"""Server-side Cal.com tools exposed to the Gemini sales conversation."""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.services.llm_service import FunctionCallParams


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


def _valid_date_range(start: str, end: str) -> bool:
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        return False
    return date.today() <= start_date <= end_date and (end_date - start_date).days <= 14


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


def _booking_hours() -> tuple[int, int]:
    """Return the visitor-local window in which consultation slots may be offered."""
    try:
        start = int(os.getenv("VISITOR_BOOKING_START_HOUR", "9"))
        end = int(os.getenv("VISITOR_BOOKING_END_HOUR", "20"))
    except ValueError:
        return 9, 20
    if not 0 <= start < end <= 24:
        return 9, 20
    return start, end


def _slot_in_booking_hours(value: str, time_zone: str) -> bool:
    try:
        instant = datetime.fromisoformat(value.replace("Z", "+00:00"))
        local = instant.astimezone(ZoneInfo(time_zone))
    except (ValueError, ZoneInfoNotFoundError):
        return False
    start_hour, end_hour = _booking_hours()
    return start_hour <= local.hour < end_hour


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
    config = CalConfig.from_env()
    if not config:
        return None

    async def check_availability(call: FunctionCallParams):
        args = dict(call.arguments)
        start = str(args.get("start_date", ""))
        end = str(args.get("end_date", ""))
        time_zone = str(args.get("time_zone", ""))
        if not _valid_date_range(start, end) or not _valid_timezone(time_zone):
            await call.result_callback({
                "status": "error",
                "message": "Use a future date range of no more than 14 days and a valid IANA timezone.",
            })
            return
        try:
            payload = await _cal_request(
                config,
                "GET",
                "/v2/slots",
                api_version="2024-09-04",
                params={**config.event_params(), "start": start, "end": end, "timeZone": time_zone},
            )
            slots: list[str] = []
            data = payload.get("data", {})
            if isinstance(data, dict):
                for day_slots in data.values():
                    if not isinstance(day_slots, list):
                        continue
                    for slot in day_slots:
                        if isinstance(slot, dict) and isinstance(slot.get("start"), str):
                            slots.append(slot["start"])
            suitable_slots = [
                slot for slot in slots if _slot_in_booking_hours(slot, time_zone)
            ][:8]
            if suitable_slots and conversation_id:
                from dashboard_store import record_calendar_progress
                await asyncio.to_thread(record_calendar_progress, conversation_id, "consultation_offered")
            start_hour, end_hour = _booking_hours()
            await call.result_callback({
                "status": "success",
                "time_zone": time_zone,
                "allowed_local_hours": f"{start_hour:02d}:00-{end_hour:02d}:00",
                "slots": [
                    {"start": slot, "visitor_local_time": _local_slot(slot, time_zone)}
                    for slot in suitable_slots
                ],
                "message": (
                    "No visitor-friendly daytime or evening slots were available in that range. "
                    "Ask for another date range; do not offer excluded overnight slots."
                    if not suitable_slots else None
                ),
            })
        except (httpx.HTTPError, ValueError):
            await call.result_callback({
                "status": "error",
                "message": "The calendar could not be checked right now. Do not invent availability.",
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
            or not _slot_in_booking_hours(start, time_zone)
        ):
            await call.result_callback({
                "status": "error",
                "message": (
                    "Booking requires a future offered visitor-local daytime/evening slot, "
                    "name, email, valid IANA timezone, and explicit confirmation."
                ),
            })
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
            payload = await _cal_request(
                config,
                "POST",
                "/v2/bookings",
                api_version="2026-02-25",
                json={
                    "start": start,
                    "attendee": attendee,
                    **config.event_params(),
                    "metadata": {"source": "vibecoderzz-website-voice-agent"},
                },
            )
            booking = payload.get("data", {})
            if not isinstance(booking, dict) or not booking.get("uid"):
                raise ValueError("Missing booking identifier")
            result = {
                "status": "success",
                "booking_uid": booking["uid"],
                "start": booking.get("start", start),
                "end": booking.get("end"),
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
                "message": "The booking was not created. Do not tell the visitor it was confirmed.",
            })

    availability_schema = FunctionSchema(
        name="check_appointment_availability",
        description="Check real available consultation slots on the studio calendar.",
        properties={
            "start_date": {"type": "string", "description": "First date to check, YYYY-MM-DD."},
            "end_date": {"type": "string", "description": "Last date to check, YYYY-MM-DD; no more than 14 days after start."},
            "time_zone": {"type": "string", "description": "Visitor's verified IANA timezone, such as America/Chicago or Europe/London."},
        },
        required=["start_date", "end_date", "time_zone"],
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
