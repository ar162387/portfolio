"""Private signaling server. The Next.js route is its only intended HTTP client."""

import asyncio
import base64
import hashlib
import hmac
import os
import sys
import time
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from loguru import logger
from pydantic import BaseModel, Field

load_dotenv(Path(__file__).with_name(".env"))
# Pipecat debug logs may contain transcripts. Keep normal operation quiet.
logger.remove()
logger.add(sys.stderr, level="WARNING", filter=lambda record: record["level"].name == "WARNING")

from bot import run_bot  # noqa: E402
from dashboard_store import (  # noqa: E402
    authenticated_user,
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


def _turn_credential(ttl_seconds: int, label: str) -> tuple[str, str] | None:
    secret = os.getenv("TURN_SHARED_SECRET", "").strip()
    if not secret:
        return None
    username = f"{int(time.time()) + ttl_seconds}:{label}"
    credential = base64.b64encode(
        hmac.new(secret.encode(), username.encode(), hashlib.sha1).digest()
    ).decode()
    return username, credential


def _turn_server(ttl_seconds: int, label: str) -> IceServer | None:
    host = os.getenv("TURN_HOST", "").strip()
    auth = _turn_credential(ttl_seconds, label)
    if not host or not auth:
        return None
    username, credential = auth
    return IceServer(
        urls=[f"turn:{host}:3478?transport=udp", f"turn:{host}:3478?transport=tcp"],
        username=username,
        credential=credential,
    )


server_turn = _turn_server(60 * 60 * 24 * 365 * 10, "voice-server")
handler = SmallWebRTCRequestHandler(ice_servers=[server_turn] if server_turn else None)
sessions: dict[str, asyncio.Task] = {}
pending = 0
starts: deque[float] = deque()
lock = asyncio.Lock()


async def authenticate(authorization: str = Header(default="")):
    token = os.getenv("VOICE_AGENT_TOKEN", "")
    if not token or not hmac.compare_digest(authorization, f"Bearer {token}"):
        raise HTTPException(401, "Unauthorized")


def require_key():
    if not os.getenv("GOOGLE_API_KEY"):
        raise HTTPException(503, "Voice model is not configured")


@asynccontextmanager
async def lifespan(_app):
    await asyncio.to_thread(initialize)
    yield
    tasks = list(sessions.values())
    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await handler.close()


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
    studio_knowledge: Knowledge


class Candidate(BaseModel):
    candidate: str = Field(max_length=2000)
    sdp_mid: str = Field(max_length=100)
    sdp_mline_index: int = Field(ge=0, le=100)


class Patch(BaseModel):
    pc_id: str = Field(max_length=100)
    candidates: list[Candidate] = Field(max_length=30)


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
    return {"available": True}


@app.get("/ice", dependencies=[Depends(authenticate)])
async def ice_configuration():
    turn = _turn_server(60 * 60, "website")
    if not turn:
        return {"ice_servers": []}
    return {"ice_servers": [{
        "urls": turn.urls,
        "username": turn.username,
        "credential": turn.credential,
    }]}


@app.post("/api/offer", dependencies=[Depends(authenticate)])
async def offer(body: Offer):
    global pending
    require_key()
    is_new = not body.pc_id
    async with lock:
        if body.pc_id and body.pc_id not in sessions:
            raise HTTPException(400, "Unknown session")
        if is_new:
            now = time.monotonic()
            while starts and starts[0] < now - 60:
                starts.popleft()
            if len(sessions) + pending >= int(os.getenv("MAX_VOICE_SESSIONS", "2")) or len(starts) >= 10:
                raise HTTPException(429, "Assistant is busy")
            starts.append(now)
            pending += 1

    async def connected(connection):
        async def serve():
            conversation_id = await asyncio.to_thread(
                start_conversation, transport_id=connection.pc_id, channel=body.channel
            )
            try:
                await run_bot(
                    connection,
                    body.studio_knowledge.model_dump(),
                    greet=body.greet,
                    conversation_id=conversation_id,
                )
            except asyncio.CancelledError:
                raise
            except Exception:
                # No provider exception text: it can contain conversation data.
                logger.warning("Voice session failed; check model access and configuration.")
            finally:
                await asyncio.to_thread(end_conversation, conversation_id)
                sessions.pop(connection.pc_id, None)
                await connection.disconnect()
        sessions[connection.pc_id] = asyncio.create_task(serve())

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
