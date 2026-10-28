"""Versioned, validated receptionist settings; no credentials or executable templates."""
from __future__ import annotations

import json
import os
import re
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import Integer, String, Text, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, mapped_column
import dashboard_store as store

VOICES = 'Sulafat Zephyr Puck Charon Kore Fenrir Leda Orus Aoede Callirrhoe Autonoe Enceladus Iapetus Umbriel Algieba Despina Erinome Algenib Rasalgethi Laomedeia Achernar Alnilam Schedar Gacrux Pulcherrima Achird Zubenelgenubi Vindemiatrix Sadachbia Sadaltager'.split()
ACCENTS = {
    'cardiff': 'natural, mild Cardiff Welsh English',
    'british': 'natural, contemporary British English',
    'american': 'natural General American English',
    'australian': 'natural Australian English',
    'custom': 'Custom direction',
}


def models():
    # Additional models need operator approval and compatibility testing first.
    return list(dict.fromkeys([os.getenv('GEMINI_LIVE_MODEL', 'gemini-3.8-live'),
                              *filter(None, os.getenv('AGENT_ALLOWED_MODELS', '').split(','))]))


class AgentConfig(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    schema_version: Literal[1] = 1
    company_name: str = Field(default='Vibe Coderz', min_length=1, max_length=100)
    pronunciation: str = Field(default='Vibe Coders', min_length=1, max_length=100)
    model: str = Field(default_factory=lambda: models()[0], min_length=1, max_length=150)
    voice: str = Field(default_factory=lambda: os.getenv('GEMINI_VOICE', 'Sulafat'))
    accent: Literal['cardiff', 'british', 'american', 'australian', 'custom'] = 'cardiff'
    custom_accent: str = Field(default='', max_length=500)
    opener: str = Field(default='Hi, thanks for visiting {{company_name}}. How can I help with your\nbusiness today?', min_length=1, max_length=1200)
    # Empty fields inherit the existing script verbatim.
    conversation_flow: str = Field(default='', max_length=5000)
    business_facts: str = Field(default='', max_length=5000)
    delivery_notes: str = Field(default='', max_length=1000)

    @field_validator('voice')
    @classmethod
    def known_voice(cls, value):
        if value not in VOICES:
            raise ValueError('Choose a supported prebuilt voice')
        return value

    @field_validator('model')
    @classmethod
    def known_model(cls, value):
        if value not in models():
            raise ValueError('Model is not enabled by the service operator')
        return value

    @model_validator(mode='after')
    def valid_templates(self):
        for text in (self.opener, self.conversation_flow):
            remaining = text.replace('{{company_name}}', '').replace('{{pronunciation}}', '')
            if '{{' in remaining or '}}' in remaining:
                raise ValueError('Only {{company_name}} and {{pronunciation}} variables are supported')
        if self.accent == 'custom' and not self.custom_accent:
            raise ValueError('Enter a custom accent direction')
        return self

    def render(self, text):
        return re.sub(r'\{\{(company_name|pronunciation)\}\}',
                      lambda m: getattr(self, m.group(1)), text)


class AgentSettings(store.Base):
    __tablename__ = 'agent_settings'
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    draft: Mapped[str] = mapped_column(Text)
    published: Mapped[str] = mapped_column(Text)


class AgentRevision(store.Base):
    __tablename__ = 'agent_revisions'
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    config: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(254))
    created_at: Mapped[str] = mapped_column(String(50))


class ConversationConfig(store.Base):
    __tablename__ = 'conversation_agent_configs'
    conversation_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    config: Mapped[str] = mapped_column(Text)


class ConfigConflict(Exception):
    pass


def initialize_settings():
    # Called after store.initialize so all models share the existing database.
    with store.SessionLocal() as db:
        if db.get(AgentSettings, 1):
            return
        baseline = AgentConfig().model_dump_json()
        db.add(AgentSettings(id=1, version=1, draft=baseline, published=baseline))
        db.add(AgentRevision(config=baseline, author='Initial configuration', created_at=datetime.now(UTC).isoformat()))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # Another process initialized the singleton.


def state():
    with store.SessionLocal() as db:
        row = db.get(AgentSettings, 1)
        revisions = db.scalars(select(AgentRevision).order_by(AgentRevision.id.desc()).limit(30)).all()
        return {'version': row.version, 'draft': json.loads(row.draft), 'published': json.loads(row.published),
                'revisions': [{'id': r.id, 'author': r.author, 'created_at': r.created_at,
                               'config': json.loads(r.config)} for r in revisions]}


def change(config: AgentConfig, version: int, publish: bool, author: str):
    payload = config.model_dump_json()
    with store.SessionLocal() as db:
        values = {'draft': payload, 'version': version + 1}
        if publish:
            values['published'] = payload
        result = db.execute(update(AgentSettings).where(AgentSettings.id == 1, AgentSettings.version == version).values(**values))
        if result.rowcount != 1:
            raise ConfigConflict('Settings changed in another window. Reload before saving.')
        if publish:
            db.add(AgentRevision(config=payload, author=author, created_at=datetime.now(UTC).isoformat()))
        db.commit()
    return state()


def for_conversation(conversation_id: str, *, initial_config: AgentConfig | None = None) -> AgentConfig:
    """Pin on first connection, keeping voice/script stable across recovery/restart."""
    with store.SessionLocal() as db:
        snapshot = db.get(ConversationConfig, conversation_id)
        if snapshot:
            return AgentConfig.model_validate_json(snapshot.config)
        row = db.get(AgentSettings, 1)
        payload = initial_config.model_dump_json() if initial_config else row.published
        db.add(ConversationConfig(conversation_id=conversation_id, config=payload))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            payload = db.get(ConversationConfig, conversation_id).config
        return AgentConfig.model_validate_json(payload)
