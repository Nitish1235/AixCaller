import asyncio
import os
import uuid
import jwt
import time
import httpx
from loguru import logger
from sqlmodel import Session, select
from shared.database import engine
from shared.models import CallRecord, Agent

async def process_missed_call(call_record_id: uuid.UUID, delay_seconds: int = 60):
    """
    Background task that waits for the specified delay, then initiates an outbound call
    if the call is still marked as requires_callback.
    """
    logger.info(f"Scheduled recovery call for {call_record_id} in {delay_seconds}s")
    await asyncio.sleep(delay_seconds)
    
    with Session(engine) as db:
        call = db.get(CallRecord, call_record_id)
        if not call or not call.requires_callback:
            logger.info(f"Call {call_record_id} no longer requires callback. Aborting.")
            return

        agent = db.get(Agent, call.agent_id)
        if not agent:
            return

        # Mark as processing
        call.requires_callback = False
        db.add(call)
        db.commit()

        logger.info(f"Initiating outbound recovery call to {call.from_number}")
        
        # Telnyx Integration
        api_key = os.environ.get("TELNYX_API_KEY")
        server_host = os.environ.get("SERVER_HOST")
        
        if not api_key or not server_host:
            logger.error("Missing Telnyx API Key or SERVER_HOST.")
            return

        # Generate Answer URL for outbound calls (returns TeXML)
        answer_url = f"https://{server_host}/outbound-answer"
        
        try:
            # We use httpx to hit the Telnyx TeXML Calls API directly
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.telnyx.com/v2/texml/calls",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "to": call.from_number,
                        "from": agent.phone_number,
                        "url": answer_url
                    }
                )
                
            if response.status_code not in [200, 201]:
                logger.error(f"Failed to initiate outbound call via Telnyx: {response.text}")
                return
                
            logger.info(f"Outbound call triggered: {response.json()}")
            
            # Save the outbound call record to link it
            outbound_call = CallRecord(
                tenant_id=call.tenant_id,
                agent_id=call.agent_id,
                from_number=agent.phone_number,
                to_number=call.from_number,
                direction="outbound",
                status="initiated",
                parent_call_id=call.id
            )
            db.add(outbound_call)
            db.commit()
            
        except Exception as e:
            logger.error(f"Failed to initiate outbound call via Telnyx: {e}")
            # Optionally revert callback requirement if failed
            # call.requires_callback = True
            # db.add(call)
            # db.commit()
