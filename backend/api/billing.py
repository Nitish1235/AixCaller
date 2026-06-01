from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlmodel import Session, select
from datetime import datetime, timedelta
from loguru import logger
from backend.services.payments import DodoPaymentsService

from shared.database import get_db
from shared.models import Tenant, Campaign
import uuid
import os
import json
import hmac
import hashlib

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])
dodo_service = DodoPaymentsService()


async def _resume_exhausted_campaigns(tenant_id: str, db):
    """
    Called in background after a successful plan renewal.
    Finds every campaign that was auto-paused due to minutes_exhausted
    and re-activates it so dialing resumes from where it left off.
    Remaining pending leads are untouched and will be picked up immediately.
    """
    try:
        from sqlmodel import Session as _S, select as _sel
        from shared.database import engine as _engine
        import os as _os
        from arq import create_pool as _arq_pool
        from arq.connections import RedisSettings as _RS

        with _S(_engine) as fresh_db:
            paused = fresh_db.exec(
                _sel(Campaign).where(
                    Campaign.tenant_id == uuid.UUID(tenant_id),
                    Campaign.status == "paused",
                    Campaign.pause_reason == "minutes_exhausted",
                )
            ).all()

            if not paused:
                return

            redis = await _arq_pool(_RS.from_dsn(_os.environ.get("REDIS_URL", "redis://localhost:6379/0")))

            for campaign in paused:
                campaign.status = "active"
                campaign.pause_reason = None
                fresh_db.add(campaign)
                fresh_db.commit()

                await redis.enqueue_job("start_campaign", campaign.id)
                logger.info(
                    f"Auto-resumed campaign {campaign.id} ({campaign.name}) "
                    f"after plan renewal for tenant {tenant_id}. "
                    f"Remaining pending leads will be dialed now."
                )

    except Exception as e:
        logger.error(f"Failed to auto-resume exhausted campaigns for tenant {tenant_id}: {e}")


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
async def dodo_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """
    DodoPayments webhook — activates the tenant on successful payment.
    Verifies HMAC-SHA256 signature before processing any event.
    """
    payload = await request.body()

    # ── Signature verification ────────────────────────────────────────────
    webhook_secret = os.environ.get("DODO_PAYMENTS_WEBHOOK_KEY", "")
    if webhook_secret:
        signature = request.headers.get("webhook-signature", "") or request.headers.get("x-dodo-signature", "")
        expected = hmac.new(webhook_secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        if not signature or not hmac.compare_digest(expected, signature.split("=")[-1]):
            logger.warning("DodoPayments webhook signature verification failed")
            raise HTTPException(status_code=401, detail="Invalid webhook signature")
    else:
        logger.warning("DODO_PAYMENTS_WEBHOOK_KEY not set — webhook signature not verified")
    # ────────────────────────────────────────────────────────────────

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

        # Robust minute assignment with fallback
        default_minutes = {
            "starter": 200,
            "pro": 500,
            "premium": 1100
        }
        minutes = plan.get("minutes") or default_minutes.get(plan_tier, 0)

        # Activate subscription
        tenant.is_active = True
        tenant.plan_tier = plan_tier
        tenant.subscription_id = subscription_id
        tenant.subscription_status = "active"
        tenant.minutes_included = int(minutes)
        tenant.minutes_used = 0.0  # Reset usage on renewal
        tenant.cycle_start = datetime.utcnow()
        tenant.cycle_end = datetime.utcnow() + timedelta(days=30)

        db.add(tenant)
        db.commit()
        logger.info(f"✅ Tenant {tenant_id} subscribed to {plan_tier} ({plan['minutes']} min)")
        logger.info(f"💰 Payment received: {tenant.name} ({tenant.contact_email}) — {plan_tier.upper()} ${plan['price_usd']}")

        # ── Auto-resume campaigns that were paused due to exhausted minutes ──
        # Now that new minutes are credited, resume them in background.
        background_tasks.add_task(_resume_exhausted_campaigns, tenant_id, db)

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
                logger.info(f"Subscription {event_type}: {tenant.name} ({tenant.contact_email}) → {tenant.subscription_status}")
                
                return {"status": "subscription_updated"}

    return {"status": "event_ignored"}
