import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from loguru import logger
from sqlmodel import Session, select
from shared.database import engine, get_db
from shared.models import Tenant, Agent
from backend.api.dashboard import PLAN_AGENT_LIMITS  # single source of truth

router = APIRouter(prefix="/api/v1/numbers", tags=["Numbers"])

class SearchRequest(BaseModel):
    country_code: str = "US"
    area_code: str = ""
    limit: int = 5

class PurchaseRequest(BaseModel):
    phone_number: str
    tenant_id: str
    agent_id: str

@router.post("/search")
async def search_numbers(req: SearchRequest):
    """
    Search Telnyx API for available phone numbers by area code.
    """
    api_key = os.environ.get("TELNYX_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Telnyx API key not configured")

    params = {
        "filter[country_code]": req.country_code,
        "filter[features][]": "voice",
        "filter[limit]": req.limit,
        "filter[best_effort]": "true"
    }
    if req.area_code:
        params["filter[national_destination_code]"] = req.area_code

    async with httpx.AsyncClient() as client:
        # Using Telnyx API to find local numbers
        response = await client.get(
            "https://api.telnyx.com/v2/available_phone_numbers",
            headers={"Authorization": f"Bearer {api_key}"},
            params=params
        )
        
        if response.status_code != 200:
            logger.error(f"Telnyx search failed: {response.text}")
            # If Telnyx returns 10031 (No numbers found), don't crash, just return empty list
            if "10031" in response.text:
                return {"numbers": []}
            raise HTTPException(status_code=500, detail="Failed to search numbers")

        data = response.json()
        
        # 3. Extract and Sort by Price
        results = []
        for item in data.get("data", []):
            cost = item.get("cost_information", {})
            upfront = float(cost.get("upfront_cost", 0))
            monthly = float(cost.get("monthly_cost", 0))
            results.append({
                "phone_number": item.get("phone_number"),
                "monthly_cost": monthly,
                "upfront_cost": upfront,
                "total_initial": upfront + monthly
            })
        
        # Sort by cheapest first (upfront + monthly)
        results.sort(key=lambda x: x["total_initial"])
        
        return {"numbers": results}



@router.post("/purchase")
async def purchase_number(req: PurchaseRequest, db: Session = Depends(get_db)):
    """
    Purchases a Telnyx number and assigns it to the specified agent.
    Enforces the per-plan agent limit at assignment time (agents only "count"
    once they have a phone number).
    """
    import uuid
    api_key = os.environ.get("TELNYX_API_KEY")
    connection_id = os.environ.get("TELNYX_CONNECTION_ID")

    if not api_key or not connection_id:
        raise HTTPException(status_code=500, detail="Telnyx config missing (TELNYX_API_KEY or TELNYX_CONNECTION_ID)")

    agent_uuid = uuid.UUID(req.agent_id)
    tenant_uuid = uuid.UUID(req.tenant_id)

    # ── Pre-flight: check subscription is active + agent limit ──────────────
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if tenant.subscription_status != "active":
        raise HTTPException(
            status_code=402,
            detail="Active subscription required to claim a phone number. Please subscribe to a plan."
        )

    # Count agents that already have a phone number (only THOSE consume slots)
    active_agents = db.exec(
        select(Agent).where(
            Agent.tenant_id == tenant_uuid,
            Agent.phone_number.is_not(None),
        )
    ).all()
    limit = PLAN_AGENT_LIMITS.get(tenant.plan_tier, 1)

    # If this agent already has a number, allow swapping (no new slot consumed)
    agent = db.exec(select(Agent).where(Agent.id == agent_uuid, Agent.tenant_id == tenant_uuid)).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    is_new_slot = agent.phone_number is None
    if is_new_slot and len(active_agents) >= limit:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Your {tenant.plan_tier} plan allows up to {limit} active agent(s). "
                f"You already have {len(active_agents)} with phone numbers. "
                f"Upgrade your plan or delete an agent to add another."
            )
        )

    # ── Purchase via Telnyx Number Orders API ───────────────────────────────
    async with httpx.AsyncClient() as client:
        order_payload = {
            "phone_numbers": [{"phone_number": req.phone_number}],
            "connection_id": connection_id
        }
        response = await client.post(
            "https://api.telnyx.com/v2/number_orders",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=order_payload
        )
        if response.status_code not in [200, 201]:
            logger.error(f"Telnyx purchase failed: {response.text}")
            raise HTTPException(status_code=500, detail="Failed to purchase number")

    # ── Assign to agent ────────────────────────────────────────────────────
    agent.phone_number = req.phone_number
    db.add(agent)
    db.commit()

    return {"status": "success", "phone_number": req.phone_number}
