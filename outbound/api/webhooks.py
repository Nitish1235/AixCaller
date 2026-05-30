import os
import uuid
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Request, Depends, BackgroundTasks
from fastapi.responses import PlainTextResponse
from loguru import logger
from sqlmodel import Session, select
from shared.database import get_db, engine
from shared.models import CampaignLead, Agent, Campaign, Tenant, CallRecord
from outbound.services.sheet_poller import get_valid_google_token, GoogleSheetPoller
from outbound.services.sms_drip import send_voicemail_sms, send_no_answer_sms, send_booked_sms

router = APIRouter(prefix="/api/v1/outbound", tags=["Outbound-Webhooks"])
sheet_poller = GoogleSheetPoller()

# ─────────────────────────────────────────────────────────────────────────────
# 1. TELEPHONY WEBHOOKS
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/sales-answer")
async def handle_sales_answer(request: Request, lead_id: str, db: Session = Depends(get_db)):
    """
    TeXML endpoint triggered when an outbound sales campaign call is answered.
    Updates the lead status, personalizes the Voice assistant greeting dynamically,
    and connects the call to the AI Assistant.
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead_id")

    lead = db.get(CampaignLead, lead_uuid)
    if not lead:
        logger.error(f"Lead {lead_id} not found on answered hook.")
        return PlainTextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', media_type="application/xml")

    campaign = db.get(Campaign, lead.campaign_id)
    if not campaign:
        logger.error(f"Campaign {lead.campaign_id} not found for lead {lead.id}.")
        return PlainTextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', media_type="application/xml")

    agent = db.get(Agent, campaign.agent_id)
    if not agent or not agent.telnyx_assistant_id:
        logger.error(f"Agent associated with campaign {campaign.id} is missing Telnyx assistant ID.")
        return PlainTextResponse('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>', media_type="application/xml")

    # 1. Update database state
    lead.status = "answered"
    lead.updated_at = datetime.utcnow()
    db.add(lead)
    db.commit()

    # 2. Writeback 'Answered' status to Google Sheet row in real-time
    tenant = db.get(Tenant, campaign.tenant_id)
    sheet_config = agent.tools_config.get("google_sheets", {})
    sheet_id = sheet_config.get("sheet_id")
    sheet_name = sheet_config.get("sheet_name", "Sheet1")
    row_num = lead.variables.get("sheet_row_number")

    if tenant and sheet_id and row_num:
        try:
            await sheet_poller.writeback_lead_status(
                tenant=tenant,
                sheet_id=sheet_id,
                sheet_name=sheet_name,
                row_number=int(row_num),
                call_result="Answered",
                campaign_status="Connected"
            )
        except Exception as wb_ex:
            logger.warning(f"Sheet writeback failed on answer: {wb_ex}")

    # 3. Personalize greeting dynamically in Telnyx's AI Assistant
    api_key = os.environ.get("TELNYX_API_KEY")
    if api_key:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        company_name = lead.variables.get("company", "your business")
        greeting_text = f"Hi {lead.name}! This is {agent.name} from {agent.business_name or 'NovaEdge'}. I'm calling you regarding {company_name}. How is your day going?"

        async with httpx.AsyncClient() as client:
            try:
                await client.put(
                    f"https://api.telnyx.com/v2/ai/assistants/{agent.telnyx_assistant_id}",
                    headers=headers,
                    json={"greeting": greeting_text},
                    timeout=5.0
                )
            except Exception as patch_ex:
                logger.warning(f"Failed to personalize greeting dynamically: {patch_ex}")

    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <AIAssistant id="{agent.telnyx_assistant_id}" />
    </Connect>
</Response>"""
    return PlainTextResponse(texml, media_type="application/xml")


