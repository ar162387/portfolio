"""Checks for the private boundary and bounded prototype sessions; no Gemini calls."""
import asyncio
import json
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient

import server
from bot import ReliableGeminiLiveService, _env_seconds, create_worker, system_prompt
from text_agent import _text_system_prompt
from dashboard_store import claim_greeting, conversation_messages
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


def test_session_and_all_typed_messages_are_delivered_once(client, monkeypatch):
    model = AsyncMock(side_effect=["First reply", "Second reply"])
    monkeypatch.setattr(server, "text_reply", model)
    session = client.post("/session", json={"channel": "text"}, headers=AUTH)
    assert session.status_code == 200
    credentials = session.json()

    def send(message_id, text):
        return client.post("/message", headers=AUTH, json={
            "conversation_id": credentials["conversation_id"],
            "session_token": credentials["session_token"],
            "message_id": message_id,
            "text": text,
            "studio_knowledge": OFFER["studio_knowledge"],
        })

    first = send("message-0001", "I am a dentist")
    second = send("message-0002", "I need appointment booking")
    duplicate = send("message-0002", "I need appointment booking")
    assert first.json()["text"] == "First reply"
    assert second.json()["text"] == "Second reply"
    assert duplicate.json() == {
        "message_id": "message-0002:assistant", "text": "Second reply", "duplicate": True,
    }
    assert model.await_count == 2
    messages = conversation_messages(credentials["conversation_id"])
    assert [item["text"] for item in messages] == [
        "I am a dentist", "First reply", "I need appointment booking", "Second reply"
    ]
    assert all(item["delivery_state"] == "completed" for item in messages)


def test_typed_response_streams_and_replays_without_second_model_call(client, monkeypatch):
    calls = []

    async def model_stream(*args):
        calls.append(args[-1])
        yield "Appointment "
        yield "booking sounds useful."

    monkeypatch.setattr(server, "text_reply_stream", model_stream)
    credentials = client.post("/session", json={"channel": "text"}, headers=AUTH).json()
    payload = {
        "conversation_id": credentials["conversation_id"],
        "session_token": credentials["session_token"],
        "message_id": "stream-0001",
        "text": "I am a dentist",
        "studio_knowledge": OFFER["studio_knowledge"],
    }
    first = client.post("/message/stream", json=payload, headers=AUTH)
    replay = client.post("/message/stream", json=payload, headers=AUTH)
    first_events = [json.loads(line) for line in first.text.splitlines()]
    replay_events = [json.loads(line) for line in replay.text.splitlines()]
    assert [item["text"] for item in first_events if item["type"] == "delta"] == [
        "Appointment ", "booking sounds useful."
    ]
    assert replay_events[-1]["duplicate"] is True
    assert calls == ["I am a dentist"]


def test_greeting_can_only_be_claimed_once(client):
    credentials = client.post("/session", json={"channel": "voice"}, headers=AUTH).json()
    conversation_id = credentials["conversation_id"]
    assert claim_greeting(conversation_id, True)
    assert not claim_greeting(conversation_id, True)


def test_audio_configuration_error_is_permanent():
    service = Mock(push_error=AsyncMock())

    async def check():
        result = await ReliableGeminiLiveService._handle_connection_error(
            service, RuntimeError("1007 CONTENT_TYPE_AUDIO rejected")
        )
        assert result is False
        service.push_error.assert_awaited_once()
        assert service.push_error.await_args.kwargs["force_treat_as_permanent"] is True

    asyncio.run(check())


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


@pytest.mark.parametrize("failure", ["start", "end", "model"])
def test_session_failures_release_capacity(monkeypatch, failure):
    connection = Mock(pc_id="cleanup", disconnect=AsyncMock())
    monkeypatch.setattr(server, "start_conversation", Mock(
        return_value="conversation", side_effect=RuntimeError() if failure == "start" else None,
    ))
    monkeypatch.setattr(server, "end_conversation", Mock(
        side_effect=RuntimeError() if failure == "end" else None,
    ))
    monkeypatch.setattr(server, "run_bot", AsyncMock(
        side_effect=RuntimeError() if failure == "model" else None,
    ))

    async def check():
        task = asyncio.create_task(server.serve_session(connection, server.Offer(**OFFER)))
        server.sessions[connection.pc_id] = task
        await task
        assert connection.pc_id not in server.sessions
        connection.disconnect.assert_awaited_once()

    asyncio.run(check())


@pytest.mark.parametrize("connected", [False, True])
def test_watchdog_releases_stalled_and_overlong_sessions(monkeypatch, connected):
    connection = Mock(pc_id="watchdog", disconnect=AsyncMock(), is_connected=Mock(return_value=connected))
    cancelled = []

    async def stalled_worker(*args, **kwargs):
        try:
            await asyncio.Event().wait()
        finally:
            cancelled.append(True)

    monkeypatch.setattr(server, "start_conversation", Mock(return_value="conversation"))
    monkeypatch.setattr(server, "end_conversation", Mock())
    monkeypatch.setattr(server, "run_bot", stalled_worker)
    monkeypatch.setattr(server, "_env_seconds", lambda name, *args:
                        0 if connected or name == "CONNECT_TIMEOUT_SECONDS" else 300)

    async def check():
        task = asyncio.create_task(server.serve_session(connection, server.Offer(**OFFER)))
        server.sessions[connection.pc_id] = task
        await asyncio.wait_for(task, 2)
        assert cancelled == [True]
        assert connection.pc_id not in server.sessions
        connection.disconnect.assert_awaited_once()

    asyncio.run(check())


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
    text_prompt = _text_system_prompt(OFFER["studio_knowledge"], booking_enabled=False)
    assert "Do not send the scripted opening" in text_prompt


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
