import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select
from loguru import logger
from shared.database import get_db
from shared.models import Tenant

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# --- Restricted Access Credentials ---
ALLOWED_USER = "Nitish165"
ALLOWED_PASS = "Nitish165@0"

class LoginRequest(BaseModel):
    email: str # We use 'email' field to maintain frontend compatibility, but it will accept 'Nitish165'
    password: str

@router.post("/login")
async def email_login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Locked-down login: Only ALLOWED_USER can log in.
    """
    if req.email != ALLOWED_USER or req.password != ALLOWED_PASS:
        logger.warning(f"Unauthorized login attempt for user: {req.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials. Access restricted.")

    # Find or create the primary tenant for Nitish165
    tenant = db.exec(select(Tenant).where(Tenant.contact_email == ALLOWED_USER)).first()
    
    if not tenant:
        logger.info(f"Creating primary tenant for {ALLOWED_USER}")
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Nitish Admin",
            contact_email=ALLOWED_USER,
            is_active=True,
            plan_tier="premium",
            minutes_included=99999, # Admin unlimited
            subscription_status="active"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    logger.info(f"Admin logged in: {req.email} | tenant={tenant.id}")
    return {
        "tenant_id": str(tenant.id),
        "email": tenant.contact_email,
        "name": tenant.name
    }

@router.post("/sync-user")
async def sync_user():
    """Signups disabled."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public signups are disabled. Restricted access only."
    )

@router.post("/signup")
async def email_signup():
    """Signups disabled."""
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Public signups are disabled. Restricted access only."
    )
