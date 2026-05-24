import os
import time
import uuid
import httpx
from typing import List, Optional, Tuple
from loguru import logger
from sqlmodel import Session, select
from shared.database import engine
from shared.models import Tenant, Campaign, CampaignLead

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
TOKEN_URL = "https://oauth2.googleapis.com/token"

# In-memory access token cache for the outbound service
_GOOGLE_TOKEN_CACHE = {}
REFRESH_BUFFER = 300

async def get_valid_google_token(tenant: Tenant, db: Session) -> Optional[str]:
    """Retrieves a valid Google OAuth access token, refreshing if expired."""
    now = int(time.time())
    tenant_id_str = str(tenant.id)

    if tenant_id_str in _GOOGLE_TOKEN_CACHE:
        token, expires_at = _GOOGLE_TOKEN_CACHE[tenant_id_str]
        if expires_at - now > REFRESH_BUFFER:
            return token

    if not tenant.google_refresh_token:
        logger.warning(f"Tenant {tenant.id} has no Google refresh token.")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(TOKEN_URL, data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": tenant.google_refresh_token,
                "grant_type": "refresh_token",
            })
            resp.raise_for_status()
            data = resp.json()
            new_token = data.get("access_token")
            if not new_token:
                return None

            expires_at = now + data.get("expires_in", 3600)
            _GOOGLE_TOKEN_CACHE[tenant_id_str] = (new_token, expires_at)

            # Persist expiration time
            tenant.google_token_expires_at = expires_at
            db.add(tenant)
            db.commit()

            return new_token
    except Exception as e:
        logger.error(f"Google token refresh failed for tenant {tenant.id}: {e}")
        return None


