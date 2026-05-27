import uuid
import json
import os
from datetime import datetime, timezone
from loguru import logger
from sqlmodel import Session
from sqlalchemy import text

from shared.models import CallRecord, Tenant, Agent
from backend.services.analytics import AnalyticsService
from backend.services.email import send_call_summary_email
from backend.services.airtable import AirtableService

analytics_service = AnalyticsService()

async def process_completed_call(
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    from_number: str,
    to_number: str,
    call_id: str,
    transcript: list | str,
    duration_seconds: int,
    db: Session
) -> dict:
    """
    Standard call processing pipeline:
    1. Inserts a new CallRecord to the database.
    2. Calculates duration and updates tenant's minutes_used atomically.
    3. Triggers AnalyticsService to parse call type, summary, sentiment, action items.
    4. Syncs call to Airtable if connected.
    5. Sends HTML summary emails using Resend.
    """
    logger.info(f"Processing completed call for tenant {tenant_id}, agent {agent_id}, call {call_id}")

    # Normalize transcript for storage
    if isinstance(transcript, list):
        transcript_str = json.dumps(transcript)
    else:
        transcript_str = str(transcript or "")

    # 1. Create CallRecord
    new_call = CallRecord(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        agent_id=agent_id,
        from_number=from_number or "unknown",
        to_number=to_number or "unknown",
        transcript=transcript_str,
        duration_seconds=duration_seconds,
        status="completed"
    )

    # 2. Fetch Agent Context for Analytics Hints
    agent_context = None
    agent_name = "AI Voice Agent"
    try:
        agent_obj = db.get(Agent, agent_id)
        if agent_obj:
            agent_name = agent_obj.name or ""
            agent_context = {
                "name": agent_name,
                "tools_config": agent_obj.tools_config or {},
                "forwarding_number": getattr(agent_obj, "forwarding_number", None),
            }
    except Exception as e:
        logger.warning(f"Could not fetch agent context for analytics: {e}")

    # 3. Analyze Call via AnalyticsService
    # Use list transcript if available to support system filter logic
    raw_transcript_for_analysis = transcript if isinstance(transcript, list) else transcript_str
    analysis = await analytics_service.analyze_call(raw_transcript_for_analysis, agent_context=agent_context)
    
    if analysis:
        new_call.summary = analysis.get("summary")
        new_call.sentiment = analysis.get("sentiment")
        action_items = analysis.get("action_items", [])
        new_call.action_items = json.dumps(action_items) if isinstance(action_items, list) else str(action_items)

    db.add(new_call)

    # 4. Atomically Bill Minutes
    if duration_seconds > 0:
        try:
            db.execute(
                text(
                    "UPDATE tenant SET minutes_used = COALESCE(minutes_used, 0) + :delta "
                    "WHERE id = CAST(:tid AS UUID)"
                ),
                {"delta": round(duration_seconds / 60.0, 6), "tid": str(tenant_id)},
            )
            db.commit()
            logger.info(f"Billed {duration_seconds} seconds successfully to tenant {tenant_id}")
        except Exception as e:
            logger.error(f"Failed to bill minutes atomically: {e}")
            db.rollback()
    else:
        db.commit()

    # Refresh tenant after billing updates
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        logger.error(f"Tenant {tenant_id} not found downstream in call processor")
        return {"status": "success", "call_record_id": str(new_call.id)}

    # 5. Airtable Call Log
    if tenant.airtable_pat and tenant.airtable_base_id:
        try:
            airtable = AirtableService(tenant)
            await airtable.log_call(
                phone=new_call.from_number,
                summary=new_call.summary or "",
                sentiment=new_call.sentiment or "neutral",
                duration=duration_seconds,
                action_items=new_call.action_items or "[]",
                agent_name=agent_name,
                call_id=str(new_call.id),
            )
            logger.info(f"Airtable sync complete for call {new_call.id}")
        except Exception as e:
            logger.warning(f"Airtable sync failed (non-blocking): {e}")

    # 6. HTML Summary Email via Resend
    if tenant.email_summary_enabled and tenant.contact_email:
        try:
            await send_call_summary_email(
                to_email=tenant.contact_email,
                data={
                    "call_id":          str(new_call.id),
                    "phone":            new_call.from_number,
                    "summary":          new_call.summary or "",
                    "sentiment":        new_call.sentiment or "neutral",
                    "action_items":     new_call.action_items or "[]",
                    "transcript":       raw_transcript_for_analysis,
                    "call_type":        analysis.get("call_type", "general") if analysis else "general",
                    "lead_info":        analysis.get("lead_info") if analysis else None,
                    "booking_info":     analysis.get("booking_info") if analysis else None,
                    "issue_info":       analysis.get("issue_info") if analysis else None,
                    "agent_name":       agent_name,
                    "duration_seconds": duration_seconds,
                    "call_timestamp":   datetime.now(timezone.utc).strftime("%b %d, %Y · %I:%M %p UTC"),
                }
            )
            logger.info(f"Successfully sent summary email to {tenant.contact_email}")
        except Exception as e:
            logger.error(f"Resend email error: {e}")

    return {"status": "success", "call_record_id": str(new_call.id)}
