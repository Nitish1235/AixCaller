import os
import json
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
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(token_url, data=payload)
            if resp.status_code == 200:
                data = resp.json()
                new_access = data.get("access_token")
                if not new_access:
                    logger.error(f"HubSpot refresh returned 200 but no access_token: {data}")
                    return False
                tenant.hubspot_access_token = new_access
                # HubSpot only re-issues refresh tokens on first auth.
                # NEVER overwrite the existing refresh_token with None.
                new_refresh = data.get("refresh_token")
                if new_refresh:
                    tenant.hubspot_refresh_token = new_refresh
                expires_in = data.get("expires_in", 1800)
                tenant.hubspot_token_expires_at = int(datetime.now(timezone.utc).timestamp()) + expires_in

                with Session(engine) as db:
                    db.add(tenant)
                    db.commit()
                return True
            else:
                logger.error(f"Failed to refresh HubSpot token ({resp.status_code}): {resp.text}")
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

    phone        = data.get("phone", "")
    summary      = data.get("summary", "")
    sentiment    = data.get("sentiment", "Neutral")
    duration_ms  = int(data.get("duration", 0)) * 1000
    action_items = data.get("action_items", "[]")
    agent_name   = data.get("agent_name", "AI Agent")
    direction    = data.get("direction", "inbound").capitalize()
    caller_name  = data.get("caller_name", "")
    caller_email = data.get("caller_email", "")

    contact_id = None

    # Build enriched call body to show in HubSpot timeline
    call_body = f"Summary: {summary or 'No summary available.'}\n\n"
    call_body += f"Sentiment: {sentiment}\n"
    call_body += f"Direction: {direction}\n"
    call_body += f"Agent: {agent_name}\n"
    if action_items and action_items != "[]":
        try:
            items = json.loads(action_items) if isinstance(action_items, str) else action_items
            if items:
                call_body += f"\nAction Items:\n" + "\n".join(f"• {i}" for i in items)
        except Exception:
            call_body += f"\nAction Items: {action_items}"

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 2. Search for Contact by phone
        search_payload = {
            "filterGroups": [{
                "filters": [{"propertyName": "phone", "operator": "EQ", "value": phone}]
            }]
        }
        try:
            resp = await client.post(
                "https://api.hubapi.com/crm/v3/objects/contacts/search",
                headers=headers, json=search_payload,
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    contact_id = results[0].get("id")
        except Exception as e:
            logger.error(f"HubSpot contact search failed: {e}")

        # 3. Create Contact if not found — use real name/email if captured
        if not contact_id:
            try:
                contact_props: dict = {"phone": phone}
                if caller_name:
                    parts = caller_name.split(" ", 1)
                    contact_props["firstname"] = parts[0]
                    if len(parts) > 1:
                        contact_props["lastname"] = parts[1]
                else:
                    contact_props["firstname"] = "AI Caller Lead"
                if caller_email:
                    contact_props["email"] = caller_email

                resp = await client.post(
                    "https://api.hubapi.com/crm/v3/objects/contacts",
                    headers=headers, json={"properties": contact_props},
                )
                if resp.status_code in (200, 201):
                    contact_id = resp.json().get("id")
                    logger.info(f"HubSpot contact created: {contact_id}")
            except Exception as e:
                logger.error(f"HubSpot contact creation failed: {e}")

        # 4. Create Call Engagement with full details
        try:
            call_payload = {
                "properties": {
                    "hs_call_title":    f"AIxCaller — {direction} Call ({agent_name})",
                    "hs_call_body":     call_body,
                    "hs_call_duration": str(duration_ms),
                    "hs_timestamp":     str(int(datetime.now(timezone.utc).timestamp() * 1000)),
                    "hs_call_status":   "COMPLETED",
                    "hs_call_source":   "INTEGRATION",
                    "hs_call_direction": "INBOUND" if direction.lower() == "inbound" else "OUTBOUND",
                },
                "associations": []
            }
            if contact_id:
                call_payload["associations"] = [{
                    "to": {"id": contact_id},
                    "types": [{"associationCategory": "HUBSPOT_DEFINED", "associationTypeId": 194}]
                }]

            resp = await client.post(
                "https://api.hubapi.com/crm/v3/objects/calls",
                headers=headers, json=call_payload,
            )
            if resp.status_code in (200, 201):
                logger.info(f"HubSpot call engagement created for tenant {tenant.id}")
            else:
                logger.error(f"Failed to create HubSpot call engagement: {resp.text}")
        except Exception as e:
            logger.error(f"HubSpot call logging failed: {e}")
