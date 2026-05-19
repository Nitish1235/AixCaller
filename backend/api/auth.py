import uuid
import os
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlmodel import Session, select
from loguru import logger
from backend.api.telegram import alert_admin

from shared.database import get_db
from shared.models import Tenant

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Admin credentials loaded from environment — used only for the /login route
ALLOWED_USER = os.environ.get("ADMIN_USER", "Nitish165")
ALLOWED_PASS = os.environ.get("ADMIN_PASS", "")


class LoginRequest(BaseModel):
    email: str
    password: str


class SyncUserRequest(BaseModel):
    google_id: str
    email: str
    name: str | None = None
    picture: str | None = None


@router.post("/login")
async def email_login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Locked-down admin login: Only ALLOWED_USER can log in via username/password.
    Regular users sign in via Google OAuth (/api/auth/google).
    """
    if req.email != ALLOWED_USER or req.password != ALLOWED_PASS:
        logger.warning(f"Unauthorized login attempt for user: {req.email}")
        raise HTTPException(status_code=401, detail="Invalid credentials. Access restricted.")

    # Find or create the primary tenant for the admin user
    tenant = db.exec(select(Tenant).where(Tenant.contact_email == ALLOWED_USER)).first()

    if not tenant:
        logger.info(f"Creating primary tenant for {ALLOWED_USER}")
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Nitish Admin",
            contact_email=ALLOWED_USER,
            is_active=True,
            plan_tier="premium",
            minutes_included=99999,
            subscription_status="active"
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    logger.info(f"Admin logged in: {req.email} | tenant={tenant.id}")
    return {
        "tenant_id": str(tenant.id),
        "email":     tenant.contact_email,
        "name":      tenant.name,
    }


@router.post("/sync-user")
async def sync_user(req: SyncUserRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Called after every successful Google OAuth flow.
    Finds an existing tenant by email, or creates a new one.
    Returns tenant_id so the frontend can set the session cookie.
    """
    # Look up by email (the unique identifier we always have from Google)
    tenant = db.exec(
        select(Tenant).where(Tenant.contact_email == req.email)
    ).first()

    if not tenant:
        # First-ever login — create a new tenant with a free trial
        logger.info(f"New Google user — creating tenant for {req.email}")
        tenant = Tenant(
            id=uuid.uuid4(),
            name=req.name or req.email.split("@")[0],
            contact_email=req.email,
            is_active=True,
            plan_tier="free",
            minutes_included=0,
            subscription_status="inactive",
        )
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        logger.info(f"Tenant created: {tenant.id} for {req.email}")
        
        # Fire Telegram alert for new signup
        background_tasks.add_task(
            alert_admin, 
            f"👤 *New User Signup*\nEmail: `{req.email}`\nName: `{req.name or 'Unknown'}`"
        )
    else:
        logger.info(f"Returning Google user: {req.email} | tenant={tenant.id}")

    return {
        "tenant_id": str(tenant.id),
        "email":     tenant.contact_email,
        "name":      tenant.name,
    }


@router.post("/signup")
async def email_signup():
    """Email/password signups are not supported — use Google OAuth."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Use Google Sign-In to create your account.",
    )
