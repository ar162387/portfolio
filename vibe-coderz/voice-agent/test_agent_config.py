"""Configuration boundaries, persistence and recovery invariants; no provider calls."""
import asyncio
import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import agent_config as settings
import dashboard_store as store
import server
from bot import system_prompt, _baseline_system_prompt, VOICE_DELIVERY_INSTRUCTION


@pytest.fixture
def database(tmp_path, monkeypatch):
    engine = create_engine(f'sqlite:///{tmp_path}/settings.db', connect_args={'check_same_thread': False})
    monkeypatch.setattr(store, 'engine', engine)
    monkeypatch.setattr(store, 'SessionLocal', sessionmaker(engine, expire_on_commit=False))
    monkeypatch.setenv('GEMINI_LIVE_MODEL', 'gemini-3.8-live')
    monkeypatch.setenv('GEMINI_VOICE', 'Sulafat')
    store.initialize()
    settings.initialize_settings()
    yield
    engine.dispose()


def test_baseline_script_preserved_except_clock(database):
    import re
    normalise = lambda text: re.sub(r'Current UTC date and time: .*?\. Resolve', 'CLOCK. Resolve', text)
    config = settings.AgentConfig()
    assert normalise(system_prompt({}, booking_enabled=True, agent_config=config)) == normalise(_baseline_system_prompt({}, booking_enabled=True))


def test_draft_publish_recovery_and_restart(database):
    baseline = settings.for_conversation('existing')
    config = baseline.model_copy(update={'voice': 'Kore', 'opener': 'Hello from {{company_name}}.'})
    settings.change(config, 1, False, 'admin')
    assert settings.for_conversation('before-publish').voice == baseline.voice
    settings.change(config, 2, True, 'admin')
    settings.initialize_settings()  # restarting must not reset saved configuration
    assert settings.for_conversation('existing') == baseline
    assert settings.for_conversation('before-publish') == baseline
    assert settings.for_conversation('new').voice == 'Kore'
    assert len(settings.state()['revisions']) == 2
    settings.change(baseline, 3, True, 'admin')
    assert settings.for_conversation('after-rollback') == baseline
    assert settings.for_conversation('new').voice == 'Kore'


def test_concurrent_edit_rejected_without_lost_update(database):
    config = settings.AgentConfig(voice='Puck')
    settings.change(config, 1, False, 'admin')
    with pytest.raises(settings.ConfigConflict):
        settings.change(settings.AgentConfig(), 1, True, 'other')
    assert settings.state()['draft']['voice'] == 'Puck'
    assert settings.state()['published']['voice'] == 'Sulafat'


@pytest.mark.parametrize('payload', [
    {'voice': 'not-a-voice'}, {'model': 'not-a-model'}, {'accent': 'custom'},
    {'opener': '{{secret}}'}, {'api_key': 'secret'}, {'opener': ' '},
    {'schema_version': 2}, {'business_facts': 'x' * 5001},
])
def test_invalid_templates_rejected(payload):
    with pytest.raises(ValidationError):
        settings.AgentConfig(**payload)


def test_customisation_keeps_booking_closing_and_recovery_rules():
    config = settings.AgentConfig(company_name='Example Studio', pronunciation='Example',
        opener='Hello from {{company_name}}.', accent='australian', conversation_flow='Ask about their business.',
        business_facts='Based in Cardiff.')
    prompt = system_prompt({}, booking_enabled=True, agent_config=config)
    assert 'Hello from Example Studio.' in prompt
    assert 'natural Australian English' in prompt
    assert 'Cardiff Welsh English' not in prompt
    assert 'Ask about their business.' in prompt
    assert 'Ask for explicit confirmation.' in prompt
    assert 'booking_uid' in prompt
    assert 'close the conversation without restarting the pitch' in prompt
    assert 'Never repeat or restart it' in prompt
    resumed = system_prompt({}, booking_enabled=True, opening_required=False, agent_config=config)
    assert 'Hello from Example Studio.' not in resumed
    assert 'The opening is suppressed' in resumed


def test_admin_endpoints_require_both_credentials(database, monkeypatch):
    monkeypatch.setenv('VOICE_AGENT_TOKEN', 'service-key')
    with TestClient(server.app) as client:
        assert client.get('/dashboard/agent').status_code == 401
        assert client.get('/dashboard/agent', headers={'Authorization': 'Bearer service-key'}).status_code == 401
        assert client.post('/dashboard/agent-audition', headers={'Authorization': 'Bearer service-key'}, json={'config': {}}).status_code == 401


def test_admin_save_validation_preview_and_audition(database, monkeypatch):
    monkeypatch.setenv('VOICE_AGENT_TOKEN', 'service-key')
    monkeypatch.setenv('GOOGLE_API_KEY', 'fake-provider-key')
    monkeypatch.setattr(server, 'authenticated_user', lambda token: {'email': 'admin@example.com'} if token == 'session' else None)
    audition = AsyncMock(return_value={'audio': 'mock', 'mime_type': 'audio/wav', 'transcript': 'Hello'})
    monkeypatch.setattr(server, 'generate_agent_audition', audition)
    headers = {'Authorization': 'Bearer service-key', 'X-Dashboard-Session': 'session'}
    with TestClient(server.app) as client:
        response = client.get('/dashboard/agent', headers=headers)
        assert response.status_code == 200
        state = response.json()
        assert state['tools'][0]['name'] == 'record_lead_qualification'
        config = {**state['draft'], 'voice': 'Kore'}
        payload = {'config': config, 'version': state['version'], 'publish': True}
        assert client.post('/dashboard/agent', headers=headers, json=payload).status_code == 200
        assert client.post('/dashboard/agent', headers=headers, json=payload).status_code == 409
        assert client.post('/dashboard/agent-prompt', headers=headers, json={'config': config}).status_code == 200
        assert client.post('/dashboard/agent-audition', headers=headers, json={'config': config}).status_code == 200
        assert audition.call_args.args[0].voice == 'Kore'
        assert client.post('/dashboard/agent', headers=headers, json={**payload, 'config': {**config, 'voice': 'invalid'}}).status_code == 422
