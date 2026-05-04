from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from backend.services.payments import DodoPaymentsService
from shared.database import get_db
from shared.models import Tenant
import uuid

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])
dodo_service = DodoPaymentsService()

@router.post("/checkout")
async def create_billing_checkout(
    tenant_id: str, 
    email: str,
    plan_id: str = "prod_default"
):
    """
    Initiates a Dodo Payments checkout session for the user.
    """
    checkout_url = await dodo_service.create_checkout_session(
        customer_email=email,
        product_id=plan_id,
        tenant_id=tenant_id
    )
    
    if not checkout_url:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")
        
    return {"checkout_url": checkout_url}

@router.post("/webhook")
async def dodo_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Handles incoming notifications from Dodo Payments.
    When a payment succeeds, we activate the tenant.
    """
    payload = await request.body()
    # In production, verify signature here using dodo_service.verify_webhook
    
    import json
    data = json.loads(payload)
    event_type = data.get("type")
    
    if event_type == "payment.succeeded":
        metadata = data.get("data", {}).get("metadata", {})
        tenant_id = metadata.get("tenant_id")
        
        if tenant_id:
            statement = select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
            tenant = db.exec(statement).first()
            if tenant:
                tenant.is_active = True
                # Add 500 free minutes for a standard plan purchase
                tenant.credits += 500.0 
                db.add(tenant)
                db.commit()
                return {"status": "tenant_activated"}

    return {"status": "event_ignored"}
