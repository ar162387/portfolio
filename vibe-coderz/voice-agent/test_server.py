"""Checks for the private boundary and bounded prototype sessions; no Gemini calls."""
import asyncio
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi.testclient import TestClient

import server
from bot import ReliableGeminiLiveService, _env_seconds, create_worker, system_prompt
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
    server.voice_conversations.clear()
    server.voice_handoff_locks.clear()
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


def test_browser_observed_assistant_transcript_is_idempotent(client):
    credentials = client.post("/session", json={"channel": "voice"}, headers=AUTH).json()
    payload = {
        "conversation_id": credentials["conversation_id"],
        "session_token": credentials["session_token"],
        "message_id": "voice-assistant:test-turn",
        "text": "How many enquiries do you receive each week?",
        "interrupted": False,
    }
    first = client.post("/transcript", json=payload, headers=AUTH)
    duplicate = client.post("/transcript", json=payload, headers=AUTH)

    assert first.json() == {"ok": True, "saved": True}
    assert duplicate.json() == {"ok": True, "saved": False}
    messages = conversation_messages(credentials["conversation_id"])
    assert [item["text"] for item in messages] == [payload["text"]]


def test_text_only_backend_is_not_exposed(client):
    assert client.post("/message", headers=AUTH, json={}).status_code == 404
    assert client.post("/message/stream", headers=AUTH, json={}).status_code == 404


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


def test_audio_configuration_close_code_is_permanent():
    service = Mock(push_error=AsyncMock())
    error = RuntimeError()
    error.rcvd = Mock(code=1007, reason="")
    error.sent = None

    async def check():
        result = await ReliableGeminiLiveService._handle_connection_error(service, error)
        assert result is False
        service.push_error.assert_awaited_once()

    asyncio.run(check())


def test_transient_live_failures_stop_after_second_attempt():
    service = Mock(push_error=AsyncMock(), _consecutive_failures=0)

    async def check():
        first = await ReliableGeminiLiveService._handle_connection_error(
            service, RuntimeError("temporary")
        )
        second = await ReliableGeminiLiveService._handle_connection_error(
            service, RuntimeError("temporary")
        )
        assert first is True
        assert second is False
        service.push_error.assert_awaited_once()

    asyncio.run(check())


def test_voice_recovery_restores_history_without_replaying_last_turn(monkeypatch):
    connection = Mock(pc_id="recovery", disconnect=AsyncMock(), is_connected=Mock(return_value=True))
    history = [{
        "role": "user", "text": "I am a dentist", "message_id": "voice-user",
        "delivery_state": "completed", "interrupted": False,
    }]
    bot = AsyncMock()
    monkeypatch.setattr(server, "start_conversation", Mock(return_value="conversation"))
    monkeypatch.setattr(server, "conversation_messages", Mock(return_value=history))
    monkeypatch.setattr(server, "claim_greeting", Mock(return_value=False))
    monkeypatch.setattr(server, "run_bot", bot)
    monkeypatch.setenv("GEMINI_LIVE_MODEL", "gemini-3.8-live")
    offer = server.Offer(**{**OFFER, "recovery_attempt": 1, "greet": False})

    asyncio.run(server.serve_session(connection, offer))

    assert bot.await_args.kwargs["model"] == "gemini-3.8-live"
    assert bot.await_args.kwargs["history"] == history
    assert bot.await_args.kwargs["resume"] is False
    assert bot.await_args.kwargs["greet"] is False


def test_voice_recovery_without_saved_turns_does_not_replay_greeting(monkeypatch):
    connection = Mock(pc_id="recovery-empty", disconnect=AsyncMock(), is_connected=Mock(return_value=True))
    bot = AsyncMock()
    monkeypatch.setattr(server, "attach_transport", Mock(return_value=True))
    monkeypatch.setattr(server, "conversation_messages", Mock(return_value=[]))
    monkeypatch.setattr(server, "claim_greeting", Mock(return_value=False))
    monkeypatch.setattr(server, "run_bot", bot)
    offer = server.Offer(**{
        **OFFER,
        "conversation_id": "conversation",
        "session_token": "token",
        "recovery_attempt": 1,
        "greet": False,
    })
    monkeypatch.setattr(server, "_verify_session_token", Mock(return_value=True))

    asyncio.run(server.serve_session(connection, offer))

    assert bot.await_args.kwargs["greet"] is False
    assert bot.await_args.kwargs["resume"] is False


def test_first_typed_turn_does_not_trigger_opening_greeting(monkeypatch):
    connection = Mock(pc_id="first-text", disconnect=AsyncMock(), is_connected=Mock(return_value=True))
    bot = AsyncMock()
    claim = Mock(return_value=False)
    monkeypatch.setattr(server, "start_conversation", Mock(return_value="conversation"))
    monkeypatch.setattr(server, "conversation_messages", Mock(return_value=[]))
    monkeypatch.setattr(server, "claim_greeting", claim)
    monkeypatch.setattr(server, "run_bot", bot)
    offer = server.Offer(**{**OFFER, "channel": "text", "greet": False})

    asyncio.run(server.serve_session(connection, offer))

    claim.assert_called_once_with("conversation", False)
    assert bot.await_args.kwargs["greet"] is False


def test_replacement_voice_session_cancels_previous_before_start(monkeypatch):
    stopped = asyncio.Event()

    async def running_session(connection, _body):
        try:
            await asyncio.Event().wait()
        finally:
            stopped.set()

    monkeypatch.setattr(server, "serve_session", running_session)
    body = server.Offer(**{
        **OFFER,
        "conversation_id": "conversation",
        "session_token": "token",
    })
    first = Mock(pc_id="first", disconnect=AsyncMock())
    second = Mock(pc_id="second", disconnect=AsyncMock())

    async def check():
        server.sessions.clear()
        server.voice_conversations.clear()
        server.voice_handoff_locks.clear()
        await server._start_voice_session(first, body)
        first_task = server.voice_conversations["conversation"][1]
        await asyncio.sleep(0)
        await server._start_voice_session(second, body)
        assert first_task.cancelled()
        assert stopped.is_set()
        first.disconnect.assert_awaited_once()
        assert list(server.sessions) == ["second"]
        second_task = server.voice_conversations["conversation"][1]
        second_task.cancel()
        await asyncio.gather(second_task, return_exceptions=True)

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
