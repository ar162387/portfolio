"""Persistent conversations, lead progress, and dashboard authentication."""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, Index, Integer, String, Text, create_engine, func, inspect, or_, select, text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


STAGE_SCORES = {
    "new": 0,
    "engaged": 20,
    "discovery": 40,
    "qualified": 60,
    "consultation_offered": 75,
    "booking_started": 90,
    "booked": 100,
}


def _now() -> datetime:
    return datetime.now(UTC)


class Base(DeclarativeBase):
    pass


class DashboardUser(Base):
    __tablename__ = "dashboard_users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class DashboardSession(Base):
    __tablename__ = "dashboard_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("dashboard_users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Conversation(Base):
    __tablename__ = "conversations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    transport_id: Mapped[str | None] = mapped_column(String(100), index=True)
    channel: Mapped[str] = mapped_column(String(30), default="voice")
    status: Mapped[str] = mapped_column(String(30), default="active", index=True)
    lead_stage: Mapped[str] = mapped_column(String(40), default="new", index=True)
    progress_score: Mapped[int] = mapped_column(Integer, default=0)
    qualified: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    offer_interest: Mapped[str | None] = mapped_column(String(50), index=True)
    company_type: Mapped[str | None] = mapped_column(String(150))
    need_summary: Mapped[str | None] = mapped_column(Text)
    inquiry_volume: Mapped[str | None] = mapped_column(String(100))
    qualification_reason: Mapped[str | None] = mapped_column(Text)
    contact_name: Mapped[str | None] = mapped_column(String(150))
    contact_email: Mapped[str | None] = mapped_column(String(254), index=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    visitor_timezone: Mapped[str | None] = mapped_column(String(100))
    appointment_start: Mapped[str | None] = mapped_column(String(100))
    booking_uid: Mapped[str | None] = mapped_column(String(150), index=True)
    meeting_url: Mapped[str | None] = mapped_column(Text)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    user_turns: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    termination_reason: Mapped[str | None] = mapped_column(String(80))
    greeting_delivered: Mapped[bool] = mapped_column(Boolean, default=False)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    __table_args__ = (
        Index(
            "ux_conversation_messages_conversation_message_id",
            "conversation_id",
            "message_id",
            unique=True,
        ),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    conversation_id: Mapped[str] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(20))
    text: Mapped[str] = mapped_column(Text)
    message_id: Mapped[str | None] = mapped_column(String(80))
    delivery_state: Mapped[str] = mapped_column(String(30), default="completed")
    interrupted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


def _database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite:///./voice_agent.db").strip()


def _build_engine():
    url = _database_url()
    args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=args)


