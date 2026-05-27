import os
from fastapi import FastAPI, Request, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select
from loguru import logger
import uuid
import traceback

# ── Startup validation — fail hard if critical secrets are missing ────────────
_JWT_SECRET = os.environ.get("JWT_SECRET")
if not _JWT_SECRET:
    raise RuntimeError("JWT_SECRET env var is required — refusing to start without it")

_INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")
_DEMO_PHONE_NUMBER = os.environ.get("DEMO_PHONE_NUMBER", "+13322446316")

_ALLOWED_ORIGINS = [
    o.strip() for o in
    os.environ.get(
        "ALLOWED_ORIGINS",
        "https://aixcaller.com,https://www.aixcaller.com,http://localhost:3000,http://localhost:3001"
    ).split(",")
    if o.strip()
]

try:
    from shared.database import engine, get_db
    from shared.models import Agent, Tenant, CallRecord
    from backend.services.kb import IngestionService
    from backend.api import admin, dashboard, kb, billing, numbers
    from backend.api import shopify as shopify_api

    from backend.api import google as google_api
    from backend.api.auth import router as auth_router
    from backend.api import telnyx_ai
    from backend.api import campaigns as campaigns_api
except Exception:
    print(f"CRITICAL STARTUP CRASH: {traceback.format_exc()}")
    raise

app = FastAPI(title="AIxCaller SaaS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router)
app.include_router(auth_router)
app.include_router(dashboard.router)
app.include_router(kb.router)
app.include_router(billing.router)
app.include_router(numbers.router)
app.include_router(shopify_api.router)

app.include_router(google_api.router)
app.include_router(telnyx_ai.router)
app.include_router(campaigns_api.router)

kb_service = IngestionService()


# ─────────────────────────────────────────────────────────────────────────────
# INBOUND CALL — main routing entry point
# Telnyx sends a POST to this URL when a call arrives on an agent's number.
# We respond with TeXML connecting the call to the agent's Telnyx AI Assistant.
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/incoming-call")
async def handle_incoming_call(request: Request, db: Session = Depends(get_db)):
    """
    Production routing:
    1. Identify Agent by 'To' number.
    2. Auto-sync Telnyx Assistant if not yet provisioned.
    3. Return TeXML <Connect><AIAssistant id="..." /></Connect>
    """
    form = await request.form()
    to_number = form.get("To")
    from_number = form.get("From")

    agent = db.exec(select(Agent).where(Agent.phone_number == to_number)).first()

    if not agent:
        logger.error(f"No agent found for number {to_number}")
        texml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>We're sorry, this number is not yet configured.</Say>
</Response>"""
        return PlainTextResponse(texml, media_type="application/xml")

    # Auto-provision Telnyx Assistant on first call
    if not agent.telnyx_assistant_id:
        try:
            from backend.services.telnyx_assistant import sync_agent_with_telnyx
            await sync_agent_with_telnyx(agent, db)
        except Exception as e:
            logger.error(f"Telnyx auto-sync failed on incoming call: {e}")

    if not agent.telnyx_assistant_id:
        texml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>The conversational assistant is currently unavailable. Please try again shortly.</Say>
</Response>"""
        return PlainTextResponse(texml, media_type="application/xml")

    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <AIAssistant id="{agent.telnyx_assistant_id}" />
    </Connect>
</Response>"""
    logger.info(f"Inbound call {from_number} → {to_number} routed to assistant {agent.telnyx_assistant_id}")
    return PlainTextResponse(texml, media_type="application/xml")



# ─────────────────────────────────────────────────────────────────────────────
# CALL STATUS — missed call detection and auto-callback trigger
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/call-status")
async def handle_call_status(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Receives Telnyx TeXML hangup/status webhooks.
    If the call was missed, creates a CallRecord and optionally schedules recovery.
    """
    form = await request.form()
    call_status = form.get("CallStatus")
    to_number = form.get("To")
    from_number = form.get("From")

    if call_status in ("no-answer", "busy", "failed", "canceled"):
        agent = db.exec(select(Agent).where(Agent.phone_number == to_number)).first()
        if agent:
            new_call = CallRecord(
                tenant_id=agent.tenant_id,
                agent_id=agent.id,
                from_number=from_number or "unknown",
                to_number=to_number or "unknown",
                direction="inbound",
                status="missed",
                requires_callback=False,
            )
            db.add(new_call)
            db.commit()
            db.refresh(new_call)
            logger.info(f"Missed call from {from_number} recorded.")

    return {"status": "received"}


# ─────────────────────────────────────────────────────────────────────────────
# FORWARDING TEST ANSWER — instructional message when forwarding not yet set up
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/forwarding-test-answer")
async def handle_forwarding_test_answer(request: Request):
    """
    TeXML delivered when a legacy-number forwarding test call is answered
    directly (i.e. forwarding is not configured yet).
    """
    form = await request.form()
    to_number = form.get("To", "your AI number")
    last4 = to_number[-4:] if len(to_number) >= 4 else "your AI number"

    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>
        Hello! This is an AIxCaller forwarding test.
        You are hearing this message because call forwarding has not been configured yet.
        Please contact your carrier and ask them to forward all calls to your
        AIxCaller number ending in {last4}.
        Once forwarding is active, callers will be answered by your AI agent automatically.
        Goodbye!
    </Say>
    <Hangup/>
</Response>"""
    return PlainTextResponse(texml, media_type="application/xml")



# ─────────────────────────────────────────────────────────────────────────────
# INTERNAL — KB upload (raw text ingestion)
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/v1/kb/upload")
async def upload_kb(
    request: Request,
    tenant_id: str,
    agent_id: str,
    content: str,
    db: Session = Depends(get_db),
):
    """Internal KB text ingestion. Requires X-Internal-Key header."""
    if not _INTERNAL_API_KEY or request.headers.get("X-Internal-Key") != _INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden — X-Internal-Key required")

    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    count = await kb_service.ingest_text(
        content=content,
        tenant_id=uuid.UUID(tenant_id),
        agent_id=uuid.UUID(agent_id),
    )
    return {"status": "success", "chunks_stored": count}
