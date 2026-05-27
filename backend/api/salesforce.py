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

router = APIRouter(prefix="/api/v1/salesforce", tags=["salesforce"])

SALESFORCE_CLIENT_ID = os.environ.get("SALESFORCE_CLIENT_ID", "")
SALESFORCE_CLIENT_SECRET = os.environ.get("SALESFORCE_CLIENT_SECRET", "")
# Needs to match the callback URL registered in Salesforce Connected App
SALESFORCE_REDIRECT_URI = os.environ.get("SALESFORCE_REDIRECT_URI", "https://api.aixcaller.com/api/v1/salesforce/callback")


@router.get("/install")
async def install_salesforce(tenant_id: str):
    """Redirects the user to the Salesforce OAuth consent screen."""
    if not SALESFORCE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Salesforce Client ID is not configured on the server.")
    
    # Required scopes for CRM access (api covers REST API access, refresh_token allows offline access)
    scopes = "api refresh_token"
    
    # We pass the tenant_id in the 'state' parameter
    url = (
        f"https://login.salesforce.com/services/oauth2/authorize"
        f"?response_type=code"
        f"&client_id={SALESFORCE_CLIENT_ID}"
        f"&redirect_uri={SALESFORCE_REDIRECT_URI}"
        f"&scope={scopes.replace(' ', '%20')}"
        f"&state={tenant_id}"
    )
    return RedirectResponse(url)


@router.get("/callback")
async def salesforce_callback(code: str, state: str, db: Session = Depends(get_db)):
    """Handles the OAuth callback from Salesforce, exchanges code for token, and saves it."""
    tenant_id = state
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?error=tenant_not_found")

    token_url = "https://login.salesforce.com/services/oauth2/token"
    payload = {
        "grant_type": "authorization_code",
        "client_id": SALESFORCE_CLIENT_ID,
        "client_secret": SALESFORCE_CLIENT_SECRET,
        "redirect_uri": SALESFORCE_REDIRECT_URI,
        "code": code
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(token_url, data=payload)
            if resp.status_code != 200:
                logger.error(f"Salesforce OAuth failed: {resp.text}")
                return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?error=salesforce_oauth_failed")
                
            data = resp.json()
            tenant.salesforce_access_token = data.get("access_token")
            tenant.salesforce_refresh_token = data.get("refresh_token")
            tenant.salesforce_instance_url = data.get("instance_url")
            
            # Salesforce tokens can sometimes be opaque with no specific expiry in the payload, 
            # we can default to 2 hours if not provided, though Salesforce usually handles expiration via the refresh flow.
            # Assuming standard Salesforce OAuth behavior.
            tenant.salesforce_token_expires_at = int(datetime.now(timezone.utc).timestamp()) + 7200
            
            db.add(tenant)
            db.commit()
            
            return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?success=salesforce")
            
        except Exception as e:
            logger.error(f"Salesforce callback exception: {e}")
            return RedirectResponse("https://app.aixcaller.com/dashboard/integrations?error=salesforce_callback_exception")
