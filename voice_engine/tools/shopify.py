"""
Shopify tool — runtime helpers the voice agent calls during a live conversation.

The agent's Shopify config is stored in `agent.tools_config["shopify"]` as:
    {"store_url": "mystore.myshopify.com", "access_token": "shpat_..."}

Populated by the OAuth flow in backend/services/shopify_oauth.py.

These helpers are designed to return SHORT, voice-friendly strings the LLM
can read directly to the caller — NOT raw JSON dumps. Speak naturally.
"""
import re
import httpx
from typing import Optional
from loguru import logger


SHOPIFY_API_VERSION = "2024-01"


# ─── Helpers ─────────────────────────────────────────────────────────────────
def _normalize_order_number(raw: str) -> str:
    """Callers say '#1042', 'order 1042', 'ten forty-two' — strip noise.
    Shopify accepts the order 'name' as-is (with or without #)."""
    if not raw:
        return ""
    s = str(raw).strip().lower()
    s = re.sub(r"(order|number|#|no\.?|num)\s*", "", s)
    s = s.strip()
    # Shopify queries with name= accept the order name with or without # — keep digits
    return s


def _digits_only(phone: Optional[str]) -> str:
    return re.sub(r"\D", "", phone or "")


def _caller_matches_order(caller_phone: Optional[str], order: dict) -> bool:
    """Light verification: does the caller's number match the order's customer phone
    (or shipping address phone)? Compares the last 7 digits to tolerate format
    differences (E.164 vs local)."""
    if not caller_phone:
        return False
    caller_tail = _digits_only(caller_phone)[-7:]
    if not caller_tail:
        return False
    candidates = []
    cust = order.get("customer") or {}
    candidates.append(cust.get("phone"))
    addr = order.get("shipping_address") or {}
    candidates.append(addr.get("phone"))
    candidates.append(order.get("phone"))
    for c in candidates:
        if c and _digits_only(c).endswith(caller_tail):
            return True
    return False


def _summarize_money(amount, currency: str) -> str:
    """'48.00' + 'USD' → '48 dollars'. Keep it speakable."""
    try:
        val = float(amount)
        whole = int(val)
        cents = round((val - whole) * 100)
        unit = {"USD": "dollars", "GBP": "pounds", "EUR": "euros", "INR": "rupees"}.get(currency, currency)
        if cents == 0:
            return f"{whole} {unit}"
        return f"{whole} {unit} and {cents} cents"
    except Exception:
        return f"{amount} {currency}"


async def _shopify_get(store_url: str, token: str, path: str, params: dict = None) -> Optional[dict]:
    """Authenticated GET to Shopify Admin API. Returns parsed JSON or None on failure."""
    url = f"https://{store_url}/admin/api/{SHOPIFY_API_VERSION}/{path}"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                url,
                headers={"X-Shopify-Access-Token": token},
                params=params or {},
            )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code == 401:
                logger.error(f"Shopify 401 — token invalid or revoked for {store_url}")
            else:
                logger.warning(f"Shopify {resp.status_code} on {path}: {resp.text[:200]}")
            return None
    except Exception as e:
        logger.error(f"Shopify GET {path} failed: {e}")
        return None


async def _find_order(config: dict, order_number: str) -> Optional[dict]:
    """Look up an order by its 'name' (e.g. '1042'). Returns the order dict or None."""
    store_url = config.get("store_url")
    token = config.get("access_token")
    if not (store_url and token):
        return None
    name = _normalize_order_number(order_number)
    if not name:
        return None
    # Search across all statuses (open, closed, cancelled)
    data = await _shopify_get(store_url, token, "orders.json", {
        "name": name,
        "status": "any",
        "limit": 1,
    })
    if not data:
        return None
    orders = data.get("orders") or []
    return orders[0] if orders else None


