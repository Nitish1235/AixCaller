"""
Google Calendar + Sheets API routes.

Endpoints:
  GET  /google/install?tenant_id=...   → OAuth redirect to Google
  GET  /google/callback                → OAuth callback, stores tokens
  DELETE /google/disconnect            → Revoke + clear tokens
  GET  /google/status?tenant_id=...    → Connection status
  PATCH /google/settings               → Update calendar_id, sheet_id, sheet_name
  GET  /leads?tenant_id=...            → List all captured leads
  PATCH /leads/{lead_id}               → Update lead status
"""

import os
import time
import uuid
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional
from shared.database import get_db
from shared.models import Tenant, Lead
from backend.services.google_oauth import (
    build_auth_url, exchange_code, get_valid_token,
    create_calendar_event, get_calendar_availability, append_lead_to_sheet,
)
from loguru import logger

router = APIRouter(prefix="/api/v1", tags=["google"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://callerx.ai")


# ─── OAuth Flow ───────────────────────────────────────────────────────────────

@router.get("/google/install")
async def google_install(tenant_id: str):
    """Redirect user to Google OAuth consent screen."""
    url = build_auth_url(tenant_id)
    return RedirectResponse(url)


@router.get("/google/callback")
async def google_callback(code: str = None, state: str = None, error: str = None, db: Session = Depends(get_db)):
    """Google redirects here after user consents. Store tokens in DB."""
    fe = FRONTEND_URL + "/dashboard/integrations"

    if error or not code or not state:
        logger.warning(f"Google OAuth error: {error}")
        return RedirectResponse(f"{fe}?google_error={error or 'cancelled'}")

    try:
        tenant_uuid = uuid.UUID(state)
    except Exception:
        return RedirectResponse(f"{fe}?google_error=invalid_state")

    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        return RedirectResponse(f"{fe}?google_error=tenant_not_found")

    try:
        data = await exchange_code(code)
    except Exception as e:
        logger.error(f"Google token exchange failed: {e}")
        return RedirectResponse(f"{fe}?google_error=token_exchange_failed")

    tenant.google_access_token     = data.get("access_token")
    tenant.google_refresh_token    = data.get("refresh_token") or tenant.google_refresh_token
    tenant.google_token_expires_at = int(time.time()) + data.get("expires_in", 3600)
    tenant.google_connected        = True
    db.add(tenant)
    db.commit()

    logger.info(f"✅ Google connected for tenant {tenant_uuid}")
    return RedirectResponse(f"{fe}?google_connected=1")


@router.delete("/google/disconnect")
async def google_disconnect(tenant_id: str, db: Session = Depends(get_db)):
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    tenant.google_access_token     = None
    tenant.google_refresh_token    = None
    tenant.google_token_expires_at = None
    tenant.google_connected        = False
    db.add(tenant)
    db.commit()
    return {"ok": True}


@router.get("/google/status")
async def google_status(tenant_id: str, db: Session = Depends(get_db)):
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    return {
        "connected":       tenant.google_connected,
        "calendar_id":     tenant.google_calendar_id,
        "sheet_id":        tenant.google_sheet_id,
        "sheet_name":      tenant.google_sheet_name,
    }


class GoogleSettingsRequest(BaseModel):
    tenant_id: str
    calendar_id: Optional[str] = None
    sheet_id: Optional[str] = None
    sheet_name: Optional[str] = None


@router.patch("/google/settings")
async def google_settings(req: GoogleSettingsRequest, db: Session = Depends(get_db)):
    tenant = db.get(Tenant, uuid.UUID(req.tenant_id))
    if not tenant:
        raise HTTPException(404, "Tenant not found")
    if req.calendar_id is not None:
        tenant.google_calendar_id = req.calendar_id
    if req.sheet_id is not None:
        tenant.google_sheet_id = req.sheet_id
    if req.sheet_name is not None:
        tenant.google_sheet_name = req.sheet_name
    db.add(tenant)
    db.commit()
    return {"ok": True}


# ─── Calendar availability helper (used by voice agent via backend) ──────────

@router.get("/google/availability")
async def check_availability(tenant_id: str, date: str, db: Session = Depends(get_db)):
    """Returns list of busy HH:MM slots for a given date."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant or not tenant.google_connected:
        raise HTTPException(400, "Google not connected")
    try:
        busy = await get_calendar_availability(tenant, date)
        return {"date": date, "busy_slots": busy}
    except Exception as e:
        logger.error(f"Calendar availability check failed: {e}")
        raise HTTPException(500, str(e))


# ─── Leads ────────────────────────────────────────────────────────────────────

@router.get("/leads")
async def list_leads(tenant_id: str, db: Session = Depends(get_db)):
    """Return all leads for a tenant, newest first."""
    leads = db.exec(
        select(Lead)
        .where(Lead.tenant_id == uuid.UUID(tenant_id))
        .order_by(Lead.created_at.desc())
    ).all()
    return {"leads": [l.model_dump() for l in leads]}


class LeadStatusUpdate(BaseModel):
    status: str   # new | contacted | booked | closed


@router.patch("/leads/{lead_id}")
async def update_lead(lead_id: str, body: LeadStatusUpdate, db: Session = Depends(get_db)):
    lead = db.get(Lead, uuid.UUID(lead_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    lead.status = body.status
    db.add(lead)
    db.commit()
    return lead.model_dump()


# ─── Appointment Booking (called by voice agent tool) ─────────────────────────────
class BookAppointmentRequest(BaseModel):
    tenant_id:  str
    agent_id:   str
    agent_name: str
    name:       str
    phone:      str
    email:      Optional[str] = ""
    date:       str           # YYYY-MM-DD
    time:       str           # HH:MM
    purpose:    Optional[str] = ""
    duration:   Optional[int] = 60


@router.post("/google/book-appointment")
async def book_appointment(req: BookAppointmentRequest, db: Session = Depends(get_db)):
    tenant = db.get(Tenant, uuid.UUID(req.tenant_id))
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    event_id   = None
    sheet_row  = None
    event_time = f"{req.date} at {req.time}"

    # 1. Create Google Calendar event (if connected)
    if tenant.google_connected:
        try:
            title       = f"Appointment: {req.name}" + (f" — {req.purpose}" if req.purpose else "")
            description = f"Booked via AIxCaller.\nPhone: {req.phone}\nEmail: {req.email or 'N/A'}"
            event = await create_calendar_event(
                tenant,
                title=title,
                date=req.date,
                time_str=req.time,
                duration_mins=req.duration or 60,
                description=description,
                attendee_email=req.email or None,
            )
            event_id = event.get("id")
            # Build human-readable time
            start = event.get("start", {}).get("dateTime", "")
            if "T" in start:
                event_time = start.replace("T", " at ").replace(":00Z", "").replace(":00+00:00", "")
            logger.info(f"✅ Calendar event created: {event_id}")
        except Exception as e:
            logger.error(f"Calendar event creation failed: {e}")

    # 2. Save lead to DB
    lead = Lead(
        tenant_id=uuid.UUID(req.tenant_id),
        agent_id=uuid.UUID(req.agent_id),
        name=req.name,
        phone=req.phone,
        email=req.email or None,
        intent=req.purpose or "Appointment booking",
        status="booked",
        appointment_date=req.date,
        appointment_time=req.time,
        google_event_id=event_id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # 3. Push to Google Sheets (if configured)
    if tenant.google_connected and tenant.google_sheet_id:
        try:
            row_num = await append_lead_to_sheet(tenant, {
                "name":             req.name,
                "phone":            req.phone,
                "email":            req.email or "",
                "intent":           req.purpose or "Appointment booking",
                "notes":            "",
                "appointment_date": req.date,
                "appointment_time": req.time,
                "status":           "booked",
                "agent_name":       req.agent_name,
            })
            lead.google_sheet_row = row_num
            db.add(lead)
            db.commit()
            logger.info(f"✅ Lead appended to Sheets row {row_num}")
        except Exception as e:
            logger.error(f"Sheets append failed: {e}")

    return {"ok": True, "lead_id": str(lead.id), "event_time": event_time}


# ─── Record Lead (called by voice agent tool) ─────────────────────────────────────
class RecordLeadRequest(BaseModel):
    tenant_id:  str
    agent_id:   str
    agent_name: str
    name:       str
    phone:      str
    email:      Optional[str] = ""
    intent:     Optional[str] = ""
    notes:      Optional[str] = ""


@router.post("/google/record-lead")
async def record_lead_endpoint(req: RecordLeadRequest, db: Session = Depends(get_db)):
    tenant = db.get(Tenant, uuid.UUID(req.tenant_id))
    if not tenant:
        raise HTTPException(404, "Tenant not found")

    # Save to DB
    lead = Lead(
        tenant_id=uuid.UUID(req.tenant_id),
        agent_id=uuid.UUID(req.agent_id),
        name=req.name,
        phone=req.phone,
        email=req.email or None,
        intent=req.intent or "Inquiry",
        notes=req.notes or None,
        status="new",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Push to Sheets (if configured)
    if tenant.google_connected and tenant.google_sheet_id:
        try:
            row_num = await append_lead_to_sheet(tenant, {
                "name":       req.name,
                "phone":      req.phone,
                "email":      req.email or "",
                "intent":     req.intent or "",
                "notes":      req.notes or "",
                "status":     "new",
                "agent_name": req.agent_name,
            })
            lead.google_sheet_row = row_num
            db.add(lead)
            db.commit()
        except Exception as e:
            logger.error(f"Sheets lead append failed: {e}")

    return {"ok": True, "lead_id": str(lead.id)}
