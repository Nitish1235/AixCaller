import os
import httpx
import uuid
from fastapi import APIRouter, Request, Depends
from sqlmodel import Session, select
from loguru import logger
from shared.database import engine
from shared.models import Tenant
from ..main import get_db

router = APIRouter(prefix="/api/v1/telegram", tags=["telegram"])

@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receives incoming messages from the Telegram Bot webhook.
    """
    try:
        data = await request.json()
        
        # Check if there is a message
        if "message" in data:
            chat_id = data["message"]["chat"]["id"]
            text = data["message"].get("text", "")
            
            # Check for the deep link command: /start tenant-<uuid>
            if text.startswith("/start tenant-"):
                tenant_id_str = text.split("tenant-")[1].strip()
                
                try:
                    tenant_uuid = uuid.UUID(tenant_id_str)
                    tenant = db.get(Tenant, tenant_uuid)
                    
                    if tenant:
                        # Save the chat ID
                        tenant.telegram_chat_id = str(chat_id)
                        db.add(tenant)
                        db.commit()
                        
                        # Send confirmation message
                        await send_telegram_message(
                            chat_id, 
                            "✅ *Successfully linked!*\n\nYou will now receive instant AIxCaller summaries here for all completed calls."
                        )
                        logger.info(f"Telegram connected for tenant {tenant_uuid}")
                    else:
                        await send_telegram_message(chat_id, "❌ Invalid Tenant ID.")
                except ValueError:
                    await send_telegram_message(chat_id, "❌ Invalid format.")

    except Exception as e:
        logger.error(f"Error processing Telegram webhook: {e}")

    # Always return 200 to Telegram so it doesn't retry
    return {"status": "ok"}

async def send_telegram_message(chat_id: str, text: str):
    """
    Helper function to send a message via Telegram API
    """
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN is missing")
        return
        
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            await client.post(url, json=payload)
        except Exception as e:
            logger.error(f"Failed to send Telegram message: {e}")
