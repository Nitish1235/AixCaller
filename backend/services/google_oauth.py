"""
Google OAuth2 Service (Calendar + Sheets)
==========================================
Handles:
  - Building the OAuth2 consent URL
  - Exchanging the authorization code for tokens
  - Refreshing expired access tokens (stored only the refresh token in DB)
  - Creating Google Calendar events
  - Checking Calendar availability (free/busy)
  - Appending rows to Google Sheets

Requires env vars:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_REDIRECT_URI   (e.g. https://api.callerx.ai/api/v1/google/callback)
"""
import os
import time
import uuid
from typing import Optional
import httpx
from loguru import logger

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "https://api.callerx.ai/api/v1/google/callback")

SCOPES = " ".join([
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "openid",
    "email",
])

TOKEN_URL = "https://oauth2.googleapis.com/token"
REFRESH_BUFFER = 300  # refresh if token expires within 5 min


# ─── OAuth URL ────────────────────────────────────────────────────────────────
def build_auth_url(tenant_id: str) -> str:
    """Build the Google OAuth consent URL, encoding tenant_id in the state param."""
    params = {
        "client_id":     GOOGLE_CLIENT_ID,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope":         SCOPES,
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         tenant_id,
    }
    from urllib.parse import urlencode
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


# ─── Token exchange ───────────────────────────────────────────────────────────
async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for tokens. Returns the full token response."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(TOKEN_URL, data={
            "code":          code,
            "client_id":     GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri":  GOOGLE_REDIRECT_URI,
            "grant_type":    "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


# ─── Token refresh ────────────────────────────────────────────────────────────
async def get_valid_token(tenant) -> Optional[str]:
    """
    Return a valid Google access token for the tenant.
    Refreshes automatically if expired/missing.
    Persists the new token expiry to the tenant object (caller must commit).
    """
    now = int(time.time())
    if (
        getattr(tenant, "google_access_token", None)
        and (tenant.google_token_expires_at or 0) - now > REFRESH_BUFFER
    ):
        return tenant.google_access_token

    if not tenant.google_refresh_token:
        logger.warning(f"Tenant {tenant.id} has no Google refresh token")
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(TOKEN_URL, data={
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": tenant.google_refresh_token,
                "grant_type":    "refresh_token",
            })
            resp.raise_for_status()
            data = resp.json()
            new_token = data.get("access_token")
            if not new_token:
                logger.error(f"Google refresh missing access_token: {data}")
                return None

            # Update in-memory; caller must db.add(tenant) + db.commit()
            tenant._google_access_token_ephemeral = new_token
            tenant.google_token_expires_at = now + data.get("expires_in", 3600)
            logger.info(f"♻️ Google token refreshed for tenant {tenant.id}")
            return new_token
    except Exception as e:
        logger.error(f"Google token refresh failed: {e}")
        return None


# ─── Calendar: Create Event ───────────────────────────────────────────────────
async def create_calendar_event(
    tenant,
    title: str,
    date: str,
    time_str: str,
    duration_mins: int = 60,
    description: str = "",
    attendee_email: Optional[str] = None,
) -> dict:
    """
    Create a Google Calendar event.
    date: 'YYYY-MM-DD', time_str: 'HH:MM'
    Returns the full event object from Google.
    """
    token = await get_valid_token(tenant)
    if not token:
        raise ValueError("No valid Google access token available")

    from datetime import datetime, timedelta
    dt_start = datetime.strptime(f"{date} {time_str}", "%Y-%m-%d %H:%M")
    dt_end = dt_start + timedelta(minutes=duration_mins)

    event_body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": dt_start.isoformat(), "timeZone": "UTC"},
        "end":   {"dateTime": dt_end.isoformat(),   "timeZone": "UTC"},
    }
    if attendee_email:
        event_body["attendees"] = [{"email": attendee_email}]

    calendar_id = getattr(tenant, "google_calendar_id", "primary") or "primary"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"https://www.googleapis.com/calendar/v3/calendars/{calendar_id}/events",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=event_body,
        )
        resp.raise_for_status()
        return resp.json()


# ─── Calendar: Availability Check ────────────────────────────────────────────
async def get_calendar_availability(tenant, date: str) -> list[str]:
    """
    Return a list of busy HH:MM slots for the given date.
    Checks in 30-minute intervals from 08:00 to 18:00.
    """
    token = await get_valid_token(tenant)
    if not token:
        raise ValueError("No valid Google access token available")

    from datetime import datetime
    dt_start = datetime.strptime(f"{date} 00:00", "%Y-%m-%d %H:%M")
    dt_end   = datetime.strptime(f"{date} 23:59", "%Y-%m-%d %H:%M")
    calendar_id = getattr(tenant, "google_calendar_id", "primary") or "primary"

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://www.googleapis.com/calendar/v3/freeBusy",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "timeMin": dt_start.isoformat() + "Z",
                "timeMax": dt_end.isoformat() + "Z",
                "items": [{"id": calendar_id}],
            },
        )
        resp.raise_for_status()
        data = resp.json()

    busy_periods = data.get("calendars", {}).get(calendar_id, {}).get("busy", [])
    busy_slots = []
    for period in busy_periods:
        start_str = period.get("start", "")
        if "T" in start_str:
            busy_slots.append(start_str.split("T")[1][:5])
    return busy_slots


# ─── Sheets: Append Lead Row ──────────────────────────────────────────────────
async def append_lead_to_sheet(tenant, lead_data: dict) -> Optional[int]:
    """
    Append a lead row to the tenant's configured Google Sheet.
    Returns the row number or None on failure.
    """
    sheet_id = getattr(tenant, "google_sheet_id", None)
    if not sheet_id:
        logger.warning("No Google Sheet configured for this tenant")
        return None

    token = await get_valid_token(tenant)
    if not token:
        return None

    sheet_name = getattr(tenant, "google_sheet_name", "Sheet1") or "Sheet1"
    row = [
        lead_data.get("name", ""),
        lead_data.get("phone", ""),
        lead_data.get("email", ""),
        lead_data.get("intent", ""),
        lead_data.get("notes", ""),
        lead_data.get("appointment_date", ""),
        lead_data.get("appointment_time", ""),
        lead_data.get("status", ""),
        lead_data.get("agent_name", ""),
    ]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_name}!A1:append",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                params={"valueInputOption": "USER_ENTERED"},
                json={"values": [row]},
            )
            resp.raise_for_status()
            updated = resp.json().get("updates", {})
            updated_range = updated.get("updatedRange", "")
            if updated_range and ":" in updated_range:
                row_num = int(updated_range.split("!")[-1].split(":")[0][1:])
                return row_num
    except Exception as e:
        logger.error(f"Google Sheets append failed: {e}")
    return None


# ─── Sheets: Fetch Values for KB ─────────────────────────────────────────────
async def fetch_sheet_values(tenant, sheet_id: str, range_name: str) -> Optional[list[list]]:
    """
    Fetch all cells in a sheet range (e.g. 'Sheet1!A1:Z500') from Google Sheets.
    Used for ingesting tabular spreadsheets into the Knowledge Base.
    """
    token = await get_valid_token(tenant)
    if not token:
        logger.error(f"No valid Google access token available for tenant {tenant.id}")
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{range_name}"
            resp = await client.get(
                url,
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"}
            )
            resp.raise_for_status()
            return resp.json().get("values", [])
    except Exception as e:
        logger.error(f"Google Sheets fetch failed for sheet {sheet_id}, range {range_name}: {e}")
        raise e

