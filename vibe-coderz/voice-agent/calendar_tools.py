"""Server-side Cal.com tools exposed to the Gemini sales conversation."""

from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams
from loguru import logger


@dataclass(frozen=True)
class CalConfig:
    api_key: str
    username: str = ""
    event_type_slug: str = ""
    event_type_id: int | None = None

    @classmethod
    def from_env(cls) -> "CalConfig | None":
        api_key = os.getenv("CAL_API_KEY", "").strip()
        username = os.getenv("CAL_USERNAME", "").strip()
        slug = os.getenv("CAL_EVENT_TYPE_SLUG", "").strip()
        raw_id = os.getenv("CAL_EVENT_TYPE_ID", "").strip()
        event_id = int(raw_id) if raw_id.isdigit() else None
        if not api_key or not (event_id or (username and slug)):
            return None
        return cls(api_key=api_key, username=username, event_type_slug=slug, event_type_id=event_id)

    def event_params(self) -> dict[str, str | int]:
        if self.event_type_id:
            return {"eventTypeId": self.event_type_id}
        return {"username": self.username, "eventTypeSlug": self.event_type_slug}


def _valid_date_range(start: str, end: str, time_zone: str = "UTC") -> bool:
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        return False
    return datetime.now(ZoneInfo(time_zone)).date() <= start_date <= end_date and (end_date - start_date).days <= 14


def _future_iso_timestamp(value: str) -> bool:
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None and parsed.astimezone(UTC) > datetime.now(UTC)


def _valid_timezone(value: str) -> bool:
    """Accept real IANA identifiers rather than model-invented timezone labels."""
    if not value or len(value) > 100:
        return False
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError):
        return False
    return True


def _utc_window(start: str, end: str, time_zone: str) -> dict[str, str]:
    """Cal's bounds are UTC; dates supplied by the visitor are local and inclusive."""
    zone = ZoneInfo(time_zone)
    first = datetime.combine(date.fromisoformat(start), time.min, zone)
    last = datetime.combine(date.fromisoformat(end) + timedelta(days=1), time.min, zone)
    return {"start": first.astimezone(UTC).isoformat(),
            "end": (last.astimezone(UTC) - timedelta(seconds=1)).isoformat()}


def _slot_starts(payload: dict[str, Any]) -> list[str]:
    # The documented default is string[]; range responses contain objects.
    if payload.get("status") != "success" or not isinstance(payload.get("data"), dict):
        raise ValueError("Invalid calendar response")
    starts = set()
    for slots in payload["data"].values():
        if not isinstance(slots, list):
            raise ValueError("Invalid calendar slots")
        for slot in slots:
            start = slot if isinstance(slot, str) else slot.get("start") if isinstance(slot, dict) else None
            if not isinstance(start, str):
                raise ValueError("Invalid calendar slot")
            instant = datetime.fromisoformat(start.replace("Z", "+00:00"))
            if instant.tzinfo is None:
                raise ValueError("Calendar slot is missing timezone")
            if instant > datetime.now(UTC):
                starts.add(instant.astimezone(UTC).isoformat())
    return sorted(starts)


async def _available_slots(config: CalConfig, start: str, end: str, time_zone: str) -> list[str]:
    window = _utc_window(start, end, time_zone)
    # Include one-hour appointments finishing after the final day's midnight.
    window["end"] = (datetime.fromisoformat(window["end"]) + timedelta(hours=1)).isoformat()
    payload = await _cal_request(config, "GET", "/v2/slots", api_version="2024-09-04",
                                 params={**config.event_params(), **window,
                                         "timeZone": time_zone, "format": "range"})
    return [slot for slot in _slot_starts(payload)
            if start <= datetime.fromisoformat(slot).astimezone(ZoneInfo(time_zone)).date().isoformat() <= end]


def _local_slot(value: str, time_zone: str) -> str:
    instant = datetime.fromisoformat(value.replace("Z", "+00:00"))
    local = instant.astimezone(ZoneInfo(time_zone))
    return local.strftime("%A, %B %-d at %-I:%M %p")


