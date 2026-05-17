"""
Call summary emails — 3 formats based on call type.

  lead_gen  → 🎯 New Lead          — intent, interest level, follow-up
  booking   → 📅 Appointment        — date/time, service, confirmed
  support / ecommerce → 🎧 Support  — issue, resolved, sentiment prominent
  general   → 📞 Call Summary       — standard outline

All templates are intentionally short — outline only, not a full report.
"""
import os
import asyncio
from loguru import logger
import resend


# ── Shared styles ─────────────────────────────────────────────────────────────
_BASE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:28px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Header -->
      <tr>
        <td style="background:{header_bg};border-radius:14px 14px 0 0;padding:24px 32px;">
          <div style="font-size:24px;margin-bottom:6px;">{header_icon}</div>
          <h1 style="margin:0;color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.3px;">{header_title}</h1>
          <p style="margin:4px 0 0;color:{header_sub_color};font-size:12px;">{agent_name} · {phone}</p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#fff;padding:24px 32px;border:1px solid #E2E8F0;border-top:none;">
          {body}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#F8FAFC;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 14px 14px;padding:14px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94A3B8;">
            Sent by <strong style="color:#0F172A;">AIxCaller</strong> · AI Voice Agents for Business &nbsp;·&nbsp;
            <a href="https://aixcaller.live" style="color:#6366F1;text-decoration:none;">aixcaller.live</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""

_SENTIMENT_COLORS = {
    "happy":      ("#059669", "😊 Happy"),
    "frustrated": ("#DC2626", "😤 Frustrated"),
    "neutral":    ("#6B7280", "😐 Neutral"),
}


def _sentiment_badge(sentiment: str) -> str:
    color, label = _SENTIMENT_COLORS.get(str(sentiment).lower(), ("#6B7280", "😐 Neutral"))
    return (
        f'<span style="background:{color}18;color:{color};font-weight:700;'
        f'font-size:12px;padding:3px 10px;border-radius:99px;border:1px solid {color}44;">'
        f'{label}</span>'
    )


def _row(label: str, value: str, accent: str = "#6366F1") -> str:
    """Single labelled row used across all templates."""
    return f"""
<tr>
  <td style="padding:8px 0;border-bottom:1px solid #F1F5F9;vertical-align:top;">
    <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
                letter-spacing:0.5px;margin-bottom:2px;">{label}</div>
    <div style="font-size:14px;font-weight:600;color:#0F172A;">{value}</div>
  </td>
</tr>"""


def _action_items_html(items) -> str:
    if isinstance(items, str):
        import json as _json
        try:
            items = _json.loads(items)
        except Exception:
            items = [items] if items and items != "None" else []
    if not items:
        return '<span style="color:#94A3B8;font-size:13px;">No follow-up actions needed.</span>'
    rows = "".join(
        f'<li style="margin-bottom:4px;font-size:13px;color:#374151;">{item}</li>'
        for item in items
    )
    return f'<ul style="margin:0;padding-left:18px;">{rows}</ul>'


# ── Template 1: Lead Gen ──────────────────────────────────────────────────────
def _build_lead_gen_html(data: dict) -> str:
    phone      = data.get("phone", "Unknown")
    summary    = data.get("summary", "—")
    sentiment  = data.get("sentiment", "Neutral")
    items      = data.get("action_items", [])
    agent_name = data.get("agent_name", "Your AI Agent")
    lead_info  = data.get("lead_info") or {}

    intent    = lead_info.get("intent", "Not specified")
    level     = str(lead_info.get("interest_level", "warm")).lower()
    level_map = {"hot": ("🔥", "#DC2626"), "warm": ("✨", "#D97706"), "cold": ("❄️", "#6B7280")}
    level_icon, level_color = level_map.get(level, ("✨", "#D97706"))
    level_label = level.capitalize()

    body = f"""
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  {_row("What they wanted", intent)}
  {_row("Interest level",
        f'<span style="color:{level_color};font-weight:800;">{level_icon} {level_label}</span>')}
  {_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">📋 Summary</div>
  <div style="background:#F8FAFC;border-left:3px solid #6366F1;border-radius:0 8px 8px 0;
              padding:12px 16px;font-size:13px;color:#374151;line-height:1.7;">
    {summary}
  </div>
</div>

<div>
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">✅ Next Steps</div>
  <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;
              padding:12px 16px;">
    {_action_items_html(items)}
  </div>
</div>"""

    return _BASE.format(
        title="New Lead — AIxCaller",
        header_bg="linear-gradient(135deg,#4F46E5,#7C3AED)",
        header_icon="🎯",
        header_title="New Lead Captured",
        header_sub_color="#C4B5FD",
        agent_name=agent_name,
        phone=phone,
        body=body,
    )


