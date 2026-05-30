import os
import httpx
from datetime import datetime, timezone
from loguru import logger
from sqlmodel import Session
from shared.database import engine
from shared.models import Tenant

SALESFORCE_CLIENT_ID = os.environ.get("SALESFORCE_CLIENT_ID", "")
SALESFORCE_CLIENT_SECRET = os.environ.get("SALESFORCE_CLIENT_SECRET", "")

async def refresh_salesforce_token(tenant: Tenant) -> bool:
    """Refresh the Salesforce access token if expired."""
    if not SALESFORCE_CLIENT_ID or not SALESFORCE_CLIENT_SECRET:
        logger.error("Salesforce client credentials missing from environment.")
        return False
        
    token_url = "https://login.salesforce.com/services/oauth2/token"
    payload = {
        "grant_type": "refresh_token",
        "client_id": SALESFORCE_CLIENT_ID,
        "client_secret": SALESFORCE_CLIENT_SECRET,
        "refresh_token": tenant.salesforce_refresh_token
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(token_url, data=payload, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                tenant.salesforce_access_token = data.get("access_token")
                # SF refresh token is typically long-lived and doesn't rotate on every refresh,
                # but if one is returned, we save it.
                if "refresh_token" in data:
                    tenant.salesforce_refresh_token = data.get("refresh_token")
                
                # Assume 2 hour token life if not specified
                tenant.salesforce_token_expires_at = int(datetime.now(timezone.utc).timestamp()) + 7200
                
                # Save to db
                with Session(engine) as db:
                    db.add(tenant)
                    db.commit()
                return True
            else:
                logger.error(f"Failed to refresh Salesforce token: {resp.text}")
                return False
        except Exception as e:
            logger.error(f"Exception refreshing Salesforce token: {e}")
            return False

async def log_call_to_salesforce(tenant: Tenant, data: dict):
    """
    Sync the completed call to Salesforce as a Task/Activity.
    """
    if not tenant.salesforce_access_token or not tenant.salesforce_refresh_token or not tenant.salesforce_instance_url:
        return

    # 1. Check token expiry
    now = int(datetime.now(timezone.utc).timestamp())
    # Add a 60-second buffer
    if tenant.salesforce_token_expires_at and now >= (tenant.salesforce_token_expires_at - 60):
        logger.info(f"Salesforce token expired for tenant {tenant.id}, refreshing...")
        success = await refresh_salesforce_token(tenant)
        if not success:
            return

    headers = {
        "Authorization": f"Bearer {tenant.salesforce_access_token}",
        "Content-Type": "application/json"
    }
    
    base_url = tenant.salesforce_instance_url.rstrip("/")
    api_version = "v60.0"

    phone = data.get("phone", "")
    summary = data.get("summary", "")
    
    who_id = None

    async with httpx.AsyncClient() as client:
        # 2. Search for Contact/Lead by phone
        # Sanitize phone to prevent SOQL injection — keep only digits and leading +
        import re
        import urllib.parse
        safe_phone = re.sub(r"[^\d+]", "", phone) if phone else ""
        if not safe_phone:
            logger.warning("Salesforce sync skipped — invalid phone number")
            return

        try:
            query = f"SELECT Id FROM Contact WHERE Phone = '{safe_phone}' OR MobilePhone = '{safe_phone}' LIMIT 1"
            resp = await client.get(
                f"{base_url}/services/data/{api_version}/query?q={urllib.parse.quote(query)}",
                headers=headers,
                timeout=10.0
            )
            if resp.status_code == 200:
                records = resp.json().get("records", [])
                if records:
                    who_id = records[0].get("Id")
            
            # If no contact, try Lead
            if not who_id:
                query = f"SELECT Id FROM Lead WHERE Phone = '{safe_phone}' OR MobilePhone = '{safe_phone}' LIMIT 1"
                resp = await client.get(
                    f"{base_url}/services/data/{api_version}/query?q={urllib.parse.quote(query)}",
                    headers=headers,
                    timeout=10.0
                )
                if resp.status_code == 200:
                    records = resp.json().get("records", [])
                    if records:
                        who_id = records[0].get("Id")
        except Exception as e:
            logger.error(f"Salesforce search failed: {e}")

        # 3. Create Lead if not found
        if not who_id:
            try:
                lead_payload = {
                    "LastName": "AI Caller Lead",
                    "Company": "Unknown",
                    "Phone": phone
                }
                resp = await client.post(
                    f"{base_url}/services/data/{api_version}/sobjects/Lead",
                    headers=headers,
                    json=lead_payload,
                    timeout=10.0
                )
                if resp.status_code in (200, 201):
                    who_id = resp.json().get("id")
            except Exception as e:
                logger.error(f"Salesforce Lead creation failed: {e}")

        # 4. Create Task (Activity)
        try:
            task_payload = {
                "Subject": "AI Call via AIxCaller",
                "Description": summary or "No summary available.",
                "Status": "Completed",
                "Priority": "Normal",
                "TaskSubtype": "Call"
            }
            if who_id:
                task_payload["WhoId"] = who_id
                
            resp = await client.post(
                f"{base_url}/services/data/{api_version}/sobjects/Task",
                headers=headers,
                json=task_payload,
                timeout=10.0
            )
            if resp.status_code in (200, 201):
                logger.info(f"Successfully logged call to Salesforce for Tenant {tenant.id}")
            else:
                logger.error(f"Failed to log call to Salesforce: {resp.text}")
        except Exception as e:
            logger.error(f"Salesforce task creation failed: {e}")
