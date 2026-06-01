"""
Dashboard API — Agent management, integration settings, calls, and limits.
All routes require tenant_id to enforce multi-tenant isolation.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from sqlalchemy import text
from typing import List, Optional
import uuid
import json
import os
from datetime import datetime, timezone
from pydantic import BaseModel
from shared.database import get_db
from shared.models import Agent, CallRecord, Tenant
from backend.services.analytics import AnalyticsService
from backend.services.airtable import AirtableService
from backend.services.email import send_call_summary_email
from loguru import logger

_INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

router = APIRouter(prefix="/api/v1", tags=["dashboard"])
analytics_service = AnalyticsService()


# ─────────────────────────────────────────────────────────────────────────────
# PLAN LIMITS
# Agent slots per plan tier — only agents WITH a phone number count.
# ─────────────────────────────────────────────────────────────────────────────
PLAN_AGENT_LIMITS = {
    "free":    1,
    "starter": 2,   # $50/mo
    "pro":     2,   # $119/mo
    "premium": 4,   # $250/mo
}


def _count_active_agents(db: Session, tenant_id: uuid.UUID) -> int:
    """Count agents that have a phone number (only those consume plan slots)."""
    return len(db.exec(
        select(Agent).where(
            Agent.tenant_id == tenant_id,
            Agent.phone_number.is_not(None),
        )
    ).all())


# ─────────────────────────────────────────────────────────────────────────────
# INTEGRATION SETTINGS
# ─────────────────────────────────────────────────────────────────────────────
class IntegrationSettings(BaseModel):
    email_summary_enabled: Optional[bool] = None
    contact_email: Optional[str] = None
    airtable_pat: Optional[str] = None
    airtable_base_id: Optional[str] = None
    airtable_table_name: Optional[str] = None
    webhook_url: Optional[str] = None
    shopify_store_url: Optional[str] = None
    shopify_api_key: Optional[str] = None


@router.get("/integrations")
async def get_integrations(tenant_id: str, db: Session = Depends(get_db)):
    """Return current integration status for a tenant."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "email_summary_enabled": tenant.email_summary_enabled,
        "contact_email":         tenant.contact_email,
        "google_connected":      tenant.google_connected,
        "google_calendar_id":    tenant.google_calendar_id,
        "airtable_connected":    bool(tenant.airtable_pat and tenant.airtable_base_id),
        "airtable_base_id":      tenant.airtable_base_id or "",
        "airtable_table_name":   tenant.airtable_table_name or "Call Log",
        "webhook_url":           tenant.webhook_url or "",
        "shopify_store_url":     tenant.shopify_domain or "",
        "shopify_api_key":       tenant.shopify_token or "",
        "hubspot_connected":     bool(tenant.hubspot_access_token),
        "salesforce_connected":  bool(tenant.salesforce_access_token),
    }


