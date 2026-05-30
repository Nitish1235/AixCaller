import os
import httpx
from datetime import datetime, timezone
from loguru import logger
from sqlmodel import Session
from shared.database import engine
from shared.models import Tenant

HUBSPOT_CLIENT_ID = os.environ.get("HUBSPOT_CLIENT_ID", "")
HUBSPOT_CLIENT_SECRET = os.environ.get("HUBSPOT_CLIENT_SECRET", "")

async def refresh_hubspot_token(tenant: Tenant) -> bool:
    """Refresh the HubSpot access token if expired."""
    if not HUBSPOT_CLIENT_ID or not HUBSPOT_CLIENT_SECRET:
        logger.error("HubSpot client credentials missing from environment.")
        return False
        
    token_url = "https://api.hubapi.com/oauth/v1/token"
    payload = {
        "grant_type": "refresh_token",
        "client_id": HUBSPOT_CLIENT_ID,
        "client_secret": HUBSPOT_CLIENT_SECRET,
        "refresh_token": tenant.hubspot_refresh_token
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(token_url, data=payload, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                tenant.hubspot_access_token = data.get("access_token")
                tenant.hubspot_refresh_token = data.get("refresh_token")
                expires_in = data.get("expires_in", 1800)
                tenant.hubspot_token_expires_at = int(datetime.now(timezone.utc).timestamp()) + expires_in
                
                # Save to db
                with Session(engine) as db:
                    db.add(tenant)
                    db.commit()
                return True
            else:
                logger.error(f"Failed to refresh HubSpot token: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Exception refreshing HubSpot token: {e}")
            return False

async def log_call_to_hubspot(tenant: Tenant, data: dict):
    """
    Sync the completed call to HubSpot as an Engagement.
    """
    if not tenant.hubspot_access_token or not tenant.hubspot_refresh_token:
        return

    # 1. Check token expiry
    now = int(datetime.now(timezone.utc).timestamp())
    # Add a 60-second buffer
    if tenant.hubspot_token_expires_at and now >= (tenant.hubspot_token_expires_at - 60):
        logger.info(f"HubSpot token expired for tenant {tenant.id}, refreshing...")
        success = await refresh_hubspot_token(tenant)
        if not success:
            return

    headers = {
        "Authorization": f"Bearer {tenant.hubspot_access_token}",
        "Content-Type": "application/json"
    }

    phone = data.get("phone", "")
    summary = data.get("summary", "")
    duration_ms = int(data.get("duration", 0)) * 1000
    
    contact_id = None

    async with httpx.AsyncClient() as client:
        # 2. Search for Contact
        search_payload = {
            "filterGroups": [
                {
                    "filters": [
                        {
                            "propertyName": "phone",
                            "operator": "EQ",
                            "value": phone
                        }
                    ]
                }
            ]
        }
        try:
            resp = await client.post(
                "https://api.hubapi.com/crm/v3/objects/contacts/search",
                headers=headers,
                json=search_payload,
                timeout=10.0
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    contact_id = results[0].get("id")
        except Exception as e:
            logger.error(f"HubSpot contact search failed: {e}")

        # 3. Create Contact if not found
        if not contact_id:
            try:
                create_payload = {
                    "properties": {
                        "phone": phone,
                        "firstname": "AI Caller Lead"
                    }
                }
                resp = await client.post(
                    "https://api.hubapi.com/crm/v3/objects/contacts",
                    headers=headers,
                    json=create_payload,
                    timeout=10.0
                )
                if resp.status_code in (200, 201):
                    contact_id = resp.json().get("id")
            except Exception as e:
                logger.error(f"HubSpot contact creation failed: {e}")

        # 4. Create Call Engagement
        try:
            call_payload = {
                "properties": {
                    "hs_call_title": "AI Call via AIxCaller",
                    "hs_call_body": summary or "No summary available.",
                    "hs_call_duration": str(duration_ms),
                    "hs_timestamp": str(int(datetime.now(timezone.utc).timestamp() * 1000)),
                    "hs_call_status": "COMPLETED",
                    "hs_call_source": "INTEGRATION"
                },
                "associations": []
            }
            
            if contact_id:
                call_payload["associations"] = [
                    {
                        "to": {"id": contact_id},
                        "types": [
                            {
                                "associationCategory": "HUBSPOT_DEFINED",
                                "associationTypeId": 194 # Call to Contact
                            }
                        ]
                    }
                ]
            
            resp = await client.post(
                "https://api.hubapi.com/crm/v3/objects/calls",
                headers=headers,
                json=call_payload,
                timeout=10.0
            )
            if resp.status_code in (200, 201):
                logger.info(f"Successfully logged call to HubSpot for Tenant {tenant.id}")
            else:
                logger.error(f"Failed to log call to HubSpot: {resp.text}")
        except Exception as e:
            logger.error(f"HubSpot call logging failed: {e}")
