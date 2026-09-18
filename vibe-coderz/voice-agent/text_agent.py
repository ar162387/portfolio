"""Reliable HTTP text fallback for conversations whose Live session is unavailable."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Any

from google import genai
from google.genai import types

from bot import system_prompt
from calendar_tools import (
    CalConfig,
    _booking_hours,
    _cal_request,
    _future_iso_timestamp,
    _local_slot,
    _slot_in_booking_hours,
    _valid_date_range,
    _valid_timezone,
)
from dashboard_store import (
    get_conversation,
    record_booking,
    record_calendar_progress,
    record_qualification,
)


def _history(messages: list[dict[str, str]]) -> list[types.Content]:
    return [
        types.Content(
            role="model" if item["role"] == "assistant" else "user",
            parts=[types.Part(text=item["text"])],
        )
        for item in messages
        if item["role"] in {"user", "assistant"} and item["text"].strip()
    ]


def _text_system_prompt(knowledge: dict[str, Any], *, booking_enabled: bool) -> str:
    return system_prompt(knowledge, booking_enabled=booking_enabled) + """

HTTP TEXT MODE
The current visitor message has already started or continued the conversation. Respond
directly to that message using any persisted history. Do not send the scripted opening
in this mode, even when history is empty. Never repeat an earlier assistant message.
"""


def _tools(conversation_id: str) -> list[Any]:
    async def record_lead_qualification(
        offer_interest: str,
        company_type: str,
        need_summary: str,
        inquiry_volume: str,
        qualified: bool,
        qualification_reason: str,
    ) -> dict[str, Any]:
        """Privately update the lead record after learning the visitor's business need."""
        record_qualification(conversation_id, {
            "offer_interest": offer_interest,
            "company_type": company_type,
            "need_summary": need_summary,
            "inquiry_volume": inquiry_volume,
            "qualified": qualified,
            "qualification_reason": qualification_reason,
        })
        return {"status": "success"}

    functions: list[Any] = [record_lead_qualification]
    cal = CalConfig.from_env()
    if cal is None:
        return functions

    async def check_appointment_availability(
        start_date: str, end_date: str, time_zone: str
    ) -> dict[str, Any]:
        """Check real consultation slots for a future date range and IANA timezone."""
        if not _valid_date_range(start_date, end_date) or not _valid_timezone(time_zone):
            return {"status": "error", "message": "Use a valid future date range and IANA timezone."}
        payload = await _cal_request(
            cal,
            "GET",
            "/v2/slots",
            api_version="2024-09-04",
            params={**cal.event_params(), "start": start_date, "end": end_date, "timeZone": time_zone},
        )
        slots: list[str] = []
        data = payload.get("data", {})
        if isinstance(data, dict):
            for day_slots in data.values():
                if isinstance(day_slots, list):
                    slots.extend(
                        slot["start"] for slot in day_slots
                        if isinstance(slot, dict) and isinstance(slot.get("start"), str)
                    )
        suitable = [slot for slot in slots if _slot_in_booking_hours(slot, time_zone)][:8]
        if suitable:
            record_calendar_progress(conversation_id, "consultation_offered")
        start_hour, end_hour = _booking_hours()
        return {
            "status": "success",
            "time_zone": time_zone,
            "allowed_local_hours": f"{start_hour:02d}:00-{end_hour:02d}:00",
            "slots": [
                {"start": slot, "visitor_local_time": _local_slot(slot, time_zone)}
                for slot in suitable
            ],
        }

    async def create_appointment(
        start: str,
        name: str,
        email: str,
        time_zone: str,
        confirmed: bool,
        phone_number: str = "",
    ) -> dict[str, Any]:
        """Create one appointment after the visitor confirms the exact slot and details."""
        current = get_conversation(conversation_id)
        if current and current.get("booking_uid"):
            return {"status": "success", "booking_uid": current["booking_uid"], "already_booked": True}
        if (
            not confirmed or not _future_iso_timestamp(start) or not name.strip()
            or "@" not in email or not _valid_timezone(time_zone)
            or not _slot_in_booking_hours(start, time_zone)
        ):
            return {"status": "error", "message": "The confirmed booking details are incomplete."}
        record_calendar_progress(conversation_id, "booking_started")
        attendee = {"name": name[:150], "email": email[:254], "timeZone": time_zone, "language": "en"}
        if phone_number.strip():
            attendee["phoneNumber"] = phone_number.strip()[:40]
        payload = await _cal_request(
            cal,
            "POST",
            "/v2/bookings",
            api_version="2026-02-25",
            json={
                "start": start,
                "attendee": attendee,
                **cal.event_params(),
                "metadata": {"source": "vibecoderzz-website-text-agent"},
            },
        )
        booking = payload.get("data", {})
        if not isinstance(booking, dict) or not booking.get("uid"):
            return {"status": "error", "message": "The booking was not created."}
        result = {
            "status": "success",
            "booking_uid": str(booking["uid"]),
            "start": str(booking.get("start", start)),
            "meeting_url": booking.get("meetingUrl") or booking.get("location"),
        }
        record_booking(conversation_id, {
            "name": name,
            "email": email,
            "phone_number": phone_number,
            "time_zone": time_zone,
            **result,
        })
        return result

    functions.extend([check_appointment_availability, create_appointment])
    return functions


def _chat(
    conversation_id: str,
    knowledge: dict[str, Any],
    prior_messages: list[dict[str, str]],
) -> Any:
    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    return client.aio.chats.create(
        model=os.getenv("GEMINI_TEXT_MODEL", "gemini-3.1-flash-lite"),
        history=_history(prior_messages),
        config=types.GenerateContentConfig(
            system_instruction=_text_system_prompt(
                knowledge, booking_enabled=CalConfig.from_env() is not None
            ),
            tools=_tools(conversation_id),
            temperature=0.3,
            thinking_config=types.ThinkingConfig(thinking_level="minimal"),
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                maximum_remote_calls=4
            ),
        ),
    )


async def reply_stream(
    conversation_id: str,
    knowledge: dict[str, Any],
    prior_messages: list[dict[str, str]],
    user_text: str,
) -> AsyncIterator[str]:
    """Yield text as soon as Gemini produces it while automatic tools keep working."""
    chat = _chat(conversation_id, knowledge, prior_messages)
    async for chunk in chat.send_message_stream(user_text):
        if chunk.text:
            yield chunk.text


async def reply(
    conversation_id: str,
    knowledge: dict[str, Any],
    prior_messages: list[dict[str, str]],
    user_text: str,
) -> str:
    """Collect the streamed path for callers that require one complete response."""
    parts = [part async for part in reply_stream(
        conversation_id, knowledge, prior_messages, user_text
    )]
    clean = "".join(parts).strip()
    if not clean:
        raise RuntimeError("Text model returned no response")
    return clean