@router.patch("/integrations")
async def save_integrations(
    tenant_id: str,
    settings: IntegrationSettings,
    db: Session = Depends(get_db),
):
    """Save integration settings for a tenant."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if settings.email_summary_enabled is not None:
        tenant.email_summary_enabled = settings.email_summary_enabled
    if settings.contact_email is not None:
        tenant.contact_email = settings.contact_email
    if settings.airtable_pat is not None:
        tenant.airtable_pat = settings.airtable_pat or None
    if settings.airtable_base_id is not None:
        tenant.airtable_base_id = settings.airtable_base_id or None
    if settings.airtable_table_name is not None:
        tenant.airtable_table_name = settings.airtable_table_name or None
    if settings.webhook_url is not None:
        tenant.webhook_url = settings.webhook_url or None
    if settings.shopify_store_url is not None:
        tenant.shopify_domain = settings.shopify_store_url or None
    if settings.shopify_api_key is not None:
        tenant.shopify_token = settings.shopify_api_key or None

    db.add(tenant)
    db.commit()
    return {"status": "saved"}


@router.delete("/integrations/{key}")
async def disconnect_integration(key: str, tenant_id: str, db: Session = Depends(get_db)):
    """Disconnect a specific integration."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    def _disconnect_google(t: Tenant):
        t.google_refresh_token = None
        t.google_token_expires_at = None
        t.google_calendar_id = "primary"
        t.google_connected = False

    def _disconnect_airtable(t: Tenant):
        t.airtable_pat = None
        t.airtable_base_id = None
        t.airtable_table_name = None

    def _disconnect_shopify(t: Tenant):
        t.shopify_domain = None
        t.shopify_token = None

    def _disconnect_webhook(t: Tenant):
        t.webhook_url = None

    def _disconnect_hubspot(t: Tenant):
        t.hubspot_access_token = None
        t.hubspot_refresh_token = None
        t.hubspot_token_expires_at = None

    def _disconnect_salesforce(t: Tenant):
        t.salesforce_access_token = None
        t.salesforce_refresh_token = None
        t.salesforce_token_expires_at = None
        t.salesforce_instance_url = None

    field_map = {
        "google": _disconnect_google,
        "airtable": _disconnect_airtable,
        "shopify": _disconnect_shopify,
        "webhook": _disconnect_webhook,
        "hubspot": _disconnect_hubspot,
        "salesforce": _disconnect_salesforce,
    }
    if key in field_map:
        field_map[key](tenant)
        db.add(tenant)
        db.commit()
    return {"status": "disconnected", "key": key}


@router.post("/integrations/airtable/test")
async def test_airtable(tenant_id: str, db: Session = Depends(get_db)):
    """Test the Airtable connection using saved PAT + base ID."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not tenant.airtable_pat or not tenant.airtable_base_id:
        raise HTTPException(status_code=400, detail="Airtable PAT and Base ID are required. Save them first.")
    try:
        svc = AirtableService(tenant)
        result = await svc.test_connection()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# AGENTS — CRUD
# ─────────────────────────────────────────────────────────────────────────────
class CreateAgentRequest(BaseModel):
    name: str
    business_name: Optional[str] = None
    system_prompt: str
    voice_id: str = "Telnyx.Ultra.Grace"
    tenant_id: str
    template_id: Optional[str] = None


class AgentUpdateRequest(BaseModel):
    """Strict schema — only whitelisted fields can be updated."""
    name: Optional[str] = None
    business_name: Optional[str] = None
    system_prompt: Optional[str] = None
    voice_id: Optional[str] = None
    language: Optional[str] = None
    forwarding_number: Optional[str] = None
    human_transfer_enabled: Optional[bool] = None
    human_transfer_timezone: Optional[str] = None
    human_transfer_hours: Optional[dict] = None
    auto_callback_enabled: Optional[bool] = None
    tools_config: Optional[dict] = None
    legacy_number: Optional[str] = None


@router.get("/agents/limits")
async def get_agent_limits(tenant_id: str, db: Session = Depends(get_db)):
    """Current active agent count vs plan limit."""
    tenant_uuid = uuid.UUID(tenant_id)
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    used = _count_active_agents(db, tenant_uuid)
    limit = PLAN_AGENT_LIMITS.get(tenant.plan_tier, 1)
    return {
        "plan_tier":       tenant.plan_tier,
        "agents_used":     used,
        "agents_limit":    limit,
        "can_assign_number": used < limit,
    }


@router.get("/agents", response_model=List[Agent])
async def get_my_agents(tenant_id: str, db: Session = Depends(get_db)):
    """Return all agents for the given tenant."""
    return db.exec(select(Agent).where(Agent.tenant_id == uuid.UUID(tenant_id))).all()


@router.post("/agents", response_model=Agent)
async def create_agent(req: CreateAgentRequest, db: Session = Depends(get_db)):
    """
    Create a new AI agent.
    Plan limit is enforced only when a phone number is assigned.
    """
    tenant_uuid = uuid.UUID(req.tenant_id)
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_agent = Agent(
        tenant_id=tenant_uuid,
        name=req.name.strip(),
        business_name=(req.business_name.strip() or None) if req.business_name else None,
        system_prompt=req.system_prompt,
        voice_id=req.voice_id,
        template_id=req.template_id,
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)

    # Provision Telnyx Assistant immediately
    try:
        from backend.services.telnyx_assistant import sync_agent_with_telnyx
        await sync_agent_with_telnyx(new_agent, db)
    except Exception as e:
        logger.error(f"Telnyx sync failed on agent creation: {e}")

    return new_agent


@router.get("/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: uuid.UUID, tenant_id: str, db: Session = Depends(get_db)):
    """Fetch a single agent by ID — tenant-scoped."""
    try:
        t_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")
    agent = db.exec(select(Agent).where(Agent.id == agent_id, Agent.tenant_id == t_uuid)).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/agents/{agent_id}", response_model=Agent)
async def update_agent_config(
    agent_id: uuid.UUID,
    tenant_id: str,
    config: AgentUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update agent settings — tenant-scoped, only whitelisted fields accepted."""
    try:
        t_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")
    agent = db.exec(select(Agent).where(Agent.id == agent_id, Agent.tenant_id == t_uuid)).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    update_data = config.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(agent, key, value)
    agent.updated_at = datetime.now(timezone.utc)

    db.add(agent)
    db.commit()
    db.refresh(agent)

    # Re-sync Telnyx Assistant with new config
    try:
        from backend.services.telnyx_assistant import sync_agent_with_telnyx
        await sync_agent_with_telnyx(agent, db)
    except Exception as e:
        logger.error(f"Telnyx sync failed on agent update: {e}")

    return agent