@router.post("/amd-callback")
async def handle_amd_callback(request: Request, lead_id: str, db: Session = Depends(get_db)):
    """
    Receives Telnyx Answering Machine Detection (AMD) status webhooks.
    If a machine/voicemail is detected, redirects the call to play a voicemail drop.
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        return {"status": "error", "message": "Invalid lead_id"}

    payload = await request.json()
    logger.info(f"Received AMD status webhook for lead {lead_id}: {payload}")

    data_block = payload.get("data", {})
    event_payload = data_block.get("payload", {}) if isinstance(data_block, dict) else payload.get("payload", {})
    if not event_payload:
        event_payload = payload

    detection_status = event_payload.get("machine_detection_status") or event_payload.get("status")
    call_control_id = event_payload.get("call_control_id")

    if detection_status == "machine" and call_control_id:
        logger.info(f"Voicemail detected on call {call_control_id} for lead {lead_id}. Redirecting call...")
        
        # 1. Update lead status to voicemail
        lead = db.get(CampaignLead, lead_uuid)
        if lead:
            lead.status = "voicemail"
            lead.updated_at = datetime.utcnow()
            db.add(lead)
            db.commit()

            # 2. Writeback voicemail drop to Google Sheet row in real-time
            campaign = db.get(Campaign, lead.campaign_id)
            if campaign:
                tenant = db.get(Tenant, campaign.tenant_id)
                agent = db.get(Agent, campaign.agent_id)
                sheet_config = agent.tools_config.get("google_sheets", {}) if agent else {}
                sheet_id = sheet_config.get("sheet_id")
                sheet_name = sheet_config.get("sheet_name", "Sheet1")
                row_num = lead.variables.get("sheet_row_number")

                if tenant and sheet_id and row_num:
                    try:
                        await sheet_poller.writeback_lead_status(
                            tenant=tenant,
                            sheet_id=sheet_id,
                            sheet_name=sheet_name,
                            row_number=int(row_num),
                            call_result="Voicemail Drop",
                            campaign_status="Voicemail"
                        )
                    except Exception as wb_ex:
                        logger.warning(f"Sheet writeback failed on voicemail: {wb_ex}")

        # 3. Redirect the Telnyx call to drop a voicemail TeXML response
        api_key = os.environ.get("TELNYX_API_KEY")
        server_host = os.environ.get("SERVER_HOST", "api.aixcaller.com")
        server_base = server_host if server_host.startswith("http") else f"https://{server_host}"
        redirect_url = f"{server_base}/api/v1/outbound/voicemail-drop?lead_id={lead_id}"

        if api_key:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            async with httpx.AsyncClient() as client:
                try:
                    await client.post(
                        f"https://api.telnyx.com/v2/calls/{call_control_id}/actions/redirect",
                        headers=headers,
                        json={"url": redirect_url},
                        timeout=10.0
                    )
                except Exception as ex:
                    logger.error(f"Failed to redirect call to voicemail drop: {ex}")

    return {"status": "processed"}


@router.post("/voicemail-drop")
async def handle_voicemail_drop(lead_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """TeXML voicemail drop script. Also fires post-call SMS drip."""
    try:
        lead = db.get(CampaignLead, uuid.UUID(lead_id))
    except ValueError:
        lead = None
    lead_name = lead.name if lead else "there"

    # Fire post-call SMS drip in background (Upgrade 2)
    if lead:
        campaign = db.get(Campaign, lead.campaign_id)
        agent = db.get(Agent, campaign.agent_id) if campaign else None
        if campaign and agent and agent.phone_number:
            background_tasks.add_task(
                send_voicemail_sms,
                campaign=campaign,
                lead=lead,
                from_number=agent.phone_number,
            )

    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>
        Hi {lead_name}, sorry I missed you! I am calling from NovaEdge.
        I will send you an email shortly with all the details.
        Have a wonderful day, goodbye!
    </Say>
    <Hangup/>
</Response>"""
    return PlainTextResponse(texml, media_type="application/xml")


# ─────────────────────────────────────────────────────────────────────────────
# 2. CONVERSATIONAL BOOKING TOOLS (LLM Webhook Tools)
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/check-availability")
async def check_availability(request: Request, tenant_id: str):
    """
    Synchronous Webhook tool called by the LLM during a call to check 
    free/busy slots on Google Calendar.
    """
    try:
        tenant_uuid = uuid.UUID(tenant_id)
        payload = await request.json()
        logger.info(f"Google Calendar availability check payload: {payload}")

        # Extract targeted date (default tomorrow)
        date_str = payload.get("date", (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"))

        with Session(engine) as db:
            tenant = db.get(Tenant, tenant_uuid)
            if not tenant or not tenant.google_connected:
                return {"status": "error", "message": "Google integration not connected."}

            token = await get_valid_google_token(tenant, db)
            if not token:
                return {"status": "error", "message": "Auth failure."}

        # Query Google Calendar FreeBusy API
        dt_start = datetime.strptime(f"{date_str} 00:00", "%Y-%m-%d %H:%M")
        dt_end   = datetime.strptime(f"{date_str} 23:59", "%Y-%m-%d %H:%M")
        calendar_id = tenant.google_calendar_id or "primary"

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://www.googleapis.com/calendar/v3/freeBusy",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "timeMin": dt_start.isoformat() + "Z",
                    "timeMax": dt_end.isoformat() + "Z",
                    "items": [{"id": calendar_id}],
                }
            )
            resp.raise_for_status()
            data = resp.json()

        busy_periods = data.get("calendars", {}).get(calendar_id, {}).get("busy", [])
        busy_slots = []
        for period in busy_periods:
            start_str = period.get("start", "")
            if "T" in start_str:
                busy_slots.append(start_str.split("T")[1][:5])

        # Synthesize free slots list from 09:00 to 17:00 in 1-hour slots
        all_slots = [f"{hour:02d}:00" for hour in range(9, 17)]
        free_slots = [slot for slot in all_slots if slot not in busy_slots]

        return {
            "status": "success",
            "date": date_str,
            "available_slots": free_slots if free_slots else "No slots free on this day."
        }
    except Exception as e:
        logger.error(f"Failed to check calendar availability: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/create-booking")
