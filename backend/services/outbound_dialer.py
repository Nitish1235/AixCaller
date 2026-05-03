import asyncio
import os
import uuid
import jwt
import time
import plivo
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
        
        # Plivo Integration
        auth_id = os.environ.get("PLIVO_AUTH_ID")
        auth_token = os.environ.get("PLIVO_AUTH_TOKEN")
        server_host = os.environ.get("SERVER_HOST")
        
        if not auth_id or not auth_token or not server_host:
            logger.error("Missing Plivo credentials or SERVER_HOST.")
            return

        client = plivo.RestClient(auth_id, auth_token)
        
        # Generate Answer URL for outbound calls
        answer_url = f"https://{server_host}/outbound-answer"
        
        try:
            # Note: We reverse from_number and to_number for the outbound leg.
            # We call the user (to_) from the agent's number (from_)
            response = client.calls.create(
                from_=agent.phone_number,
                to_=call.from_number,
                answer_url=answer_url,
                answer_method='POST'
            )
            logger.info(f"Outbound call triggered: {response}")
            
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
            logger.error(f"Failed to initiate outbound call via Plivo: {e}")
            # Optionally revert callback requirement if failed
            # call.requires_callback = True
            # db.add(call)
            # db.commit()
