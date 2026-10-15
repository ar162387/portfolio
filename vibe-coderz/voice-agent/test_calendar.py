"""Calendar regressions: real timezone bounds, overnight availability, and conflicts."""
import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import httpx
import pytest
import calendar_tools as cal


def test_local_dates_become_utc_bounds_across_dst():
    assert cal._utc_window('2026-11-01', '2026-11-01', 'America/Chicago') == {
        'start': '2026-11-01T05:00:00+00:00', 'end': '2026-11-02T05:59:59+00:00'}
    assert cal._utc_window('2026-10-10', '2026-10-10', 'Asia/Karachi')['start'] == '2026-10-09T19:00:00+00:00'


def test_parser_accepts_both_api_formats_and_preserves_night_slots():
    future = datetime.now(UTC) + timedelta(days=2)
    start = future.replace(hour=1, minute=0, second=0, microsecond=0).isoformat()
    later = (datetime.fromisoformat(start) + timedelta(hours=1)).isoformat()
    assert cal._slot_starts({'status':'success','data':{'day':[later, {'start':start}, start]}}) == [start, later]
    with pytest.raises(ValueError):
        cal._slot_starts({'status':'error','data':{}})
    with pytest.raises(ValueError):
        cal._slot_starts({'status':'success','data':{'day':[{}]}})


@pytest.fixture
def handlers(monkeypatch):
    monkeypatch.setenv('CAL_API_KEY', 'test')
    monkeypatch.setenv('CAL_EVENT_TYPE_ID', '1')
    return {tool.name:tool.handler for tool in cal.calendar_tools_from_env().standard_tools}


def invoke(handler, args):
    callback = AsyncMock()
    asyncio.run(handler(SimpleNamespace(arguments=args,result_callback=callback)))
    return callback.call_args.args[0]


def test_first_available_searches_forward_and_returns_utc_slot(monkeypatch, handlers):
    start = (datetime.now(UTC) + timedelta(days=17)).replace(hour=1).isoformat()
    api = AsyncMock(side_effect=[{'status':'success','data':{}}, {'status':'success','data':{'day':[start]}}])
    monkeypatch.setattr(cal, '_cal_request', api)
    result = invoke(handlers['check_appointment_availability'], {'time_zone':'America/Chicago'})
    assert result['slots'][0]['start'] == start
    assert result['duration_minutes'] == 30
    assert api.await_count == 2
    assert api.call_args.kwargs['params']['format'] == 'range'


def test_calendar_failure_is_error_not_empty_success(monkeypatch, handlers):
    monkeypatch.setattr(cal, '_cal_request', AsyncMock(side_effect=httpx.ConnectError('down')))
    result = invoke(handlers['check_appointment_availability'], {'time_zone':'Asia/Karachi'})
    assert result['status'] == 'error'
    assert 'not an empty calendar' in result['message']


def test_booking_rechecks_slot_and_does_not_override_conflict(monkeypatch, handlers):
    start = (datetime.now(UTC) + timedelta(days=2)).replace(hour=1, minute=0, second=0,microsecond=0).isoformat()
    api = AsyncMock(side_effect=[{'status':'success','data':{'day':[start]}}, {'status':'success','data':{}}])
    monkeypatch.setattr(cal, '_cal_request', api)
    invoke(handlers['check_appointment_availability'], {'time_zone':'Asia/Karachi'})
    args = {'start':start,'name':'Visitor','email':'visitor@example.com','time_zone':'Asia/Karachi','confirmed':True}
    result = invoke(handlers['create_appointment'], args)
    assert result['status'] == 'unavailable'
    assert all(call.args[1] == 'GET' for call in api.call_args_list)


def test_unoffered_slot_cannot_be_booked(monkeypatch, handlers):
    api = AsyncMock()
    monkeypatch.setattr(cal, '_cal_request', api)
    result = invoke(handlers['create_appointment'], {'start':(datetime.now(UTC)+timedelta(days=1)).isoformat(),
        'name':'Visitor','email':'visitor@example.com','time_zone':'Asia/Karachi','confirmed':True})
    assert result['status'] == 'error'
    api.assert_not_called()


def test_successful_booking_uses_utc_and_attendee_timezone(monkeypatch, handlers):
    start = (datetime.now(UTC)+timedelta(days=2)).replace(hour=20, minute=0, second=0, microsecond=0).isoformat()
    api = AsyncMock(side_effect=[{'status':'success','data':{'day':[start]}},
        {'status':'success','data':{'day':[start]}},
        {'status':'success','data':{'uid':'booking-test','start':start,'end':(datetime.fromisoformat(start)+timedelta(minutes=30)).isoformat()}}])
    monkeypatch.setattr(cal, '_cal_request', api)
    invoke(handlers['check_appointment_availability'], {'time_zone':'America/Chicago'})
    result = invoke(handlers['create_appointment'], {'start':start,'name':'Visitor','email':'visitor@example.com',
        'time_zone':'America/Chicago','confirmed':True})
    assert result['booking_uid'] == 'booking-test'
    body = api.call_args.kwargs['json']
    assert body['start'] == start.replace('+00:00', 'Z')
    assert body['attendee']['timeZone'] == 'America/Chicago'
    assert 'allowConflicts' not in body


