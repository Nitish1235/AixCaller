"""
Call summary emails — 3 smart templates routed by call_type.

  lead_gen              → 🎯 New Lead Captured
  booking               → 📅 Appointment Booked
  support / ecommerce   → 🎧 Support / 📦 Order Call
  general               → 📞 Call Summary  (fallback)

Each template shows:
  • Caller phone + duration + timestamp  (top meta strip)
  • Type-specific highlights  (intent/booking details/issue)
  • AI Summary block
  • Action Items checklist
  • Conversation Excerpt  (last ~6 exchanges so you have context)
"""
import os
import json
import asyncio
from datetime import datetime, timezone
from loguru import logger
import resend


# ── Shared chrome ─────────────────────────────────────────────────────────────
_HTML_WRAPPER = """\
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#F1F5F9;padding:32px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0"
           style="max-width:580px;width:100%;">

      <!-- ── HEADER ───────────────────────────────────────────── -->
      <tr>
        <td style="background:{header_bg};
                   border-radius:16px 16px 0 0;
                   padding:28px 32px 24px;">
          <div style="font-size:28px;margin-bottom:8px;">{header_icon}</div>
          <h1 style="margin:0 0 4px;color:#fff;font-size:20px;
                     font-weight:900;letter-spacing:-0.4px;">
            {header_title}
          </h1>
          <p style="margin:0;color:{header_sub_color};font-size:12px;font-weight:600;">
            {agent_name}
          </p>
        </td>
      </tr>

      <!-- ── META STRIP ───────────────────────────────────────── -->
      <tr>
        <td style="background:{meta_bg};padding:12px 32px;
                   border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:12px;color:{meta_color};font-weight:700;">
                📞 {phone}
              </td>
              <td align="center" style="font-size:12px;color:{meta_color};font-weight:700;">
                ⏱ {duration}
              </td>
              <td align="right" style="font-size:12px;color:{meta_color};font-weight:700;">
                🕐 {timestamp}
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ── BODY ──────────────────────────────────────────────── -->
      <tr>
        <td style="background:#fff;padding:28px 32px;
                   border:1px solid #E2E8F0;border-top:none;">
          {body}
        </td>
      </tr>

      <!-- ── FOOTER ────────────────────────────────────────────── -->
      <tr>
        <td style="background:#F8FAFC;
                   border:1px solid #E2E8F0;border-top:none;
                   border-radius:0 0 16px 16px;
                   padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94A3B8;">
            Sent by <strong style="color:#0F172A;">AIxCaller</strong>
            &nbsp;·&nbsp; AI Voice Agents for Business
            &nbsp;·&nbsp;
            <a href="https://aixcaller.live" style="color:#6366F1;text-decoration:none;">
              aixcaller.live
            </a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>"""


# ── Shared helpers ────────────────────────────────────────────────────────────
_SENTIMENT_MAP = {
    "happy":      ("#059669", "#ECFDF5", "#BBF7D0", "😊 Happy"),
    "frustrated": ("#DC2626", "#FEF2F2", "#FECACA", "😤 Frustrated"),
    "neutral":    ("#64748B", "#F8FAFC", "#E2E8F0", "😐 Neutral"),
}


def _sentiment_badge(sentiment: str) -> str:
    color, _, _, label = _SENTIMENT_MAP.get(str(sentiment).lower(), _SENTIMENT_MAP["neutral"])
    return (
        f'<span style="background:{color}18;color:{color};font-weight:700;'
        f'font-size:12px;padding:4px 12px;border-radius:99px;border:1px solid {color}44;">'
        f'{label}</span>'
    )


def _section_label(text: str) -> str:
    return (
        f'<div style="font-size:10px;font-weight:800;color:#94A3B8;'
        f'text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">'
        f'{text}</div>'
    )


def _info_row(label: str, value: str) -> str:
    return f"""
<tr>
  <td width="36%" style="padding:9px 0;border-bottom:1px solid #F1F5F9;
                          vertical-align:top;">
    <span style="font-size:11px;font-weight:700;color:#94A3B8;
                 text-transform:uppercase;letter-spacing:0.5px;">{label}</span>
  </td>
  <td style="padding:9px 0 9px 12px;border-bottom:1px solid #F1F5F9;
             vertical-align:top;">
    <span style="font-size:14px;font-weight:600;color:#0F172A;">{value}</span>
  </td>
</tr>"""


def _action_items_html(items) -> str:
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            items = [items] if items and items not in ("None", "[]") else []
    if not items:
        return (
            '<span style="color:#94A3B8;font-size:13px;font-style:italic;">'
            'No follow-up actions needed.</span>'
        )
    rows = "".join(
        f'<li style="margin-bottom:6px;font-size:13px;color:#374151;line-height:1.5;">'
        f'{item}</li>'
        for item in items
    )
    return f'<ul style="margin:0;padding-left:20px;">{rows}</ul>'