# ─── Public tool functions (called by bot.py from LLM tool dispatch) ────────
async def lookup_order(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    """Headline status of an order — payment, fulfillment, items count, total."""
    order = await _find_order(config, order_number)
    if not order:
        return f"I couldn't find an order matching {order_number}. Could you double-check the number?"

    verified = _caller_matches_order(caller_phone, order)
    cust = order.get("customer") or {}
    customer_name = (cust.get("first_name") or "").strip()

    fulfillment = order.get("fulfillment_status") or "not yet fulfilled"
    financial = order.get("financial_status") or "pending"
    item_count = sum(li.get("quantity", 0) for li in order.get("line_items", []))
    total_str = _summarize_money(order.get("total_price"), order.get("currency", "USD"))
    name = order.get("name", order_number)

    greeting = f"Hi {customer_name}, " if verified and customer_name else ""
    return (
        f"{greeting}order {name} is currently {fulfillment}, payment status is {financial}. "
        f"It has {item_count} item{'s' if item_count != 1 else ''}, total {total_str}."
    )


async def get_order_tracking(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    """Tracking number, carrier, estimated delivery."""
    order = await _find_order(config, order_number)
    if not order:
        return f"I couldn't find an order matching {order_number}."

    fulfillments = order.get("fulfillments") or []
    if not fulfillments:
        status = order.get("fulfillment_status") or "not yet shipped"
        return f"Order {order.get('name')} is currently {status}. There's no tracking information yet."

    latest = fulfillments[-1]
    tracking_num = latest.get("tracking_number")
    carrier = latest.get("tracking_company") or "the carrier"
    eta = latest.get("estimated_delivery_at")
    parts = [f"Your order shipped via {carrier}"]
    if tracking_num:
        parts.append(f"tracking number is {tracking_num}")
    if eta:
        parts.append(f"estimated delivery {eta.split('T')[0]}")
    return ". ".join(parts) + "."


async def get_order_items(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    """Lists what's in the order."""
    order = await _find_order(config, order_number)
    if not order:
        return f"I couldn't find an order matching {order_number}."

    items = order.get("line_items") or []
    if not items:
        return "That order doesn't have any items listed."

    # Keep it speakable — read first 3 items
    bits = []
    for li in items[:3]:
        qty = li.get("quantity", 1)
        title = li.get("title", "an item")
        variant = li.get("variant_title")
        line = f"{qty} {title}"
        if variant and variant.lower() not in ("default title", ""):
            line += f" in {variant}"
        bits.append(line)
    extra = ""
    if len(items) > 3:
        extra = f", plus {len(items) - 3} more item{'s' if len(items) - 3 != 1 else ''}"
    return f"Your order includes {', '.join(bits)}{extra}."


async def get_order_total(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    """Total cost + shipping breakdown."""
    order = await _find_order(config, order_number)
    if not order:
        return f"I couldn't find an order matching {order_number}."
    currency = order.get("currency", "USD")
    total = _summarize_money(order.get("total_price"), currency)
    subtotal = _summarize_money(order.get("subtotal_price"), currency)
    tax = _summarize_money(order.get("total_tax"), currency)
    shipping_lines = order.get("shipping_lines") or []
    shipping = _summarize_money(
        sum(float(s.get("price", 0)) for s in shipping_lines),
        currency,
    )
    return (
        f"The order total is {total}. That's {subtotal} subtotal, "
        f"plus {shipping} shipping and {tax} tax."
    )


async def get_shipping_address(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    order = await _find_order(config, order_number)
    if not order:
        return f"I couldn't find an order matching {order_number}."
    addr = order.get("shipping_address") or {}
    if not addr:
        return "There's no shipping address on that order — it might be a digital item or local pickup."
    parts = [
        addr.get("name"),
        addr.get("address1"),
        addr.get("city"),
        addr.get("zip"),
        addr.get("country"),
    ]
    return "Shipping to: " + ", ".join(p for p in parts if p) + "."


async def get_refund_status(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    order = await _find_order(config, order_number)
    if not order:
        return f"I couldn't find an order matching {order_number}."
    refunds = order.get("refunds") or []
    if not refunds:
        return f"There are no refunds processed on order {order.get('name')} yet."
    total_refunded = sum(
        float(t.get("amount", 0))
        for r in refunds
        for t in (r.get("transactions") or [])
    )
    currency = order.get("currency", "USD")
    amount = _summarize_money(total_refunded, currency)
    return f"A refund of {amount} has been processed on order {order.get('name')}."


# ─── Backwards compatibility ────────────────────────────────────────────────
# Old code in bot.py calls `check_order_status` — keep it as an alias of lookup_order.
async def check_order_status(order_number: str, config: dict, caller_phone: Optional[str] = None) -> str:
    return await lookup_order(order_number, config, caller_phone)
