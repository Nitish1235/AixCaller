"""
Outbound Missed-Call Recovery Dialer
=====================================
When a call is missed and auto_callback_enabled is True on the agent,
this service schedules and executes an outbound callback via Telnyx.

Uses FastAPI BackgroundTasks with asyncio.sleep for scheduling.
This is reliable on Cloud Run (Telnyx connection keeps the instance warm).
"""
import asyncio
import os
import uuid
import httpx
from datetime import datetime
from loguru import logger
from sqlmodel import Session

from shared.database import engine
from shared.models import CallRecord, Agent


async def schedule_missed_call(
    call_record_id: uuid.UUID,
    delay_seconds: int = 60,
    background_tasks=None,
):
    """
    Schedule an outbound recovery call after `delay_seconds`.

    Args:
        call_record_id: The missed CallRecord to recover.
        delay_seconds:  How long to wait before calling back (default 60s).
        background_tasks: FastAPI BackgroundTasks instance (required).
    """
    if not background_tasks:
        logger.error("No background_tasks provided — cannot schedule recovery call")
        return

    async def _delayed():
        logger.info(f"Waiting {delay_seconds}s before recovery callback for {call_record_id}")
        await asyncio.sleep(delay_seconds)
        await execute_missed_call(call_record_id)

    background_tasks.add_task(_delayed)
    logger.info(f"Recovery callback scheduled in {delay_seconds}s for call {call_record_id}")


async def execute_missed_call(call_record_id: uuid.UUID):
    """
    Place an outbound call via Telnyx to recover a missed call.
    The call will connect the caller back to the agent's Telnyx AI Assistant
    via the /outbound-answer TeXML endpoint.
    """
    logger.info(f"Executing recovery callback for {call_record_id}")

    with Session(engine) as db:
        call = db.get(CallRecord, call_record_id)
        if not call:
            logger.info(f"CallRecord {call_record_id} not found — aborting recovery")
            return
        if not call.requires_callback:
            logger.info(f"CallRecord {call_record_id} no longer requires callback — skipping")
            return

        agent = db.get(Agent, call.agent_id)
        if not agent or not agent.phone_number:
            logger.error(f"Agent {call.agent_id} not found or has no phone number")
            return

        # Mark as processing so we don't double-dial
        call.requires_callback = False
        db.add(call)
        db.commit()

    api_key = os.environ.get("TELNYX_API_KEY")
    server_host = os.environ.get("SERVER_HOST", "")

    if not api_key or not server_host:
        logger.error("Missing TELNYX_API_KEY or SERVER_HOST — cannot place outbound call")
        return

    server_base = server_host if server_host.startswith("http") else f"https://{server_host}"
    answer_url = f"{server_base}/outbound-answer"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.telnyx.com/v2/texml/calls",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "to":  call.from_number,
                    "from": agent.phone_number,
                    "url": answer_url,
                },
            )

        if response.status_code not in (200, 201):
            logger.error(f"Telnyx outbound call failed: {response.status_code} — {response.text}")
            return

        logger.info(f"Recovery callback placed: {agent.phone_number} → {call.from_number}")

        # Record the outbound attempt
        with Session(engine) as db:
            outbound = CallRecord(
                tenant_id=call.tenant_id,
                agent_id=call.agent_id,
                from_number=agent.phone_number,
                to_number=call.from_number,
                direction="outbound",
                status="initiated",
                parent_call_id=call.id,
            )
            db.add(outbound)
            db.commit()

    except Exception as e:
        logger.error(f"Failed to place recovery callback: {e}")
