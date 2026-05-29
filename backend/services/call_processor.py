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
from backend.services.hubspot import log_call_to_hubspot
from backend.services.salesforce import log_call_to_salesforce
import httpx
from backend.services.knowledge_service import KnowledgeService
from backend.services.calendar_service import CalendarService
from backend.services.sheets_service import SheetsService

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

    # 1. Update existing CallRecord or Create a new one
    from sqlmodel import select, desc
    existing_call = None
    if call_id and call_id != "unknown":
        existing_call = db.exec(select(CallRecord).where(CallRecord.call_control_id == call_id)).first()
        
    # Fallback: if we don't have a call_control_id from the webhook, find the most recent in_progress call for this agent
    if not existing_call:
        existing_call = db.exec(
            select(CallRecord)
            .where(CallRecord.agent_id == agent_id)
            .where(CallRecord.status == "in_progress")
            .order_by(desc(CallRecord.created_at))
        ).first()

    if existing_call:
        logger.info(f"Updating existing CallRecord for {call_id}")
        existing_call.transcript = transcript_str
        existing_call.duration_seconds = duration_seconds
        existing_call.status = "completed"
        # Only overwrite from_number if it was previously unknown, so we preserve the original
        if existing_call.from_number == "unknown" and from_number != "unknown" and from_number != "Customer":
            existing_call.from_number = from_number
        new_call = existing_call
    else:
        logger.info(f"No existing CallRecord found for {call_id}, creating a new one")
        new_call = CallRecord(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            agent_id=agent_id,
            from_number=from_number or "unknown",
            to_number=to_number or "unknown",
            transcript=transcript_str,
            duration_seconds=duration_seconds,
            status="completed",
            call_control_id=call_id if call_id != "unknown" else None
        )

    # 2. Fetch Agent Context for Analytics Hints
    agent_context = None
    agent_name = "AI Voice Agent"
    post_call_config = {}
    try:
        agent_obj = db.get(Agent, agent_id)
        if agent_obj:
            agent_name = agent_obj.name or ""
            agent_context = {
                "name": agent_name,
                "tools_config": agent_obj.tools_config or {},
                "forwarding_number": getattr(agent_obj, "forwarding_number", None),
            }
            post_call_config = (agent_obj.call_flow or {}).get("post_call", {})
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
        
        # --- Integration based on detected intent ---
        intent = analysis.get("intent")
        knowledge_result = None
        calendar_info = None
        sheet_result = None
        if intent == "knowledge_lookup":
            ks = KnowledgeService(tenant)
            knowledge_result = await ks.lookup(analysis.get("query", ""))
        elif intent == "schedule_booking":
            cs = CalendarService(tenant)
            calendar_info = cs.get_free_slots()
        elif intent == "sheet_lookup":
            ss = SheetsService(tenant)
            sheet_result = await ss.search_table(analysis.get("sheet_id", ""), analysis.get("query", ""))

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
    if tenant.airtable_pat and tenant.airtable_base_id and post_call_config.get("airtable_log", {}).get("enabled", False):
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
    if tenant.email_summary_enabled and tenant.contact_email and post_call_config.get("email_summary", {}).get("enabled", True):
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
                    "knowledge_result": knowledge_result if 'knowledge_result' in locals() else None,
                    "calendar_info":     calendar_info if 'calendar_info' in locals() else None,
                    "sheet_result":      sheet_result if 'sheet_result' in locals() else None
                }
            )
            logger.info(f"Successfully sent summary email to {tenant.contact_email}")
        except Exception as e:
            logger.error(f"Resend email error: {e}")

    # 7. Custom Webhook
    if tenant.webhook_url and post_call_config.get("webhook_post", {}).get("enabled", True):
        try:
            async with httpx.AsyncClient() as client:
                webhook_payload = {
                    "event": "call.completed",
                    "tenant_id": str(tenant.id),
                    "call_id": str(new_call.id),
                    "agent_name": agent_name,
                    "phone": new_call.from_number,
                    "duration_seconds": duration_seconds,
                    "summary": new_call.summary,
                    "sentiment": new_call.sentiment,
                    "action_items": new_call.action_items,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
                await client.post(tenant.webhook_url, json=webhook_payload, timeout=10.0)
                logger.info(f"Successfully dispatched webhook to {tenant.webhook_url}")
        except Exception as e:
            logger.error(f"Webhook dispatch failed: {e}")

    # 8. HubSpot Sync (if connected)
    if tenant.hubspot_access_token and post_call_config.get("hubspot_sync", {}).get("enabled", True):
        try:
            # Prepare payload for HubSpot sync
            hubspot_data = {
                "call_id": str(new_call.id),
                "phone": new_call.from_number,
                "summary": new_call.summary,
                "duration": duration_seconds,
            }
            await log_call_to_hubspot(tenant, hubspot_data)
        except Exception as e:
            logger.error(f"HubSpot sync error: {e}")

    # 9. Salesforce Sync (if connected)
    if tenant.salesforce_access_token and post_call_config.get("salesforce_sync", {}).get("enabled", True):
        try:
            salesforce_data = {
                "call_id": str(new_call.id),
                "phone": new_call.from_number,
                "summary": new_call.summary,
                "duration": duration_seconds,
            }
            await log_call_to_salesforce(tenant, salesforce_data)
        except Exception as e:
            logger.error(f"Salesforce sync error: {e}")

    return {"status": "success", "call_record_id": str(new_call.id)}
