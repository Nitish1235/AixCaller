import os
from fastapi import FastAPI, Request, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlmodel import Session, select
import jwt
import time
import traceback

try:
    from shared.database import engine, get_db
    from shared.models import Agent, Tenant, CallRecord
    from backend.services.kb import IngestionService
    from backend.services.outbound_dialer import process_missed_call
    from backend.api import admin, dashboard, kb, billing, live, telegram, numbers
    from backend.api.auth import router as auth_router
    from backend.services.email import send_call_summary_email
except Exception as e:
    print(f"CRITICAL STARTUP CRASH: {traceback.format_exc()}")
    raise

app = FastAPI(title="AIxcaller SaaS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
kb_service = IngestionService()

@app.post("/incoming-call")
async def handle_incoming_call(request: Request, db: Session = Depends(get_db)):
    """
    Production-ready Plivo routing.
    1. Identify Agent by 'To' number.
    2. Check if Tenant is active.
    3. Route to Voice Engine with signed metadata.
    """
    form = await request.form()
    to_number = form.get("To")
    call_uuid = form.get("CallUUID")

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
        "system_prompt": agent.system_prompt,
        "voice_id": agent.voice_id,
        "idle_timeout": agent.idle_timeout,
        "llm_temperature": agent.llm_temperature,
        "language": agent.language,
        "tools_config": agent.tools_config,
        "exp": time.time() + 300
    }
    secret = os.environ.get("JWT_SECRET", "super-secret-key")
    signed_token = jwt.encode(token_payload, secret, algorithm="HS256")

    # 4. Route to Voice Engine with the Token
    voice_url = os.environ.get("VOICE_ENGINE_URL")
    
    # Telnyx TeXML (TwiML compatible)
    texml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{voice_url}">
            <Parameter name="call_token" value="{signed_token}" />
        </Stream>
    </Connect>
</Response>"""

    return PlainTextResponse(texml, media_type="application/xml")

@app.post("/api/v1/kb/upload")
async def upload_kb(tenant_id: str, content: str, db: Session = Depends(get_db)):
    """
    Multi-tenant KB ingestion.
    """
    # Verify tenant exists
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    await kb_service.process_text(tenant_id, content)
    return {"status": "success", "message": "Knowledge base indexed"}

@app.post("/call-status")
async def handle_call_status(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Receives Plivo's Hangup/Status webhooks.
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
                requires_callback=True
            )
            db.add(new_call)
            db.commit()
            db.refresh(new_call)
            
            # Trigger background callback in 60 seconds
            background_tasks.add_task(process_missed_call, new_call.id, 60)
            logger.info(f"Missed call detected from {from_number}. Recovery scheduled.")

    return {"status": "received"}

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
        "is_recovery": True,
        "exp": time.time() + 300
    }
    secret = os.environ.get("JWT_SECRET", "super-secret-key")
    signed_token = jwt.encode(token_payload, secret, algorithm="HS256")

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