def _transcript_excerpt(transcript, max_exchanges: int = 6) -> str:
    """Return the last N user/assistant exchanges as a styled HTML block."""
    if not transcript:
        return ""
    if isinstance(transcript, str):
        try:
            transcript = json.loads(transcript)
        except Exception:
            return ""
    lines = [
        m for m in transcript
        if isinstance(m, dict) and m.get("role") in ("user", "assistant")
    ]
    lines = lines[-max_exchanges * 2:]  # last N exchanges = 2*N messages
    if not lines:
        return ""

    rows = []
    for m in lines:
        role = m.get("role", "")
        content = m.get("content", "")
        if isinstance(content, list):
            content = " ".join(p.get("text", "") for p in content if isinstance(p, dict))
        content = str(content).strip()
        if not content:
            continue
        is_agent = role == "assistant"
        bg      = "#F0FDF4" if is_agent else "#EFF6FF"
        border  = "#BBF7D0" if is_agent else "#BFDBFE"
        label   = "Agent" if is_agent else "Caller"
        lcolor  = "#059669" if is_agent else "#3B82F6"
        rows.append(
            f'<div style="background:{bg};border:1px solid {border};border-radius:8px;'
            f'padding:8px 12px;margin-bottom:6px;">'
            f'<div style="font-size:10px;font-weight:800;color:{lcolor};'
            f'text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">{label}</div>'
            f'<div style="font-size:13px;color:#374151;line-height:1.5;">{content}</div>'
            f'</div>'
        )

    if not rows:
        return ""

    return (
        '<div style="margin-top:24px;">'
        + _section_label("💬 Conversation Excerpt")
        + "".join(rows)
        + '</div>'
    )


def _fmt_duration(seconds) -> str:
    try:
        s = int(seconds)
    except (TypeError, ValueError):
        return "—"
    if s <= 0:
        return "< 1 sec"
    m, sec = divmod(s, 60)
    return f"{m}m {sec}s" if m else f"{sec}s"


def _render(data: dict, *, header_bg: str, meta_bg: str, meta_color: str,
            header_icon: str, header_title: str, header_sub_color: str,
            title: str, body: str) -> str:
    return _HTML_WRAPPER.format(
        title=title,
        header_bg=header_bg,
        header_icon=header_icon,
        header_title=header_title,
        header_sub_color=header_sub_color,
        meta_bg=meta_bg,
        meta_color=meta_color,
        agent_name=data.get("agent_name", "Your AI Agent"),
        phone=data.get("phone", "Unknown Caller"),
        duration=_fmt_duration(data.get("duration_seconds", 0)),
        timestamp=data.get("call_timestamp", "—"),
        body=body,
    )


# ── Template 1: Lead Gen 🎯 ───────────────────────────────────────────────────
def _build_lead_gen_html(data: dict) -> str:
    summary   = data.get("summary", "—")
    sentiment = data.get("sentiment", "neutral")
    items     = data.get("action_items", [])
    lead_info = data.get("lead_info") or {}
    transcript = data.get("transcript")

    intent    = lead_info.get("intent", "Not specified")
    level     = str(lead_info.get("interest_level", "warm")).lower()
    level_map = {
        "hot":  ("🔥", "#DC2626", "#FEF2F2", "#FECACA"),
        "warm": ("✨", "#D97706", "#FFFBEB", "#FDE68A"),
        "cold": ("❄️", "#6B7280", "#F8FAFC", "#E2E8F0"),
    }
    l_icon, l_color, l_bg, l_border = level_map.get(level, level_map["warm"])

    interest_block = (
        f'<div style="background:{l_bg};border:1px solid {l_border};'
        f'border-radius:10px;padding:12px 16px;margin-bottom:20px;'
        f'display:inline-block;width:100%;box-sizing:border-box;">'
        f'<div style="font-size:10px;font-weight:800;color:{l_color};'
        f'text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Interest Level</div>'
        f'<div style="font-size:22px;font-weight:900;color:{l_color};">'
        f'{l_icon} {level.capitalize()}</div>'
        f'</div>'
    )

    body = f"""
{interest_block}

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
  {_info_row("What they wanted", intent)}
  {_info_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

{_section_label("📋 AI Summary")}
<div style="background:#F8FAFC;border-left:4px solid #6366F1;
            border-radius:0 10px 10px 0;padding:14px 18px;
            font-size:14px;color:#374151;line-height:1.75;margin-bottom:22px;">
  {summary}
</div>

{_section_label("✅ Next Steps")}
<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;
            padding:14px 18px;margin-bottom:0;">
  {_action_items_html(items)}
</div>
{_transcript_excerpt(transcript)}"""

    return _render(
        data,
        title="New Lead — AIxCaller",
        header_bg="linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)",
        meta_bg="#EEF2FF",
        meta_color="#4338CA",
        header_icon="🎯",
        header_title="New Lead Captured",
        header_sub_color="#C4B5FD",
        body=body,
    )