async def create_booking(request: Request, tenant_id: str, lead_id: str, background_tasks: BackgroundTasks):
    """
    Synchronous Webhook tool called by the LLM to book a meeting.
    Creates Google Calendar invite and writes back 'Booked' status + Event Link
    directly into the customer's Google Sheet row in real-time.
    Also fires a booking confirmation SMS to the lead (Upgrade 2).
    """
    try:
        tenant_uuid = uuid.UUID(tenant_id)
        lead_uuid = uuid.UUID(lead_id)
        payload = await request.json()
        logger.info(f"Create booking tool call: {payload}")

        date_str = payload.get("date")  # YYYY-MM-DD
        time_str = payload.get("time")  # HH:MM

        if not date_str or not time_str:
            return {"status": "error", "message": "Missing date or time."}

        with Session(engine) as db:
            tenant = db.get(Tenant, tenant_uuid)
            lead = db.get(CampaignLead, lead_uuid)
            if not tenant or not lead:
                return {"status": "error", "message": "Tenant or Lead not found."}

            token = await get_valid_google_token(tenant, db)
            if not token:
                return {"status": "error", "message": "Auth failure."}

        # 1. Create Google Calendar Event
        dt_start = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        dt_end = dt_start + timedelta(minutes=45)
        calendar_id = tenant.google_calendar_id or "primary"

        event_body = {
            "summary": f"AIxCaller Sales Consultation: {lead.name}",
            "description": f"Scheduled automatically by AI Outbound Campaign Sales Agent.",
            "start": {"dateTime": dt_start.isoformat(), "timeZone": "UTC"},
            "end":   {"dateTime": dt_end.isoformat(),   "timeZone": "UTC"},
        }
        if lead.email:
            event_body["attendees"] = [{"email": lead.email}]

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json=event_body
            )
            resp.raise_for_status()
            event_data = resp.json()
            event_link = event_data.get("htmlLink", "")

        # 2. Update lead DB state + appointment_datetime (Upgrade 4 — reminder engine uses this)
        with Session(engine) as db:
            lead = db.get(CampaignLead, lead_uuid)
            if lead:
                lead.status = "answered"
                lead.appointment_datetime = dt_start.replace(tzinfo=timezone.utc)
                db.add(lead)
                db.commit()
                db.refresh(lead)

        # 3. Two-Way Google Sheet Writeback
        with Session(engine) as db:
            lead = db.get(CampaignLead, lead_uuid)
            tenant = db.get(Tenant, tenant_uuid)          # re-fetch with open session
            campaign = db.get(Campaign, lead.campaign_id) if lead else None
            agent = db.get(Agent, campaign.agent_id) if campaign else None
            sheet_config = agent.tools_config.get("google_sheets", {}) if agent else {}
            sheet_id = sheet_config.get("sheet_id")
            sheet_name = sheet_config.get("sheet_name", "Sheet1")
            row_num = lead.variables.get("sheet_row_number") if lead else None

            if sheet_id and row_num and tenant:
                await sheet_poller.writeback_lead_status(
                    tenant=tenant,
                    sheet_id=sheet_id,
                    sheet_name=sheet_name,
                    row_number=int(row_num),
                    call_result="Appointment Booked",
                    campaign_status="Booked",
                    booking_date=date_str,
                    booking_time=time_str,
                    booking_link=event_link
                )

            # 4. Fire booking confirmation SMS in background (Upgrade 2)
            if campaign and agent and agent.phone_number and lead:
                background_tasks.add_task(
                    send_booked_sms,
                    campaign=campaign,
                    lead=lead,
                    from_number=agent.phone_number,
                    appointment_date=date_str,
                    appointment_time=time_str,
                    booking_link=event_link,
                )

        return {
            "status": "success",
            "message": "Appointment successfully booked!",
            "calendar_event_link": event_link
        }
    except Exception as e:
        logger.error(f"Failed to create Google Calendar booking: {e}")
        return {"status": "error", "message": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# 3. POST-CALL ANALYTICS WEBHOOK
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/conversation-ended")
async def handle_conversation_ended(request: Request, lead_id: str, db: Session = Depends(get_db)):
    """
    Telnyx fires this webhook when a call.conversation.ended event occurs
    for an outbound campaign call.

    Full pipeline:
      1. Fetch full conversation transcript from Telnyx /v2/ai/conversations API
      2. Save transcript + analytics to CampaignLead (opt-out detection)
      3. Route through shared call_processor.py:
           - OpenAI analytics (summary, sentiment, action items)
           - Atomic minute billing on Tenant
           - Airtable call log
           - HTML email summary via Resend
           - Custom webhook POST
           - HubSpot sync
           - Salesforce sync
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        return {"status": "error", "message": "Invalid lead_id"}

    payload = await request.json()
    logger.info(f"Outbound conversation-ended webhook received for lead {lead_id}: {payload}")

    # ── 1. Extract event metadata ──────────────────────────────────────────────
    data_block = payload.get("data", {})
    event_payload = data_block.get("payload", {}) if isinstance(data_block, dict) else payload.get("payload", {})
    if not event_payload:
        event_payload = payload

    conversation_id  = event_payload.get("conversation_id")
    call_control_id  = event_payload.get("call_control_id", "unknown")
    duration_secs    = int(event_payload.get("duration_sec", event_payload.get("duration_seconds", 0)))
    from_number      = event_payload.get("from") or event_payload.get("from_number", "unknown")
    to_number        = event_payload.get("to")   or event_payload.get("to_number",   "unknown")

    # ── 2. Fetch lead + campaign + agent ──────────────────────────────────────
    lead = db.get(CampaignLead, lead_uuid)
    if not lead:
        logger.warning(f"CampaignLead {lead_id} not found.")
        return {"status": "not_found"}

    campaign = db.get(Campaign, lead.campaign_id)
    if not campaign:
        logger.error(f"Campaign {lead.campaign_id} not found for lead {lead_id}.")
        return {"status": "error", "message": "Campaign not found"}

    agent = db.get(Agent, campaign.agent_id)

    # Use agent phone as from_number if payload is missing it
    if (not from_number or from_number == "unknown") and agent and agent.phone_number:
        from_number = agent.phone_number

    # ── 3. Fetch full transcript from Telnyx Conversations API ────────────────
    api_key = os.environ.get("TELNYX_API_KEY")
    transcript_messages = []

    if conversation_id and api_key:
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(
                    f"https://api.telnyx.com/v2/ai/conversations/{conversation_id}/messages",
                    headers={"Authorization": f"Bearer {api_key}", "Accept": "application/json"},
                )
                if resp.status_code == 200:
                    for msg in resp.json().get("data", []):
                        role    = msg.get("role", "")
                        content = msg.get("content", "")
                        if role and content:
                            transcript_messages.append({"role": role, "content": content})
                    logger.info(f"Fetched {len(transcript_messages)} transcript messages for outbound lead {lead_id}")
                else:
                    logger.error(f"Telnyx transcript fetch failed ({resp.status_code}): {resp.text}")
            except Exception as ex:
                logger.error(f"Exception fetching transcript for lead {lead_id}: {ex}")
    else:
        if not conversation_id:
            logger.warning(f"No conversation_id in outbound webhook for lead {lead_id} — transcript will be empty.")
        if not api_key:
            logger.error("TELNYX_API_KEY not set — cannot fetch transcript.")

    # ── 4. Persist raw transcript + basic fields to CampaignLead ─────────────
    import json as _json
    transcript_str = _json.dumps(transcript_messages) if transcript_messages else ""
    lead.call_transcript = transcript_str
    lead.call_duration_seconds = duration_secs
    lead.updated_at = datetime.utcnow()

    # Opt-out detection
    OPT_OUT_PHRASES = [
        "don't call", "do not call", "remove me", "stop calling",
        "not interested", "take me off", "unsubscribe"
    ]
    flat_text = " ".join(m.get("content", "") for m in transcript_messages).lower()
    if flat_text and any(phrase in flat_text for phrase in OPT_OUT_PHRASES):
        lead.opted_out = True
        lead.status = "opted_out"
        logger.info(f"Opt-out detected in transcript for outbound lead {lead.name} — marked opted_out.")
    elif lead.status not in ("voicemail", "opted_out", "booked"):
        lead.status = "completed"

    db.add(lead)
    db.commit()

    # ── 5. Route through shared call_processor pipeline ───────────────────────
    # Imports here to avoid circular import at module load time
    from shared.database import engine as shared_engine
    from backend.services.call_processor import process_completed_call
    from sqlmodel import Session as SharedSession

    try:
        # call_processor needs its own session that it controls commit/rollback on
        with SharedSession(shared_engine) as proc_db:
            result = await process_completed_call(
                tenant_id=campaign.tenant_id,
                agent_id=campaign.agent_id,
                from_number=lead.phone,          # caller = the lead for outbound
                to_number=from_number,            # agent's number
                call_id=call_control_id,
                transcript=transcript_messages,
                duration_seconds=duration_secs,
                db=proc_db,
            )
        logger.info(f"Outbound call_processor pipeline complete for lead {lead_id}: {result}")
    except Exception as proc_ex:
        logger.error(f"call_processor pipeline failed for outbound lead {lead_id}: {proc_ex}")

    return {"status": "ok", "lead_id": lead_id}


