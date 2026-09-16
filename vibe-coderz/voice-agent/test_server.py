"""Checks for the private boundary and bounded prototype sessions; no Gemini calls."""
import asyncio
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import server
from bot import _env_seconds, create_worker, system_prompt
from calendar_tools import (
    CalConfig,
    _booking_hours,
    _future_iso_timestamp,
    _slot_in_booking_hours,
    _valid_date_range,
    _valid_timezone,
    calendar_tools_from_env,
)
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("VOICE_AGENT_TOKEN", "test-token")
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")
    server.starts.clear()
    server.sessions.clear()
    server.pending = 0
    with TestClient(server.app) as test_client:
        yield test_client


AUTH = {"Authorization": "Bearer test-token"}
OFFER = {"sdp": "test", "type": "offer", "studio_knowledge": {"name": "Studio", "email": "test@example.com", "services": []}}


def test_private_health(client):
    assert client.get("/health").status_code == 401
    assert client.get("/health", headers=AUTH).status_code == 200


def test_private_ephemeral_turn_credentials(client, monkeypatch):
    assert client.get("/ice").status_code == 401
    monkeypatch.setenv("TURN_HOST", "voice.example.com")
    monkeypatch.setenv("TURN_SHARED_SECRET", "test-turn-secret")
    payload = client.get("/ice", headers=AUTH).json()["ice_servers"][0]
    assert payload["username"].endswith(":website")
    assert payload["credential"]
    assert payload["urls"] == [
        "turn:voice.example.com:3478?transport=udp",
        "turn:voice.example.com:3478?transport=tcp",
    ]


def test_missing_key(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY")
    assert client.get("/health", headers=AUTH).status_code == 503
    assert client.post("/api/offer", json=OFFER, headers=AUTH).status_code == 503


def test_rejects_malformed_and_unknown_sessions(client):
    assert client.post("/api/offer", json={**OFFER, "type": "answer"}, headers=AUTH).status_code == 422
    assert client.post("/api/offer", json={**OFFER, "pc_id": "unknown"}, headers=AUTH).status_code == 400
    assert client.patch("/api/offer", json={"pc_id": "unknown", "candidates": []}, headers=AUTH).status_code == 404


def test_capacity_blocks_before_connection(client, monkeypatch):
    monkeypatch.setenv("MAX_VOICE_SESSIONS", "1")
    server.pending = 1
    negotiate = AsyncMock()
    monkeypatch.setattr(server.handler, "handle_web_request", negotiate)
    assert client.post("/api/offer", json=OFFER, headers=AUTH).status_code == 429
    negotiate.assert_not_called()
    server.pending = 0


def test_transport_fields_and_rate_limit(client, monkeypatch):
    negotiate = AsyncMock(return_value={"sdp": "answer", "type": "answer", "pc_id": "test"})
    monkeypatch.setattr(server.handler, "handle_web_request", negotiate)
    for _ in range(10):
        assert client.post("/api/offer", json=OFFER, headers=AUTH).status_code == 200
    assert server.pending == 0
    assert client.post("/api/offer", json=OFFER, headers=AUTH).status_code == 429
    assert negotiate.call_args.args[0].sdp == "test"


def test_pipeline_uses_installed_api(client):
    async def check():
        connection = SmallWebRTCConnection()
        worker = create_worker(connection, OFFER["studio_knowledge"])
        assert worker.rtvi is not None
        await connection.disconnect()
    asyncio.run(check())
    assert "NO booking" in system_prompt(OFFER["studio_knowledge"])


def test_sales_prompt_is_scoped_and_truthful():
    prompt = system_prompt(OFFER["studio_knowledge"])
    assert "website sales consultant" in prompt
    assert "two offers" in prompt
    assert "Do not volunteer that you are an AI" in prompt
    assert "If directly asked whether you" in prompt
    assert "are a bot, AI, or human" in prompt
    assert "trivia, news, politics" in prompt.replace("\n", " ")
    assert "NO booking" in prompt


def test_bad_silence_timeout_falls_back(monkeypatch):
    monkeypatch.setenv("SILENCE_TIMEOUT_SECONDS", "not-a-number")
    assert _env_seconds("SILENCE_TIMEOUT_SECONDS", 90, 15) == 90
    monkeypatch.setenv("SILENCE_TIMEOUT_SECONDS", "2")
    assert _env_seconds("SILENCE_TIMEOUT_SECONDS", 90, 15) == 15


def test_calendar_config_requires_key_and_event(monkeypatch):
    monkeypatch.delenv("CAL_API_KEY", raising=False)
    assert CalConfig.from_env() is None
    monkeypatch.setenv("CAL_API_KEY", "cal_test")
    monkeypatch.setenv("CAL_USERNAME", "studio")
    monkeypatch.setenv("CAL_EVENT_TYPE_SLUG", "discovery")
    monkeypatch.delenv("CAL_EVENT_TYPE_ID", raising=False)
    assert CalConfig.from_env().event_params() == {
        "username": "studio", "eventTypeSlug": "discovery"
    }
    tools = calendar_tools_from_env()
    assert tools is not None
    assert [tool.name for tool in tools.standard_tools] == [
        "check_appointment_availability", "create_appointment"
    ]


def test_calendar_input_guards():
    today = __import__("datetime").date.today().isoformat()
    assert _valid_date_range(today, today)
    assert not _valid_date_range("bad", today)
    assert not _future_iso_timestamp("2020-01-01T00:00:00Z")
    assert _valid_timezone("America/Chicago")
    assert not _valid_timezone("Central Time")


def test_calendar_uses_visitor_local_business_hours(monkeypatch):
    monkeypatch.setenv("VISITOR_BOOKING_START_HOUR", "9")
    monkeypatch.setenv("VISITOR_BOOKING_END_HOUR", "20")
    assert _booking_hours() == (9, 20)
    assert _slot_in_booking_hours("2026-09-22T13:00:00-05:00", "America/Chicago")
    assert not _slot_in_booking_hours("2026-09-22T01:00:00-05:00", "America/Chicago")


def test_booking_prompt_changes_with_tool_availability():
    disabled = system_prompt(OFFER["studio_knowledge"])
    enabled = system_prompt(OFFER["studio_knowledge"], booking_enabled=True)
    assert "NO booking" in disabled
    assert "calendar tools are available" in enabled
    assert "booking_uid" in enabled
    assert "Most of Texas is America/Chicago" in enabled
