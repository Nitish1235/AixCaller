"""
outbound/services/sms_drip.py
==============================
Post-call SMS Drip Engine — sends personalized Telnyx SMS messages
immediately after each call outcome.

Outcomes handled:
  - no_answer   → sms_no_answer_template
  - voicemail   → sms_voicemail_template
  - booked      → sms_booked_template
  - reminder    → sms_reminder_template (24h before appointment)
"""

import os
import httpx
from loguru import logger
from shared.models import Campaign, CampaignLead, Agent

TELNYX_MESSAGES_URL = "https://api.telnyx.com/v2/messages"

# Opt-out keywords — if lead sends any of these, mark as DNC
OPT_OUT_KEYWORDS = {"stop", "unsubscribe", "cancel", "quit", "remove", "optout", "opt-out"}


def _render_template(template: str, lead: CampaignLead, campaign: Campaign,
                     booking_link: str = "", appointment_date: str = "",
                     appointment_time: str = "") -> str:
    """Substitutes template variables with lead/campaign data."""
    return (
        template
        .replace("{name}", lead.name or "there")
        .replace("{agent_name}", getattr(campaign, "agent", None).name if getattr(campaign, "agent", None) else "")
        .replace("{business_name}", getattr(campaign, "agent", None).business_name if getattr(campaign, "agent", None) else "")
        .replace("{booking_link}", booking_link)
        .replace("{appointment_date}", appointment_date)
        .replace("{appointment_time}", appointment_time)
    )


async def send_sms(
    from_number: str,
    to_number: str,
    message: str,
) -> bool:
    """Low-level Telnyx SMS send. Returns True on success."""
    api_key = os.environ.get("TELNYX_API_KEY", "")
    if not api_key:
        logger.error("TELNYX_API_KEY not set — cannot send SMS.")
        return False

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                TELNYX_MESSAGES_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": from_number,
                    "to": to_number,
                    "text": message,
                }
            )
            if resp.status_code in (200, 201):
                logger.info(f"SMS sent to {to_number}: {message[:60]}...")
                return True
            logger.error(f"Telnyx SMS failed ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.error(f"Exception sending SMS to {to_number}: {e}")
    return False


async def send_no_answer_sms(
    campaign: Campaign,
    lead: CampaignLead,
    from_number: str,
    booking_link: str = "",
) -> bool:
    """Send SMS after no-answer outcome."""
    if not campaign.sms_enabled or not campaign.sms_no_answer_template:
        return False
    message = _render_template(
        campaign.sms_no_answer_template, lead, campaign,
        booking_link=booking_link
    )
    return await send_sms(from_number, lead.phone, message)


async def send_voicemail_sms(
    campaign: Campaign,
    lead: CampaignLead,
    from_number: str,
    booking_link: str = "",
) -> bool:
    """Send SMS after voicemail drop outcome."""
    if not campaign.sms_enabled or not campaign.sms_voicemail_template:
        return False
    message = _render_template(
        campaign.sms_voicemail_template, lead, campaign,
        booking_link=booking_link
    )
    return await send_sms(from_number, lead.phone, message)


async def send_booked_sms(
    campaign: Campaign,
    lead: CampaignLead,
    from_number: str,
    appointment_date: str,
    appointment_time: str,
    booking_link: str = "",
) -> bool:
    """Send booking confirmation SMS."""
    if not campaign.sms_enabled or not campaign.sms_booked_template:
        return False
    message = _render_template(
        campaign.sms_booked_template, lead, campaign,
        booking_link=booking_link,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
    )
    return await send_sms(from_number, lead.phone, message)


async def send_reminder_sms(
    campaign: Campaign,
    lead: CampaignLead,
    from_number: str,
    appointment_time: str,
) -> bool:
    """Send 24-hour appointment reminder SMS."""
    if not campaign.sms_enabled or not campaign.sms_reminder_template:
        return False
    message = _render_template(
        campaign.sms_reminder_template, lead, campaign,
        appointment_time=appointment_time,
    )
    return await send_sms(from_number, lead.phone, message)


def is_opt_out_reply(text: str) -> bool:
    """Checks if an inbound SMS reply is an opt-out request."""
    return text.strip().lower() in OPT_OUT_KEYWORDS




