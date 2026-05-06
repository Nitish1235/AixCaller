import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from loguru import logger
from sqlmodel import Session, select
from shared.database import engine, get_db
from shared.models import Tenant, Agent

router = APIRouter(prefix="/api/v1/numbers", tags=["Numbers"])

class SearchRequest(BaseModel):
    area_code: str
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

    async with httpx.AsyncClient() as client:
        # Using Telnyx API to find local numbers
        response = await client.get(
            "https://api.telnyx.com/v2/available_phone_numbers",
            headers={"Authorization": f"Bearer {api_key}"},
            params={
                "filter[national_destination_code]": req.area_code,
                "filter[features][]": "voice",
                "filter[limit]": req.limit,
                "filter[best_effort]": "true"
            }
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
    """
    api_key = os.environ.get("TELNYX_API_KEY")
    connection_id = os.environ.get("TELNYX_CONNECTION_ID")
    
    if not api_key or not connection_id:
        raise HTTPException(status_code=500, detail="Telnyx config missing (TELNYX_API_KEY or TELNYX_CONNECTION_ID)")

    # 1. Purchase the number via Telnyx Number Orders API
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

    # 2. Update the Agent in Database
    agent = db.exec(select(Agent).where(Agent.id == req.agent_id, Agent.tenant_id == req.tenant_id)).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.phone_number = req.phone_number
    db.add(agent)
    db.commit()

    return {"status": "success", "phone_number": req.phone_number}
