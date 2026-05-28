"""
Shopify OAuth endpoints.

Mounted at /api/v1/shopify.

Endpoints:
  GET    /install?agent_id=&shop=     — kicks off OAuth, 302 redirects to Shopify
  GET    /callback?...                — Shopify redirects merchant back here
  GET    /status?agent_id=            — returns whether Shopify is connected
  POST   /test-connection?agent_id=   — pings Shopify /shop.json with stored token
  DELETE /disconnect?agent_id=        — removes the stored credentials
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session
from loguru import logger
from shared.database import get_db
from shared.models import Agent, Tenant
from backend.services.shopify_oauth import (
    SHOPIFY_API_KEY,
    DASHBOARD_URL,
    normalize_shop_domain,
    make_state_token,
    decode_state_token,
    build_install_url,
    verify_hmac,
    exchange_code_for_token,
    test_connection as oauth_test_connection,
)

router = APIRouter(prefix="/api/v1/shopify", tags=["shopify"])

# --- DISABLED FOR NOW (We only need manual custom app API Key logic on the integrations dashboard) ---

'''
@router.get("/install")
async def start_install(
    agent_id: str,
    shop: str,
    db: Session = Depends(get_db),
):
    """Step 1: User clicks 'Connect Shopify' → we 302 to Shopify's permission screen.
    `shop` can be `mystore`, `mystore.myshopify.com`, or a full admin URL."""
    if not SHOPIFY_API_KEY:
        raise HTTPException(status_code=500, detail="Shopify OAuth not configured on server (SHOPIFY_API_KEY missing)")

    # Validate agent exists & belongs to a tenant
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = db.get(Agent, agent_uuid)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    shop_domain = normalize_shop_domain(shop)
    if not shop_domain:
        raise HTTPException(status_code=400, detail=f"Invalid Shopify shop domain: '{shop}'")

    state_token = make_state_token(
        agent_id=str(agent.id),
        tenant_id=str(agent.tenant_id),
        shop=shop_domain,
    )
    install_url = build_install_url(shop_domain, state_token)
    logger.info(f"🛍️ Shopify install initiated for agent {agent_id} → {shop_domain}")
    return RedirectResponse(install_url, status_code=302)


@router.get("/callback")
async def oauth_callback(request: Request, db: Session = Depends(get_db)):
    """Step 4: Shopify sends the merchant back here with code+hmac+shop+state.
    We verify the HMAC, decode our state token, exchange the code for an
    access_token, and save it. Then redirect the merchant to the dashboard."""
    params = dict(request.query_params)
    logger.info(f"🛍️ Shopify OAuth callback: {sorted(params.keys())}")

    # 1. Verify HMAC — prevents tampering / forgery
    if not verify_hmac(params):
        logger.warning("Shopify OAuth callback HMAC verification FAILED")
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=hmac_failed", status_code=302)

    # 2. Decode our state token to find which agent this is for
    state = decode_state_token(params.get("state", ""))
    if not state:
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=invalid_state", status_code=302)

    expected_shop = state["shop"]
    callback_shop = params.get("shop")
    if expected_shop != callback_shop:
        logger.warning(f"Shopify OAuth shop mismatch: expected {expected_shop}, got {callback_shop}")
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=shop_mismatch", status_code=302)

    # 3. Exchange the code for a permanent access token
    code = params.get("code")
    if not code:
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=no_code", status_code=302)

    token_data = await exchange_code_for_token(callback_shop, code)
    if not token_data:
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=token_exchange_failed", status_code=302)

    # 4. Save into the agent's tools_config (per-agent storage)
    try:
        agent_uuid = uuid.UUID(state["agent_id"])
    except ValueError:
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=invalid_agent", status_code=302)

    agent = db.get(Agent, agent_uuid)
    if not agent:
        return RedirectResponse(f"{DASHBOARD_URL}/dashboard/agents?shopify_error=agent_not_found", status_code=302)

    current_tools = dict(agent.tools_config or {})
    current_tools["shopify"] = {
        "store_url":    callback_shop,
        "access_token": token_data["access_token"],
        "scope":        token_data.get("scope", ""),
        "connected_at": int(__import__("time").time()),
    }
    agent.tools_config = current_tools
    db.add(agent)
    db.commit()
    logger.info(f"✅ Shopify connected for agent {agent.id} → {callback_shop}")

    return RedirectResponse(
        f"{DASHBOARD_URL}/dashboard/agents/{agent.id}?shopify_connected=1",
        status_code=302,
    )


@router.get("/status")
async def get_status(agent_id: str, db: Session = Depends(get_db)):
    """Returns the current Shopify connection status for an agent."""
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = db.get(Agent, agent_uuid)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    shopify_cfg = (agent.tools_config or {}).get("shopify")
    if not shopify_cfg or not shopify_cfg.get("access_token"):
        return {"connected": False, "store_url": None}

    return {
        "connected":    True,
        "store_url":    shopify_cfg.get("store_url"),
        "scope":        shopify_cfg.get("scope"),
        "connected_at": shopify_cfg.get("connected_at"),
    }


@router.post("/test-connection")
async def test_connection(agent_id: str, db: Session = Depends(get_db)):
    """Verifies the saved token still works by hitting Shopify /shop.json."""
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = db.get(Agent, agent_uuid)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    shopify_cfg = (agent.tools_config or {}).get("shopify", {})
    store_url = shopify_cfg.get("store_url")
    token = shopify_cfg.get("access_token")
    if not store_url or not token:
        return {"ok": False, "message": "Shopify is not connected for this agent."}

    ok, msg = await oauth_test_connection(store_url, token)
    return {"ok": ok, "message": msg, "store_url": store_url}


@router.get("/test-order")
async def test_order(agent_id: str, order_number: str, db: Session = Depends(get_db)):
    """Fetch a real order by number to verify the Shopify connection works end-to-end."""
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = db.get(Agent, agent_uuid)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    shopify_cfg = (agent.tools_config or {}).get("shopify", {})
    store_url = shopify_cfg.get("store_url")
    token = shopify_cfg.get("access_token")
    if not store_url or not token:
        return {"ok": False, "message": "Shopify is not connected for this agent."}

    import re, httpx as _httpx
    # Normalize order number — strip #, "order", etc.
    num = re.sub(r"(order|number|#|no\.?|num)\s*", "", order_number.strip().lower()).strip()
    if not num:
        return {"ok": False, "message": "Please enter a valid order number."}

    url = f"https://{store_url}/admin/api/2024-01/orders.json"
    try:
        async with _httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                url,
                headers={"X-Shopify-Access-Token": token},
                params={"name": num, "status": "any", "limit": 1},
            )
        if resp.status_code == 401:
            return {"ok": False, "message": "Token rejected by Shopify — it may have been revoked."}
        if resp.status_code != 200:
            return {"ok": False, "message": f"Shopify returned HTTP {resp.status_code}."}

        orders = resp.json().get("orders", [])
        if not orders:
            return {"ok": False, "message": f"No order found matching '{order_number}'. Check the number and try again."}

        o = orders[0]
        cust = o.get("customer") or {}
        name = o.get("name", f"#{num}")
        status = o.get("fulfillment_status") or "unfulfilled"
        payment = o.get("financial_status") or "pending"
        total = o.get("total_price", "?")
        currency = o.get("currency", "")
        item_count = sum(li.get("quantity", 0) for li in o.get("line_items", []))
        customer_name = f"{cust.get('first_name', '')} {cust.get('last_name', '')}".strip() or "Unknown"

        return {
            "ok": True,
            "message": f"Order {name} found!",
            "order": {
                "name": name,
                "customer": customer_name,
                "fulfillment_status": status,
                "financial_status": payment,
                "item_count": item_count,
                "total": f"{total} {currency}".strip(),
            },
        }
    except Exception as e:
        return {"ok": False, "message": f"Request failed: {e}"}


@router.post("/connect-direct")
async def connect_direct(
    agent_id: str,
    store_url: str,
    access_token: str,
    db: Session = Depends(get_db),
):
    """Connect Shopify using a direct access token (legacy custom apps, dev stores).
    Validates the token works before saving by hitting /shop.json."""
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = db.get(Agent, agent_uuid)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    from backend.services.shopify_oauth import normalize_shop_domain
    shop_domain = normalize_shop_domain(store_url)
    if not shop_domain:
        raise HTTPException(status_code=400, detail=f"Invalid Shopify store URL: '{store_url}'")

    ok, msg = await oauth_test_connection(shop_domain, access_token)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Token validation failed: {msg}")

    current_tools = dict(agent.tools_config or {})
    current_tools["shopify"] = {
        "store_url":    shop_domain,
        "access_token": access_token,
        "scope":        "",
        "connected_at": int(__import__("time").time()),
    }
    agent.tools_config = current_tools
    db.add(agent)
    db.commit()
    logger.info(f"✅ Shopify (direct token) connected for agent {agent.id} → {shop_domain}")
    return {"ok": True, "message": f"Connected to {shop_domain}"}


@router.delete("/disconnect")
async def disconnect(agent_id: str, db: Session = Depends(get_db)):
    """Removes Shopify credentials from this agent. Does NOT revoke the token
    on Shopify's side — merchants should uninstall the app from their Shopify
    admin if they want full revocation."""
    try:
        agent_uuid = uuid.UUID(agent_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id")

    agent = db.get(Agent, agent_uuid)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    current_tools = dict(agent.tools_config or {})
    current_tools.pop("shopify", None)
    agent.tools_config = current_tools
    db.add(agent)
    db.commit()
    logger.info(f"🔌 Shopify disconnected for agent {agent.id}")
    return {"status": "disconnected"}
'''