# ── Template 2: Booking / Appointment ────────────────────────────────────────
def _build_booking_html(data: dict) -> str:
    phone        = data.get("phone", "Unknown")
    summary      = data.get("summary", "—")
    sentiment    = data.get("sentiment", "Neutral")
    items        = data.get("action_items", [])
    agent_name   = data.get("agent_name", "Your AI Agent")
    booking_info = data.get("booking_info") or {}

    service   = booking_info.get("service", "Not specified")
    date_str  = booking_info.get("date", "") or "—"
    time_str  = booking_info.get("time", "") or "—"
    confirmed = booking_info.get("confirmed", False)
    confirmed_html = (
        '<span style="color:#059669;font-weight:700;">✅ Confirmed</span>'
        if confirmed else
        '<span style="color:#D97706;font-weight:700;">⏳ Pending confirmation</span>'
    )

    body = f"""
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  {_row("Service / Purpose", service)}
  {_row("Date", date_str)}
  {_row("Time", time_str)}
  {_row("Status", confirmed_html)}
  {_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">📋 Summary</div>
  <div style="background:#F8FAFC;border-left:3px solid #059669;border-radius:0 8px 8px 0;
              padding:12px 16px;font-size:13px;color:#374151;line-height:1.7;">
    {summary}
  </div>
</div>

<div>
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">✅ Next Steps</div>
  <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;
              padding:12px 16px;">
    {_action_items_html(items)}
  </div>
</div>"""

    return _BASE.format(
        title="Appointment Booked — AIxCaller",
        header_bg="linear-gradient(135deg,#059669,#0D9488)",
        header_icon="📅",
        header_title="Appointment Call",
        header_sub_color="#A7F3D0",
        agent_name=agent_name,
        phone=phone,
        body=body,
    )


# ── Template 3: Support / E-commerce ─────────────────────────────────────────
def _build_support_html(data: dict) -> str:
    phone      = data.get("phone", "Unknown")
    summary    = data.get("summary", "—")
    sentiment  = data.get("sentiment", "Neutral")
    items      = data.get("action_items", [])
    agent_name = data.get("agent_name", "Your AI Agent")
    issue_info = data.get("issue_info") or {}
    call_type  = data.get("call_type", "support")

    issue    = issue_info.get("issue", "Not specified")
    resolved = issue_info.get("resolved", False)
    resolved_html = (
        '<span style="color:#059669;font-weight:700;">✅ Resolved</span>'
        if resolved else
        '<span style="color:#DC2626;font-weight:700;">❌ Needs follow-up</span>'
    )

    # Sentiment is especially important for support calls — show it prominently
    _, label_with_icon = _SENTIMENT_COLORS.get(str(sentiment).lower(), ("#6B7280", "😐 Neutral"))
    is_frustrated = str(sentiment).lower() == "frustrated"
    sentiment_alert = ""
    if is_frustrated:
        sentiment_alert = """
<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;
            padding:10px 14px;margin-bottom:16px;font-size:13px;color:#DC2626;font-weight:600;">
  ⚠️ Caller was frustrated — consider a follow-up.
</div>"""

    icon  = "📦" if call_type == "ecommerce" else "🎧"
    title = "Order Support Call" if call_type == "ecommerce" else "Support Call"
    hbg   = "linear-gradient(135deg,#DC2626,#B91C1C)" if is_frustrated else "linear-gradient(135deg,#0F172A,#1E293B)"
    hsub  = "#FECACA" if is_frustrated else "#94A3B8"

    body = f"""
{sentiment_alert}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  {_row("Issue / Question", issue)}
  {_row("Resolution", resolved_html)}
  {_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">📋 Summary</div>
  <div style="background:#F8FAFC;border-left:3px solid #0F172A;border-radius:0 8px 8px 0;
              padding:12px 16px;font-size:13px;color:#374151;line-height:1.7;">
    {summary}
  </div>
</div>

<div>
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">✅ Next Steps</div>
  <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;
              padding:12px 16px;">
    {_action_items_html(items)}
  </div>
</div>"""

    return _BASE.format(
        title=f"{title} — AIxCaller",
        header_bg=hbg,
        header_icon=icon,
        header_title=title,
        header_sub_color=hsub,
        agent_name=agent_name,
        phone=phone,
        body=body,
    )


