import os
import httpx
from loguru import logger
import asyncio

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
ADMIN_TELEGRAM_CHAT_ID = os.environ.get("ADMIN_TELEGRAM_CHAT_ID")

async def send_admin_alert(message: str):
    """
    Sends a Telegram alert to the admin chat ID using the configured bot token.
    Fails silently if the env variables are missing or the API call fails, 
    to not block the main application flows.
    """
    if not TELEGRAM_BOT_TOKEN or not ADMIN_TELEGRAM_CHAT_ID:
        logger.warning("TELEGRAM_BOT_TOKEN or ADMIN_TELEGRAM_CHAT_ID missing. Cannot send admin alert.")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": ADMIN_TELEGRAM_CHAT_ID,
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

def send_admin_alert_background(message: str):
    """
    Utility to fire-and-forget the alert in a background task (synchronous contexts).
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(send_admin_alert(message))
    except RuntimeError:
        asyncio.run(send_admin_alert(message))
