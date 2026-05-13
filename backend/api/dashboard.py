from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
import uuid, json
from pydantic import BaseModel
from shared.database import engine
from shared.models import Agent, VoiceOption, CallRecord, Tenant
from backend.services.analytics import AnalyticsService
from backend.services.crm import ZohoCRMService
from backend.services.integrations import IntegrationService
from shared.database import get_db
from backend.api.telegram import send_telegram_message
from backend.services.email import send_call_summary_email
from backend.services.agent_templates import list_templates, get_template

router = APIRouter(prefix="/api/v1", tags=["dashboard"])
analytics_service = AnalyticsService()


# ── Marketplace: pre-built agent templates ──────────────────────────────────
@router.get("/agent-templates")
async def get_agent_templates():
    """Public list of marketplace templates (Healthcare, E-commerce, etc.)."""
    return {"templates": list_templates()}


class CreateFromTemplateRequest(BaseModel):
    template_id: str
    tenant_id: str
    business_name: str
    agent_name: Optional[str] = None   # override template's default_name


@router.post("/agents/from-template", response_model=Agent)
async def create_agent_from_template(req: CreateFromTemplateRequest, db: Session = Depends(get_db)):
    """Spin up a new agent pre-configured from a marketplace template."""
    template = get_template(req.template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{req.template_id}' not found")

    tenant_uuid = uuid.UUID(req.tenant_id)
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_agent = Agent(
        tenant_id=tenant_uuid,
        name=req.agent_name or template["default_name"],
        business_name=req.business_name,
        system_prompt=template["system_prompt"],
        voice_id=template["voice_id"],
        template_id=template["id"],
        kb_namespace=f"kb_{tenant_uuid.hex[:8]}_{uuid.uuid4().hex[:8]}"
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent


# ── Integration models ───────────────────────────────────────────────────────
# Shopify is per-agent (see backend/api/shopify.py for OAuth).
# Zoho is per-tenant (see backend/api/zoho.py for OAuth — uses zoho_org_id only).
# Webhooks (Zapier/Make.com) removed — were unauthenticated outbound POSTs.
class IntegrationSettings(BaseModel):
    zoho_org_id:           Optional[str] = None
    email_summary_enabled: Optional[bool] = None

class AgentConfig(BaseModel):
    name: Optional[str] = None
    system_prompt: Optional[str] = None
    voice_id: Optional[str] = None
    idle_timeout: Optional[int] = None
    forwarding_number: Optional[str] = None


@router.get("/integrations")
async def get_integrations(tenant_id: str, db: Session = Depends(get_db)):
    """Return current integration settings for a tenant."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "zoho_connected":        bool(tenant.zoho_refresh_token),
        "zoho_org_id":           tenant.zoho_org_id,
        "zoho_domain":           tenant.zoho_domain,
        "email_summary_enabled": tenant.email_summary_enabled,
        "contact_email":         tenant.contact_email,
        "google_connected":      getattr(tenant, "google_connected", False),
        "google_calendar_id":    getattr(tenant, "google_calendar_id", "primary"),
        "google_sheet_id":       getattr(tenant, "google_sheet_id", None),
        "google_sheet_name":     getattr(tenant, "google_sheet_name", "Leads"),
    }


@router.patch("/integrations")
async def save_integrations(
    tenant_id: str,
    settings:  IntegrationSettings,
    db:        Session = Depends(get_db)
):
    """Save integration credentials for a tenant."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if settings.zoho_org_id         is not None: tenant.zoho_org_id         = settings.zoho_org_id
    if settings.email_summary_enabled is not None: tenant.email_summary_enabled = settings.email_summary_enabled

    db.add(tenant); db.commit()
    return {"status": "saved"}


@router.delete("/integrations/{key}")
async def disconnect_integration(key: str, tenant_id: str, db: Session = Depends(get_db)):
    """Disconnect a specific integration by key."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    def _disconnect_zoho(t):
        t.zoho_access_token = None
        t.zoho_refresh_token = None
        t.zoho_domain = None
        t.zoho_token_expires_at = None
        t.zoho_org_id = None

    field_map = {
        "zoho": _disconnect_zoho,
    }
    if key in field_map:
        field_map[key](tenant)
        db.add(tenant); db.commit()
    return {"status": "disconnected"}


@router.get("/voices", response_model=List[VoiceOption])
async def get_available_voices(db: Session = Depends(get_db)):
    """
    Returns the list of all available AI voices with their preview URLs.
    """
    statement = select(VoiceOption)
    voices = db.exec(statement).all()
    return voices

from pydantic import BaseModel
class CreateAgentRequest(BaseModel):
    name: str
    business_name: Optional[str] = None
    system_prompt: str
    voice_id: str = "aura-asteria-en"
    tenant_id: str
    template_id: Optional[str] = None


# ─── Plan limits ─────────────────────────────────────────────────────────────
# Agent slots per plan tier — only counts agents WITH a phone number assigned.
PLAN_AGENT_LIMITS = {
    "free":     1,
    "starter":  2,   # $50 plan
    "pro":      10,  # $119 plan
    "premium":  100, # $250 plan
}


def _count_active_agents(db: Session, tenant_id: uuid.UUID) -> int:
    """Counts agents that have a phone number assigned (don't count drafts)."""
    statement = select(Agent).where(
        Agent.tenant_id == tenant_id,
        Agent.phone_number.is_not(None),
    )
    return len(db.exec(statement).all())


@router.post("/agents", response_model=Agent)
async def create_agent(req: CreateAgentRequest, db: Session = Depends(get_db)):
    """
    Creates a new agent for the given tenant.
    Note: plan limit only counts agents with a phone number assigned.
    """
    tenant_uuid = uuid.UUID(req.tenant_id)
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # ── Strict Plan Limit Check ──────────────────────────────────────────────
    # We count ALL agents (including drafts) to strictly enforce the plan's 
    # slot limit as requested.
    total_agents = db.exec(select(Agent).where(Agent.tenant_id == tenant_uuid)).all()
    limit = PLAN_AGENT_LIMITS.get(tenant.plan_tier, 1)
    
    if len(total_agents) >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"Your {tenant.plan_tier} plan allows up to {limit} agent(s). You have already reached this limit."
        )
    # ─────────────────────────────────────────────────────────────────────────

    new_agent = Agent(
        tenant_id=tenant_uuid,
        name=req.name,
        business_name=req.business_name,
        system_prompt=req.system_prompt,
        voice_id=req.voice_id,
        template_id=req.template_id,
        kb_namespace=f"kb_{tenant_uuid.hex[:8]}_{uuid.uuid4().hex[:8]}"
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent


@router.get("/agents/{agent_id}/transfer-availability")
async def get_transfer_availability(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """Returns whether human-transfer is currently available for this agent
    (enabled + forwarding number set + inside staffed hours)."""
    from shared.transfer_hours import is_human_transfer_available
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    available, reason = is_human_transfer_available(
        enabled=getattr(agent, "human_transfer_enabled", False),
        forwarding_number=agent.forwarding_number,
        timezone=getattr(agent, "human_transfer_timezone", "UTC"),
        hours=getattr(agent, "human_transfer_hours", {}) or {},
    )
    return {"available": available, "reason": reason}


@router.get("/agents/limits")
async def get_agent_limits(tenant_id: str, db: Session = Depends(get_db)):
    """Returns current active agent count + plan limit for the UI to show usage."""
    tenant_uuid = uuid.UUID(tenant_id)
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    used = _count_active_agents(db, tenant_uuid)
    limit = PLAN_AGENT_LIMITS.get(tenant.plan_tier, 1)
    return {
        "plan_tier": tenant.plan_tier,
        "agents_used": used,
        "agents_limit": limit,
        "can_assign_number": used < limit,
    }

@router.get("/agents", response_model=List[Agent])
async def get_my_agents(tenant_id: str, db: Session = Depends(get_db)):
    """
    Returns all agents belonging to the specific tenant.
    """
    import uuid
    tenant_uuid = uuid.UUID(tenant_id)
    statement = select(Agent).where(Agent.tenant_id == tenant_uuid)
    agents = db.exec(statement).all()
    return agents

@router.patch("/agents/{agent_id}", response_model=Agent)
async def update_agent_config(agent_id: uuid.UUID, config: dict, db: Session = Depends(get_db)):
    """
    Updates an agent's settings (voice, prompt, timeout, etc.)
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update only provided fields
    for key, value in config.items():
        if hasattr(agent, key):
            setattr(agent, key, value)
    
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent

@router.get("/calls", response_model=List[CallRecord])
async def get_call_history(tenant_id: str, db: Session = Depends(get_db)):
    import uuid
    tenant_uuid = uuid.UUID(tenant_id)
    statement = select(CallRecord).where(CallRecord.tenant_id == tenant_uuid).order_by(CallRecord.created_at.desc())
    calls = db.exec(statement).all()
    return calls

@router.post("/process-call-data")
async def process_call_data(data: dict, db: Session = Depends(get_db)):
    """
    Internal endpoint called by Voice Engine to save transcript and trigger analytics.
    """
    call_id = data.get("call_id")
    transcript = data.get("transcript")

    # transcript arrives as a list of message dicts from context.get_messages().
    # psycopg2 cannot adapt a Python list/dict → must serialize to JSON string for Text column.
    if isinstance(transcript, list):
        transcript_str = json.dumps(transcript)
    else:
        transcript_str = str(transcript or "")

    # 1. Create the Call Record
    # call_id from voice engine is the Telnyx call_control_id (format: "v3:xxx...")
    # which is NOT a UUID. We generate a fresh UUID for the DB record.
    duration_sec = int(data.get("duration_seconds", 0))
    new_call = CallRecord(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(data.get("tenant_id")),
        agent_id=uuid.UUID(data.get("agent_id")),
        from_number=data.get("from_number", "unknown"),
        to_number=data.get("to_number", "unknown"),
        transcript=transcript_str,
        duration_seconds=duration_sec,
    )

    # 2. Run AI Analytics (Summary, Sentiment, Action Items)
    # Pass the original list so analytics can skip system messages cleanly.
    analysis = await analytics_service.analyze_call(transcript)
    if analysis:
        new_call.summary = analysis.get("summary")
        new_call.sentiment = analysis.get("sentiment")
        # Serialize action_items list to string for Text column
        action_items = analysis.get("action_items", [])
        new_call.action_items = json.dumps(action_items) if isinstance(action_items, list) else str(action_items)

    db.add(new_call)

    # 2b. Increment tenant's minutes_used so we can enforce plan limits
    tenant = db.get(Tenant, uuid.UUID(data.get("tenant_id")))
    if tenant and duration_sec > 0:
        tenant.minutes_used = (tenant.minutes_used or 0.0) + (duration_sec / 60.0)
        db.add(tenant)

    db.commit()

    if not tenant:
        return {"status": "success"}

    payload = {
        "call_id": call_id,
        "phone": new_call.from_number,
        "transcript": transcript,
        "summary": new_call.summary,
        "sentiment": new_call.sentiment
    }

    # ── Zoho CRM Sync (OAuth, auto-refresh) ───────────────────────────────
    if tenant.zoho_refresh_token:
        try:
            crm_service = ZohoCRMService(tenant, db_session=db)
            await crm_service.upsert_lead_from_call(
                phone=new_call.from_number,
                summary=new_call.summary or "",
                sentiment=new_call.sentiment or "neutral",
                call_id=str(new_call.id),
            )
        except Exception as e:
            logger.warning(f"Zoho sync failed for tenant {tenant.id}: {e}")

    # HubSpot Sync (legacy — no OAuth yet, kept off by default)
    if tenant.hubspot_api_key:
        try:
            await IntegrationService.push_to_hubspot(tenant.hubspot_api_key, payload)
        except Exception:
            pass

    # NOTE: Zapier/Make.com webhook integration was removed in v2 — it was
    # an unauthenticated arbitrary outbound POST with no allowlist.

    # Resend — Call Summary Email (Default ON, tied to contact_email)
    if tenant.email_summary_enabled and tenant.contact_email:
        try:
            await send_call_summary_email(
                to_email=tenant.contact_email,
                data={
                    "call_id":      str(new_call.id),
                    "phone":        new_call.from_number,
                    "summary":      new_call.summary or "",
                    "sentiment":    new_call.sentiment or "neutral",
                    "action_items": new_call.action_items or "None",
                    "transcript":   transcript or "",
                }
            )
        except Exception as e:
            logger.error(f"Resend email error: {e}")

    return {"status": "success"}
