"""
outbound/services/reminder_engine.py
======================================
No-Show Reminder & AI Rescheduler Engine.

Runs every 15 minutes (triggered via /api/v1/outbound/cron-reminders).
Finds confirmed leads whose appointment_datetime is within the next 24 hours
and fires a reminder SMS. If a no-show is later detected via call outcome,
triggers an outbound rescheduling AI call.

Reminder flow:
  1. Find leads with appointment_datetime between now+15min and now+24h
     whose status is 'answered' and reminder not yet sent.
  2. Send reminder SMS using campaign.sms_reminder_template.
  3. Mark lead with reminder_sent=True (via variables dict to avoid schema change).

Rescheduling flow (called from webhooks.py on no-show detection):
  1. Lead's appointment passed but call wasn't completed.
  2. Trigger an outbound AI call offering new slots.
"""

import os
import uuid
import httpx
from datetime import datetime, timedelta, timezone
from loguru import logger
from sqlmodel import Session, select, and_
from shared.database import engine
from shared.models import Campaign, CampaignLead, Agent
from outbound.services.sms_drip import send_reminder_sms


async def run_reminder_sweep() -> dict:
    """
    Main reminder sweep — call this every 15 minutes via cron.
    Returns summary dict with counts.
    """
    now_utc = datetime.now(timezone.utc)
    window_start = now_utc + timedelta(minutes=15)   # don't send if appointment is too soon
    window_end = now_utc + timedelta(hours=24)

    sent = 0
    skipped = 0

    with Session(engine) as db:
        # Find all answered leads with an appointment in the 24h window
        leads = db.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.status == "answered",
                    CampaignLead.appointment_datetime >= window_start,
                    CampaignLead.appointment_datetime <= window_end,
                    CampaignLead.opted_out == False,
                )
            )
        ).all()

        for lead in leads:
            # Skip if reminder already sent (stored in variables dict as a lightweight flag)
            if lead.variables.get("reminder_sent"):
                skipped += 1
                continue

            campaign = db.get(Campaign, lead.campaign_id)
            if not campaign or not campaign.sms_enabled:
                skipped += 1
                continue

            agent = db.get(Agent, campaign.agent_id)
            if not agent or not agent.phone_number:
                skipped += 1
                continue

            # Format appointment time nicely
            appt_dt = lead.appointment_datetime
            if appt_dt.tzinfo is None:
                appt_dt = appt_dt.replace(tzinfo=timezone.utc)
            appt_time_str = appt_dt.strftime("%I:%M %p").lstrip("0")   # e.g. "3:30 PM"

            success = await send_reminder_sms(
                campaign=campaign,
                lead=lead,
                from_number=agent.phone_number,
                appointment_time=appt_time_str,
            )

            if success:
                # Mark reminder as sent in variables JSONB (no schema migration needed)
                lead.variables = {**lead.variables, "reminder_sent": True}
                db.add(lead)
                sent += 1
                logger.info(f"Reminder sent to {lead.name} ({lead.phone}) for appointment at {appt_time_str}.")
            else:
                skipped += 1

        db.commit()

    logger.info(f"Reminder sweep complete: {sent} sent, {skipped} skipped.")
    return {"reminders_sent": sent, "skipped": skipped}


async def trigger_reschedule_call(lead_id: uuid.UUID) -> bool:
    """
    Fires an outbound AI rescheduling call for a lead who missed their appointment.
    The AI assistant conversationally offers new slots and rebooks.
    """
    api_key = os.environ.get("TELNYX_API_KEY", "")
    connection_id = os.environ.get("TELNYX_CONNECTION_ID", "")
    server_host = os.environ.get("SERVER_HOST", "api.aixcaller.com")
    server_base = server_host if server_host.startswith("http") else f"https://{server_host}"

    if not api_key or not connection_id:
        logger.error("Missing Telnyx config — cannot trigger reschedule call.")
        return False

    with Session(engine) as db:
        lead = db.get(CampaignLead, lead_id)
        if not lead:
            logger.error(f"Lead {lead_id} not found for rescheduling.")
            return False

        campaign = db.get(Campaign, lead.campaign_id)
        agent = db.get(Agent, campaign.agent_id) if campaign else None

        if not agent or not agent.phone_number:
            logger.error(f"Agent phone missing for rescheduling lead {lead_id}.")
            return False

        lead_id_str = str(lead.id)
        # Reuse the same /sales-answer webhook — AI assistant will handle rescheduling
        answer_url = f"{server_base}/api/v1/outbound/sales-answer?lead_id={lead_id_str}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(
                    "https://api.telnyx.com/v2/texml/calls",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "to": lead.phone,
                        "from": agent.phone_number,
                        "url": answer_url,
                        "connection_id": connection_id,
                    }
                )
                if resp.status_code in (200, 201):
                    logger.info(f"Reschedule call triggered for lead {lead.name} ({lead.phone}).")
                    return True
                logger.error(f"Reschedule call failed: {resp.status_code} {resp.text}")
            except Exception as e:
                logger.error(f"Exception triggering reschedule call: {e}")

    return False