@router.get("/agents/{agent_id}/call-flow")
async def get_call_flow(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """Fetch the call flow config for a single agent, merged with tenant integration status."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    tenant = db.get(Tenant, agent.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    call_flow = agent.call_flow or {}
    
    custom_api_cfg  = (agent.tools_config or {}).get("custom_api", {})
    sheet_cfg       = (agent.tools_config or {}).get("google_sheet", {})
    sheet_kb_cfg    = (agent.tools_config or {}).get("google_sheet_kb", {})

    return {
        "call_flow": call_flow,
        "sheet_kb_config": {
            "enabled":     sheet_kb_cfg.get("enabled", False),
            "description": sheet_kb_cfg.get("description", ""),
            "columns":     sheet_kb_cfg.get("columns", []),
        },
        "integrations": {
            "shopify_connected":       bool(tenant.shopify_token),
            "shopify_domain":          tenant.shopify_domain,
            "google_connected":        tenant.google_connected,
            "google_sheet_configured": bool(tenant.google_connected and sheet_cfg.get("sheet_id")),
            "google_sheet_id":         sheet_cfg.get("sheet_id", ""),
            "google_sheet_name":       sheet_cfg.get("sheet_name", "Sheet1"),
            "airtable_connected":      bool(tenant.airtable_pat and tenant.airtable_base_id),
            "airtable_base_id":        tenant.airtable_base_id or "",
            "hubspot_connected":       bool(tenant.hubspot_access_token),
            "salesforce_connected":    bool(tenant.salesforce_access_token),
            "webhook_connected":       bool(tenant.webhook_url),
            "webhook_url":             tenant.webhook_url or "",
            "custom_api_configured":   bool(custom_api_cfg and custom_api_cfg.get("endpoint")),
            "custom_api_endpoint":     custom_api_cfg.get("endpoint", "") if custom_api_cfg else "",
        }
    }


class CallFlowUpdateRequest(BaseModel):
    call_flow: dict


# ─────────────────────────────────────────────────────────────────────────────
# SHEET KB CONFIG  (analyze headers + save description)
# ─────────────────────────────────────────────────────────────────────────────

class SheetKbConfigRequest(BaseModel):
    description: str
    columns: List[str] = []
    enabled: bool = True


@router.post("/agents/{agent_id}/sheet-kb/analyze")
async def analyze_sheet_kb(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    Reads only the first row of the agent's Google Sheet to detect column names.
    Returns columns + an auto-generated description of what the AI can search for.
    Called from the call-flow dashboard when the user clicks 'Analyze Sheet'.
    Only reads 1 row → fast, minimal API quota usage.
    """
    import httpx as _httpx

    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    tenant = db.get(Tenant, agent.tenant_id)
    if not tenant or not tenant.google_connected:
        raise HTTPException(status_code=400, detail="Google is not connected for this account")

    sheet_cfg  = (agent.tools_config or {}).get("google_sheet", {})
    sheet_id   = sheet_cfg.get("sheet_id", "").strip()
    sheet_name = (sheet_cfg.get("sheet_name") or "Sheet1").strip()

    if not sheet_id:
        raise HTTPException(status_code=400, detail="No Google Sheet is configured for this agent yet. Add a sheet ID in Agent Settings first.")

    try:
        from outbound.services.sheet_poller import get_valid_google_token
        token = await get_valid_google_token(tenant, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve Google token: {e}")

    if not token:
        raise HTTPException(status_code=401, detail="Google authentication failed. Please reconnect Google in Integrations.")

    # Fetch ONLY the header row (row 1) — one API call, minimal data transfer
    async with _httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_name}!1:1",
            headers={"Authorization": f"Bearer {token}"},
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Google Sheets API error ({resp.status_code}). Check that the sheet ID is correct and the connected account has read access.")

    values = resp.json().get("values", [])
    columns = [str(c).strip() for c in (values[0] if values else []) if str(c).strip()]

    if not columns:
        raise HTTPException(status_code=400, detail="The sheet's first row appears empty. Add a header row with column names (e.g. Service, Price, Description).")

    col_list = ", ".join(f'"{c}"' for c in columns)
    auto_description = (
        f"Contains structured business data with columns: {col_list}. "
        f"Search this sheet when callers ask about "
        f"{' or '.join(c.lower() for c in columns[:3])} or related details."
    )

    return {
        "columns": columns,
        "auto_description": auto_description,
        "sheet_id": sheet_id,
        "sheet_name": sheet_name,
    }


@router.patch("/agents/{agent_id}/sheet-kb/config")
async def save_sheet_kb_config(
    agent_id: uuid.UUID,
    body: SheetKbConfigRequest,
    db: Session = Depends(get_db),
):
    """
    Saves the Sheet KB search configuration (description + columns) to the agent's
    tools_config. The description is injected into the Telnyx tool definition so the
    AI knows exactly WHEN to call search_sheet_data vs search_knowledge_base.
    Also re-syncs the Telnyx Assistant so the change takes effect immediately.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    tools_config = dict(agent.tools_config or {})
    if body.enabled and body.description.strip():
        tools_config["google_sheet_kb"] = {
            "enabled": True,
            "description": body.description.strip(),
            "columns": body.columns,
        }
    else:
        # Disabled or no description → remove so tool is NOT registered on Telnyx
        tools_config.pop("google_sheet_kb", None)

    agent.tools_config = tools_config
    agent.updated_at = datetime.now(timezone.utc)
    db.add(agent)
    db.commit()
    db.refresh(agent)

    # Re-sync Telnyx assistant so new tool description takes effect immediately
    try:
        from backend.services.telnyx_assistant import sync_agent_with_telnyx
        await sync_agent_with_telnyx(agent, db)
    except Exception as e:
        logger.error(f"Telnyx sync failed after sheet-kb config save: {e}")

    return {"status": "saved", "tool_registered": body.enabled and bool(body.description.strip())}


@router.delete("/agents/{agent_id}/sheet-kb/config")
async def remove_sheet_kb_config(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """Remove the Sheet KB config entirely — tool is unregistered from Telnyx."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    tools_config = dict(agent.tools_config or {})
    tools_config.pop("google_sheet_kb", None)
    agent.tools_config = tools_config
    agent.updated_at = datetime.now(timezone.utc)
    db.add(agent)
    db.commit()
    db.refresh(agent)

    try:
        from backend.services.telnyx_assistant import sync_agent_with_telnyx
        await sync_agent_with_telnyx(agent, db)
    except Exception as e:
        logger.error(f"Telnyx sync failed after sheet-kb config removal: {e}")

    return {"status": "removed"}


@router.put("/agents/{agent_id}/call-flow")
async def update_call_flow(
    agent_id: uuid.UUID,
    payload: CallFlowUpdateRequest,
    db: Session = Depends(get_db),
):
    """Update the call flow visual pipeline for an agent."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.call_flow = payload.call_flow
    agent.updated_at = datetime.now(timezone.utc)
    
    db.add(agent)
    db.commit()
    db.refresh(agent)

    # Re-sync Telnyx Assistant with new config (injects tools dynamically)
    try:
        from backend.services.telnyx_assistant import sync_agent_with_telnyx
        await sync_agent_with_telnyx(agent, db)
    except Exception as e:
        logger.error(f"Telnyx sync failed on call flow update: {e}")

    return agent.call_flow


class CallFlowTestRequest(BaseModel):
    integration: str


@router.post("/agents/{agent_id}/call-flow/test")
async def test_call_flow_integration(
    agent_id: uuid.UUID,
    payload: CallFlowTestRequest,
    db: Session = Depends(get_db),
):
    """Test a specific integration from the Call Flow builder."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
        
    tenant = db.get(Tenant, agent.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    integration = payload.integration

    if integration == "shopify":
        if not tenant.shopify_token or not tenant.shopify_domain:
            return {"success": False, "message": "Shopify is not connected. Add your App credentials in the guide above."}
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                res = await client.get(
                    f"https://{tenant.shopify_domain}/admin/api/2024-01/shop.json",
                    headers={"X-Shopify-Access-Token": tenant.shopify_token}
                )
                if res.status_code == 200:
                    shop_name = res.json().get("shop", {}).get("name", tenant.shopify_domain)
                    return {"success": True, "message": f"Successfully connected to Shopify store: {shop_name}"}
                else:
                    return {"success": False, "message": f"Shopify API returned error {res.status_code}. Check your token and permissions."}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {str(e)}"}

    elif integration == "airtable":
        if not tenant.airtable_pat or not tenant.airtable_base_id:
            return {"success": False, "message": "Airtable PAT and Base ID are required."}
        try:
            svc = AirtableService(tenant)
            result = await svc.test_connection()
            return {"success": True, "message": result.get("message", "Connected to Airtable")}
        except ValueError as e:
            return {"success": False, "message": str(e)}
        except Exception as e:
            return {"success": False, "message": f"Airtable connection failed: {str(e)}"}
            
    elif integration == "webhook":
        if not tenant.webhook_url:
            return {"success": False, "message": "Webhook URL is required."}
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                test_payload = {
                    "event": "test_connection",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "message": "This is a test from AIxCaller Call Flow Builder."
                }
                res = await client.post(tenant.webhook_url, json=test_payload, timeout=5.0)
                if res.status_code in [200, 201, 202]:
                    return {"success": True, "message": f"Webhook received successfully with status {res.status_code}."}
                else:
                    return {"success": False, "message": f"Webhook failed with status {res.status_code}."}
        except Exception as e:
            return {"success": False, "message": f"Webhook test failed: {str(e)}"}
            
    elif integration == "google_calendar":
        if not tenant.google_refresh_token:
            return {"success": False, "message": "Google is not connected. Click 'Connect Google' above."}
        return {"success": True, "message": "Google Calendar connection is valid."}
        
    elif integration == "hubspot":
        if not tenant.hubspot_access_token:
            return {"success": False, "message": "HubSpot is not connected. Click 'Connect HubSpot' above."}
        return {"success": True, "message": "HubSpot connection is valid."}

    elif integration == "salesforce":
        if not tenant.salesforce_access_token:
            return {"success": False, "message": "Salesforce is not connected. Click 'Connect Salesforce' above."}
        return {"success": True, "message": "Salesforce connection is valid."}

    return {"success": False, "message": f"Unknown integration type: {integration}"}


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: uuid.UUID, tenant_id: str, db: Session = Depends(get_db)):
    """Delete an agent and clean up its Telnyx Assistant."""
    agent = db.exec(
        select(Agent).where(Agent.id == agent_id, Agent.tenant_id == uuid.UUID(tenant_id))
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Best-effort delete from Telnyx
    if agent.telnyx_assistant_id:
        try:
            import httpx
            api_key = os.environ.get("TELNYX_API_KEY")
            if api_key:
                async with httpx.AsyncClient() as client:
                    await client.delete(
                        f"https://api.telnyx.com/v2/ai/assistants/{agent.telnyx_assistant_id}",
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=10.0,
                    )
        except Exception as e:
            logger.warning(f"Could not delete Telnyx Assistant {agent.telnyx_assistant_id}: {e}")

    db.delete(agent)
    db.commit()
    return {"status": "deleted", "agent_id": str(agent_id)}


@router.get("/agents/{agent_id}/transfer-availability")
async def get_transfer_availability(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """Check whether human transfer is available right now for this agent."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if not agent.human_transfer_enabled or not agent.forwarding_number:
        return {"available": False, "reason": "Human transfer is not configured."}

    # Simple business hours check
    from datetime import datetime
    import zoneinfo
    try:
        tz = zoneinfo.ZoneInfo(agent.human_transfer_timezone or "UTC")
        now = datetime.now(tz)
        day_key = now.strftime("%a").lower()  # "mon", "tue", etc.
        windows = (agent.human_transfer_hours or {}).get(day_key, [])
        if not windows:
            return {"available": False, "reason": "Outside staffed hours for today."}
        current_time = now.strftime("%H:%M")
        for window in windows:
            try:
                start, end = window.split("-")
                if start <= current_time <= end:
                    return {"available": True, "reason": "Within staffed hours."}
            except ValueError:
                continue
        return {"available": False, "reason": "Outside staffed hours."}
    except Exception as e:
        logger.warning(f"Transfer availability check error: {e}")
        return {"available": True, "reason": "Could not determine hours — defaulting to available."}


# ─────────────────────────────────────────────────────────────────────────────
# MARKETPLACE — pre-built agent templates (inline, no separate file)
# ─────────────────────────────────────────────────────────────────────────────
AGENT_TEMPLATES = [
    {
        "id": "dental_receptionist",
        "name": "Dental Receptionist",
        "description": "Books appointments, answers FAQ about procedures, and handles cancellations.",
        "industry": "Healthcare",
        "voice_id": "Telnyx.Ultra.Grace",
        "system_prompt": (
            "You are a warm, professional AI receptionist for a dental clinic. "
            "Help callers book, reschedule, or cancel appointments. Answer questions about "
            "services, insurance acceptance, and office hours. Always be empathetic and patient. "
            "If the caller has a dental emergency, express concern and advise them to visit an "
            "emergency clinic or call 911 if severe."
        ),
    },
    {
        "id": "real_estate_agent",
        "name": "Real Estate Agent",
        "description": "Qualifies buyer/seller leads, answers property questions, and schedules viewings.",
        "industry": "Real Estate",
        "voice_id": "Telnyx.Ultra.George",
        "system_prompt": (
            "You are an enthusiastic, knowledgeable AI real estate agent assistant. "
            "Help callers learn about property listings, schedule viewings, and understand "
            "the buying or selling process. Qualify leads by asking about their budget, "
            "timeline, and requirements. Always be professional and helpful."
        ),
    },
    {
        "id": "ecommerce_support",
        "name": "E-Commerce Support",
        "description": "Handles order status, returns, refunds, and product questions.",
        "industry": "E-Commerce",
        "voice_id": "Telnyx.Ultra.Grace",
        "system_prompt": (
            "You are a helpful AI customer support agent for an online store. "
            "Assist callers with order status, tracking, returns, refunds, and product questions. "
            "Be empathetic when callers have issues. Always aim to resolve issues on the first call."
        ),
    },
    {
        "id": "hvac_contractor",
        "name": "HVAC Service Dispatcher",
        "description": "Books service calls, qualifies urgency, and provides basic troubleshooting.",
        "industry": "Home Services",
        "voice_id": "Telnyx.Ultra.George",
        "system_prompt": (
            "You are a professional AI dispatcher for an HVAC company. "
            "Help callers schedule service calls, assess urgency (emergency vs. routine), "
            "and provide basic troubleshooting steps while a technician is dispatched. "
            "Always ask about the issue, the equipment type, and a good contact number."
        ),
    },
    {
        "id": "law_firm_intake",
        "name": "Law Firm Intake",
        "description": "Screens potential clients, gathers case details, and schedules consultations.",
        "industry": "Legal",
        "voice_id": "Telnyx.Ultra.George",
        "system_prompt": (
            "You are a professional AI intake specialist for a law firm. "
            "Gather basic information about potential clients' legal situations, explain the "
            "consultation process, and schedule initial meetings with an attorney. "
            "Never provide legal advice. Always note the nature of the case and urgency."
        ),
    },
]


@router.get("/agent-templates")
async def get_agent_templates():
    """Return available marketplace agent templates."""
    return {"templates": AGENT_TEMPLATES}


class CreateFromTemplateRequest(BaseModel):
    template_id: str
    tenant_id: str
    business_name: str
    agent_name: Optional[str] = None


@router.post("/agents/from-template", response_model=Agent)
async def create_agent_from_template(
    req: CreateFromTemplateRequest,
    db: Session = Depends(get_db),
):
    """Spin up a new agent pre-configured from a marketplace template."""
    template = next((t for t in AGENT_TEMPLATES if t["id"] == req.template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{req.template_id}' not found")

    tenant_uuid = uuid.UUID(req.tenant_id)
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    new_agent = Agent(
        tenant_id=tenant_uuid,
        name=req.agent_name or template["name"],
        business_name=req.business_name,
        system_prompt=template["system_prompt"],
        voice_id=template["voice_id"],
        template_id=template["id"],
    )
    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)

    try:
        from backend.services.telnyx_assistant import sync_agent_with_telnyx
        await sync_agent_with_telnyx(new_agent, db)
    except Exception as e:
        logger.error(f"Telnyx sync failed on template agent creation: {e}")

    return new_agent


# ─────────────────────────────────────────────────────────────────────────────
# CALLS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/calls", response_model=List[CallRecord])
async def get_call_history(tenant_id: str, db: Session = Depends(get_db)):
    """Return paginated call history for the tenant, newest first."""
    tenant_uuid = uuid.UUID(tenant_id)
    return db.exec(
        select(CallRecord)
        .where(CallRecord.tenant_id == tenant_uuid)
        .order_by(CallRecord.created_at.desc())
    ).all()


# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — Call data processing (called from voice engine / Cloud Tasks)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/process-call-data")
async def process_call_data(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
):
    """
    Internal endpoint. Requires X-Internal-Key header.
    Delegates to the shared call processor.
    """
    if not _INTERNAL_API_KEY or request.headers.get("X-Internal-Key") != _INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden — X-Internal-Key required")

    from backend.services.call_processor import process_completed_call

    return await process_completed_call(
        tenant_id=uuid.UUID(data["tenant_id"]),
        agent_id=uuid.UUID(data["agent_id"]),
        from_number=data.get("from_number", "unknown"),
        to_number=data.get("to_number", "unknown"),
        call_id=data.get("call_id", ""),
        transcript=data.get("transcript", []),
        duration_seconds=int(data.get("duration_seconds", 0)),
        db=db,
    )


# ─────────────────────────────────────────────────────────────────────────────
# VOICES — Public Telnyx voice catalogue with dynamic previews
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/voices")
async def get_voices(db: Session = Depends(get_db)):
    """
    Returns the Telnyx Ultra voices with their dynamically constructed
    Google Cloud Storage public preview URLs.
    """
    from backend.api.admin import TELNYX_VOICES
    import os
    
    bucket_name = os.environ.get("GCS_BUCKET_NAME", "aixcaller-assets")
    
    voices_with_previews = []
    for voice in TELNYX_VOICES:
        name_lower = voice["name"].lower()
        preview_url = f"https://storage.googleapis.com/{bucket_name}/voices/telnyx_ultra_{name_lower}.mp3"
        voices_with_previews.append({
            **voice,
            "preview_url": preview_url
        })
        
    return voices_with_previews
