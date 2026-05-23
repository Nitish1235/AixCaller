import uuid
import os
import httpx
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from loguru import logger
from sqlmodel import Session, select

from shared.database import get_db
from shared.models import Tenant, Agent, CallRecord
from shared.kb import search_knowledge_base
from backend.services.call_processor import process_completed_call

router = APIRouter(prefix="/api/v1/telnyx-ai", tags=["telnyx-ai"])

@router.post("/kb-search")
async def telnyx_kb_search(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Synchronous webhook tool for Telnyx Conversational AI to search the Knowledge Base.
    The URL configured in Telnyx should be:
    https://api.aixcaller.com/api/v1/telnyx-ai/kb-search?tenant_id=<id>&agent_id=<id>
    """
    try:
        payload = await request.json()
        logger.info(f"Received Telnyx AI KB Search Webhook: {payload}")

        # Extract search query parameters recursively
        query = "general information" # default fallback
        
        def find_query(d: Any) -> str:
            if isinstance(d, dict):
                for k, v in d.items():
                    if k.lower() == "query" and isinstance(v, str):
                        return v
                    res = find_query(v)
                    if res:
                        return res
            elif isinstance(d, list):
                for item in d:
                    res = find_query(item)
                    if res:
                        return res
            return ""

        extracted_query = find_query(payload)
        if extracted_query:
            query = extracted_query

        logger.info(f"Telnyx AI querying KB for: {query}")

        try:
            t_uuid = uuid.UUID(tenant_id)
            a_uuid = uuid.UUID(agent_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tenant_id or agent_id format")

        kb_result = await search_knowledge_base(
            query=query,
            tenant_id=t_uuid,
            agent_id=a_uuid,
            limit=3
        )

        return {
            "status": "success",
            "result": kb_result if kb_result else "No information found in the knowledge base."
        }
    except Exception as e:
        logger.error(f"Telnyx KB Search Webhook failed: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/call-ended")
async def telnyx_call_ended(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Async webhook hit by Telnyx when a Conversational AI call ends.
    Configured URL:
    https://api.aixcaller.com/api/v1/telnyx-ai/call-ended?tenant_id=<id>&agent_id=<id>
    """
    try:
        payload = await request.json()
        logger.info(f"Received Telnyx Webhook for Agent {agent_id}: {payload}")

        t_uuid = uuid.UUID(tenant_id)
        a_uuid = uuid.UUID(agent_id)

        # 1. Identify webhook event type
        event_type = payload.get("event_type") or payload.get("data", {}).get("event_type")
        if event_type != "call.conversation.ended":
            logger.info(f"Ignoring non-conversation-ended event: {event_type}")
            return {"status": "ignored", "event_type": event_type}

        # 2. Extract payload block
        data_block = payload.get("data", {})
        event_payload = data_block.get("payload", {}) if isinstance(data_block, dict) else payload.get("payload", {})
        if not event_payload:
            event_payload = payload

        conversation_id = event_payload.get("conversation_id")
        call_control_id = event_payload.get("call_control_id", "unknown")
        duration_sec = int(event_payload.get("duration_sec", 0))

        # Check for from/to number details
        from_number = event_payload.get("from") or event_payload.get("from_number") or "Customer"
        to_number = event_payload.get("to") or event_payload.get("to_number") or "AI Agent"

        logger.info(f"Call conversation ended. ID: {conversation_id}, duration: {duration_sec}s")

        if not conversation_id:
            logger.warning("No conversation_id provided in the ended webhook. Aborting sync.")
            return {"status": "error", "message": "Missing conversation_id"}

        # 3. Pull conversation messages transcript from Telnyx REST API
        api_key = os.environ.get("TELNYX_API_KEY")
        transcript_messages = []
        if api_key:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        f"https://api.telnyx.com/v2/ai/conversations/{conversation_id}/messages",
                        headers=headers,
                        timeout=15.0
                    )
                    if response.status_code == 200:
                        resp_json = response.json()
                        messages_data = resp_json.get("data", [])
                        # Normalize into standard system transcript structure
                        for msg in messages_data:
                            role = msg.get("role", "")
                            content = msg.get("content", "")
                            if role and content:
                                transcript_messages.append({
                                    "role": role,
                                    "content": content
                                })
                        logger.info(f"Successfully retrieved {len(transcript_messages)} messages from Telnyx AI conversation")
                    else:
                        logger.error(f"Failed to fetch conversation history from Telnyx: {response.status_code} - {response.text}")
                except Exception as ex:
                    logger.error(f"Failed to retrieve conversation history from Telnyx due to exception: {ex}")
        else:
            logger.error("Missing TELNYX_API_KEY - cannot retrieve conversation transcript")

        # 4. Trigger Shared Call Processor
        # Will handle DB insertion, analytics, email summary notifications, and Zoho CRM
        res = await process_completed_call(
            tenant_id=t_uuid,
            agent_id=a_uuid,
            from_number=from_number,
            to_number=to_number,
            call_id=call_control_id,
            transcript=transcript_messages,
            duration_seconds=duration_sec,
            db=db
        )

        return {"status": "success", "processed_record": res}

    except Exception as e:
        logger.error(f"Telnyx Call Ended Webhook failed: {e}")
        return {"status": "error", "message": str(e)}
