import uuid
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select
from loguru import logger
from shared.database import get_db
from shared.models import Tenant

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class SyncUserRequest(BaseModel):
    google_id: str
    email:     str
    name:      str
    picture:   str = ""


@router.post("/sync-user")
async def sync_user(req: SyncUserRequest, db: Session = Depends(get_db)):
    """
    Called after Google OAuth callback.
    - If tenant with this email already exists → return their tenant_id.
    - If new user → create Tenant record, auto-set resend_email to their Google email.
    """
    # Look up existing tenant by email
    existing = db.exec(select(Tenant).where(Tenant.contact_email == req.email)).first()

    if existing:
        logger.info(f"Returning user signed in: {req.email} | tenant={existing.id}")
        return {"tenant_id": str(existing.id), "is_new": False}

    # First login — create Tenant
    new_tenant = Tenant(
        id=uuid.uuid4(),
        name=req.name or req.email.split("@")[0],
        contact_email=req.email,
        is_active=True,
        credits=500.0,            # 500 free minutes on signup
        resend_email=req.email,   # Auto-set summary emails to their Google email
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    logger.info(f"New tenant created: {req.email} | tenant={new_tenant.id}")
    return {"tenant_id": str(new_tenant.id), "is_new": True}


import bcrypt
from fastapi import HTTPException

class EmailSignupRequest(BaseModel):
    name: str
    email: str
    password: str

@router.post("/signup")
async def email_signup(req: EmailSignupRequest, db: Session = Depends(get_db)):
    existing = db.exec(select(Tenant).where(Tenant.contact_email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_tenant = Tenant(
        id=uuid.uuid4(),
        name=req.name,
        contact_email=req.email,
        is_active=True,
        credits=500.0,
        resend_email=req.email,
        password_hash=bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    logger.info(f"New tenant signed up: {req.email} | tenant={new_tenant.id}")
    return {"tenant_id": str(new_tenant.id), "email": new_tenant.contact_email, "name": new_tenant.name}

class EmailLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def email_login(req: EmailLoginRequest, db: Session = Depends(get_db)):
    tenant = db.exec(select(Tenant).where(Tenant.contact_email == req.email)).first()
    if not tenant or not tenant.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not bcrypt.checkpw(req.password.encode('utf-8'), tenant.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    logger.info(f"User logged in via email: {req.email} | tenant={tenant.id}")
    return {"tenant_id": str(tenant.id), "email": tenant.contact_email, "name": tenant.name}