engine = _build_engine()
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def _hash_password(password: str, *, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    iterations = 600_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return "$".join([
        "pbkdf2-sha256",
        str(iterations),
        base64.urlsafe_b64encode(salt).decode(),
        base64.urlsafe_b64encode(digest).decode(),
    ])


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, raw_iterations, raw_salt, raw_digest = encoded.split("$", 3)
        if algorithm != "pbkdf2-sha256":
            return False
        salt = base64.urlsafe_b64decode(raw_salt.encode())
        expected = base64.urlsafe_b64decode(raw_digest.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(raw_iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def initialize() -> None:
    Base.metadata.create_all(engine)
    # create_all does not add columns to existing SQLite/PostgreSQL tables.
    # These additive migrations keep existing production conversations readable.
    existing_conversation = {column["name"] for column in inspect(engine).get_columns("conversations")}
    existing_message = {column["name"] for column in inspect(engine).get_columns("conversation_messages")}
    statements = []
    if "termination_reason" not in existing_conversation:
        statements.append("ALTER TABLE conversations ADD COLUMN termination_reason VARCHAR(80)")
    if "greeting_delivered" not in existing_conversation:
        boolean_default = "FALSE" if engine.dialect.name == "postgresql" else "0"
        boolean_type = "BOOLEAN" if engine.dialect.name == "postgresql" else "INTEGER"
        statements.append(
            f"ALTER TABLE conversations ADD COLUMN greeting_delivered {boolean_type} "
            f"DEFAULT {boolean_default}"
        )
    if "message_id" not in existing_message:
        statements.append("ALTER TABLE conversation_messages ADD COLUMN message_id VARCHAR(80)")
    if "delivery_state" not in existing_message:
        statements.append(
            "ALTER TABLE conversation_messages ADD COLUMN delivery_state VARCHAR(30) DEFAULT 'completed'"
        )
    if "interrupted" not in existing_message:
        boolean_type = "BOOLEAN" if engine.dialect.name == "postgresql" else "INTEGER"
        boolean_default = "FALSE" if engine.dialect.name == "postgresql" else "0"
        statements.append(
            f"ALTER TABLE conversation_messages ADD COLUMN interrupted {boolean_type} "
            f"DEFAULT {boolean_default}"
        )
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
        connection.execute(text("DROP INDEX IF EXISTS ix_conversation_messages_message_id"))
        connection.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_conversation_messages_conversation_message_id "
            "ON conversation_messages (conversation_id, message_id)"
        ))
    email = os.getenv("DASHBOARD_ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("DASHBOARD_ADMIN_PASSWORD", "")
    if not email or len(password) < 12:
        return
    with SessionLocal.begin() as db:
        user = db.scalar(select(DashboardUser).where(DashboardUser.email == email))
        if user is None:
            db.add(DashboardUser(id=str(uuid.uuid4()), email=email, password_hash=_hash_password(password)))


def start_conversation(*, transport_id: str | None, channel: str) -> str:
    conversation_id = str(uuid.uuid4())
    with SessionLocal.begin() as db:
        db.add(Conversation(id=conversation_id, transport_id=transport_id, channel=channel))
    return conversation_id


def add_message(
    conversation_id: str,
    role: str,
    text: str,
    timestamp: str | None = None,
    *,
    message_id: str | None = None,
    delivery_state: str = "completed",
    interrupted: bool = False,
) -> bool:
    clean = text.strip()
    if not clean:
        return False
    created_at = _now()
    if timestamp:
        try:
            created_at = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except ValueError:
            pass
    with SessionLocal.begin() as db:
        if message_id:
            existing = db.scalar(select(ConversationMessage).where(
                ConversationMessage.conversation_id == conversation_id,
                ConversationMessage.message_id == message_id,
            ))
            if existing:
                if existing.interrupted and role == "assistant" and delivery_state == "completed":
                    existing.text = clean[:12_000]
                    existing.delivery_state = "completed"
                    existing.interrupted = False
                    return True
                return False
        conversation = db.get(Conversation, conversation_id)
        if conversation is None:
            return False
        db.add(ConversationMessage(
            conversation_id=conversation_id,
            role=role,
            text=clean[:12_000],
            message_id=message_id,
            delivery_state=delivery_state[:30],
            interrupted=interrupted,
            created_at=created_at,
        ))
        conversation.message_count += 1
        conversation.last_activity_at = _now()
        if role == "user":
            conversation.user_turns += 1
            if conversation.lead_stage == "new":
                conversation.lead_stage = "engaged"
                conversation.progress_score = STAGE_SCORES["engaged"]
            elif conversation.lead_stage == "engaged":
                conversation.lead_stage = "discovery"
                conversation.progress_score = STAGE_SCORES["discovery"]
            if not conversation.need_summary:
                conversation.need_summary = clean[:500]
        return True


def update_message_delivery(
    conversation_id: str, message_id: str, state: str, *, interrupted: bool = False
) -> None:
    with SessionLocal.begin() as db:
        message = db.scalar(select(ConversationMessage).where(
            ConversationMessage.conversation_id == conversation_id,
            ConversationMessage.message_id == message_id,
        ))
        if message:
            message.delivery_state = state[:30]
            message.interrupted = interrupted


def conversation_messages(conversation_id: str) -> list[dict[str, Any]]:
    with SessionLocal() as db:
        messages = db.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.id)
        ).all()
        return [{
            "role": item.role,
            "text": item.text,
            "message_id": item.message_id,
            "delivery_state": item.delivery_state,
            "interrupted": item.interrupted,
        } for item in messages]


