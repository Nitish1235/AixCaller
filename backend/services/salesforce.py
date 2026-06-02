import os
import re
import json
import httpx
import urllib.parse
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
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(token_url, data=payload)
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

    phone        = data.get("phone", "")
    summary      = data.get("summary", "")
    sentiment    = data.get("sentiment", "Neutral")
    duration_sec = int(data.get("duration", 0))
    action_items = data.get("action_items", "[]")
    agent_name   = data.get("agent_name", "AI Agent")
    direction    = data.get("direction", "inbound").capitalize()
    caller_name  = data.get("caller_name", "")
    caller_email = data.get("caller_email", "")

    # Build enriched description for the Salesforce Task
    task_desc = f"Summary: {summary or 'No summary available.'}\n\n"
    task_desc += f"Sentiment: {sentiment}\n"
    task_desc += f"Direction: {direction}\n"
    task_desc += f"Duration: {duration_sec}s\n"
    task_desc += f"Agent: {agent_name}\n"
    if action_items and action_items != "[]":
        try:
            items = json.loads(action_items) if isinstance(action_items, str) else action_items
            if items:
                task_desc += "\nAction Items:\n" + "\n".join(f"• {i}" for i in items)
        except Exception:
            task_desc += f"\nAction Items: {action_items}"

    who_id = None

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 2. Search for Contact/Lead by phone
        # Sanitize phone to prevent SOQL injection — keep only digits and leading +
        safe_phone = re.sub(r"[^\d+]", "", phone) if phone else ""
        if not safe_phone:
            logger.warning("Salesforce sync skipped — invalid phone number")
            return

        try:
            query = f"SELECT Id FROM Contact WHERE Phone = '{safe_phone}' OR MobilePhone = '{safe_phone}' LIMIT 1"
            resp = await client.get(
                f"{base_url}/services/data/{api_version}/query?q={urllib.parse.quote(query)}",  # noqa: E501
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
                    f"{base_url}/services/data/{api_version}/query?q={urllib.parse.quote(query)}",  # noqa: E501
                    headers=headers,
                    timeout=10.0
                )
                if resp.status_code == 200:
                    records = resp.json().get("records", [])
                    if records:
                        who_id = records[0].get("Id")
        except Exception as e:
            logger.error(f"Salesforce search failed: {e}")

        # 3. Create Lead if not found — use real name/email if captured
        if not who_id:
            try:
                name_parts = caller_name.split(" ", 1) if caller_name else []
                lead_payload = {
                    "LastName":  name_parts[-1] if name_parts else "AI Caller Lead",
                    "FirstName": name_parts[0]  if len(name_parts) > 1 else "",
                    "Company":   "Unknown",
                    "Phone":     phone,
                }
                if caller_email:
                    lead_payload["Email"] = caller_email
                resp = await client.post(
                    f"{base_url}/services/data/{api_version}/sobjects/Lead",
                    headers=headers, json=lead_payload, timeout=10.0,
                )
                if resp.status_code in (200, 201):
                    who_id = resp.json().get("id")
                    logger.info(f"Salesforce Lead created: {who_id}")
            except Exception as e:
                logger.error(f"Salesforce Lead creation failed: {e}")

        # 4. Create Task (Activity) with full call details
        try:
            task_payload = {
                "Subject":     f"AIxCaller — {direction} Call ({agent_name})",
                "Description": task_desc,
                "Status":      "Completed",
                "Priority":    "Normal",
                "TaskSubtype": "Call",
            }
            if who_id:
                task_payload["WhoId"] = who_id

            resp = await client.post(
                f"{base_url}/services/data/{api_version}/sobjects/Task",
                headers=headers, json=task_payload, timeout=10.0,
            )
            if resp.status_code in (200, 201):
                logger.info(f"Salesforce Task created for tenant {tenant.id}")
            else:
                logger.error(f"Failed to create Salesforce Task: {resp.text}")
        except Exception as e:
            logger.error(f"Salesforce task creation failed: {e}")
