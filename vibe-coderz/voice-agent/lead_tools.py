"""Structured lead qualification tool for the sales conversation."""

from __future__ import annotations

import asyncio

from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.services.llm_service import FunctionCallParams


def qualification_tool(conversation_id: str | None) -> FunctionSchema:
    async def record(call: FunctionCallParams):
        details = dict(call.arguments)
        if conversation_id:
            from dashboard_store import record_qualification
            await asyncio.to_thread(record_qualification, conversation_id, details)
        await call.result_callback({"status": "success", "recorded": bool(conversation_id)})

    return FunctionSchema(
        name="record_lead_qualification",
        description=(
            "Privately update the visitor's lead record after learning their business need. "
            "Call again when the qualification becomes clearer."
        ),
        properties={
            "offer_interest": {
                "type": "string",
                "enum": ["voice_agent", "custom_crm", "both", "unclear"],
            },
            "company_type": {"type": "string", "description": "Their business type, or empty if unknown."},
            "need_summary": {"type": "string", "description": "A concise factual summary of the problem and desired outcome."},
            "inquiry_volume": {"type": "string", "description": "Approximate enquiry volume and period, or empty if unknown."},
            "qualified": {"type": "boolean", "description": "True when the need matches an offer and there is credible intent."},
            "qualification_reason": {"type": "string", "description": "A short factual reason for the qualification decision."},
        },
        required=[
            "offer_interest", "company_type", "need_summary", "inquiry_volume",
            "qualified", "qualification_reason",
        ],
        handler=record,
    )
