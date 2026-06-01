"""
outbound/services/dialer_engine.py
=====================================
Core outbound dialing dispatcher for the standalone outbound microservice.

Upgrades implemented:
  1. Timezone-Aware Calling Window  — only dials within configured HH:MM window (lead's local time)
  2. Smart Retry Cadence            — sets next_retry_at based on campaign.retry_cadence_hours
  3. AI Lead Score Ordering         — hot leads (score 7+) are dialed before warm/cold
  2b. Post-Call SMS Drip            — sends outcome-based SMS after voicemail/no-answer
"""

import os
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from loguru import logger
from sqlmodel import Session, select, and_, or_
from shared.database import engine
from shared.models import Campaign, CampaignLead, Agent, CallRecord
from outbound.services.sheet_poller import GoogleSheetPoller
from outbound.services.lead_scorer import score_campaign_leads
from outbound.services.sms_drip import send_no_answer_sms, send_voicemail_sms


class OutboundDialerEngine:
    """
    Core executor for sales dialing campaigns in the standalone outbound microservice.
    Coordinates sheet polling, AI scoring, timezone-aware concurrency checks,
    smart retry cadencing, and outbound Telnyx API triggers.
    """

    def __init__(self):
        self.api_key = os.environ.get("TELNYX_API_KEY", "")
        self.connection_id = os.environ.get("TELNYX_CONNECTION_ID", "")
        self.server_host = os.environ.get("SERVER_HOST", "api.aixcaller.com")
        self.sheet_poller = GoogleSheetPoller()

    async def execute_dialing_campaigns(self):
        """
        Polls and executes all active outbound calling campaigns.
        Called every minute by the /cron endpoint.
        """
        if not self.api_key or not self.connection_id:
            logger.error("Missing Telnyx configuration — dialer engine disabled.")
            return

        with Session(engine) as db:
            active_campaigns = db.exec(
                select(Campaign).where(Campaign.status == "active")
            ).all()

            if not active_campaigns:
                logger.debug("No active campaign dial queues found.")
                return

            for campaign in active_campaigns:
                try:
                    # 1. Sync new leads from Google Sheet
                    new_leads = await self.sheet_poller.sync_campaign_sheet(campaign.id)

                    # 2. Score any new unscored leads (Upgrade 3 — AI Lead Scoring)
                    if new_leads > 0:
                        await score_campaign_leads(campaign.id)

                    # 3. Process outbound dials
                    await self._process_campaign(campaign, db)
                except Exception as e:
                    logger.error(f"Error processing campaign {campaign.id}: {e}")

    async def _process_campaign(self, campaign: Campaign, db: Session):
        agent = db.get(Agent, campaign.agent_id)
        if not agent or not agent.phone_number:
            logger.error(f"Campaign {campaign.id} agent {campaign.agent_id} has no phone number.")
            return

        # Count currently active concurrent calls
        active_calls = len(db.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign.id,
                    CampaignLead.status == "in_progress"
                )
            )
        ).all())

        slots = campaign.max_concurrent_calls - active_calls
        if slots <= 0:
            logger.debug(f"Campaign {campaign.id} at full capacity ({active_calls}/{campaign.max_concurrent_calls}).")
            return

        now_utc = datetime.now(timezone.utc)

        # Fetch pending leads ready to dial:
        #   - status = pending
        #   - attempts < max retries (length of cadence list + 1)
        #   - next_retry_at is NULL (first attempt) OR next_retry_at <= now
        #   - not opted out
        max_attempts = len(campaign.retry_cadence_hours) + 1
        pending_leads = db.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign.id,
                    CampaignLead.status == "pending",
                    CampaignLead.attempts < max_attempts,
                    CampaignLead.opted_out == False,
                    or_(
                        CampaignLead.next_retry_at == None,
                        CampaignLead.next_retry_at <= now_utc,
                    )
                )
            )
            # Upgrade 3: Order hot leads first (highest score first)
            .order_by(CampaignLead.lead_score.desc())
            .limit(slots * 3)  # fetch extra to allow for timezone filtering below
        ).all()

        if not pending_leads:
            if active_calls == 0:
                campaign.status = "completed"
                db.add(campaign)
                db.commit()
                logger.info(f"Campaign {campaign.id} completed — all leads processed.")
            return

        # Upgrade 1: Filter by timezone-aware calling window
        dialable_leads = []
        for lead in pending_leads:
            if self._is_within_calling_window(lead, campaign):
                dialable_leads.append(lead)
                if len(dialable_leads) >= slots:
                    break

        if not dialable_leads:
            logger.debug(f"Campaign {campaign.id}: {len(pending_leads)} leads pending but none in calling window.")
            return

        logger.info(f"Campaign {campaign.id} dispatching {len(dialable_leads)} dials "
                    f"(Active: {active_calls}/{campaign.max_concurrent_calls}).")

        server_base = self.server_host if self.server_host.startswith("http") else f"https://{self.server_host}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            for lead in dialable_leads:
                lead_id_str = str(lead.id)
                answer_url = f"{server_base}/api/v1/outbound/sales-answer?lead_id={lead_id_str}"
                amd_url    = f"{server_base}/api/v1/outbound/amd-callback?lead_id={lead_id_str}"

                # Mark as in_progress to prevent race conditions
                lead.status = "in_progress"
                lead.attempts += 1
                lead.updated_at = datetime.now(timezone.utc)
                db.add(lead)
                db.commit()

                try:
                    payload = {
                        "to": lead.phone,
                        "from": agent.phone_number,
                        "url": answer_url,
                        "connection_id": self.connection_id,
                        "machine_detection": "detect",
                        "machine_detection_status_url": amd_url,
                    }

                    response = await client.post(
                        "https://api.telnyx.com/v2/texml/calls",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json",
                        },
                        json=payload
                    )

                    if response.status_code not in (200, 201):
                        logger.error(f"Telnyx dial failed for lead {lead.id}: {response.text}")
                        lead.status = "pending"   # back to pending so retry picks it up
                        self._schedule_next_retry(lead, campaign)
                        db.add(lead)
                        db.commit()
                        continue

                    resp_json = response.json()
                    call_control_id = resp_json.get("data", {}).get("call_control_id")

                    if call_control_id:
                        try:
                            call_uuid = uuid.UUID(call_control_id)
                        except ValueError:
                            call_uuid = uuid.uuid4()

                        record = CallRecord(
                            id=call_uuid,
                            tenant_id=campaign.tenant_id,
                            agent_id=campaign.agent_id,
                            from_number=agent.phone_number,
                            to_number=lead.phone,
                            direction="outbound",
                            status="initiated",
                        )
                        db.add(record)
                        lead.last_call_id = call_uuid
                        db.add(lead)
                        db.commit()

                    logger.info(f"Dialed {lead.name} ({lead.phone}) — attempt {lead.attempts}/{max_attempts}.")

                except Exception as ex:
                    logger.error(f"Exception dialing lead {lead.id}: {ex}")
                    lead.status = "pending"
                    self._schedule_next_retry(lead, campaign)
                    db.add(lead)
                    db.commit()

    def _is_within_calling_window(self, lead: CampaignLead, campaign: Campaign) -> bool:
        """
        Upgrade 1: Checks if the current time in the lead's local timezone
        falls within the campaign's configured calling window.
        """
        try:
            tz = ZoneInfo(lead.timezone)
        except (ZoneInfoNotFoundError, Exception):
            tz = ZoneInfo("UTC")

        now_local = datetime.now(tz)
        now_time = now_local.strftime("%H:%M")

        in_window = campaign.calling_window_start <= now_time <= campaign.calling_window_end
        if not in_window:
            logger.debug(
                f"Lead {lead.name} ({lead.timezone}) is outside calling window "
                f"[{campaign.calling_window_start}–{campaign.calling_window_end}]. "
                f"Current local time: {now_time}."
            )
        return in_window

    def _schedule_next_retry(self, lead: CampaignLead, campaign: Campaign):
        """
        Upgrade 1: Computes and sets next_retry_at based on attempt count
        and the campaign's retry_cadence_hours list.
        """
        cadence = campaign.retry_cadence_hours or [2, 24, 72]
        attempt_index = lead.attempts - 1   # 0-based index into cadence

        if attempt_index < len(cadence):
            hours = cadence[attempt_index]
            lead.next_retry_at = datetime.now(timezone.utc) + timedelta(hours=hours)
            lead.status = "pending"
            logger.debug(
                f"Lead {lead.name} scheduled for retry in {hours}h "
                f"(attempt {lead.attempts}, next: {lead.next_retry_at})."
            )
        else:
            # Exhausted all retry slots — mark as failed
            lead.status = "failed"
            lead.next_retry_at = None
            logger.info(f"Lead {lead.name} exhausted all {len(cadence)+1} attempts — marked failed.")
