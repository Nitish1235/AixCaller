import os
import httpx
from loguru import logger

async def send_admin_alert(message: str):
    """
    Sends a Telegram alert to the admin chat ID using the configured bot token.
    Fails silently if the env variables are missing or the API call fails,
    to not block the main application flows.
    Reads env vars at call time (not import time) so new values take effect immediately.
    """
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("ADMIN_TELEGRAM_CHAT_ID")

    if not bot_token or not chat_id:
        logger.warning("TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_CHAT_ID missing. Cannot send admin alert.")
        return

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=5.0)
            if resp.status_code != 200:
                logger.error(f"Failed to send Telegram alert. Status: {resp.status_code}, Response: {resp.text}")
            else:
                logger.info(f"Admin Telegram alert sent successfully: {message[:30]}...")
    except Exception as e:
        logger.error(f"Exception sending admin Telegram alert: {e}")

