import os
import asyncio
from loguru import logger
import resend


def _build_summary_html(data: dict) -> str:
    """Build a clean, branded HTML email for the call summary."""
    phone        = data.get("phone", "Unknown")
    summary      = data.get("summary", "No summary available.")
    sentiment    = data.get("sentiment", "neutral")
    action_items = data.get("action_items", "None")
    transcript   = data.get("transcript", "")
    call_id      = data.get("call_id", "")

    # Sentiment colour
    sentiment_color = {"positive": "#059669", "negative": "#DC2626", "neutral": "#6B7280"}.get(
        str(sentiment).lower(), "#6B7280"
    )
    sentiment_label = str(sentiment).capitalize()

    # Truncate transcript to 1500 chars for email safety
    transcript_excerpt = (transcript[:1500] + "…") if len(transcript) > 1500 else transcript
    transcript_html = transcript_excerpt.replace("\n", "<br>") if transcript_excerpt else "No transcript recorded."

    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Call Summary — AIxCaller</title>
</head>
<body style="margin:0;padding:0;background:#F6FEFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6FEFA;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#064E3B,#10B981);border-radius:16px 16px 0 0;padding:32px 36px;text-align:center;">
            <div style="font-size:28px;margin-bottom:8px;">🎙️</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Call Summary Report</h1>
            <p style="margin:6px 0 0;color:#A7F3D0;font-size:13px;">AIxCaller · Powered by AI</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#fff;padding:32px 36px;border:1px solid #D1FAE5;border-top:none;">

            <!-- Meta row -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  <div style="background:#F6FEFA;border:1px solid #D1FAE5;border-radius:10px;padding:14px 16px;">
                    <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Caller</div>
                    <div style="font-size:15px;font-weight:800;color:#064E3B;font-family:monospace;">{phone}</div>
                  </div>
                </td>
                <td style="width:50%;padding-left:8px;">
                  <div style="background:#F6FEFA;border:1px solid #D1FAE5;border-radius:10px;padding:14px 16px;">
                    <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Sentiment</div>
                    <div style="font-size:15px;font-weight:800;color:{sentiment_color};">● {sentiment_label}</div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Summary -->
            <div style="margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">📋 AI Summary</div>
              <div style="background:#F6FEFA;border-left:4px solid #10B981;border-radius:0 10px 10px 0;padding:16px 18px;font-size:14px;color:#374151;line-height:1.7;">
                {summary}
              </div>
            </div>

            <!-- Action Items -->
            <div style="margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">✅ Action Items</div>
              <div style="background:#ECFDF5;border:1px solid #D1FAE5;border-radius:10px;padding:16px 18px;font-size:14px;color:#064E3B;line-height:1.7;">
                {action_items if action_items and action_items != "None" else "No action items identified."}
              </div>
            </div>

            <!-- Transcript -->
            <div style="margin-bottom:24px;">
              <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">💬 Transcript Excerpt</div>
              <div style="background:#0F172A;border-radius:10px;padding:18px;font-size:12px;color:#6EE7B7;line-height:1.8;font-family:monospace;max-height:200px;overflow:hidden;">
                {transcript_html}
              </div>
            </div>

            <!-- Call ID -->
            <div style="border-top:1px solid #E5E7EB;padding-top:16px;font-size:11px;color:#9CA3AF;">
              Call ID: <code style="font-family:monospace;">{call_id}</code>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F6FEFA;border:1px solid #D1FAE5;border-top:none;border-radius:0 0 16px 16px;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9CA3AF;">
              Sent by <strong style="color:#064E3B;">AIxCaller</strong> · AI Voice Agents for Business<br>
              <a href="https://aixcaller.live" style="color:#10B981;text-decoration:none;">aixcaller.live</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""


async def send_call_summary_email(to_email: str, data: dict) -> bool:
    """
    Sends a branded call summary email via Resend.

    Uses the official Resend Python SDK (resend.Emails.send).
    The SDK call is synchronous, so we run it in a thread executor
    to keep FastAPI's event loop unblocked.

    Args:
        to_email: recipient email address
        data: dict with keys: call_id, phone, summary, sentiment,
                               action_items, transcript

    Returns:
        True on success, False on failure.
    """
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY not set — skipping summary email.")
        return False

    resend.api_key = api_key

    from_address = os.environ.get("RESEND_FROM_EMAIL", "AIxCaller <noreply@aixcaller.live>")
    phone        = data.get("phone", "Unknown Caller")

    params: resend.Emails.SendParams = {
        "from":    from_address,
        "to":      [to_email],
        "subject": f"📞 Call Summary: {phone}",
        "html":    _build_summary_html(data),
    }

    try:
        # resend.Emails.send is synchronous — run in thread executor
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(None, lambda: resend.Emails.send(params))
        logger.info(f"Summary email sent to {to_email} | id={response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Resend email failed: {e}")
        return False