# ── Template 2: Booking 📅 ────────────────────────────────────────────────────
def _build_booking_html(data: dict) -> str:
    summary      = data.get("summary", "—")
    sentiment    = data.get("sentiment", "neutral")
    items        = data.get("action_items", [])
    booking_info = data.get("booking_info") or {}
    transcript   = data.get("transcript")

    service   = booking_info.get("service", "Not specified")
    date_str  = booking_info.get("date", "") or "—"
    time_str  = booking_info.get("time", "") or "—"
    confirmed = booking_info.get("confirmed", False)

    status_html = (
        '<span style="color:#059669;font-weight:700;font-size:14px;">✅ Confirmed</span>'
        if confirmed else
        '<span style="color:#D97706;font-weight:700;font-size:14px;">⏳ Awaiting confirmation</span>'
    )

    # Appointment card
    appt_card = f"""
<div style="background:linear-gradient(135deg,#ECFDF5,#D1FAE5);
            border:1px solid #6EE7B7;border-radius:12px;
            padding:18px 22px;margin-bottom:22px;">
  <div style="font-size:10px;font-weight:800;color:#065F46;
              text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;">
    📅 Appointment Details
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td width="50%" style="padding-bottom:10px;">
        <div style="font-size:11px;color:#6EE7B7;font-weight:700;
                    text-transform:uppercase;margin-bottom:3px;">Service</div>
        <div style="font-size:15px;font-weight:800;color:#064E3B;">{service}</div>
      </td>
      <td width="50%" style="padding-bottom:10px;">
        <div style="font-size:11px;color:#6EE7B7;font-weight:700;
                    text-transform:uppercase;margin-bottom:3px;">Status</div>
        <div>{status_html}</div>
      </td>
    </tr>
    <tr>
      <td>
        <div style="font-size:11px;color:#6EE7B7;font-weight:700;
                    text-transform:uppercase;margin-bottom:3px;">Date</div>
        <div style="font-size:15px;font-weight:800;color:#064E3B;">{date_str}</div>
      </td>
      <td>
        <div style="font-size:11px;color:#6EE7B7;font-weight:700;
                    text-transform:uppercase;margin-bottom:3px;">Time</div>
        <div style="font-size:15px;font-weight:800;color:#064E3B;">{time_str}</div>
      </td>
    </tr>
  </table>
</div>"""

    body = f"""
{appt_card}

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
  {_info_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

{_section_label("📋 AI Summary")}
<div style="background:#F8FAFC;border-left:4px solid #059669;
            border-radius:0 10px 10px 0;padding:14px 18px;
            font-size:14px;color:#374151;line-height:1.75;margin-bottom:22px;">
  {summary}
</div>

{_section_label("✅ Follow-Up Actions")}
<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;
            padding:14px 18px;">
  {_action_items_html(items)}
</div>
{_transcript_excerpt(transcript)}"""

    return _render(
        data,
        title="Appointment Booked — AIxCaller",
        header_bg="linear-gradient(135deg,#059669 0%,#0D9488 100%)",
        meta_bg="#ECFDF5",
        meta_color="#065F46",
        header_icon="📅",
        header_title="Appointment Booked",
        header_sub_color="#A7F3D0",
        body=body,
    )


