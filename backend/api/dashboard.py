from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
import uuid
from shared.database import engine
from shared.models import Agent, VoiceOption, CallRecord
from ..services.analytics import AnalyticsService
from ..services.crm import ZohoCRMService
from ..services.integrations import IntegrationService
from ..main import get_db
from .telegram import send_telegram_message

router = APIRouter(prefix="/api/v1", tags=["dashboard"])
analytics_service = AnalyticsService()

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
    new_agent = Agent(
        tenant_id=uuid.UUID(req.tenant_id),
        name=req.name,
        system_prompt=req.system_prompt,
        voice_id=req.voice_id
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
    statement = select(Agent).where(Agent.tenant_id == tenant_id)
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
    statement = select(CallRecord).where(CallRecord.tenant_id == tenant_id).order_by(CallRecord.created_at.desc())
    calls = db.exec(statement).all()
    return calls

@router.post("/process-call-data")
async def process_call_data(data: dict, db: Session = Depends(get_db)):
    """
    Internal endpoint called by Voice Engine to save transcript and trigger analytics.
    """
    call_id = data.get("call_id")
    transcript = data.get("transcript")
    
    # 1. Create the Call Record
    new_call = CallRecord(
        id=uuid.UUID(call_id),
        tenant_id=uuid.UUID(data.get("tenant_id")),
        agent_id=uuid.UUID(data.get("agent_id")),
        from_number=data.get("from_number", "unknown"),
        to_number=data.get("to_number", "unknown"),
        transcript=transcript
    )
    
    # 2. Run AI Analytics (Summary, Sentiment, Action Items)
    analysis = await analytics_service.analyze_call(transcript)
    if analysis:
        new_call.summary = analysis.get("summary")
        new_call.sentiment = analysis.get("sentiment")
        new_call.action_items = str(analysis.get("action_items"))
        
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

    # Telegram Alert
    if tenant.telegram_chat_id:
        try:
            msg = f"📞 *New Call Summary*\n\n*Phone:* {new_call.from_number}\n*Sentiment:* {new_call.sentiment}\n*Summary:* {new_call.summary}"
            if new_call.action_items and new_call.action_items != "None":
                msg += f"\n*Action Items:* {new_call.action_items}"
            await send_telegram_message(tenant.telegram_chat_id, msg)
        except Exception: pass

    return {"status": "success"}
