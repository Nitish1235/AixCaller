import os
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from loguru import logger
from sqlmodel import Session, select, and_, or_
from arq.connections import RedisSettings
from arq import create_pool

from shared.database import engine
from shared.models import Campaign, CampaignLead, Agent, CallRecord, Tenant
from outbound.services.sheet_poller import GoogleSheetPoller
from outbound.services.lead_scorer import score_campaign_leads
from sqlalchemy import func as sqlfunc

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
redis_settings = RedisSettings.from_dsn(REDIS_URL)

async def get_redis_pool():
    return await create_pool(redis_settings)

def _is_within_calling_window(lead: CampaignLead, campaign: Campaign) -> bool:
    tz_str = campaign.calling_window_timezone
    if not tz_str or tz_str == "lead_local":
        tz_str = lead.timezone
        
    try:
        tz = ZoneInfo(tz_str)
    except (ZoneInfoNotFoundError, Exception):
        tz = ZoneInfo("UTC")

    now_local = datetime.now(tz)
    now_time = now_local.strftime("%H:%M")

    in_window = campaign.calling_window_start <= now_time <= campaign.calling_window_end
    if not in_window:
        logger.debug(
            f"Lead {lead.name} ({tz_str}) is outside calling window "
            f"[{campaign.calling_window_start}–{campaign.calling_window_end}]. "
            f"Current local time: {now_time}."
        )
    return in_window

def _schedule_next_retry(lead: CampaignLead, campaign: Campaign, db: Session):
    cadence = campaign.retry_cadence_hours or [2, 24, 72]
    attempt_index = lead.attempts - 1

    if attempt_index < len(cadence):
        hours = cadence[attempt_index]
        lead.next_retry_at = datetime.now(timezone.utc) + timedelta(hours=hours)
        lead.status = "pending"
        logger.debug(
            f"Lead {lead.name} scheduled for retry in {hours}h "
            f"(attempt {lead.attempts}, next: {lead.next_retry_at})."
        )
    else:
        lead.status = "failed"
        lead.next_retry_at = None
        logger.info(f"Lead {lead.name} exhausted all {len(cadence)+1} attempts — marked failed.")
    
    db.add(lead)
    db.commit()


async def start_campaign(ctx, campaign_id):
    """
    Triggered when a campaign is started. 
    It checks how many slots are available based on max_concurrent_calls (max 3),
    and enqueues that many dial_next_lead tasks.
    """
    logger.info(f"Starting campaign {campaign_id} tasks...")
    sheet_poller = GoogleSheetPoller()
    new_leads = await sheet_poller.sync_campaign_sheet(campaign_id)
    if new_leads > 0:
        await score_campaign_leads(campaign_id)

    with Session(engine) as db:
        campaign = db.get(Campaign, campaign_id)
        if not campaign or campaign.status != "active":
            logger.info(f"Campaign {campaign_id} is not active. Aborting start.")
            return

        # ── Minutes gate — block campaign start if tenant has no remaining minutes ──
        tenant = db.get(Tenant, campaign.tenant_id)
        if tenant:
            minutes_remaining = (tenant.minutes_included or 0) - (tenant.minutes_used or 0)
            if minutes_remaining <= 0:
                logger.warning(
                    f"Campaign {campaign_id} NOT STARTED — tenant {tenant.id} has no remaining minutes "
                    f"({tenant.minutes_used:.2f} used / {tenant.minutes_included} included)."
                )
                campaign.status = "paused"
                campaign.pause_reason = "minutes_exhausted"
                db.add(campaign)
                db.commit()
                return

        # Ensure max concurrency is capped at 3 per user request constraint
        concurrency_limit = min(campaign.max_concurrent_calls, 3)

        # Count active calls
        active_calls = len(db.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign.id,
                    CampaignLead.status == "in_progress"
                )
            )
        ).all())

        slots = concurrency_limit - active_calls
        if slots <= 0:
            logger.info(f"Campaign {campaign_id} already at max concurrency ({active_calls}/{concurrency_limit}).")
            return

    # Enqueue up to `slots` dial_next_lead tasks
    redis = ctx.get('redis')
    for _ in range(slots):
        await redis.enqueue_job('dial_next_lead', campaign_id)
        logger.info(f"Enqueued dial_next_lead for campaign {campaign_id}")


