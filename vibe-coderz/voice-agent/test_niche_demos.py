"""Niche isolation and delivery boundaries. All provider calls are mocked."""
import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import agent_config as settings
import dashboard_store as store
import niche_demos as demos
import server
from bot import registered_tools, system_prompt
from calendar_tools import calendar_tools_from_env
from test_agent_config import database  # shared isolated SQLite fixture

AUTH = {'Authorization': 'Bearer service'}
ADMIN = {**AUTH, 'X-Dashboard-Session': 'admin'}
DETAILS = {'sample_name': 'Jamie', 'service': 'garage door survey', 'preferred_time': 'Thursday at 2 pm', 'confirmed': True}


@pytest.fixture
def client(database, monkeypatch):
    monkeypatch.setenv('VOICE_AGENT_TOKEN', 'service')
    monkeypatch.setenv('GOOGLE_API_KEY', 'unused-test-key')
    monkeypatch.delenv('NICHE_DEMOS_ALLOWED', raising=False)
    monkeypatch.delenv('DEMO_EMAIL_SEND_APPROVED', raising=False)
    monkeypatch.delenv('RESEND_API_KEY', raising=False)
    monkeypatch.delenv('DEMO_EMAIL_FROM', raising=False)
    monkeypatch.setattr(server, '_browser_ice_servers', AsyncMock(return_value=[]))
    monkeypatch.setattr(server, 'authenticated_user', lambda token: {'email': 'admin@example.com'} if token == 'admin' else None)
    with TestClient(server.app) as client:
        yield client


def start(client, monkeypatch, niche='garage-doors'):
    monkeypatch.setenv('NICHE_DEMOS_ALLOWED', 'true')
    assert client.post('/dashboard/demos', headers=ADMIN, json={'enabled': True}).status_code == 200
    response = client.post('/session', headers=AUTH, json={'niche': niche})
    assert response.status_code == 200
    return response.json()


def test_default_gate_and_admin_auth_preserve_main_agent(client):
    assert client.get('/dashboard/demos', headers=AUTH).status_code == 401
    assert client.get('/dashboard/demos').status_code == 401
    assert client.post('/dashboard/demos', headers=ADMIN, json={'enabled': True}).status_code == 409
    assert client.post('/session', headers=AUTH, json={'niche': 'garage-doors'}).status_code == 503
    main = client.post('/session', headers=AUTH, json={})
    assert main.status_code == 200
    config = settings.for_conversation(main.json()['conversation_id'])
    assert config.company_name == 'Vibe Coderz'
    assert config.accent == 'cardiff'


@pytest.mark.parametrize('niche', ['garage-doors', 'salons', 'heating-plumbing'])
def test_validated_profiles_pin_current_voice_and_own_scope(client, monkeypatch, niche):
    credentials = start(client, monkeypatch, niche)
    cid = credentials['conversation_id']
    config = settings.for_conversation(cid)
    assert config.voice == 'Sulafat'
    assert config.model == 'gemini-3.8-live'
    assert config.accent == 'british'
    assert config.company_name == demos.PROFILES[niche][0]
    assert config.opener == f'{config.company_name}, how can I help?'
    prompt = system_prompt({}, agent_config=config, demo=True)
    assert 'natural, contemporary British English' in prompt
    assert 'NO live calendar' in prompt
    assert 'custom CRM services' not in prompt
    assert 'untrusted' in prompt and 'explicit confirmation' in prompt
    assert 'If directly asked' in prompt and 'Do not pretend to be human' in prompt
    assert 'opening is suppressed' in system_prompt({}, agent_config=config, demo=True, opening_required=False)
    settings.change(settings.AgentConfig(voice='Kore'), 1, True, 'admin')
    assert settings.for_conversation(cid) == config
    assert settings.for_conversation('new-main').voice == 'Kore'