async def _cal_request(
    config: CalConfig,
    method: str,
    path: str,
    *,
    api_version: str,
    params: dict[str, Any] | None = None,
    json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    headers = {
        "Authorization": f"Bearer {config.api_key}",
        "cal-api-version": api_version,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(base_url="https://api.cal.com", timeout=12) as client:
        response = await client.request(method, path, headers=headers, params=params, json=json)
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {"status": "error"}


def calendar_tools_from_env(conversation_id: str | None = None) -> ToolsSchema | None:
    if conversation_id:
        from niche_demos import profile_for
        if profile_for(conversation_id):
            return None
    config = CalConfig.from_env()
    if not config:
        return None
    offered: set[str] = set()

    async def check_availability(call: FunctionCallParams):
        args = dict(call.arguments)
        start = str(args.get("start_date", ""))
        end = str(args.get("end_date", ""))
        time_zone = str(args.get("time_zone", ""))
        preferred_time = str(args.get("preferred_time", "")).strip()
        if preferred_time and not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", preferred_time):
            await call.result_callback({"status": "error", "message": "Use preferred_time in visitor-local 24-hour HH:MM format, for example 21:00 for 9 PM."})
            return
        if not _valid_timezone(time_zone):
            await call.result_callback({"status": "error", "message": "A valid visitor IANA timezone is required."})
            return
        today = datetime.now(ZoneInfo(time_zone)).date()
        earliest = not start and not end
        if earliest:
            start, end = today.isoformat(), (today + timedelta(days=14)).isoformat()
        if not _valid_date_range(start, end, time_zone):
            await call.result_callback({
                "status": "error",
                "message": "Use a future date range of no more than 14 days and a valid IANA timezone.",
            })
            return
        try:
            def matches_preference(slots: list[str]) -> list[str]:
                return [slot for slot in slots if not preferred_time or
                        datetime.fromisoformat(slot).astimezone(ZoneInfo(time_zone)).strftime("%H:%M") == preferred_time]

            suitable_slots = matches_preference(await _available_slots(config, start, end, time_zone))
            # "First available" needs no invented dates or repeated questions.
            while earliest and not suitable_slots and (date.fromisoformat(end) - today).days < 89:
                start = (date.fromisoformat(end) + timedelta(days=1)).isoformat()
                end = min(date.fromisoformat(start) + timedelta(days=14), today + timedelta(days=89)).isoformat()
                suitable_slots = matches_preference(await _available_slots(config, start, end, time_zone))
            total_available = len(suitable_slots)
            # A single day's results are complete. A multi-day shortlist is never
            # evidence that a different requested time is unavailable.
            if start != end:
                suitable_slots = suitable_slots[:8]
            offered.update(suitable_slots)
            if suitable_slots and conversation_id:
                from dashboard_store import record_calendar_progress
                await asyncio.to_thread(record_calendar_progress, conversation_id, "consultation_offered")
            await call.result_callback({
                "status": "success",
                "time_zone": time_zone,
                "checked_start_date": start,
                "checked_end_date": end,
                "duration_minutes": 30,
                "preferred_time": preferred_time or None,
                "total_available_slots": total_available,
                "results_limited": len(suitable_slots) < total_available,
                "requested_time_status": ("available" if total_available else "unavailable") if preferred_time else "not_checked",
                "slots": [
                    {"start": slot, "visitor_local_time": _local_slot(slot, time_zone)}
                    for slot in suitable_slots
                ],
                "message": (
                    "Cal.com returned no available slots in the checked range."
                    if not suitable_slots else (
                        "These are suggested openings, not the full schedule. If the visitor requests a different time, call this tool again with preferred_time before claiming it is unavailable."
                        if len(suitable_slots) < total_available else None
                    )
                ),
            })
        except (httpx.HTTPError, ValueError) as exc:
            logger.bind(diagnostic=True, event="calendar_availability_error",
                        error_type=type(exc).__name__).warning("Calendar availability failed")
            await call.result_callback({
                "status": "error",
                "message": "The calendar could not be checked right now. This is an error, not an empty calendar. Do not claim there are no openings.",
            })

    async def create_booking(call: FunctionCallParams):
        args = dict(call.arguments)
        start = str(args.get("start", ""))
        name = str(args.get("name", "")).strip()
        email = str(args.get("email", "")).strip()
        time_zone = str(args.get("time_zone", "")).strip()
        confirmed = args.get("confirmed") is True
        if (
            not confirmed
            or not _future_iso_timestamp(start)
            or not name
            or len(name) > 150
            or "@" not in email
            or len(email) > 254
            or not _valid_timezone(time_zone)
        ):
            await call.result_callback({
                "status": "error",
                "message": (
                    "Booking requires a future offered slot, "
                    "name, email, valid IANA timezone, and explicit confirmation."
                ),
            })
            return
        start = datetime.fromisoformat(start.replace("Z", "+00:00")).astimezone(UTC).isoformat()
        if start not in offered:
            await call.result_callback({"status": "error", "message": "Check availability and select a returned slot before booking."})
            return

        attendee: dict[str, str] = {
            "name": name,
            "email": email,
            "timeZone": time_zone,
            "language": "en",
        }
        phone = str(args.get("phone_number", "")).strip()
        if phone:
            attendee["phoneNumber"] = phone[:40]

        if conversation_id:
            from dashboard_store import record_calendar_progress
            await asyncio.to_thread(record_calendar_progress, conversation_id, "booking_started")

        try:
            local_date = datetime.fromisoformat(start).astimezone(ZoneInfo(time_zone)).date().isoformat()
            if start not in await _available_slots(config, local_date, local_date, time_zone):
                await call.result_callback({"status": "unavailable", "message": "That slot is no longer available. Check again and offer another slot."})
                return
            payload = await _cal_request(
                config,
                "POST",
                "/v2/bookings",
                api_version="2026-02-25",
                json={
                    "start": start.replace("+00:00", "Z"),
                    "attendee": attendee,
                    **config.event_params(),
                    "metadata": {"source": "vibecoderzz-website-voice-agent"},
                },
            )
            booking = payload.get("data", {})
            if payload.get("status") != "success" or not isinstance(booking, dict) or not booking.get("uid"):
                raise ValueError("Missing booking identifier")
            result = {
                "status": "success",
                "booking_uid": booking["uid"],
                "start": booking.get("start", start),
                "end": booking.get("end"),
                "time_zone": time_zone,
                "visitor_local_time": _local_slot(booking.get("start", start), time_zone),
                "meeting_url": booking.get("meetingUrl") or booking.get("location"),
            }
            if conversation_id:
                from dashboard_store import record_booking
                await asyncio.to_thread(record_booking, conversation_id, {
                    **args,
                    "booking_uid": result["booking_uid"],
                    "start": result["start"],
                    "meeting_url": result["meeting_url"],
                })
            await call.result_callback(result)
        except (httpx.HTTPError, ValueError):
            await call.result_callback({
                "status": "error",
                "message": "The calendar could not confirm the booking. Do not claim success or retry blindly; a calendar invitation may still arrive if the request timed out after creation.",
            })

    availability_schema = FunctionSchema(
        name="check_appointment_availability",
        description="Check real 30-minute consultation slots, including nights and weekends. Always use preferred_time to check a visitor's requested time before accepting or rejecting it. Omit both dates to find the earliest opening within 90 days. Multi-day results may be a shortlist, not all openings.",
        properties={
            "start_date": {"type": "string", "description": "First date to check, YYYY-MM-DD."},
            "end_date": {"type": "string", "description": "Last date to check, YYYY-MM-DD; no more than 14 days after start."},
            "time_zone": {"type": "string", "description": "Visitor's verified IANA timezone, such as America/Chicago or Europe/London."},
            "preferred_time": {"type": "string", "description": "Exact visitor-local time to check, in 24-hour HH:MM format (9 PM = 21:00, 4 PM = 16:00, 2 PM = 14:00). Include this whenever the visitor requests a particular time; use the date already being discussed, or ask the date if unclear."},
        },
        required=["time_zone"],
        handler=check_availability,
    )
    booking_schema = FunctionSchema(
        name="create_appointment",
        description="Create a Cal.com booking only after the visitor explicitly confirms an offered slot and their details.",
        properties={
            "start": {"type": "string", "description": "The exact selected slot as an ISO 8601 timestamp returned by the availability tool."},
            "name": {"type": "string", "description": "Visitor's full name."},
            "email": {"type": "string", "description": "Visitor's email for the calendar invitation and appointment follow-up."},
            "time_zone": {"type": "string", "description": "Visitor's IANA timezone."},
            "phone_number": {"type": "string", "description": "Optional phone number, including country code, only if voluntarily provided."},
            "confirmed": {"type": "boolean", "description": "True only after the visitor explicitly confirms the exact slot and details."},
        },
        required=["start", "name", "email", "time_zone", "confirmed"],
        handler=create_booking,
    )
    return ToolsSchema(standard_tools=[availability_schema, booking_schema])
