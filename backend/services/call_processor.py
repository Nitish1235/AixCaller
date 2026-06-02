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
from backend.services.google_oauth import get_calendar_availability, create_calendar_event
from outbound.services.sms_drip import send_sms

analytics_service = AnalyticsService()

async def process_completed_call(
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    customer_phone: str,
    agent_phone: str,
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

    # ── Idempotency guard — prevent double-billing on duplicate webhooks ───────
    # Telnyx can fire conversation-ended twice on network retries.
    # If the call is already completed and billing has run, bail out immediately.
    if existing_call and existing_call.status == "completed" and existing_call.duration_seconds > 0:
        logger.warning(
            f"Duplicate webhook detected for call {call_id} — already processed "
            f"({existing_call.duration_seconds}s billed). Skipping to prevent double-billing."
        )
        return {"status": "already_processed", "call_record_id": str(existing_call.id)}

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
        if existing_call.from_number == "unknown" and customer_phone != "unknown" and customer_phone != "Customer":
            existing_call.from_number = customer_phone
        new_call = existing_call
    else:
        logger.info(f"No existing CallRecord found for {call_id}, creating a new one")
        new_call = CallRecord(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            agent_id=agent_id,
            from_number=customer_phone or "unknown",
            to_number=agent_phone or "unknown",
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

    # ── Persist the call record FIRST so it is never lost even if analytics fails ──
    db.add(new_call)
    try:
        db.commit()
        db.refresh(new_call)
    except Exception as e:
        logger.error(f"Failed to persist CallRecord for call {call_id}: {e}")
        db.rollback()
        # Re-add after rollback so billing can still proceed
        db.add(new_call)

    # 3. Atomically Bill Minutes — always runs, independent of analytics
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
            logger.info(
                f"Billed {duration_seconds}s ({duration_seconds / 60.0:.4f} min) "
                f"to tenant {tenant_id} for call {call_id}"
            )
        except Exception as e:
            logger.error(f"Failed to bill minutes for call {call_id}: {e}")
            db.rollback()
    else:
        logger.warning(f"Call {call_id} has duration_seconds=0 — no minutes billed")

    # 4. Analyze Call via AnalyticsService (non-blocking — failure must not lose billing)
    raw_transcript_for_analysis = transcript if isinstance(transcript, list) else transcript_str
    analysis = None
    try:
        analysis = await analytics_service.analyze_call(raw_transcript_for_analysis, agent_context=agent_context)
    except Exception as e:
        logger.error(f"Analytics failed for call {call_id} (billing already done): {e}")

    if analysis:
        new_call.summary = analysis.get("summary")
        new_call.sentiment = analysis.get("sentiment")
        action_items = analysis.get("action_items", [])
        new_call.action_items = json.dumps(action_items) if isinstance(action_items, list) else str(action_items)

    db.add(new_call)
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to persist analytics fields for call {call_id}: {e}")
        db.rollback()

    # Refresh tenant after billing updates
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        logger.error(f"Tenant {tenant_id} not found downstream in call processor")
        return {"status": "success", "call_record_id": str(new_call.id)}

    # 3b. Post-call KB enrichment (uses tenant, so must run after tenant is loaded)
    kb_result = None
    if analysis:
        intent = analysis.get("intent")
        if intent == "knowledge_lookup":
            try:
                ks = KnowledgeService(tenant)
                kb_result = await ks.lookup(analysis.get("query", ""))
                logger.info(f"Post-call KB lookup result: {kb_result}")
            except Exception as e:
                logger.error(f"Post-call KB lookup failed: {e}")

    # 5. Google Sheets Post-Call Append
    if tenant.google_connected and post_call_config.get("google_sheets", {}).get("enabled", False):
        try:
            agent_for_sheet = db.get(Agent, agent_id)
            sheet_cfg = (agent_for_sheet.tools_config or {}).get("google_sheet", {}) if agent_for_sheet else {}
            sheet_id = sheet_cfg.get("sheet_id")
            if sheet_id:
                from backend.services.google_oauth import append_lead_to_sheet
                sheet_row = {
                    "name": new_call.from_number,
                    "phone": new_call.from_number,
                    "intent": new_call.summary or "",
                    "notes": (
                        f"Sentiment: {new_call.sentiment or 'neutral'} | "
                        f"Duration: {duration_seconds}s | "
                        f"Agent: {agent_name}"
                    ),
                    "status": "completed",
                    "agent_name": agent_name,
                }
                # Pass sheet_id to append function via tenant attribute
                tenant.google_sheet_id = sheet_id  # type: ignore[attr-defined]
                await append_lead_to_sheet(tenant, sheet_row)
                logger.info(f"Google Sheets post-call append complete for call {new_call.id}")
        except Exception as e:
            logger.warning(f"Google Sheets post-call append failed (non-blocking): {e}")

    # 6. Airtable Call Log
    if tenant.airtable_pat and tenant.airtable_base_id and post_call_config.get("airtable_log", {}).get("enabled", True):
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

    # 7. HTML Summary Email via Resend
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
                    "knowledge_result": kb_result,
                    "calendar_info":     None,
                    "sheet_result":      None
                }
            )
            logger.info(f"Successfully sent summary email to {tenant.contact_email}")
        except Exception as e:
            logger.error(f"Resend email error: {e}")

    # 8. Custom Webhook
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

    # 9. HubSpot Sync (if connected)
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

    # 10. Salesforce Sync (if connected)
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

    # 11. Intelligent SMS Follow-up
    sms_followup = analysis.get("sms_followup", {}) if analysis else {}
    if sms_followup.get("needed") and sms_followup.get("suggested_message"):
        logger.info(f"Intelligent SMS needed for call {new_call.id}. Reason: {sms_followup.get('reason')}")
        try:
            # send_sms(from_number, to_number, message)
            sms_sent = await send_sms(agent_phone, customer_phone, sms_followup.get("suggested_message"))
            if sms_sent:
                new_call.sms_sent = True
                db.add(new_call)
                db.commit()
                logger.info(f"Successfully dispatched intelligent SMS for call {new_call.id}")
        except Exception as e:
            logger.error(f"Failed to send intelligent SMS: {e}")

    return {"status": "success", "call_record_id": str(new_call.id)}
