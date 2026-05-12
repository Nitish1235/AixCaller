"""
Google OAuth2 service — handles Calendar + Sheets integration.

OAuth Scopes requested:
  - calendar.events           → create/read events
  - spreadsheets              → read/write Google Sheets
  - userinfo.email            → confirm account

Environment variables required:
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  SERVER_HOST  (e.g. https://api.callerx.ai)
"""

import os
import time
import httpx
from loguru import logger
from sqlmodel import Session
from shared.database import engine
from shared.models import Tenant
import uuid

GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
CALENDAR_API      = "https://www.googleapis.com/calendar/v3"
SHEETS_API        = "https://sheets.googleapis.com/v4/spreadsheets"

SCOPES = " ".join([
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
])


def get_oauth_redirect_uri() -> str:
    host = os.environ.get("SERVER_HOST", "http://localhost:8000")
    return f"https://{host}/api/v1/google/callback"


def build_auth_url(tenant_id: str) -> str:
    client_id = os.environ["GOOGLE_CLIENT_ID"]
    redirect  = get_oauth_redirect_uri()
    params = (
        f"?client_id={client_id}"
        f"&redirect_uri={redirect}"
        f"&response_type=code"
        f"&scope={SCOPES.replace(' ', '%20')}"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={tenant_id}"
    )
    return GOOGLE_AUTH_URL + params


async def exchange_code(code: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code":          code,
            "client_id":     os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uri":  get_oauth_redirect_uri(),
            "grant_type":    "authorization_code",
        })
        resp.raise_for_status()
        return resp.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Refresh a stale access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data={
            "client_id":     os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "refresh_token": refresh_token,
            "grant_type":    "refresh_token",
        })
        resp.raise_for_status()
        return resp.json()


async def get_valid_token(tenant: Tenant) -> str:
    """Return a valid access token, refreshing it if close to expiry."""
    now = int(time.time())
    # Refresh if expired or expiring within 5 minutes
    if not tenant.google_access_token or (tenant.google_token_expires_at and tenant.google_token_expires_at < now + 300):
        if not tenant.google_refresh_token:
            raise ValueError("Google not connected — no refresh token available")
        data = await refresh_access_token(tenant.google_refresh_token)
        # Update DB
        with Session(engine) as db:
            t = db.get(Tenant, tenant.id)
            if t:
                t.google_access_token     = data["access_token"]
                t.google_token_expires_at = now + data.get("expires_in", 3600)
                db.add(t)
                db.commit()
        return data["access_token"]
    return tenant.google_access_token


# ─── Google Calendar ─────────────────────────────────────────────────────────

async def create_calendar_event(
    tenant: Tenant,
    title: str,
    date: str,        # "YYYY-MM-DD"
    time_str: str,    # "HH:MM"
    duration_mins: int = 60,
    description: str = "",
    attendee_email: str = None,
) -> dict:
    """Create a Google Calendar event and return the event dict."""
    token       = await get_valid_token(tenant)
    calendar_id = tenant.google_calendar_id or "primary"

    # Build datetime strings in ISO 8601
    start_dt = f"{date}T{time_str}:00"
    # Simple duration addition
    h, m = divmod(int(time_str.replace(":", "")[2:]) + duration_mins * (1 if ":" in time_str else 0), 60)
    start_h = int(time_str.split(":")[0])
    start_m = int(time_str.split(":")[1])
    end_total_m = start_h * 60 + start_m + duration_mins
    end_h = end_total_m // 60
    end_m = end_total_m % 60
    end_dt = f"{date}T{end_h:02d}:{end_m:02d}:00"

    body = {
        "summary":     title,
        "description": description,
        "start":       {"dateTime": start_dt, "timeZone": "UTC"},
        "end":         {"dateTime": end_dt,   "timeZone": "UTC"},
    }
    if attendee_email:
        body["attendees"] = [{"email": attendee_email}]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{CALENDAR_API}/calendars/{calendar_id}/events",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
        resp.raise_for_status()
        return resp.json()


async def get_calendar_availability(
    tenant: Tenant,
    date: str,     # "YYYY-MM-DD"
) -> list[str]:
    """Return list of busy HH:MM slots on a given date."""
    token       = await get_valid_token(tenant)
    calendar_id = tenant.google_calendar_id or "primary"

    time_min = f"{date}T00:00:00Z"
    time_max = f"{date}T23:59:59Z"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{CALENDAR_API}/calendars/{calendar_id}/events",
            headers={"Authorization": f"Bearer {token}"},
            params={
                "timeMin":      time_min,
                "timeMax":      time_max,
                "singleEvents": "true",
                "orderBy":      "startTime",
            },
        )
        if resp.status_code != 200:
            return []
        events = resp.json().get("items", [])
        busy = []
        for ev in events:
            s = ev.get("start", {}).get("dateTime", "")
            if "T" in s:
                busy.append(s.split("T")[1][:5])   # "HH:MM"
        return busy


# ─── Google Sheets ───────────────────────────────────────────────────────────

LEAD_HEADERS = [
    "Timestamp", "Name", "Phone", "Email", "Intent", "Notes",
    "Appointment Date", "Appointment Time", "Status", "Agent"
]


async def ensure_sheet_headers(tenant: Tenant):
    """Write header row if the sheet is empty."""
    token    = await get_valid_token(tenant)
    sheet_id = tenant.google_sheet_id
    tab      = tenant.google_sheet_name or "Leads"
    if not sheet_id:
        return

    async with httpx.AsyncClient() as client:
        # Check if A1 is empty
        resp = await client.get(
            f"{SHEETS_API}/{sheet_id}/values/{tab}!A1",
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code == 200 and resp.json().get("values"):
            return   # headers already exist

        # Write headers
        await client.put(
            f"{SHEETS_API}/{sheet_id}/values/{tab}!A1",
            headers={"Authorization": f"Bearer {token}"},
            params={"valueInputOption": "USER_ENTERED"},
            json={"values": [LEAD_HEADERS]},
        )


async def append_lead_to_sheet(tenant: Tenant, lead_data: dict) -> int:
    """Append a lead row to Google Sheets. Returns the row number."""
    token    = await get_valid_token(tenant)
    sheet_id = tenant.google_sheet_id
    tab      = tenant.google_sheet_name or "Leads"
    if not sheet_id:
        raise ValueError("No Google Sheet configured")

    await ensure_sheet_headers(tenant)

    from datetime import datetime as dt
    row = [
        dt.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        lead_data.get("name", ""),
        lead_data.get("phone", ""),
        lead_data.get("email", ""),
        lead_data.get("intent", ""),
        lead_data.get("notes", ""),
        lead_data.get("appointment_date", ""),
        lead_data.get("appointment_time", ""),
        lead_data.get("status", "new"),
        lead_data.get("agent_name", ""),
    ]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SHEETS_API}/{sheet_id}/values/{tab}!A1:append",
            headers={"Authorization": f"Bearer {token}"},
            params={"valueInputOption": "USER_ENTERED", "insertDataOption": "INSERT_ROWS"},
            json={"values": [row]},
        )
        resp.raise_for_status()
        updates = resp.json().get("updates", {})
        # Parse row number from updatedRange like "Leads!A3:J3"
        try:
            rng = updates.get("updatedRange", "")
            row_num = int(rng.split("!")[-1].split(":")[0][1:])
        except Exception:
            row_num = 0
        return row_num