def test_midnight_crossing_slot_is_kept_but_next_day_starts_are_excluded(monkeypatch):
    day=(datetime.now(UTC)+timedelta(days=5)).date().isoformat()
    start=f'{day}T23:30:00+05:00'
    next_day=(datetime.fromisoformat(day)+timedelta(days=1)).date().isoformat()
    api=AsyncMock(return_value={'status':'success','data':{'day':[{'start':start}, {'start':f'{next_day}T00:00:00+05:00'}]}})
    monkeypatch.setattr(cal,'_cal_request',api)
    slots=asyncio.run(cal._available_slots(cal.CalConfig('test',event_type_id=1),day,day,'Asia/Karachi'))
    assert slots==[datetime.fromisoformat(start).astimezone(UTC).isoformat()]
    # Preserve production's one-hour query overrun for midnight-crossing slots.
    # Returned starts on the next local day must still be excluded.
    assert api.call_args.kwargs['params']['end']==f'{day}T19:59:59+00:00'


@pytest.mark.parametrize('requested', ['14:00', '16:00', '21:00'])
def test_specific_time_is_checked_before_shortlist_limit(monkeypatch, handlers, requested):
    day=(datetime.now(UTC)+timedelta(days=2)).date().isoformat()
    slots=[f'{day}T{hour:02d}:00:00+05:00' for hour in range(24)]
    api=AsyncMock(return_value={'status':'success','data':{'day':slots}})
    monkeypatch.setattr(cal,'_cal_request',api)
    result=invoke(handlers['check_appointment_availability'], {'start_date':day,'end_date':day,'time_zone':'Asia/Karachi','preferred_time':requested})
    assert result['requested_time_status']=='available'
    assert len(result['slots'])==1
    expected=datetime.fromisoformat(f'{day}T{requested}:00+05:00').astimezone(UTC).isoformat()
    assert result['slots'][0]['start']==expected
    assert result['results_limited'] is False


def test_day_search_returns_late_slots_and_multi_day_marks_shortlist(monkeypatch, handlers):
    day=(datetime.now(UTC)+timedelta(days=2)).date().isoformat()
    slots=[f'{day}T{hour:02d}:00:00+05:00' for hour in range(24)]
    monkeypatch.setattr(cal,'_cal_request',AsyncMock(return_value={'status':'success','data':{'day':slots}}))
    args={'start_date':day,'end_date':day,'time_zone':'Asia/Karachi'}
    result=invoke(handlers['check_appointment_availability'],args)
    assert len(result['slots'])==24
    assert result['results_limited'] is False
    args['end_date']=(datetime.fromisoformat(day)+timedelta(days=1)).date().isoformat()
    result=invoke(handlers['check_appointment_availability'],args)
    assert len(result['slots'])==8
    assert result['total_available_slots']==24
    assert result['results_limited'] is True
    assert result['requested_time_status']=='not_checked'


def test_exact_time_unavailable_does_not_substitute_morning_slots(monkeypatch, handlers):
    day=(datetime.now(UTC)+timedelta(days=2)).date().isoformat()
    monkeypatch.setattr(cal,'_cal_request',AsyncMock(return_value={'status':'success','data':{'day':[f'{day}T09:00:00+05:00']}}))
    result=invoke(handlers['check_appointment_availability'],{'start_date':day,'end_date':day,'time_zone':'Asia/Karachi','preferred_time':'21:00'})
    assert result['requested_time_status']=='unavailable'
    assert result['slots']==[]


def test_customer_can_select_9pm_after_initial_morning_suggestions(monkeypatch, handlers):
    day=(datetime.now(UTC)+timedelta(days=2)).date().isoformat()
    slots=[f'{day}T{hour:02d}:00:00+05:00' for hour in range(7,24)]
    chosen=datetime.fromisoformat(f'{day}T21:00:00+05:00').astimezone(UTC).isoformat()
    api=AsyncMock(side_effect=[{'status':'success','data':{'day':slots}},
        {'status':'success','data':{'day':slots}},
        {'status':'success','data':{'day':slots}},
        {'status':'success','data':{'uid':'evening-booking','start':chosen}}])
    monkeypatch.setattr(cal,'_cal_request',api)
    first=invoke(handlers['check_appointment_availability'],{'start_date':day,'end_date':(datetime.fromisoformat(day)+timedelta(days=1)).date().isoformat(),'time_zone':'Asia/Karachi'})
    assert chosen not in [s['start'] for s in first['slots']]
    requested=invoke(handlers['check_appointment_availability'],{'start_date':day,'end_date':day,'time_zone':'Asia/Karachi','preferred_time':'21:00'})
    result=invoke(handlers['create_appointment'],{'start':requested['slots'][0]['start'],'name':'Visitor','email':'visitor@example.com','time_zone':'Asia/Karachi','confirmed':True})
    assert result['booking_uid']=='evening-booking'
    assert api.call_args.kwargs['json']['start']==chosen.replace('+00:00','Z')
