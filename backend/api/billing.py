from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from datetime import datetime, timedelta
from loguru import logger
from backend.services.payments import DodoPaymentsService
from shared.database import get_db
from shared.models import Tenant
import uuid
import os
import json

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])
dodo_service = DodoPaymentsService()


# ─── Plan Catalogue ──────────────────────────────────────────────────────────
# Maps internal plan_tier → (DodoPayments product_id, monthly minutes, agent limit, price)
# Set DODO_PRODUCT_<TIER> env vars to the DodoPayments product IDs you created.
PLANS = {
    "starter": {
        "name":        "Starter",
        "price_usd":   50,
        "minutes":     200,
        "agent_limit": 2,
        "product_id":  os.environ.get("DODO_PRODUCT_STARTER", "prod_starter"),
    },
    "pro": {
        "name":        "Pro",
        "price_usd":   119,
        "minutes":     500,
        "agent_limit": 2,
        "product_id":  os.environ.get("DODO_PRODUCT_PRO", "prod_pro"),
    },
    "premium": {
        "name":        "Premium",
        "price_usd":   250,
        "minutes":     1100,
        "agent_limit": 4,
        "product_id":  os.environ.get("DODO_PRODUCT_PREMIUM", "prod_premium"),
    },
}


@router.get("/plans")
async def list_plans():
    """Public catalogue of available plans for the pricing page."""
    return {
        "plans": [
            {
                "tier":        tier,
                "name":        cfg["name"],
                "price_usd":   cfg["price_usd"],
                "minutes":     cfg["minutes"],
                "agent_limit": cfg["agent_limit"],
            }
            for tier, cfg in PLANS.items()
        ]
    }


@router.get("/subscription")
async def get_subscription(tenant_id: str, db: Session = Depends(get_db)):
    """Returns current subscription + usage for the dashboard."""
    tenant = db.get(Tenant, uuid.UUID(tenant_id))
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    plan_cfg = PLANS.get(tenant.plan_tier)
    minutes_left = max(0, (tenant.minutes_included or 0) - (tenant.minutes_used or 0))

    return {
        "plan_tier":           tenant.plan_tier,
        "plan_name":           plan_cfg["name"] if plan_cfg else "Free",
        "subscription_status": tenant.subscription_status,
        "minutes_included":    tenant.minutes_included,
        "minutes_used":        round(tenant.minutes_used, 2),
        "minutes_left":        round(minutes_left, 2),
        "cycle_start":         tenant.cycle_start.isoformat() if tenant.cycle_start else None,
        "cycle_end":           tenant.cycle_end.isoformat() if tenant.cycle_end else None,
    }


@router.post("/checkout")
async def create_billing_checkout(
    tenant_id: str,
    email: str,
    plan_tier: str = "starter",
):
    """Initiates a DodoPayments checkout session for the chosen plan."""
    if plan_tier not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {plan_tier}")

    plan = PLANS[plan_tier]
    checkout_url = await dodo_service.create_checkout_session(
        customer_email=email,
        product_id=plan["product_id"],
        tenant_id=tenant_id,
        metadata={"plan_tier": plan_tier},
    )
    if not checkout_url:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

    return {"checkout_url": checkout_url, "plan": plan_tier}


@router.post("/webhook")
async def dodo_webhook(request: Request, db: Session = Depends(get_db)):
    """
    DodoPayments webhook — activates the tenant on successful payment and
    sets up their plan tier, monthly minute allowance, and billing cycle.
    """
    payload = await request.body()
    data = json.loads(payload)
    event_type = data.get("type")

    logger.info(f"DodoPayments webhook event: {event_type}")

    if event_type in ("payment.succeeded", "subscription.active", "subscription.renewed"):
        event_data = data.get("data", {})
        metadata = event_data.get("metadata", {}) or {}
        tenant_id = metadata.get("tenant_id")
        plan_tier = metadata.get("plan_tier", "starter")
        subscription_id = event_data.get("subscription_id") or event_data.get("id")

        if not tenant_id:
            logger.warning("Webhook missing tenant_id in metadata")
            return {"status": "no_tenant_id"}

        plan = PLANS.get(plan_tier)
        if not plan:
            logger.warning(f"Unknown plan_tier in webhook: {plan_tier}")
            return {"status": "unknown_plan"}

        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant:
            logger.warning(f"Tenant {tenant_id} not found")
            return {"status": "tenant_not_found"}

        # Activate subscription
        tenant.is_active = True
        tenant.plan_tier = plan_tier
        tenant.subscription_id = subscription_id
        tenant.subscription_status = "active"
        tenant.minutes_included = plan["minutes"]
        tenant.minutes_used = 0.0  # Reset usage on renewal
        tenant.cycle_start = datetime.utcnow()
        tenant.cycle_end = datetime.utcnow() + timedelta(days=30)

        db.add(tenant)
        db.commit()
        logger.info(f"✅ Tenant {tenant_id} subscribed to {plan_tier} ({plan['minutes']} min)")
        return {"status": "subscription_activated", "plan": plan_tier}

    if event_type in ("subscription.cancelled", "subscription.failed"):
        metadata = data.get("data", {}).get("metadata", {}) or {}
        tenant_id = metadata.get("tenant_id")
        if tenant_id:
            tenant = db.get(Tenant, uuid.UUID(tenant_id))
            if tenant:
                tenant.subscription_status = "cancelled" if event_type == "subscription.cancelled" else "past_due"
                db.add(tenant)
                db.commit()
                logger.info(f"Tenant {tenant_id} subscription {event_type}")
                return {"status": "subscription_updated"}

    return {"status": "event_ignored"}