async def dial_next_lead(ctx, campaign_id):
    """
    Finds exactly one lead that is ready to be dialed, checks concurrency, and dials it.
    """
    api_key = os.environ.get("TELNYX_API_KEY", "")
    connection_id = os.environ.get("TELNYX_CONNECTION_ID", "")
    server_host = os.environ.get("SERVER_HOST", "api.aixcaller.com")

    if not api_key or not connection_id:
        logger.error("Missing Telnyx configuration — dialer engine disabled.")
        return

    with Session(engine) as db:
        campaign = db.get(Campaign, campaign_id)
        if not campaign or campaign.status != "active":
            return

        agent = db.get(Agent, campaign.agent_id)
        if not agent or not agent.phone_number:
            logger.error(f"Campaign {campaign.id} agent {campaign.agent_id} has no phone number.")
            return

        # ── Minutes gate — pause campaign if tenant has no remaining minutes ───
        tenant = db.get(Tenant, campaign.tenant_id)
        if tenant:
            minutes_remaining = (tenant.minutes_included or 0) - (tenant.minutes_used or 0)
            if minutes_remaining <= 0:
                logger.warning(
                    f"OUTBOUND CAMPAIGN PAUSED — tenant {tenant.id} exhausted minutes "
                    f"({tenant.minutes_used:.2f} used / {tenant.minutes_included} included). "
                    f"Campaign {campaign.id} → paused (minutes_exhausted). "
                    f"Remaining leads will resume automatically when plan renews."
                )
                campaign.status = "paused"
                campaign.pause_reason = "minutes_exhausted"
                db.add(campaign)
                db.commit()
                return

        # ── Daily call limit gate ─────────────────────────────────────────────
        if campaign.daily_call_limit and campaign.daily_call_limit > 0:
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            calls_today = db.exec(
                select(sqlfunc.count(CampaignLead.id)).where(
                    CampaignLead.campaign_id == campaign.id,
                    CampaignLead.attempts > 0,
                    CampaignLead.updated_at >= today_start,
                )
            ).one()
            if calls_today >= campaign.daily_call_limit:
                logger.info(
                    f"Campaign {campaign.id} hit daily limit "
                    f"({calls_today}/{campaign.daily_call_limit}) — waiting until tomorrow."
                )
                return

        concurrency_limit = min(campaign.max_concurrent_calls, 3)

        active_calls = len(db.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign.id,
                    CampaignLead.status == "in_progress"
                )
            )
        ).all())

        if active_calls >= concurrency_limit:
            logger.debug(f"Campaign {campaign.id} at full capacity ({active_calls}/{concurrency_limit}).")
            return

        now_utc = datetime.now(timezone.utc)
        max_attempts = len(campaign.retry_cadence_hours or [2, 24, 72]) + 1
        
        # We need ONE lead, but we fetch a few to account for timezone filtering
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
            .order_by(CampaignLead.lead_score.desc())
            .limit(10)
        ).all()

        target_lead = None
        for lead in pending_leads:
            if _is_within_calling_window(lead, campaign):
                target_lead = lead
                break

        if not target_lead:
            if active_calls == 0:
                # Double-check: are there any pending leads that are simply outside
                # their calling window right now? If so, don't mark complete —
                # they will be picked up when their timezone window opens.
                any_pending_at_all = db.exec(
                    select(sqlfunc.count(CampaignLead.id)).where(
                        CampaignLead.campaign_id == campaign.id,
                        CampaignLead.status == "pending",
                        CampaignLead.opted_out == False,
                        CampaignLead.attempts < max_attempts,
                    )
                ).one()

                if any_pending_at_all > 0:
                    # Leads exist but are outside calling window — don't complete yet
                    logger.debug(
                        f"Campaign {campaign.id}: {any_pending_at_all} pending leads exist "
                        f"but none are in calling window right now. Will retry next cycle."
                    )
                    return

                campaign.status = "completed"
                db.add(campaign)
                db.commit()
                logger.info(f"Campaign {campaign.id} completed — all leads processed.")
            return

        # Mark in progress immediately to prevent race conditions
        target_lead.status = "in_progress"
        target_lead.attempts += 1
        # naive vs aware fix for sqlmodel datetime handling if needed
        # updated_at is sometimes expected naive in postgres but it depends on model
        target_lead.updated_at = datetime.now(timezone.utc)
        db.add(target_lead)
        db.commit()

        server_base = server_host if server_host.startswith("http") else f"https://{server_host}"
        lead_id_str = str(target_lead.id)
        answer_url = f"{server_base}/api/v1/outbound/sales-answer?lead_id={lead_id_str}"
        amd_url    = f"{server_base}/api/v1/outbound/amd-callback?lead_id={lead_id_str}"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                payload = {
                    "to": target_lead.phone,
                    "from": agent.phone_number,
                    "url": answer_url,
                    "connection_id": connection_id,
                    "machine_detection": "detect",
                    "machine_detection_status_url": amd_url,
                }

                response = await client.post(
                    "https://api.telnyx.com/v2/texml/calls",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload
                )

                if response.status_code not in (200, 201):
                    logger.error(f"Telnyx dial failed for lead {target_lead.id}: {response.text}")
                    target_lead.status = "pending"
                    _schedule_next_retry(target_lead, campaign, db)
                    # We failed to dial, so slot opened up, enqueue another try
                    redis = ctx.get('redis')
                    await redis.enqueue_job('dial_next_lead', campaign_id)
                    return

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
                        to_number=target_lead.phone,
                        direction="outbound",
                        status="initiated",
                    )
                    db.add(record)
                    target_lead.last_call_id = call_uuid
                    db.add(target_lead)
                    db.commit()

                logger.info(f"Dialed {target_lead.name} ({target_lead.phone}) — attempt {target_lead.attempts}/{max_attempts}.")

            except Exception as ex:
                logger.error(f"Exception dialing lead {target_lead.id}: {ex}")
                target_lead.status = "pending"
                _schedule_next_retry(target_lead, campaign, db)
                redis = ctx.get('redis')
                await redis.enqueue_job('dial_next_lead', campaign_id)


