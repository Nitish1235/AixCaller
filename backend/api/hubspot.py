import os
import uuid
import httpx
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session
from shared.database import get_db
from shared.models import Tenant
from loguru import logger

router = APIRouter(prefix="/api/v1/hubspot", tags=["hubspot"])

HUBSPOT_CLIENT_ID = os.environ.get("HUBSPOT_CLIENT_ID", "")
HUBSPOT_CLIENT_SECRET = os.environ.get("HUBSPOT_CLIENT_SECRET", "")
# Needs to match the callback URL registered in HubSpot Developer Portal
HUBSPOT_REDIRECT_URI = os.environ.get("HUBSPOT_REDIRECT_URI", "https://api.aixcaller.com/api/v1/hubspot/callback")


@router.get("/install")
async def install_hubspot(tenant_id: str):
    """Redirects the user to the HubSpot OAuth consent screen."""
    if not HUBSPOT_CLIENT_ID:
        raise HTTPException(status_code=500, detail="HubSpot Client ID is not configured on the server.")
    
    # Required scopes for CRM access
    scopes = "crm.objects.contacts.read crm.objects.contacts.write crm.objects.companies.read crm.objects.companies.write crm.objects.deals.read crm.objects.deals.write"
    
    # We pass the tenant_id in the 'state' parameter so we know who they are when they return
    url = (
        f"https://app.hubspot.com/oauth/authorize"
        f"?client_id={HUBSPOT_CLIENT_ID}"
        f"&redirect_uri={HUBSPOT_REDIRECT_URI}"
        f"&scope={scopes.replace(' ', '%20')}"
        f"&state={tenant_id}"
    )
    return RedirectResponse(url)


@router.get("/callback")
async def hubspot_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Handles the OAuth callback from HubSpot, exchanges code for token, and saves it."""
    tenant_id = state
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?error=tenant_not_found")

    token_url = "https://api.hubapi.com/oauth/v1/token"
    payload = {
        "grant_type": "authorization_code",
        "client_id": HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "redirect_uri": HUBSPOT_REDIRECT_URI,
        "code": code
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(token_url, data=payload)
            if resp.status_code != 200:
                logger.error(f"HubSpot OAuth failed: {resp.text}")
                return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?error=hubspot_oauth_failed")
                
            data = resp.json()
            tenant.hubspot_access_token = data.get("access_token")
            tenant.hubspot_refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in", 1800)
            tenant.hubspot_token_expires_at = int(datetime.now(timezone.utc).timestamp()) + expires_in
            
            db.add(tenant)
            db.commit()
            
            return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?success=hubspot")
            
        except Exception as e:
            logger.error(f"HubSpot callback exception: {e}")
            return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?error=hubspot_callback_exception")
