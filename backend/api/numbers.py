import os
import uuid
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
async def search_numbers(req: SearchRequest, tenant_id: str = "", db: Session = Depends(get_db)):
    """
    Search Telnyx API for available phone numbers by area code.
    Blocked for free-plan tenants.
    """
    # Block free-plan tenants from searching numbers
    if tenant_id:
        try:
            tenant = db.get(Tenant, uuid.UUID(tenant_id))
            if tenant and tenant.plan_tier in ("free", "") or (tenant and tenant.subscription_status not in ("active",)):
                raise HTTPException(
                    status_code=402,
                    detail="Phone number provisioning requires an active paid plan. Please upgrade."
                )
        except (ValueError, AttributeError):
            pass  # If UUID is invalid, let the purchase step catch it

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

    async with httpx.AsyncClient(timeout=15.0) as client:
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
    After purchase, automatically links the number to the AIxCaller SMS
    messaging profile (TELNYX_MESSAGING_PROFILE_ID).
    """
    import uuid
    from urllib.parse import quote

    api_key = os.environ.get("TELNYX_API_KEY")
    connection_id = os.environ.get("TELNYX_CONNECTION_ID")

    if not api_key or not connection_id:
        raise HTTPException(status_code=500, detail="Telnyx config missing (TELNYX_API_KEY or TELNYX_CONNECTION_ID)")

    agent_uuid = uuid.UUID(req.agent_id)
    tenant_uuid = uuid.UUID(req.tenant_id)

    # ── Pre-flight: check plan tier + subscription status + agent limit ─────
    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Block free-plan users entirely — they must upgrade first
    if tenant.plan_tier in ("free", "") or tenant.subscription_status not in ("active",):
        raise HTTPException(
            status_code=402,
            detail="Phone number provisioning requires an active paid plan. Please upgrade to Starter, Pro, or Premium."
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

    # ── Step 1: Purchase via Telnyx Number Orders API ───────────────────────
    async with httpx.AsyncClient(timeout=20.0) as client:
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
            logger.error(f"Telnyx purchase failed ({response.status_code}): {response.text}")
            # Extract the real Telnyx error message so the user knows what went wrong
            try:
                err_body = response.json()
                telnyx_msg = (
                    err_body.get("errors", [{}])[0].get("detail")
                    or err_body.get("errors", [{}])[0].get("title")
                    or err_body.get("detail")
                    or "Unknown Telnyx error"
                )
            except Exception:
                telnyx_msg = response.text[:200] or "Unknown error"
            raise HTTPException(
                status_code=502,
                detail=f"Telnyx rejected the number purchase: {telnyx_msg}"
            )

    logger.info(f"Successfully purchased {req.phone_number}.")

    # ── Step 2: Link to AIxCaller SMS Messaging Profile ─────────────────────
    messaging_profile_id = os.environ.get("TELNYX_MESSAGING_PROFILE_ID")
    if messaging_profile_id:
        async with httpx.AsyncClient() as client:
            encoded_number = quote(req.phone_number, safe="")
            patch_resp = await client.patch(
                f"https://api.telnyx.com/v2/phone_numbers/{encoded_number}",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"messaging_profile_id": messaging_profile_id},
                timeout=10.0
            )
            if patch_resp.status_code not in (200, 201):
                logger.warning(
                    f"Number purchased but failed to link to messaging profile "
                    f"{messaging_profile_id}: {patch_resp.text}"
                )
            else:
                logger.info(f"Linked {req.phone_number} to AIxCaller SMS messaging profile.")
    else:
        logger.warning("TELNYX_MESSAGING_PROFILE_ID not set — number not linked to a messaging profile.")

    # ── Step 3: Assign to agent in DB ──────────────────────────────────────
    agent.phone_number = req.phone_number
    db.add(agent)
    db.commit()

    return {"status": "success", "phone_number": req.phone_number}


# ── Legacy Number Forwarding — Test Call ─────────────────────────────────────

class TestForwardingRequest(BaseModel):
    agent_id: str
    tenant_id: str


@router.post("/test-forwarding")
async def test_forwarding(req: TestForwardingRequest, db: Session = Depends(get_db)):
    """
    Places a short test call FROM the agent's Telnyx number TO the legacy number.

    Two outcomes:
      • Forwarding NOT configured — the legacy phone rings; the owner hears an
        instructional message telling them forwarding is not active yet.
      • Forwarding IS configured — the carrier redirects the call back to the
        Telnyx number; the AI agent answers, proving end-to-end routing works.

    Uses the dedicated /forwarding-test-answer TeXML endpoint so Telnyx knows
    what to say when the test call is picked up directly.
    """
    api_key = os.environ.get("TELNYX_API_KEY")
    server_host = os.environ.get("SERVER_HOST")

    if not api_key:
        raise HTTPException(status_code=500, detail="Telnyx API key not configured")
    if not server_host:
        raise HTTPException(status_code=500, detail="SERVER_HOST env var not configured")

    agent_uuid = uuid.UUID(req.agent_id)
    tenant_uuid = uuid.UUID(req.tenant_id)

    agent = db.exec(
        select(Agent).where(Agent.id == agent_uuid, Agent.tenant_id == tenant_uuid)
    ).first()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if not agent.legacy_number:
        raise HTTPException(status_code=400, detail="No legacy number saved for this agent")
    if not agent.phone_number:
        raise HTTPException(status_code=400, detail="Agent has no Telnyx number assigned yet")

    # The TeXML for this test call lives at /forwarding-test-answer
    answer_url = f"https://{server_host}/forwarding-test-answer"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            "https://api.telnyx.com/v2/texml/calls",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "to":  agent.legacy_number,
                "from": agent.phone_number,
                "url": answer_url,
            },
        )

    if response.status_code not in [200, 201]:
        logger.error(f"Telnyx test-forwarding call failed: {response.text}")
        raise HTTPException(status_code=500, detail="Failed to place test call via Telnyx")

    logger.info(
        f"Forwarding test call placed: {agent.phone_number} → {agent.legacy_number} "
        f"(agent {agent.id})"
    )
    return {
        "status": "test_call_placed",
        "from": agent.phone_number,
        "to": agent.legacy_number,
    }