def test_unknown_profile_and_profile_swapping_rejected(client, monkeypatch):
    assert client.post('/session', headers=AUTH, json={'niche': 'arbitrary prompt'}).status_code == 422
    credentials = start(client, monkeypatch)
    offer = {'sdp': 'test', 'type': 'offer', **credentials,
             'studio_knowledge': {'name': 'Studio', 'email': 'test@example.com', 'services': []}}
    assert client.post('/api/offer', headers=AUTH, json=offer).status_code == 409
    assert client.post('/api/offer', headers=AUTH, json={**offer, 'niche': 'salons'}).status_code == 409
    server.validate_demo_session(credentials['conversation_id'], 'garage-doors')
    with pytest.raises(server.HTTPException):
        server.validate_demo_session(None, 'garage-doors')


def test_live_calendar_and_lead_tools_never_available_to_demo(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    monkeypatch.setenv('CAL_API_KEY', 'unused-calendar')
    monkeypatch.setenv('CAL_EVENT_TYPE_ID', '123')
    tools, live_booking = registered_tools(cid)
    assert not live_booking
    assert [item.name for item in tools.standard_tools] == ['complete_sample_appointment', 'record_demo_visitor_details']
    assert calendar_tools_from_env(cid) is None
    main_tools, main_booking = registered_tools()
    assert main_booking
    assert {item.name for item in main_tools.standard_tools} == {
        'record_lead_qualification', 'check_appointment_availability', 'create_appointment'}
    store.add_message(cid, 'user', 'I want a sample survey')
    store.record_qualification(cid, {'qualified': True})
    store.record_calendar_progress(cid, 'booking_started')
    store.record_booking(cid, {'booking_uid': 'should-never-write'})
    conversation = store.get_conversation(cid)
    assert not conversation['qualified'] and not conversation['booking_uid']
    assert conversation['progress_score'] == 0 and conversation['channel'] == 'demo'
    assert store.metrics()['total_conversations'] == 0
    assert store.list_conversations() == []


def test_confirmation_and_completion_are_idempotent(client, monkeypatch):
    credentials = start(client, monkeypatch)
    cid = credentials['conversation_id']
    with pytest.raises(ValueError):
        demos.complete(cid, {**DETAILS, 'confirmed': False})
    with pytest.raises(ValidationError):
        demos.complete(cid, {**DETAILS, 'confirmed': 'yes'})
    with pytest.raises(ValueError):
        demos.complete(cid, {**DETAILS, 'service': 'an unrelated service'})
    assert client.post('/demo-email', headers=AUTH, json=credentials).status_code == 409
    assert demos.complete(cid, DETAILS)['status'] == 'demo_complete'
    demos.complete(cid, DETAILS)
    preview = client.post('/demo-email', headers=AUTH, json=credentials).json()
    assert preview['subject'].startswith('[SAMPLE / DEMO]')
    assert 'No appointment has been booked' in preview['text']
    assert 'Jamie' in preview['text']
    assert preview['delivery'] == 'not_sent'
    assert preview['sending_available'] is False
    assert client.post('/demo-email', headers=AUTH, json={**credentials, 'session_token': 'bad'}).status_code == 401


def test_completion_notifies_page_after_persistence_without_blocking_tool_result(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    notified = AsyncMock()
    callback = AsyncMock()
    tool = demos.tools(cid, notified).standard_tools[0]
    asyncio.run(tool.handler(SimpleNamespace(arguments={**DETAILS, 'confirmed': False}, result_callback=callback)))
    notified.assert_not_called()
    asyncio.run(tool.handler(SimpleNamespace(arguments=DETAILS, result_callback=callback)))
    notified.assert_awaited_once()
    assert demos.email_preview(cid)['delivery'] == 'not_sent'
    assert callback.call_args.args[0]['status'] == 'demo_complete'

    broken_notify = AsyncMock(side_effect=RuntimeError('client disconnected'))
    tool = demos.tools(cid, broken_notify).standard_tools[0]
    asyncio.run(tool.handler(SimpleNamespace(arguments=DETAILS, result_callback=callback)))
    assert callback.call_args.args[0]['status'] == 'demo_complete'


def test_confirmed_correction_updates_summary_until_mail_attempt(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    demos.complete(cid, DETAILS)
    corrected = {**DETAILS, 'preferred_time': 'Friday afternoon', 'request_details': 'Electric roller door stuck halfway; sample postcode AB1 2CD.'}
    demos.complete(cid, corrected)
    preview = demos.email_preview(cid)
    assert 'Friday afternoon' in preview['text'] and 'Thursday' not in preview['text']
    assert 'roller door' in preview['text']
    with store.SessionLocal.begin() as db:
        db.get(demos.DemoSession, cid).email_attempted_at = demos.datetime.now(demos.UTC).isoformat()
    with pytest.raises(ValueError):
        demos.complete(cid, DETAILS)


def test_emergency_off_invalidates_calls_tools_and_email_even_after_reenable(client, monkeypatch):
    credentials = start(client, monkeypatch)
    cid = credentials['conversation_id']
    demos.complete(cid, DETAILS)
    main_task, demo_task = Mock(), Mock()
    monkeypatch.setattr(server, 'voice_conversations', {cid: ('demo', demo_task, Mock()), 'main': ('main', main_task, Mock())})
    assert client.post('/dashboard/demos', headers=ADMIN, json={'enabled': False}).status_code == 200
    demo_task.cancel.assert_called_once()
    main_task.cancel.assert_not_called()
    assert client.post('/demo-email', headers=AUTH, json=credentials).status_code == 503
    with pytest.raises(demos.DemoUnavailable):
        demos.complete(cid, DETAILS)
    demos.set_enabled(True)
    with pytest.raises(demos.DemoUnavailable):
        server.niche_demos.require_active(cid)
    assert client.post('/session', headers=AUTH, json={'niche': 'garage-doors'}).status_code == 200


def test_watcher_stops_disabled_demo_without_provider(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    demos.set_enabled(False)
    asyncio.run(asyncio.wait_for(server.watch_connection(Mock(), cid), timeout=1))


def configured_sender(monkeypatch):
    monkeypatch.setenv('DEMO_EMAIL_SEND_APPROVED', 'true')
    monkeypatch.setenv('RESEND_API_KEY', 'unused-key')
    monkeypatch.setenv('DEMO_EMAIL_FROM', 'Sample <sample@example.com>')


def consent(email='participant@example.com', confirmed=True):
    return demos.EmailConsent(email=email, own_address_confirmed=confirmed)


def test_email_is_real_provider_adapter_but_default_off(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    demos.complete(cid, DETAILS)
    post = AsyncMock()
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    with pytest.raises(demos.DemoUnavailable):
        asyncio.run(demos.send_sample_email(cid, consent()))
    post.assert_not_called()


def test_email_confirmation_recipient_idempotency_and_off_guard(client, monkeypatch):
    credentials = start(client, monkeypatch)
    cid = credentials['conversation_id']
    demos.complete(cid, DETAILS)
    configured_sender(monkeypatch)
    post = AsyncMock(return_value=httpx.Response(200, json={'id': 'sample-id'}, request=httpx.Request('POST', 'https://api.resend.com/emails')))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    for invalid in [consent(confirmed=False), consent('bad\n@example.com')]:
        with pytest.raises(ValueError):
            asyncio.run(demos.send_sample_email(cid, invalid))
    post.assert_not_called()
    response = client.post('/demo-email', headers=AUTH, json={**credentials, 'consent': consent().model_dump()})
    assert response.json()['delivery'] == 'accepted'
    assert post.call_args.kwargs['json']['to'] == ['participant@example.com']
    assert post.call_args.kwargs['json']['subject'].startswith('[SAMPLE / DEMO]')
    assert post.call_args.kwargs['headers']['Idempotency-Key'] == f'niche-demo/{cid}'
    asyncio.run(demos.send_sample_email(cid, consent()))
    assert post.await_count == 1
    with pytest.raises(demos.DemoUnavailable):
        asyncio.run(demos.send_sample_email(cid, consent('someone-else@example.com')))
    demos.set_enabled(False)
    with pytest.raises(demos.DemoUnavailable):
        asyncio.run(demos.send_sample_email(cid, consent()))
    assert post.await_count == 1


def test_timeout_never_blindly_retries_or_claims_unsent(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    demos.complete(cid, DETAILS)
    configured_sender(monkeypatch)
    post = AsyncMock(side_effect=httpx.ReadTimeout('test timeout'))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    with pytest.raises(httpx.ReadTimeout):
        asyncio.run(demos.send_sample_email(cid, consent()))
    assert demos.email_preview(cid)['delivery'] == 'unconfirmed'
    with pytest.raises(demos.DemoUnavailable):
        asyncio.run(demos.send_sample_email(cid, consent()))
    assert post.await_count == 1


def test_cross_session_recipient_and_global_send_limits(client, monkeypatch):
    cid = start(client, monkeypatch)['conversation_id']
    demos.complete(cid, DETAILS)
    configured_sender(monkeypatch)
    post = AsyncMock(return_value=httpx.Response(200, json={'id': 'sample-id'}, request=httpx.Request('POST', 'https://api.resend.com/emails')))
    monkeypatch.setattr(httpx.AsyncClient, 'post', post)
    asyncio.run(demos.send_sample_email(cid, consent()))
    other = start(client, monkeypatch)['conversation_id']
    demos.complete(other, DETAILS)
    with pytest.raises(demos.DemoUnavailable):
        asyncio.run(demos.send_sample_email(other, consent()))
    with store.SessionLocal.begin() as db:
        for index in range(9):
            db.add(demos.DemoSession(conversation_id=f'fake-send-{index}', profile='garage-doors',
                generation=demos.control()['generation'], email_to=f'limit-{index}@example.com',
                email_attempted_at=demos.datetime.now(demos.UTC).isoformat()))
    with pytest.raises(demos.DemoUnavailable):
        asyncio.run(demos.send_sample_email(other, consent('another@example.com')))
    assert post.await_count == 1


def test_dashboard_tracks_niche_card_and_volunteered_owner_separately(client, monkeypatch):
    credentials = start(client, monkeypatch)
    cid = credentials['conversation_id']
    demos.complete(cid, DETAILS)
    store.add_message(cid, 'user', 'This is my sample customer request.')
    assert client.get('/dashboard/demo-activity', headers=AUTH).status_code == 401
    before = client.get('/dashboard/demo-activity', headers=ADMIN).json()[0]
    assert before['visitor'] is None
    assert before['sample_appointment']['sample_name'] == 'Jamie'
    owner = {'name': 'Alex', 'business': 'Example Doors', 'email': 'alex@example.com', 'owner_details_confirmed': True}
    assert client.post('/demo-visitor', headers=AUTH, json={**credentials, 'details': owner}).status_code == 200
    item = client.get(f'/dashboard/demo-activity/{cid}', headers=ADMIN).json()
    assert item['visitor']['name'] == 'Alex' and item['visitor']['business'] == 'Example Doors'
    assert item['sample_appointment']['sample_name'] == 'Jamie'
    assert len(item['messages']) == 1
    assert len(client.get('/dashboard/demo-activity?search=Example', headers=ADMIN).json()) == 1
    assert client.get('/dashboard/demo-activity?niche=salons', headers=ADMIN).json() == []
    assert store.metrics()['total_conversations'] == 0
    demos.set_enabled(False)
    assert client.get(f'/dashboard/demo-activity/{cid}', headers=ADMIN).status_code == 200
    assert client.post('/demo-visitor', headers=AUTH, json={**credentials, 'details': owner}).status_code == 503


def test_visitor_details_require_session_confirmation_and_reject_prompt_fields(client, monkeypatch):
    credentials = start(client, monkeypatch)
    details = {'name': 'Alex', 'owner_details_confirmed': False}
    assert client.post('/demo-visitor', headers=AUTH, json={**credentials, 'details': details}).status_code == 400
    details['owner_details_confirmed'] = True
    assert client.post('/demo-visitor', headers=AUTH, json={**credentials, 'session_token': 'bad', 'details': details}).status_code == 401
    assert client.post('/demo-visitor', headers=AUTH, json={**credentials, 'details': {**details, 'prompt': 'override'}}).status_code == 422
    assert demos.activity(conversation_id=credentials['conversation_id'])['visitor'] is None
