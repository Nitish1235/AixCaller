import os
from fastapi import FastAPI, Request, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select
from loguru import logger
import jwt
import time
import uuid
import traceback

# ── Startup validation — fail hard if critical secrets are missing ────────────
_JWT_SECRET = os.environ.get("JWT_SECRET")
if not _JWT_SECRET:
    raise RuntimeError("JWT_SECRET env var is required — refusing to start without it")

_INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

_ALLOWED_ORIGINS = [
    o.strip() for o in
    os.environ.get("ALLOWED_ORIGINS", "https://callerx.ai,https://www.callerx.ai,http://localhost:3000,http://localhost:3001").split(",")
    if o.strip()
]

try:
    from shared.database import engine, get_db
    from shared.models import Agent, Tenant, CallRecord
    from backend.services.kb import IngestionService
    from backend.services.outbound_dialer import schedule_missed_call, execute_missed_call
    from backend.api import admin, dashboard, kb, billing, live, telegram, numbers
    from backend.api import shopify as shopify_api
    from backend.api import zoho as zoho_api
    from backend.api import google as google_api
    from backend.api.auth import router as auth_router
    from backend.services.email import send_call_summary_email
except Exception as e:
    print(f"CRITICAL STARTUP CRASH: {traceback.format_exc()}")
    raise

app = FastAPI(title="AIxcaller SaaS Backend")

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
app.include_router(live.router)
app.include_router(telegram.router)
app.include_router(numbers.router)
app.include_router(shopify_api.router)
app.include_router(zoho_api.router)
app.include_router(google_api.router)
kb_service = IngestionService()

@app.post("/incoming-call")
async def handle_incoming_call(request: Request, db: Session = Depends(get_db)):
    """
    Production-ready Telnyx routing.
    1. Identify Agent by 'To' number.
    2. Check if Tenant is active.
    3. Route to Voice Engine with signed metadata.
    """
    form = await request.form()
    to_number = form.get("To")
    from_number = form.get("From")
    call_uuid = form.get("CallSid")  # Telnyx uses CallSid

    # DB Lookup
    statement = select(Agent).where(Agent.phone_number == to_number)
    agent = db.exec(statement).first()

    if not agent:
        logger.error(f"No agent found for number {to_number}")
        texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>We are sorry, this number is not configured.</Say>
</Response>"""
        return PlainTextResponse(texml, media_type="application/xml")

    # 3. Create a Secure One-Time Token (JWT)
    # This prevents anyone from spoofing your voice engine
    token_payload = {
        "tenant_id": str(agent.tenant_id),
        "agent_id": str(agent.id),
        "voice_id": agent.voice_id,
        "from_number": from_number,
        "to_number": to_number,
        "exp": time.time() + 300
    }
    signed_token = jwt.encode(token_payload, _JWT_SECRET, algorithm="HS256")

    # 4. Route to Voice Engine with the Token
    voice_url = os.environ.get("VOICE_ENGINE_URL")
    
    # Official Pipecat Telnyx example (pipecat-examples/telnyx-chatbot/outbound/server.py):
    # bidirectionalMode="rtp" is the CORRECT attribute for two-way audio.
    # track="both_tracks" alone does NOT enable sending audio back — rtp mode is required.
    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{voice_url}" bidirectionalMode="rtp">
            <Parameter name="call_token" value="{signed_token}" />
        </Stream>
    </Connect>
    <Pause length="40"/>
</Response>"""

    return PlainTextResponse(texml, media_type="application/xml")

@app.post("/api/v1/kb/upload")
async def upload_kb(request: Request, tenant_id: str, agent_id: str, content: str, db: Session = Depends(get_db)):
    """
    Internal KB ingestion — requires X-Internal-Key header.
    Prefer the /api/v1/kb/upload-text route from the dashboard.
    """
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

@app.post("/call-status")
async def handle_call_status(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Receives Telnyx TeXML Hangup/Status webhooks.
    Flags missed calls and triggers the recovery dialer.
    """
    form = await request.form()
    call_status = form.get("CallStatus")
    to_number = form.get("To")
    from_number = form.get("From")
    
    if call_status in ["no-answer", "busy", "failed", "canceled"]:
        agent = db.exec(select(Agent).where(Agent.phone_number == to_number)).first()
        if agent:
            # Create a missed CallRecord
            new_call = CallRecord(
                tenant_id=agent.tenant_id,
                agent_id=agent.id,
                from_number=from_number,
                to_number=to_number,
                direction="inbound",
                status="missed",
                requires_callback=agent.auto_callback_enabled
            )
            db.add(new_call)
            db.commit()
            db.refresh(new_call)
            
            # Trigger background callback in 60 seconds ONLY if enabled
            if agent.auto_callback_enabled:
                await schedule_missed_call(new_call.id, 60, background_tasks)
                logger.info(f"Missed call detected from {from_number}. Recovery scheduled.")
            else:
                logger.info(f"Missed call from {from_number}. Auto-callback is disabled.")

    return {"status": "received"}

@app.post("/api/v1/internal/dial-recovery")
async def dial_recovery_endpoint(request: Request, data: dict):
    """
    Internal endpoint hit by Google Cloud Tasks to execute delayed outbound recovery calls.
    """
    if not _INTERNAL_API_KEY or request.headers.get("X-Internal-Key") != _INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden — X-Internal-Key required")
    call_record_id = data.get("call_record_id")
    if not call_record_id:
        raise HTTPException(status_code=400, detail="Missing call_record_id")
    
    await execute_missed_call(uuid.UUID(call_record_id))
    return {"status": "executed"}

@app.post("/outbound-answer")
async def handle_outbound_answer(request: Request, db: Session = Depends(get_db)):
    """
    When the user picks up the recovery call, connect them to the Voice Engine.
    """
    form = await request.form()
    from_number = form.get("From") # This is our Agent's number in outbound
    
    agent = db.exec(select(Agent).where(Agent.phone_number == from_number)).first()
    if not agent:
        texml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'
        return PlainTextResponse(texml, media_type="application/xml")

    # Generate Secure JWT with is_recovery flag
    token_payload = {
        "tenant_id": str(agent.tenant_id),
        "agent_id": str(agent.id),
        "system_prompt": agent.system_prompt,
        "voice_id": agent.voice_id,
        "idle_timeout": agent.idle_timeout,
        "llm_temperature": agent.llm_temperature,
        "language": agent.language,
        "tools_config": agent.tools_config,
        "forwarding_number": agent.forwarding_number,
        "call_id": form.get("CallUUID"),
        "is_recovery": True,
        "exp": time.time() + 300
    }
    signed_token = jwt.encode(token_payload, _JWT_SECRET, algorithm="HS256")

    voice_url = os.environ.get("VOICE_ENGINE_URL")
    
    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{voice_url}">
            <Parameter name="call_token" value="{signed_token}" />
        </Stream>
    </Connect>
</Response>"""

    return PlainTextResponse(texml, media_type="application/xml")
