"""Private signaling server. The Next.js route is its only intended HTTP client."""

import asyncio
import base64
import hashlib
import hmac
import os
import secrets
import sys
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))
# Pipecat debug logs may contain transcripts. Keep normal operation quiet.
logger.remove()
logger.add(sys.stderr, level="WARNING", filter=lambda record: record["level"].name == "WARNING")
# Preserve failure locations without logging provider payloads or transcripts.
def error_location_only(record):
    exception = record["exception"]
    exception_type = getattr(getattr(exception, "type", None), "__name__", "unknown")
    record["extra"]["exception_type"] = exception_type
    record["exception"] = None
    return True


logger.add(sys.stderr, level="ERROR", filter=error_location_only,
           format=("{time} | {level} | {name}:{function}:{line} | "
                   "Voice pipeline error type={extra[exception_type]}"),
           backtrace=False, diagnose=False)
logger.add(
    sys.stdout,
    level="INFO",
    filter=lambda record: record["extra"].get("diagnostic") is True,
    serialize=True,
)

from bot import _env_seconds, run_bot  # noqa: E402
from dashboard_store import (  # noqa: E402
    add_message,
    attach_transport,
    authenticated_user,
    claim_greeting,
    conversation_exists,
    conversation_messages,
    end_conversation,
    get_conversation,
    initialize,
    list_conversations,
    login,
    logout,
    metrics,
    start_conversation,
)
from pipecat.transports.smallwebrtc.request_handler import (  # noqa: E402
    IceCandidate, SmallWebRTCPatchRequest, SmallWebRTCRequest, SmallWebRTCRequestHandler,
)
from pipecat.transports.smallwebrtc.connection import IceServer  # noqa: E402
from pipecat.frames.frames import LLMMessagesAppendFrame  # noqa: E402


def _turn_credential(ttl_seconds: int, label: str) -> tuple[str, str] | None:
    secret = os.getenv("TURN_SHARED_SECRET", "").strip()
    if not secret:
        return None
    username = f"{int(time.time()) + ttl_seconds}:{label}"
    credential = base64.b64encode(
        hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()
    ).decode()
    return username, credential


def _turn_server(ttl_seconds: int, label: str, host: str | None = None) -> IceServer | None:
    host = (host or os.getenv("TURN_HOST", "")).strip()
    auth = _turn_credential(ttl_seconds, label)
    if not host or not auth:
        return None
    username, credential = auth
    return IceServer(
        urls=[f"turn:{host}:3478?transport=udp", f"turn:{host}:3478?transport=tcp"],
        username=username,
        credential=credential,
    )


# The browser reaches TURN through the public hostname. The EC2 WebRTC peer must
# reach the same relay on its private interface so its answer includes a public
# relay candidate instead of an unreachable 172.31.x.x host candidate.
server_turn = _turn_server(
    60 * 60 * 24 * 365 * 10,
    "voice-server",
    os.getenv("TURN_INTERNAL_HOST", "").strip() or None,
)
handler = SmallWebRTCRequestHandler(ice_servers=[server_turn] if server_turn else None)
sessions: dict[str, asyncio.Task] = {}
voice_conversations: dict[str, tuple[str, asyncio.Task, object]] = {}
live_workers: dict[str, tuple[str, object]] = {}
typed_input_ids: dict[str, deque[str]] = {}
typed_input_locks: dict[str, asyncio.Lock] = {}
voice_handoff_locks: dict[str, asyncio.Lock] = {}
pending = 0
starts: deque[float] = deque()
lock = asyncio.Lock()


async def watch_connection(connection):
    """Bound abandoned handshakes and lost browsers independently of the UI."""
    started = time.monotonic()
    last_connected = None
    while True:
        now = time.monotonic()
        if connection.is_connected():
            last_connected = now
        if now - started >= _env_seconds("MAX_SESSION_SECONDS", 840, 30):
            return
        if last_connected is None:
            if now - started >= _env_seconds("CONNECT_TIMEOUT_SECONDS", 20, 5):
                return
        elif now - last_connected >= _env_seconds("DISCONNECT_TIMEOUT_SECONDS", 15, 5):
            return
        await asyncio.sleep(1)