def conversation_exists(conversation_id: str) -> bool:
    with SessionLocal() as db:
        return db.get(Conversation, conversation_id) is not None


def attach_transport(conversation_id: str, transport_id: str, channel: str) -> bool:
    with SessionLocal.begin() as db:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None or conversation.ended_at is not None:
            return False
        conversation.transport_id = transport_id[:100]
        conversation.channel = channel[:30]
        conversation.last_activity_at = _now()
        return True


def claim_greeting(conversation_id: str, requested: bool) -> bool:
    """Atomically allow the opening once for the lifetime of a conversation."""
    if not requested:
        return False
    with SessionLocal.begin() as db:
        conversation = db.get(Conversation, conversation_id)
        if (
            conversation is None
            or conversation.greeting_delivered
            or conversation.message_count > 0
        ):
            return False
        conversation.greeting_delivered = True
        conversation.last_activity_at = _now()
        return True


def _advance(conversation: Conversation, stage: str) -> None:
    if STAGE_SCORES.get(stage, 0) >= conversation.progress_score:
        conversation.lead_stage = stage
        conversation.progress_score = STAGE_SCORES[stage]


def record_qualification(conversation_id: str, details: dict[str, Any]) -> None:
    with SessionLocal.begin() as db:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None:
            return
        conversation.offer_interest = str(details.get("offer_interest") or "unclear")[:50]
        conversation.company_type = str(details.get("company_type") or "")[:150] or None
        conversation.need_summary = str(details.get("need_summary") or "")[:2000] or conversation.need_summary
        conversation.inquiry_volume = str(details.get("inquiry_volume") or "")[:100] or None
        conversation.qualified = details.get("qualified") is True
        conversation.qualification_reason = str(details.get("qualification_reason") or "")[:1000] or None
        if conversation.qualified:
            _advance(conversation, "qualified")
        conversation.last_activity_at = _now()


def record_calendar_progress(conversation_id: str, stage: str) -> None:
    with SessionLocal.begin() as db:
        conversation = db.get(Conversation, conversation_id)
        if conversation:
            _advance(conversation, stage)
            conversation.last_activity_at = _now()


def record_booking(conversation_id: str, details: dict[str, Any]) -> None:
    with SessionLocal.begin() as db:
        conversation = db.get(Conversation, conversation_id)
        if conversation is None:
            return
        _advance(conversation, "booked")
        conversation.status = "booked"
        conversation.qualified = True
        conversation.contact_name = str(details.get("name") or "")[:150] or None
        conversation.contact_email = str(details.get("email") or "")[:254] or None
        conversation.contact_phone = str(details.get("phone_number") or "")[:50] or None
        conversation.visitor_timezone = str(details.get("time_zone") or "")[:100] or None
        conversation.appointment_start = str(details.get("start") or "")[:100] or None
        conversation.booking_uid = str(details.get("booking_uid") or "")[:150] or None
        conversation.meeting_url = str(details.get("meeting_url") or "")[:2000] or None
        conversation.last_activity_at = _now()


def end_conversation(conversation_id: str, reason: str = "client_ended") -> None:
    with SessionLocal.begin() as db:
        conversation = db.get(Conversation, conversation_id)
        if conversation:
            if conversation.status == "active":
                conversation.status = "completed" if conversation.message_count else "abandoned"
            conversation.ended_at = _now()
            conversation.termination_reason = reason[:80]
            conversation.last_activity_at = _now()


def login(email: str, password: str) -> tuple[str, datetime] | None:
    with SessionLocal.begin() as db:
        user = db.scalar(select(DashboardUser).where(DashboardUser.email == email.strip().lower()))
        valid_hash = user.password_hash if user else _hash_password("invalid-password", salt=b"0" * 16)
        valid = _verify_password(password, valid_hash)
        if not user or not valid or user.disabled:
            return None
        token = secrets.token_urlsafe(48)
        expires_at = _now() + timedelta(hours=12)
        db.add(DashboardSession(
            token_hash=hashlib.sha256(token.encode()).hexdigest(),
            user_id=user.id,
            expires_at=expires_at,
        ))
        return token, expires_at