class GoogleSheetPoller:
    """
    Two-way synchronization engine between Google Sheets and CampaignLead database.
    """

    async def sync_campaign_sheet(self, campaign_id: uuid.UUID) -> int:
        """
        Polls the Google Sheet configured for this campaign, imports new 'pending' rows,
        and saves them to CampaignLead.
        """
        with Session(engine) as db:
            campaign = db.get(Campaign, campaign_id)
            if not campaign:
                logger.error(f"Campaign {campaign_id} not found.")
                return 0

            tenant = db.get(Tenant, campaign.tenant_id)
            if not tenant or not tenant.google_connected:
                logger.warning(f"Google integration not connected for tenant {campaign.tenant_id}.")
                return 0

            # Sheet config is stored in Agent.tools_config / Campaign metadata
            from shared.models import Agent
            agent = db.get(Agent, campaign.agent_id)
            if not agent:
                return 0

            sheet_config = agent.tools_config.get("google_sheets", {})
            sheet_id = sheet_config.get("sheet_id")
            sheet_name = sheet_config.get("sheet_name", "Sheet1")

            if not sheet_id:
                logger.warning(f"No Google Sheet ID configured for agent {agent.id}.")
                return 0

            token = await get_valid_google_token(tenant, db)
            if not token:
                return 0

            # 1. Fetch values from Google Sheet
            range_name = f"{sheet_name}!A1:Z500"
            rows = await self._fetch_sheet_values(token, sheet_id, range_name)
            if not rows or len(rows) < 2:
                logger.info(f"Sheet {sheet_id} is empty or has headers only.")
                return 0

            headers = [h.strip().lower() for h in rows[0]]
            headers = await self._ensure_required_columns(token, sheet_id, sheet_name, headers)
            
            # Map column indexes
            name_idx, phone_idx, email_idx, status_idx = -1, -1, -1, -1
            for idx, h in enumerate(headers):
                if h in ("name", "full name", "fullname", "first name", "lead_name"):
                    name_idx = idx
                elif h in ("phone", "phone number", "telephone", "mobile", "number"):
                    phone_idx = idx
                elif h in ("email", "e-mail", "address"):
                    email_idx = idx
                elif h in ("campaign status", "status", "booking status"):
                    status_idx = idx

            if phone_idx == -1:
                logger.error(f"Required 'phone' column not found in Google Sheet {sheet_id}.")
                return 0

            leads_imported = 0
            for row_num, row in enumerate(rows[1:], start=2):
                if not row or len(row) <= phone_idx:
                    continue

                phone_val = row[phone_idx].strip()
                if not phone_val:
                    continue

                status_val = row[status_idx].strip().lower() if status_idx != -1 and status_idx < len(row) else ""
                
                # Only import rows where status is empty or set to pending
                if status_val not in ("", "pending"):
                    continue

                # Check if lead already exists in DB for this campaign
                existing = db.exec(
                    select(CampaignLead).where(
                        CampaignLead.campaign_id == campaign_id,
                        CampaignLead.phone == phone_val
                    )
                ).first()

                if existing:
                    continue

                name_val = row[name_idx].strip() if name_idx != -1 and name_idx < len(row) else "Valued Customer"
                email_val = row[email_idx].strip() if email_idx != -1 and email_idx < len(row) else None

                # Fetch dynamic variables
                vars_dict = {"sheet_row_number": row_num}
                for idx, h in enumerate(headers):
                    if idx not in (name_idx, phone_idx, email_idx, status_idx) and idx < len(row):
                        vars_dict[h.replace(" ", "_").replace("-", "_")] = row[idx].strip()

                lead = CampaignLead(
                    campaign_id=campaign_id,
                    name=name_val,
                    phone=phone_val,
                    email=email_val,
                    variables=vars_dict,
                    status="pending"
                )
                db.add(lead)
                leads_imported += 1

            db.commit()
            logger.info(f"Synced Google Sheet {sheet_id} — Imported {leads_imported} new pending leads.")
            return leads_imported

    async def writeback_lead_status(
        self,
        tenant: Tenant,
        sheet_id: str,
        sheet_name: str,
        row_number: int,
        call_result: str,
        campaign_status: str,
        booking_date: Optional[str] = None,
        booking_time: Optional[str] = None,
        booking_link: Optional[str] = None
    ) -> bool:
        """
        Performs a batch writeback to a specific row in the tenant's Google Sheet,
        populating results, status, and calendar invites.
        """
        with Session(engine) as db:
            token = await get_valid_google_token(tenant, db)
            if not token:
                return False

        headers = await self._fetch_sheet_headers(token, sheet_id, f"{sheet_name}!A1:Z1")
        if not headers:
            return False

        headers = await self._ensure_required_columns(token, sheet_id, sheet_name, headers)

        # Find column offsets
        status_col = self._col_letter(headers, ("campaign status", "status"))
        result_col = self._col_letter(headers, ("call result", "result", "outcome"))
        date_col = self._col_letter(headers, ("appointment date", "date", "booking date"))
        time_col = self._col_letter(headers, ("appointment time", "time", "booking time"))
        link_col = self._col_letter(headers, ("booking link", "calendar link", "invite link"))

        # Build values updates
        data = []
        if status_col:
            data.append({"range": f"{sheet_name}!{status_col}{row_number}", "values": [[campaign_status]]})
        if result_col:
            data.append({"range": f"{sheet_name}!{result_col}{row_number}", "values": [[call_result]]})
        if date_col and booking_date:
            data.append({"range": f"{sheet_name}!{date_col}{row_number}", "values": [[booking_date]]})
        if time_col and booking_time:
            data.append({"range": f"{sheet_name}!{time_col}{row_number}", "values": [[booking_time]]})
        if link_col and booking_link:
            data.append({"range": f"{sheet_name}!{link_col}{row_number}", "values": [[booking_link]]})

        if not data:
            return False

        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values:batchUpdate"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.post(
                    url,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"valueInputOption": "USER_ENTERED", "data": data}
                )
                if resp.status_code == 200:
                    logger.info(f"Google Sheet {sheet_id} row {row_number} successfully updated via writeback.")
                    return True
                logger.error(f"Sheet writeback failed: {resp.text}")
            except Exception as e:
                logger.error(f"Exception during sheet writeback: {e}")
        return False

    async def _fetch_sheet_values(self, token: str, sheet_id: str, range_name: str) -> Optional[List[List[str]]]:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{range_name}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.get(url, headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
                resp.raise_for_status()
                return resp.json().get("values", [])
            except Exception as e:
                logger.error(f"Failed to fetch Google Sheet values: {e}")
                return None

    async def _fetch_sheet_headers(self, token: str, sheet_id: str, range_name: str) -> Optional[List[str]]:
        vals = await self._fetch_sheet_values(token, sheet_id, range_name)
        return [str(h).strip().lower() for h in vals[0]] if vals else None

    def _col_letter(self, headers: List[str], matches: Tuple[str, ...]) -> Optional[str]:
        for idx, h in enumerate(headers):
            if any(m in h for m in matches):
                # Convert 0-index to A-Z column letters (A=65)
                return chr(65 + idx)
        return None

    async def _ensure_required_columns(self, token: str, sheet_id: str, sheet_name: str, headers: List[str]) -> List[str]:
        """
        Checks if required columns for campaign writeback are present in the sheet headers.
        If missing, appends them to the first row (A1) dynamically.
        """
        missing_columns = []
        
        status_col = self._col_letter(headers, ("campaign status", "status"))
        result_col = self._col_letter(headers, ("call result", "result", "outcome"))
        date_col = self._col_letter(headers, ("appointment date", "date", "booking date"))
        time_col = self._col_letter(headers, ("appointment time", "time", "booking time"))
        link_col = self._col_letter(headers, ("booking link", "calendar link", "invite link"))
        
        if not status_col:
            missing_columns.append("Campaign Status")
        if not result_col:
            missing_columns.append("Call Result")
        if not date_col:
            missing_columns.append("Appointment Date")
        if not time_col:
            missing_columns.append("Appointment Time")
        if not link_col:
            missing_columns.append("Booking Link")
            
        if not missing_columns:
            return headers
            
        new_headers = list(headers)
        for col in missing_columns:
            # Capitalize newly appended column names for clean sheet display
            new_headers.append(col)
            
        # Write the new full header array back to row 1
        last_col_letter = chr(65 + len(new_headers) - 1)
        range_name = f"{sheet_name}!A1:{last_col_letter}1"
        
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{range_name}?valueInputOption=USER_ENTERED"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                resp = await client.put(
                    url,
                    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                    json={"values": [new_headers]}
                )
                if resp.status_code == 200:
                    logger.info(f"Successfully appended missing required columns {missing_columns} to sheet {sheet_id}.")
                    return [h.lower() for h in new_headers]
                else:
                    logger.error(f"Failed to append missing columns to sheet headers: {resp.text}")
            except Exception as e:
                logger.error(f"Exception trying to write new sheet headers: {e}")
                
        return headers
