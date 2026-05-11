"""
Zoho OAuth endpoints. Mounted at /api/v1/zoho.

GET  /install?tenant_id=&dc=us      — kicks off OAuth, 302 to Zoho
GET  /callback?...                  — Zoho returns merchant here
GET  /status?tenant_id=             — connection status
POST /test-connection?tenant_id=    — pings Zoho /users to verify
DELETE /disconnect?tenant_id=       — removes stored tokens
"""
import os
import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session
from loguru import logger
from shared.database import get_db
from shared.models import Tenant
from backend.services.zoho_oauth import (
    ZOHO_CLIENT_ID,
    DASHBOARD_URL,
    get_dc,
    make_state_token,
    decode_state_token,
    build_install_url,
    exchange_code_for_tokens,
)
from backend.services.crm import ZohoCRMService

router = APIRouter(prefix="/api/v1/zoho", tags=["zoho"])


@router.get("/install")
async def start_install(tenant_id: str, dc: str = "us", db: Session = Depends(get_db)):
    """Step 1: build authorize URL, 302 to Zoho."""
    if not ZOHO_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Zoho OAuth not configured (ZOHO_CLIENT_ID missing)")

    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")

    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    state = make_state_token(tenant_id=str(tenant.id), dc_code=dc)
    install_url = build_install_url(dc, state)
    logger.info(f"💼 Zoho install initiated for tenant {tenant.id} (DC: {dc})")
    return RedirectResponse(install_url, status_code=302)


@router.get("/callback")
async def oauth_callback(request: Request, db: Session = Depends(get_db)):
    """Step 4: Zoho redirects merchant here with code + state."""
    params = dict(request.query_params)
    logger.info(f"💼 Zoho OAuth callback keys: {sorted(params.keys())}")

    if "error" in params:
        return RedirectResponse(
            f"{DASHBOARD_URL}/dashboard/integrations?zoho_error={params['error']}",
            status_code=302,
        )

    state = decode_state_token(params.get("state", ""))
    if not state:
        return RedirectResponse(
            f"{DASHBOARD_URL}/dashboard/integrations?zoho_error=invalid_state",
            status_code=302,
        )

    code = params.get("code")
    if not code:
        return RedirectResponse(
            f"{DASHBOARD_URL}/dashboard/integrations?zoho_error=no_code",
            status_code=302,
        )

    # Exchange the code for tokens
    token_data = await exchange_code_for_tokens(state["dc"], code)
    if not token_data:
        return RedirectResponse(
            f"{DASHBOARD_URL}/dashboard/integrations?zoho_error=token_exchange_failed",
            status_code=302,
        )

    # Find tenant + save tokens
    try:
        tenant_uuid = uuid.UUID(state["tenant_id"])
    except ValueError:
        return RedirectResponse(
            f"{DASHBOARD_URL}/dashboard/integrations?zoho_error=invalid_tenant",
            status_code=302,
        )

    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        return RedirectResponse(
            f"{DASHBOARD_URL}/dashboard/integrations?zoho_error=tenant_not_found",
            status_code=302,
        )

    # Zoho returns an `api_domain` like "https://www.zohoapis.eu" — strip protocol
    api_domain_raw = token_data.get("api_domain") or f"https://www.{get_dc(state['dc'])['api_domain']}"
    api_domain = api_domain_raw.replace("https://", "").replace("http://", "").replace("www.", "").rstrip("/")

    now = int(time.time())
    tenant.zoho_access_token       = token_data["access_token"]
    tenant.zoho_refresh_token      = token_data["refresh_token"]
    tenant.zoho_domain             = api_domain
    tenant.zoho_token_expires_at   = now + int(token_data.get("expires_in", 3600))
    db.add(tenant)
    db.commit()
    logger.info(f"✅ Zoho connected for tenant {tenant.id} (api_domain={api_domain})")

    return RedirectResponse(
        f"{DASHBOARD_URL}/dashboard/integrations?zoho_connected=1",
        status_code=302,
    )


@router.get("/status")
async def get_status(tenant_id: str, db: Session = Depends(get_db)):
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {
        "connected":  bool(tenant.zoho_refresh_token),
        "api_domain": tenant.zoho_domain,
        "expires_at": tenant.zoho_token_expires_at,
    }


@router.post("/test-connection")
async def test_connection(tenant_id: str, db: Session = Depends(get_db)):
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if not tenant.zoho_refresh_token:
        return {"ok": False, "message": "Zoho is not connected."}

    service = ZohoCRMService(tenant, db_session=db)
    ok, msg = await service.test_connection()
    return {"ok": ok, "message": msg}


@router.delete("/disconnect")
async def disconnect(tenant_id: str, db: Session = Depends(get_db)):
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id")
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    tenant.zoho_access_token = None
    tenant.zoho_refresh_token = None
    tenant.zoho_domain = None
    tenant.zoho_token_expires_at = None
    tenant.zoho_org_id = None
    db.add(tenant)
    db.commit()
    logger.info(f"🔌 Zoho disconnected for tenant {tenant.id}")
    return {"status": "disconnected"}