# ── Template 4: General fallback ─────────────────────────────────────────────
def _build_general_html(data: dict) -> str:
    phone      = data.get("phone", "Unknown")
    summary    = data.get("summary", "No summary available.")
    sentiment  = data.get("sentiment", "Neutral")
    items      = data.get("action_items", [])
    agent_name = data.get("agent_name", "Your AI Agent")
    duration   = data.get("duration_seconds", 0)
    dur_str    = f"{int(duration // 60)}m {int(duration % 60)}s" if duration else "—"

    body = f"""
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
  {_row("Call duration", dur_str)}
  {_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

<div style="margin-bottom:20px;">
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">📋 Summary</div>
  <div style="background:#F8FAFC;border-left:3px solid #10B981;border-radius:0 8px 8px 0;
              padding:12px 16px;font-size:13px;color:#374151;line-height:1.7;">
    {summary}
  </div>
</div>

<div>
  <div style="font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;
              letter-spacing:0.5px;margin-bottom:8px;">✅ Next Steps</div>
  <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;
              padding:12px 16px;">
    {_action_items_html(items)}
  </div>
</div>"""

    return _BASE.format(
        title="Call Summary — AIxCaller",
        header_bg="linear-gradient(135deg,#064E3B,#10B981)",
        header_icon="📞",
        header_title="Call Summary",
        header_sub_color="#A7F3D0",
        agent_name=agent_name,
        phone=phone,
        body=body,
    )


# ── Router ────────────────────────────────────────────────────────────────────
def _build_email_html(data: dict) -> str:
    """Pick the right template based on call_type."""
    call_type = str(data.get("call_type", "general")).lower()
    if call_type == "lead_gen":
        return _build_lead_gen_html(data)
    elif call_type == "booking":
        return _build_booking_html(data)
    elif call_type in ("support", "ecommerce"):
        return _build_support_html(data)
    else:
        return _build_general_html(data)


def _build_subject(data: dict) -> str:
    call_type  = str(data.get("call_type", "general")).lower()
    phone      = data.get("phone", "Unknown Caller")
    agent_name = data.get("agent_name", "")

    prefix_map = {
        "lead_gen":  "🎯 New Lead",
        "booking":   "📅 Appointment",
        "support":   "🎧 Support Call",
        "ecommerce": "📦 Order Call",
        "general":   "📞 Call Summary",
    }
    prefix = prefix_map.get(call_type, "📞 Call Summary")
    suffix = f" — {agent_name}" if agent_name else ""
    return f"{prefix}: {phone}{suffix}"


# ── Public API ────────────────────────────────────────────────────────────────
async def send_call_summary_email(to_email: str, data: dict) -> bool:
    """
    Send a branded call summary email via Resend.

    data keys (all optional with safe defaults):
      call_id, phone, summary, sentiment, action_items,
      call_type       — "lead_gen" | "booking" | "support" | "ecommerce" | "general"
      lead_info       — {"intent": str, "interest_level": str}
      booking_info    — {"service": str, "date": str, "time": str, "confirmed": bool}
      issue_info      — {"issue": str, "resolved": bool}
      agent_name      — shown in header subtitle
      duration_seconds — shown in general template
    """
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — skipping summary email.")
        return False

    resend.api_key = api_key
    from_address   = os.environ.get("RESEND_FROM_EMAIL", "AIxCaller <noreply@aixcaller.live>")

    params: resend.Emails.SendParams = {
        "from":    from_address,
        "to":      [to_email],
        "subject": _build_subject(data),
        "html":    _build_email_html(data),
    }

    try:
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, lambda: resend.Emails.send(params))
        logger.info(
            f"Summary email sent to {to_email} "
            f"[type={data.get('call_type','general')}] id={response.get('id')}"
        )
        return True
    except Exception as e:
        logger.error(f"Resend email failed: {e}")
        return False