async def serve_session(connection, body):
    conversation_id = None
    children = []
    try:
        if body.conversation_id and _verify_session_token(body.conversation_id, body.session_token):
            attached = await asyncio.to_thread(
                attach_transport, body.conversation_id, connection.pc_id, body.channel
            )
            if not attached:
                raise RuntimeError("Conversation is unavailable")
            conversation_id = body.conversation_id
        else:
            conversation_id = await asyncio.to_thread(
                start_conversation, transport_id=connection.pc_id, channel=body.channel
            )
        history = await asyncio.to_thread(conversation_messages, conversation_id)
        greet = await asyncio.to_thread(
            claim_greeting, conversation_id, body.greet
        )
        # A recovery restores context and waits for fresh speech. The prior
        # last-user heuristic could regenerate an answer that had already played
        # when assistant transcript persistence lagged behind audio.
        resume = False
        # Keep the same model and configured voice across a transport recovery so
        # the visitor does not hear a different persona midway through the call.
        model = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.8-live")
        def worker_ready(pipeline_worker):
            live_workers[conversation_id] = (
                connection.pc_id,
                pipeline_worker,
                pipeline_worker.studio_live_service,
            )

        worker = asyncio.create_task(run_bot(
            connection, body.studio_knowledge.model_dump(), greet=greet,
            conversation_id=conversation_id, history=history, model=model, resume=resume,
            worker_ready=worker_ready,
        ))
        watcher = asyncio.create_task(watch_connection(connection))
        children = [worker, watcher]
        done, _ = await asyncio.wait(children, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            task.result()
    except asyncio.CancelledError:
        raise
    except Exception:
        # Provider/database exception text can contain private conversation data.
        logger.warning("Voice session failed; check model access and configuration.")
    finally:
        for task in children:
            task.cancel()
        try:
            await asyncio.gather(*children, return_exceptions=True)
            await connection.disconnect()
        finally:
            # Recording failures must never leave the capacity slot occupied.
            sessions.pop(connection.pc_id, None)
            if conversation_id:
                active = voice_conversations.get(conversation_id)
                if active and active[0] == connection.pc_id:
                    voice_conversations.pop(conversation_id, None)
                live = live_workers.get(conversation_id)
                if live and live[0] == connection.pc_id:
                    live_workers.pop(conversation_id, None)


async def authenticate(authorization: str = Header(default="")):
    token = os.getenv("VOICE_AGENT_TOKEN", "")
    if not token or not hmac.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(401, "Unauthorized")


def require_key():
    if not os.getenv("GOOGLE_API_KEY"):
        raise HTTPException(503, "Voice model is not configured")


@asynccontextmanager
async def lifespan(_app):
    if os.getenv("NLTK_DATA"):
        from nltk.tokenize import sent_tokenize
        await asyncio.to_thread(sent_tokenize, "Voice startup check.")
    await asyncio.to_thread(initialize)
    turn_refresh = asyncio.create_task(_refresh_server_turn_forever())
    yield
    turn_refresh.cancel()
    await asyncio.gather(turn_refresh, return_exceptions=True)
    tasks = list(sessions.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await handler.close()


async def _start_voice_session(connection, body):
    """Atomically replace any older media/model session for this conversation."""
    conversation_id = body.conversation_id
    handoff_lock = (
        voice_handoff_locks.setdefault(conversation_id, asyncio.Lock())
        if conversation_id else lock
    )
    async with handoff_lock:
        if conversation_id:
            previous = voice_conversations.get(conversation_id)
            if previous and previous[0] != connection.pc_id:
                previous_pc_id, previous_task, previous_connection = previous
                previous_task.cancel()
                try:
                    await previous_connection.disconnect()
                except Exception:
                    pass
                await asyncio.gather(previous_task, return_exceptions=True)
                sessions.pop(previous_pc_id, None)
        task = asyncio.create_task(serve_session(connection, body))
        sessions[connection.pc_id] = task
        if conversation_id:
            voice_conversations[conversation_id] = (connection.pc_id, task, connection)
        # Also release tasks cancelled before their coroutine first runs.
        task.add_done_callback(lambda _: sessions.pop(connection.pc_id, None))
app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None)


class Service(BaseModel):
    name: str = Field(max_length=150)
    detail: str = Field(max_length=2000)
    fit: str = Field(max_length=1000)


class Knowledge(BaseModel):
    name: str = Field(max_length=150)
    email: str = Field(max_length=254)
    services: list[Service] = Field(max_length=30)


class Offer(BaseModel):
    sdp: str = Field(min_length=1, max_length=24000)
    type: Literal["offer"]
    pc_id: str | None = Field(default=None, max_length=100)
    restart_pc: bool = False
    greet: bool = True
    channel: Literal["voice", "push_to_talk", "text"] = "voice"
    conversation_id: str | None = Field(default=None, max_length=36)
    session_token: str = Field(default="", max_length=500)
    recovery_attempt: int = Field(default=0, ge=0, le=1)
    studio_knowledge: Knowledge


class Candidate(BaseModel):
    candidate: str = Field(max_length=2000)
    sdp_mid: str = Field(max_length=100)
    sdp_mline_index: int = Field(ge=0, le=100)


class Patch(BaseModel):
    pc_id: str = Field(max_length=100)
    candidates: list[Candidate] = Field(max_length=30)


class SessionStart(BaseModel):
    channel: Literal["voice", "push_to_talk", "text"] = "voice"


class SessionEnd(BaseModel):
    conversation_id: str = Field(max_length=36)
    session_token: str = Field(max_length=500)
    reason: str = Field(default="client_ended", max_length=80)


class ConnectionDiagnostic(BaseModel):
    conversation_id: str = Field(max_length=36)
    session_token: str = Field(max_length=500)
    event: Literal["connected", "degraded", "disconnected", "recovered"]
    connection_state: str = Field(default="unknown", max_length=30)
    ice_transport: Literal["udp", "tcp", "tls", "unknown"] = "unknown"
    local_candidate_type: str = Field(default="unknown", max_length=20)
    remote_candidate_type: str = Field(default="unknown", max_length=20)
    round_trip_ms: float | None = Field(default=None, ge=0, le=120_000)
    packets_lost: int | None = Field(default=None, ge=0, le=2_147_483_647)
    jitter_ms: float | None = Field(default=None, ge=0, le=120_000)


class VoiceTranscript(BaseModel):
    conversation_id: str = Field(max_length=36)
    session_token: str = Field(max_length=500)
    message_id: str = Field(min_length=8, max_length=80)
    text: str = Field(min_length=1, max_length=12_000)
    interrupted: bool = False


class VoiceInput(BaseModel):
    conversation_id: str = Field(max_length=36)
    session_token: str = Field(max_length=500)
    message_id: str = Field(min_length=8, max_length=80)
    text: str = Field(min_length=1, max_length=2_000)


def _session_token(conversation_id: str, ttl_seconds: int = 60 * 60) -> str:
    expires = int(time.time()) + ttl_seconds
    nonce = secrets.token_urlsafe(12)
    payload = f"{conversation_id}.{expires}.{nonce}"
    signature = hmac.new(
        os.environ["VOICE_AGENT_TOKEN"].encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"{payload}.{signature}"


def _verify_session_token(conversation_id: str, token: str) -> bool:
    try:
        token_conversation, raw_expiry, nonce, signature = token.split(".", 3)
        payload = f"{token_conversation}.{raw_expiry}.{nonce}"
        expected = hmac.new(
            os.environ["VOICE_AGENT_TOKEN"].encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        return (
            token_conversation == conversation_id
            and int(raw_expiry) >= int(time.time())
            and hmac.compare_digest(signature, expected)
        )
    except (KeyError, ValueError):
        return False


async def _cloudflare_ice() -> list[dict]:
    if os.getenv("MANAGED_TURN_ENABLED", "false").lower() not in {"1", "true", "yes"}:
        return []
    key_id = os.getenv("CLOUDFLARE_TURN_KEY_ID", "").strip()
    api_token = os.getenv("CLOUDFLARE_TURN_API_TOKEN", "").strip()
    if not key_id or not api_token:
        return []
    try:
        async with httpx.AsyncClient(timeout=4) as client:
            response = await client.post(
                f"https://rtc.live.cloudflare.com/v1/turn/keys/{key_id}/credentials/generate-ice-servers",
                headers={"Authorization": f"Bearer {api_token}"},
                json={"ttl": 3600},
            )
            response.raise_for_status()
            servers = response.json().get("iceServers", [])
            return servers if isinstance(servers, list) else []
    except (httpx.HTTPError, ValueError, AttributeError):
        logger.warning("Managed TURN credentials unavailable; using self-hosted fallback.")
        return []


async def _browser_ice_servers() -> list[dict]:
    managed = await _cloudflare_ice()
    if managed:
        return managed
    turn = _turn_server(60 * 60, "website")
    if not turn:
        return []
    return [{"urls": turn.urls, "username": turn.username, "credential": turn.credential}]


async def _refresh_server_turn_forever():
    """Keep the EC2 peer on the same managed relay set as browsers."""
    while True:
        servers = await _cloudflare_ice()
        managed = [
            IceServer(
                urls=item.get("urls", []),
                username=item.get("username"),
                credential=item.get("credential"),
            )
            for item in servers
            if isinstance(item, dict) and item.get("urls")
        ]
        handler.update_ice_servers(managed or ([server_turn] if server_turn else None))
        await asyncio.sleep(45 * 60)


class DashboardLogin(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=500)


def dashboard_token(x_dashboard_session: str = Header(default="")) -> str:
    if not authenticated_user(x_dashboard_session):
        raise HTTPException(401, "Unauthorized")
    return x_dashboard_session


@app.get("/health", dependencies=[Depends(authenticate)])
async def health():
    require_key()
    return {"available": True, "sessions": len(sessions), "pending": pending}


@app.get("/ice", dependencies=[Depends(authenticate)])
async def ice_configuration():
    return {"ice_servers": await _browser_ice_servers()}


@app.post("/session", dependencies=[Depends(authenticate)])
async def create_session(body: SessionStart):
    require_key()
    conversation_id = await asyncio.to_thread(
        start_conversation, transport_id=None, channel=body.channel
    )
    return {
        "conversation_id": conversation_id,
        "session_token": _session_token(conversation_id),
        "ice_servers": await _browser_ice_servers(),
    }


@app.post("/session/end", dependencies=[Depends(authenticate)])
async def close_session(body: SessionEnd):
    if not _verify_session_token(body.conversation_id, body.session_token):
        raise HTTPException(401, "Invalid session")
    await asyncio.to_thread(end_conversation, body.conversation_id, body.reason)
    typed_input_ids.pop(body.conversation_id, None)
    typed_input_locks.pop(body.conversation_id, None)
    return {"ok": True}


@app.post("/input", dependencies=[Depends(authenticate)])
async def deliver_typed_input(body: VoiceInput):
    """Reliably inject text into the active Gemini Live worker and acknowledge it."""
    if not _verify_session_token(body.conversation_id, body.session_token):
        raise HTTPException(401, "Invalid session")
    text = body.text.strip()
    if not text:
        raise HTTPException(422, "Message is empty")

    async with typed_input_locks.setdefault(body.conversation_id, asyncio.Lock()):
        # The browser can reach this endpoint just before run_bot publishes its
        # worker. Bound that race instead of rejecting a valid first typed turn.
        live = live_workers.get(body.conversation_id)
        for _ in range(20):
            if live:
                break
            await asyncio.sleep(0.1)
            live = live_workers.get(body.conversation_id)
        if not live:
            raise HTTPException(409, "Live voice session is unavailable")

        message_ids = typed_input_ids.setdefault(body.conversation_id, deque(maxlen=100))
        if body.message_id in message_ids:
            return {"ok": True, "accepted": False}

        _pc_id, worker, live_service = live
        await worker.rtvi.interrupt_bot()
        await worker.flush_pipeline()
        # Keep Pipecat's local history ordered for tools and reconnection, but
        # do not run inference from this bookkeeping frame. Gemini Live assumes
        # post-initialisation context updates are already known by the provider.
        await worker.queue_frames([
            LLMMessagesAppendFrame(
                messages=[{"role": "user", "content": text}],
                run_llm=False,
            )
        ])
        await worker.flush_pipeline()
        try:
            await live_service.send_text_reliably(text)
        except TimeoutError as exc:
            raise HTTPException(409, "Live voice session is recovering") from exc
        except Exception as exc:
            raise HTTPException(503, "Typed input could not reach the live model") from exc
        message_ids.append(body.message_id)
        try:
            await asyncio.to_thread(
                add_message,
                body.conversation_id,
                "user",
                text,
                message_id=body.message_id,
                delivery_state="completed",
            )
        except Exception as exc:
            logger.bind(
                diagnostic=True,
                conversation_id=body.conversation_id,
                event="typed_input_persist_failed",
                error_type=type(exc).__name__,
            ).info("voice_input")
    logger.bind(
        diagnostic=True,
        conversation_id=body.conversation_id,
        event="typed_input_accepted",
    ).info("voice_input")
    return {"ok": True, "accepted": True}


@app.post("/diagnostic", dependencies=[Depends(authenticate)])
async def record_connection_diagnostic(body: ConnectionDiagnostic):
    if not _verify_session_token(body.conversation_id, body.session_token):
        raise HTTPException(401, "Invalid session")
    logger.bind(
        diagnostic=True,
        conversation_id=body.conversation_id,
        event=body.event,
        connection_state=body.connection_state,
        ice_transport=body.ice_transport,
        local_candidate_type=body.local_candidate_type,
        remote_candidate_type=body.remote_candidate_type,
        round_trip_ms=body.round_trip_ms,
        packets_lost=body.packets_lost,
        jitter_ms=body.jitter_ms,
    ).info("voice_connection")
    return {"ok": True}


@app.post("/transcript", dependencies=[Depends(authenticate)])
async def record_voice_transcript(body: VoiceTranscript):
    """Persist the browser-observed assistant turn if provider aggregation lags."""
    if not _verify_session_token(body.conversation_id, body.session_token):
        raise HTTPException(401, "Invalid session")
    if not await asyncio.to_thread(conversation_exists, body.conversation_id):
        raise HTTPException(404, "Conversation not found")
    existing = await asyncio.to_thread(conversation_messages, body.conversation_id)
    if existing and existing[-1].get("role") == "assistant" and existing[-1].get("text") == body.text.strip():
        return {"ok": True, "saved": False}
    saved = await asyncio.to_thread(
        add_message,
        body.conversation_id,
        "assistant",
        body.text,
        message_id=body.message_id,
        delivery_state="interrupted" if body.interrupted else "completed",
        interrupted=body.interrupted,
    )
    return {"ok": True, "saved": saved}


@app.post("/api/offer", dependencies=[Depends(authenticate)])
async def offer(body: Offer):
    global pending
    require_key()
    if body.conversation_id and not _verify_session_token(body.conversation_id, body.session_token):
        raise HTTPException(401, "Invalid session")
    is_new = not body.pc_id
    async with lock:
        if body.pc_id and body.pc_id not in sessions:
            raise HTTPException(400, "Unknown session")
        if is_new:
            now = time.monotonic()
            while starts and starts[0] < now - 60:
                starts.popleft()
            replacing = bool(
                body.conversation_id and body.conversation_id in voice_conversations
            )
            active_slots = len(sessions) - (1 if replacing else 0)
            if active_slots + pending >= int(os.getenv("MAX_VOICE_SESSIONS", "2")):
                raise HTTPException(429, "Assistant is busy", headers={"Retry-After": "15"})
            if len(starts) >= 10:
                raise HTTPException(429, "Too many connection attempts", headers={"Retry-After": "60"})
            starts.append(now)
            pending += 1

    async def connected(connection):
        await _start_voice_session(connection, body)

    try:
        return await handler.handle_web_request(
            SmallWebRTCRequest(sdp=body.sdp, type=body.type, pc_id=body.pc_id, restart_pc=body.restart_pc),
            connected,
        )
    finally:
        if is_new:
            async with lock:
                pending -= 1


@app.patch("/api/offer", dependencies=[Depends(authenticate)])
async def patch(body: Patch):
    if body.pc_id not in sessions:
        raise HTTPException(404, "Unknown session")
    await handler.handle_patch_request(SmallWebRTCPatchRequest(
        pc_id=body.pc_id, candidates=[IceCandidate(**candidate.model_dump()) for candidate in body.candidates],
    ))
    return {"ok": True}


@app.post("/dashboard/login", dependencies=[Depends(authenticate)])
async def dashboard_login(body: DashboardLogin):
    result = await asyncio.to_thread(login, body.email, body.password)
    if not result:
        raise HTTPException(401, "Invalid email or password")
    token, expires_at = result
    return {"token": token, "expires_at": expires_at.isoformat()}


@app.post("/dashboard/logout", dependencies=[Depends(authenticate)])
async def dashboard_logout(token: str = Depends(dashboard_token)):
    await asyncio.to_thread(logout, token)
    return {"ok": True}


@app.get("/dashboard/me", dependencies=[Depends(authenticate)])
async def dashboard_me(token: str = Depends(dashboard_token)):
    return await asyncio.to_thread(authenticated_user, token)


@app.get("/dashboard/metrics", dependencies=[Depends(authenticate)])
async def dashboard_metrics(_token: str = Depends(dashboard_token)):
    return await asyncio.to_thread(metrics)


@app.get("/dashboard/conversations", dependencies=[Depends(authenticate)])
async def dashboard_conversations(
    limit: int = Query(default=100, ge=1, le=200),
    stage: str = Query(default="", max_length=40),
    search: str = Query(default="", max_length=100),
    _token: str = Depends(dashboard_token),
):
    return await asyncio.to_thread(
        list_conversations, limit=limit, stage=stage, search=search
    )


@app.get("/dashboard/conversations/{conversation_id}", dependencies=[Depends(authenticate)])
async def dashboard_conversation(conversation_id: str, _token: str = Depends(dashboard_token)):
    item = await asyncio.to_thread(get_conversation, conversation_id)
    if item is None:
        raise HTTPException(404, "Conversation not found")
    return item
