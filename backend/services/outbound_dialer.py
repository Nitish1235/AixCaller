import asyncio
import os
import uuid
import json
import httpx
from datetime import datetime, timedelta
from loguru import logger
from sqlmodel import Session
from shared.database import engine
from shared.models import CallRecord, Agent

async def schedule_missed_call(call_record_id: uuid.UUID, delay_seconds: int = 60, background_tasks = None):
    """
    Schedules an outbound recovery call.
    Uses Google Cloud Tasks if configured (required for Cloud Run),
    otherwise falls back to FastAPI BackgroundTasks for local development.
    """
    gcp_project = os.environ.get("GCP_PROJECT_ID")
    gcp_location = os.environ.get("GCP_LOCATION")
    gcp_queue = os.environ.get("GCP_QUEUE_NAME")
    server_host = os.environ.get("SERVER_HOST")
    internal_key = os.environ.get("INTERNAL_API_KEY", "")

    if gcp_project and gcp_location and gcp_queue and server_host:
        # Enqueue via Google Cloud Tasks
        try:
            from google.cloud import tasks_v2
            from google.protobuf import timestamp_pb2

            client = tasks_v2.CloudTasksClient()
            parent = client.queue_path(gcp_project, gcp_location, gcp_queue)

            url = f"https://{server_host}/api/v1/internal/dial-recovery"
            payload = {"call_record_id": str(call_record_id)}
            
            task = {
                "http_request": {
                    "http_method": tasks_v2.HttpMethod.POST,
                    "url": url,
                    "headers": {
                        "Content-Type": "application/json",
                        "X-Internal-Key": internal_key
                    },
                    "body": json.dumps(payload).encode(),
                }
            }

            # Set delay
            d = datetime.utcnow() + timedelta(seconds=delay_seconds)
            timestamp = timestamp_pb2.Timestamp()
            timestamp.FromDatetime(d)
            task["schedule_time"] = timestamp

            response = client.create_task(request={"parent": parent, "task": task})
            logger.info(f"☁️ Scheduled Cloud Task for recovery call {call_record_id}: {response.name}")
        except Exception as e:
            logger.error(f"Failed to schedule Cloud Task: {e}")
    else:
        # Fallback to local asyncio sleep (will NOT survive Cloud Run CPU throttling)
        logger.warning("Google Cloud Tasks not fully configured. Falling back to local BackgroundTask.")
        if background_tasks:
            async def _delayed_execution():
                await asyncio.sleep(delay_seconds)
                await execute_missed_call(call_record_id)
            background_tasks.add_task(_delayed_execution)
        else:
            logger.error("No background_tasks provided for local execution fallback.")


async def execute_missed_call(call_record_id: uuid.UUID):
    """
    Executes the outbound call. Triggered either locally or via Cloud Tasks webhook.
    """
    logger.info(f"Executing recovery call for {call_record_id}")
    
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
                id=uuid.uuid4(),
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