async def check_scheduled_campaigns(ctx):
    """
    Runs every minute. Finds campaigns in 'scheduled' status whose
    scheduled_start_at has arrived (or passed) and auto-activates them.

    Flow:
      scheduled_start_at <= now  →  status = "active"  →  enqueue start_campaign
    """
    now_utc = datetime.now(timezone.utc)

    with Session(engine) as db:
        from shared.models import Tenant
        due_campaigns = db.exec(
            select(Campaign).where(
                Campaign.status == "scheduled",
                Campaign.scheduled_start_at != None,
                Campaign.scheduled_start_at <= now_utc,
            )
        ).all()

        if not due_campaigns:
            return

        redis = ctx.get("redis")
        for campaign in due_campaigns:
            # Minutes gate before auto-activating
            tenant = db.get(Tenant, campaign.tenant_id)
            if tenant:
                minutes_remaining = (tenant.minutes_included or 0) - (tenant.minutes_used or 0)
                if minutes_remaining <= 0:
                    logger.warning(
                        f"Scheduled campaign {campaign.id} NOT auto-activated — "
                        f"tenant {tenant.id} has no remaining minutes."
                    )
                    campaign.status = "paused"
                    db.add(campaign)
                    continue

            campaign.status = "active"
            db.add(campaign)
            db.commit()
            logger.info(
                f"Campaign {campaign.id} auto-activated — "
                f"scheduled_start_at={campaign.scheduled_start_at} reached."
            )
            if redis:
                await redis.enqueue_job("start_campaign", campaign.id)
            else:
                # Fallback: create a fresh pool if ctx doesn't have redis
                pool = await create_pool(redis_settings)
                await pool.enqueue_job("start_campaign", campaign.id)


async def reconcile_stuck_calls(ctx):
    """
    Runs every 5 minutes. Resets any leads stuck in 'in_progress' for > 8 minutes
    (Telnyx calls time out after ~6 minutes of ringing with no answer, so 8 min
    is a safe window to catch webhook-drop failures without false-positives).
    """
    logger.info("Running reconcile_stuck_calls...")
    threshold = datetime.now(timezone.utc) - timedelta(minutes=8)
    
    with Session(engine) as db:
        stuck_leads = db.exec(
            select(CampaignLead).where(
                and_(
                    CampaignLead.status == "in_progress",
                    CampaignLead.updated_at < threshold
                )
            )
        ).all()

        campaign_ids_to_restart = set()
        for lead in stuck_leads:
            logger.warning(f"Resetting stuck lead {lead.id} back to pending.")
            lead.status = "pending"
            db.add(lead)
            campaign_ids_to_restart.add(lead.campaign_id)
            
        db.commit()

        # Wake up those campaigns so they fill their newly available slots
        redis = ctx.get('redis')
        for cid in campaign_ids_to_restart:
            await redis.enqueue_job('start_campaign', cid)
