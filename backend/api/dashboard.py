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

router = APIRouter(prefix="/api/v1", tags=["dashboard"])
analytics_service = AnalyticsService()


# ── Integration models ───────────────────────────────────────────────────────
class IntegrationSettings(BaseModel):
    shopify_store_url:  Optional[str] = None
    shopify_api_key:    Optional[str] = None
    zoho_access_token:  Optional[str] = None
    zoho_org_id:        Optional[str] = None
    webhook_url:        Optional[str] = None
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
        "shopify_store_url":  tenant.tools_config.get("shopify", {}).get("store_url") if hasattr(tenant, "tools_config") else None,
        "shopify_api_key":    tenant.tools_config.get("shopify", {}).get("api_key")   if hasattr(tenant, "tools_config") else None,
        "zoho_access_token":  tenant.zoho_access_token,
        "zoho_org_id":        tenant.zoho_org_id,
        "webhook_url":        tenant.webhook_url,
        "email_summary_enabled": tenant.email_summary_enabled,
        "contact_email":      tenant.contact_email, # For UI info
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

    if settings.zoho_access_token  is not None: tenant.zoho_access_token  = settings.zoho_access_token
    if settings.zoho_org_id         is not None: tenant.zoho_org_id         = settings.zoho_org_id
    if settings.webhook_url         is not None: tenant.webhook_url         = settings.webhook_url
    if settings.email_summary_enabled is not None: tenant.email_summary_enabled = settings.email_summary_enabled

    db.add(tenant); db.commit()
    return {"status": "saved"}


@router.delete("/integrations/{key}")
async def disconnect_integration(key: str, tenant_id: str, db: Session = Depends(get_db)):
    """Disconnect a specific integration by key."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    field_map = {
        "zoho":     lambda t: setattr(t, "zoho_access_token", None) or setattr(t, "zoho_org_id", None),
        "webhook":  lambda t: setattr(t, "webhook_url", None),
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
    system_prompt: str
    voice_id: str = "aura-asteria-en"
    tenant_id: str

@router.post("/agents", response_model=Agent)
async def create_agent(req: CreateAgentRequest, db: Session = Depends(get_db)):
    """
    Creates a new agent for the given tenant.
    """
    import uuid
    tenant_uuid = uuid.UUID(req.tenant_id)
    new_agent = Agent(
        tenant_id=tenant_uuid,
        name=req.name,
        system_prompt=req.system_prompt,
        voice_id=req.voice_id,
        kb_namespace=f"kb_{tenant_uuid.hex[:8]}_{uuid.uuid4().hex[:8]}"
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)
    return new_agent

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
    new_call = CallRecord(
        id=uuid.uuid4(),
        tenant_id=uuid.UUID(data.get("tenant_id")),
        agent_id=uuid.UUID(data.get("agent_id")),
        from_number=data.get("from_number", "unknown"),
        to_number=data.get("to_number", "unknown"),
        transcript=transcript_str
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
    db.commit()

    # 3. CRM & Webhook Automation (Push-Only)
    tenant = db.get(Tenant, uuid.UUID(data.get("tenant_id")))
    if not tenant:
        return {"status": "success"}

    payload = {
        "call_id": call_id,
        "phone": new_call.from_number,
        "transcript": transcript,
        "summary": new_call.summary,
        "sentiment": new_call.sentiment
    }

    # Zoho Sync
    if tenant.zoho_access_token:
        try:
            crm_service = ZohoCRMService(tenant.zoho_access_token)
            await crm_service.create_lead(
                last_name=f"Call_{new_call.id.hex[:6]}",
                company="AIxcaller Lead",
                phone=new_call.from_number
            )
        except Exception: pass

    # HubSpot Sync
    if tenant.hubspot_api_key:
        try:
            await IntegrationService.push_to_hubspot(tenant.hubspot_api_key, payload)
        except Exception: pass

    # Custom Webhook (Zapier/Make.com)
    if tenant.webhook_url:
        try:
            await IntegrationService.push_to_webhook(tenant.webhook_url, payload)
        except Exception: pass

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