# ── Template 3: Support / Ecommerce 🎧📦 ─────────────────────────────────────
def _build_support_html(data: dict) -> str:
    summary    = data.get("summary", "—")
    sentiment  = data.get("sentiment", "neutral")
    items      = data.get("action_items", [])
    issue_info = data.get("issue_info") or {}
    call_type  = str(data.get("call_type", "support")).lower()
    transcript = data.get("transcript")

    issue    = issue_info.get("issue", "Not specified")
    resolved = issue_info.get("resolved", False)
    resolved_html = (
        '<span style="color:#059669;font-weight:700;font-size:14px;">✅ Resolved on call</span>'
        if resolved else
        '<span style="color:#DC2626;font-weight:700;font-size:14px;">❌ Needs follow-up</span>'
    )

    is_frustrated = str(sentiment).lower() == "frustrated"
    is_ecommerce  = call_type == "ecommerce"

    frustrated_banner = ""
    if is_frustrated:
        frustrated_banner = """
<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;
            padding:12px 16px;margin-bottom:20px;">
  <div style="font-size:13px;font-weight:700;color:#DC2626;">
    ⚠️ Caller was frustrated — consider a personal follow-up.
  </div>
</div>"""

    icon  = "📦" if is_ecommerce else "🎧"
    title_label = "Order Support" if is_ecommerce else "Support"
    hbg   = "linear-gradient(135deg,#DC2626,#B91C1C)" if is_frustrated else (
            "linear-gradient(135deg,#1E3A5F,#2563EB)" if is_ecommerce else
            "linear-gradient(135deg,#0F172A,#334155)")
    hsub  = "#FECACA" if is_frustrated else "#93C5FD" if is_ecommerce else "#94A3B8"
    meta_bg    = "#FEF2F2" if is_frustrated else "#EFF6FF" if is_ecommerce else "#F8FAFC"
    meta_color = "#991B1B" if is_frustrated else "#1D4ED8" if is_ecommerce else "#475569"

    body = f"""
{frustrated_banner}

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
  {_info_row("Issue / Question", issue)}
  {_info_row("Resolution",       resolved_html)}
  {_info_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

{_section_label("📋 AI Summary")}
<div style="background:#F8FAFC;border-left:4px solid {'#DC2626' if is_frustrated else '#334155'};
            border-radius:0 10px 10px 0;padding:14px 18px;
            font-size:14px;color:#374151;line-height:1.75;margin-bottom:22px;">
  {summary}
</div>

{_section_label("✅ Action Items")}
<div style="background:#{'FEF2F2' if not resolved else 'F0FDF4'};
            border:1px solid #{'FECACA' if not resolved else 'BBF7D0'};
            border-radius:10px;padding:14px 18px;">
  {_action_items_html(items)}
</div>
{_transcript_excerpt(transcript)}"""

    return _render(
        data,
        title=f"{title_label} Call — AIxCaller",
        header_bg=hbg,
        meta_bg=meta_bg,
        meta_color=meta_color,
        header_icon=icon,
        header_title=f"{title_label} Call",
        header_sub_color=hsub,
        body=body,
    )


# ── Template 4: General (fallback) 📞 ────────────────────────────────────────
def _build_general_html(data: dict) -> str:
    summary    = data.get("summary", "No summary available.")
    sentiment  = data.get("sentiment", "neutral")
    items      = data.get("action_items", [])
    transcript = data.get("transcript")

    body = f"""
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
  {_info_row("Caller sentiment", _sentiment_badge(sentiment))}
</table>

{_section_label("📋 AI Summary")}
<div style="background:#F8FAFC;border-left:4px solid #10B981;
            border-radius:0 10px 10px 0;padding:14px 18px;
            font-size:14px;color:#374151;line-height:1.75;margin-bottom:22px;">
  {summary}
</div>

{_section_label("✅ Action Items")}
<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;
            padding:14px 18px;">
  {_action_items_html(items)}
</div>
{_transcript_excerpt(transcript)}"""

    return _render(
        data,
        title="Call Summary — AIxCaller",
        header_bg="linear-gradient(135deg,#064E3B 0%,#10B981 100%)",
        meta_bg="#ECFDF5",
        meta_color="#065F46",
        header_icon="📞",
        header_title="Call Summary",
        header_sub_color="#A7F3D0",
        body=body,
    )


# ── Router: pick template by call_type ───────────────────────────────────────
def _build_email_html(data: dict) -> str:
    call_type = str(data.get("call_type", "general")).lower()
    if call_type == "lead_gen":
        return _build_lead_gen_html(data)
    if call_type == "booking":
        return _build_booking_html(data)
    if call_type in ("support", "ecommerce"):
        return _build_support_html(data)
    return _build_general_html(data)


def _build_subject(data: dict) -> str:
    call_type  = str(data.get("call_type", "general")).lower()
    phone      = data.get("phone", "Unknown Caller")
    agent_name = data.get("agent_name", "")
    duration   = _fmt_duration(data.get("duration_seconds", 0))

    prefix_map = {
        "lead_gen":  "🎯 New Lead",
        "booking":   "📅 Appointment",
        "support":   "🎧 Support Call",
        "ecommerce": "📦 Order Call",
        "general":   "📞 Call Summary",
    }
    prefix = prefix_map.get(call_type, "📞 Call Summary")
    agent_part = f" · {agent_name}" if agent_name else ""
    return f"{prefix}: {phone}{agent_part} ({duration})"


# ── Public API ────────────────────────────────────────────────────────────────
async def send_call_summary_email(to_email: str, data: dict) -> bool:
    """
    Send a branded call summary email via Resend.

    Required in data:
      phone, summary, sentiment, action_items, call_type, agent_name,
      duration_seconds, call_timestamp, transcript

    Optional (used by specific templates):
      lead_info, booking_info, issue_info
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
            f"📧 Summary email sent to {to_email} "
            f"[type={data.get('call_type','general')}, "
            f"dur={_fmt_duration(data.get('duration_seconds',0))}] "
            f"id={response.get('id')}"
        )
        return True
    except Exception as e:
        logger.error(f"Resend email failed: {e}")
        return False
