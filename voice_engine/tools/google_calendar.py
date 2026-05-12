"""
Voice agent tools for Google Calendar booking and lead capture.

Called by bot.py during live calls when the LLM decides to:
  - book_appointment(...)
  - record_lead(...)
  - check_availability(...)

These functions hit the backend API (which in turn calls Google APIs)
so the voice engine doesn't need direct Google credentials.
"""

import os
import httpx
from loguru import logger

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")


async def _post(path: str, payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=12.0) as client:
        resp = await client.post(f"{BACKEND_URL}{path}", json=payload)
        resp.raise_for_status()
        return resp.json()


async def _get(path: str, params: dict = None) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{BACKEND_URL}{path}", params=params or {})
        resp.raise_for_status()
        return resp.json()


# ─── Check Calendar Availability ─────────────────────────────────────────────

async def check_availability(tenant_id: str, date: str) -> str:
    """
    Check what time slots are available on a given date.
    Returns a voice-friendly string the LLM can read to the caller.
    date format: YYYY-MM-DD
    """
    try:
        data = await _get("/google/availability", {"tenant_id": tenant_id, "date": date})
        busy = data.get("busy_slots", [])

        # Standard business hours 9am-5pm, 1-hour slots
        all_slots = [f"{h:02d}:00" for h in range(9, 17)]
        available = [s for s in all_slots if s not in busy]

        if not available:
            return f"It looks like {date} is fully booked. Would you like to try another date?"

        readable = []
        for s in available[:4]:  # Cap at 4 so it's not overwhelming on a call
            h = int(s.split(":")[0])
            period = "AM" if h < 12 else "PM"
            h12 = h if h <= 12 else h - 12
            readable.append(f"{h12} {period}")

        more = ""
        if len(available) > 4:
            more = f" and {len(available) - 4} more"
        return f"On {date}, available slots are: {', '.join(readable)}{more}. Which time works for you?"

    except Exception as e:
        logger.error(f"check_availability tool error: {e}")
        return "I'm having trouble checking the calendar right now. Could you suggest a date and time and I'll note it down?"


# ─── Book Appointment ─────────────────────────────────────────────────────────

async def book_appointment(
    tenant_id: str,
    agent_id: str,
    agent_name: str,
    caller_name: str,
    caller_phone: str,
    date: str,          # YYYY-MM-DD
    time_str: str,      # HH:MM  24h
    purpose: str = "",
    caller_email: str = "",
    duration_mins: int = 60,
) -> str:
    """
    Book a Google Calendar event and save lead to DB + Sheets.
    Returns a voice-friendly confirmation string.
    """
    try:
        payload = {
            "tenant_id":   tenant_id,
            "agent_id":    agent_id,
            "agent_name":  agent_name,
            "name":        caller_name,
            "phone":       caller_phone,
            "email":       caller_email,
            "date":        date,
            "time":        time_str,
            "purpose":     purpose,
            "duration":    duration_mins,
        }
        result = await _post("/google/book-appointment", payload)
        event_time = result.get("event_time", f"{date} at {time_str}")
        return (
            f"Perfect! I've booked your appointment for {event_time}. "
            f"You'll receive a calendar invite shortly. Is there anything else I can help you with?"
        )
    except Exception as e:
        logger.error(f"book_appointment tool error: {e}")
        return (
            f"I've noted down your request for {date} at {time_str}. "
            f"Our team will confirm the appointment with you shortly."
        )


# ─── Record Lead ──────────────────────────────────────────────────────────────

async def record_lead(
    tenant_id: str,
    agent_id: str,
    agent_name: str,
    caller_name: str,
    caller_phone: str,
    intent: str,
    notes: str = "",
    caller_email: str = "",
) -> str:
    """
    Save a qualified lead to the DB and push to Google Sheets.
    Returns a short voice-friendly confirmation.
    """
    try:
        payload = {
            "tenant_id":  tenant_id,
            "agent_id":   agent_id,
            "agent_name": agent_name,
            "name":       caller_name,
            "phone":      caller_phone,
            "email":      caller_email,
            "intent":     intent,
            "notes":      notes,
        }
        await _post("/google/record-lead", payload)
        return f"Got it. I've recorded your details, {caller_name}. Our team will be in touch soon."
    except Exception as e:
        logger.error(f"record_lead tool error: {e}")
        return f"I've noted your information. Our team will follow up with you at {caller_phone}."