def authenticated_user(token: str) -> dict[str, str] | None:
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    with SessionLocal.begin() as db:
        session = db.get(DashboardSession, token_hash)
        if session is None:
            return None
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at <= _now():
            db.delete(session)
            return None
        user = db.get(DashboardUser, session.user_id)
        if user is None or user.disabled:
            return None
        return {"id": user.id, "email": user.email}


def logout(token: str) -> None:
    with SessionLocal.begin() as db:
        session = db.get(DashboardSession, hashlib.sha256(token.encode()).hexdigest())
        if session:
            db.delete(session)


def metrics() -> dict[str, Any]:
    with SessionLocal() as db:
        total = db.scalar(select(func.count()).select_from(Conversation)) or 0
        qualified = db.scalar(select(func.count()).select_from(Conversation).where(Conversation.qualified)) or 0
        booked = db.scalar(select(func.count()).select_from(Conversation).where(Conversation.status == "booked")) or 0
        stages = {
            stage: db.scalar(select(func.count()).select_from(Conversation).where(Conversation.lead_stage == stage)) or 0
            for stage in STAGE_SCORES
        }
        return {
            "total_conversations": total,
            "qualified_leads": qualified,
            "booked_consultations": booked,
            "qualification_rate": round((qualified / total * 100) if total else 0, 1),
            "booking_rate": round((booked / total * 100) if total else 0, 1),
            "stages": stages,
        }


def _conversation_dict(item: Conversation) -> dict[str, Any]:
    return {
        "id": item.id,
        "channel": item.channel,
        "status": item.status,
        "lead_stage": item.lead_stage,
        "progress_score": item.progress_score,
        "qualified": item.qualified,
        "offer_interest": item.offer_interest,
        "company_type": item.company_type,
        "need_summary": item.need_summary,
        "inquiry_volume": item.inquiry_volume,
        "qualification_reason": item.qualification_reason,
        "contact_name": item.contact_name,
        "contact_email": item.contact_email,
        "contact_phone": item.contact_phone,
        "visitor_timezone": item.visitor_timezone,
        "appointment_start": item.appointment_start,
        "booking_uid": item.booking_uid,
        "meeting_url": item.meeting_url,
        "message_count": item.message_count,
        "user_turns": item.user_turns,
        "started_at": item.started_at.isoformat(),
        "last_activity_at": item.last_activity_at.isoformat(),
        "ended_at": item.ended_at.isoformat() if item.ended_at else None,
        "termination_reason": item.termination_reason,
    }


def list_conversations(*, limit: int = 100, stage: str = "", search: str = "") -> list[dict[str, Any]]:
    with SessionLocal() as db:
        query = select(Conversation)
        if stage:
            query = query.where(Conversation.lead_stage == stage)
        if search:
            pattern = f"%{search[:100]}%"
            query = query.where(or_(
                Conversation.contact_name.ilike(pattern),
                Conversation.contact_email.ilike(pattern),
                Conversation.company_type.ilike(pattern),
                Conversation.need_summary.ilike(pattern),
            ))
        items = db.scalars(query.order_by(Conversation.started_at.desc()).limit(min(limit, 200))).all()
        return [_conversation_dict(item) for item in items]


def get_conversation(conversation_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        item = db.get(Conversation, conversation_id)
        if item is None:
            return None
        result = _conversation_dict(item)
        messages = db.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.conversation_id == conversation_id)
            .order_by(ConversationMessage.id)
        ).all()
        result["messages"] = [{
            "id": message.id,
            "role": message.role,
            "text": message.text,
            "message_id": message.message_id,
            "delivery_state": message.delivery_state,
            "interrupted": message.interrupted,
            "created_at": message.created_at.isoformat(),
        } for message in messages]
        return result
