"""
Shopify OAuth 2.0 helper.

Flow:
  1. Frontend calls our /shopify/install?agent_id=X&shop=mystore.myshopify.com
  2. We build the Shopify install URL with our SHOPIFY_API_KEY + a signed state
     token (JWT carrying agent_id + tenant_id + expiry), and 302 redirect there.
  3. Merchant approves on Shopify's permission screen.
  4. Shopify redirects back to /shopify/callback?code=&shop=&state=&hmac=...
  5. We verify the HMAC signature, decode our state token, exchange the code
     for an access_token, and save it under agent.tools_config["shopify"].

Docs: https://shopify.dev/docs/apps/auth/oauth/getting-started
"""
import os
import hmac as hmac_lib
import hashlib
import secrets
import re
import time
from typing import Optional
from urllib.parse import urlencode
import httpx
import jwt as pyjwt
from loguru import logger


# ─── Env config ──────────────────────────────────────────────────────────────
SHOPIFY_API_KEY        = os.environ.get("SHOPIFY_API_KEY", "")
SHOPIFY_API_SECRET     = os.environ.get("SHOPIFY_API_SECRET", "")
SHOPIFY_SCOPES         = os.environ.get(
    "SHOPIFY_SCOPES",
    "read_orders,read_customers,read_products,read_inventory,read_fulfillments",
)
# Where Shopify will POST the callback. Must EXACTLY match the redirect URL
# registered in the Shopify Partner dashboard for your app.
SHOPIFY_REDIRECT_URI   = os.environ.get(
    "SHOPIFY_REDIRECT_URI",
    "https://backend-597874469660.europe-west1.run.app/api/v1/shopify/callback",
)
# Where to send the merchant after we finish saving the token. Pointing them
# back to their agent settings is best UX.
DASHBOARD_URL          = os.environ.get("DASHBOARD_URL", "http://localhost:3000")

# State JWT uses the same JWT_SECRET as call tokens — short-lived (10 min)
JWT_SECRET             = os.environ.get("JWT_SECRET", "super-secret-key")
STATE_TTL_SECONDS      = 600


# ─── Shop domain normalization ───────────────────────────────────────────────
_SHOP_DOMAIN_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$")


def normalize_shop_domain(raw: str) -> Optional[str]:
    """Accept 'mystore', 'mystore.myshopify.com', 'https://mystore.myshopify.com',
    'admin.shopify.com/store/mystore' → 'mystore.myshopify.com'.

    Returns None if the input is not a valid shop domain.
    """
    if not raw:
        return None
    s = raw.strip().lower()
    # Strip protocol
    s = re.sub(r"^https?://", "", s)
    # Strip /admin/... suffix
    s = s.split("/")[0]
    # If they pasted admin.shopify.com/store/<name>, extract <name>
    if s == "admin.shopify.com":
        parts = raw.strip().lower().rstrip("/").split("/")
        if "store" in parts:
            idx = parts.index("store")
            if idx + 1 < len(parts):
                s = f"{parts[idx + 1]}.myshopify.com"
    # Bare handle → append .myshopify.com
    if "." not in s:
        s = f"{s}.myshopify.com"
    if _SHOP_DOMAIN_RE.match(s):
        return s
    return None


# ─── State token (JWT) ───────────────────────────────────────────────────────
def make_state_token(agent_id: str, tenant_id: str, shop: str) -> str:
    """Sign a short-lived JWT that the callback will decode to know which
    agent is being connected. Carries a nonce to prevent CSRF replay."""
    payload = {
        "agent_id":  agent_id,
        "tenant_id": tenant_id,
        "shop":      shop,
        "nonce":     secrets.token_urlsafe(16),
        "exp":       int(time.time()) + STATE_TTL_SECONDS,
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_state_token(token: str) -> Optional[dict]:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except pyjwt.ExpiredSignatureError:
        logger.warning("Shopify OAuth state token expired")
        return None
    except Exception as e:
        logger.warning(f"Shopify OAuth state token invalid: {e}")
        return None


# ─── Install URL ─────────────────────────────────────────────────────────────
def build_install_url(shop: str, state_token: str) -> str:
    """Construct the Shopify OAuth authorize URL the user gets redirected to."""
    params = {
        "client_id":    SHOPIFY_API_KEY,
        "scope":        SHOPIFY_SCOPES,
        "redirect_uri": SHOPIFY_REDIRECT_URI,
        "state":        state_token,
        # grant_options[] is for online tokens; we want offline (persistent),
        # so we omit it (offline is the default).
    }
    return f"https://{shop}/admin/oauth/authorize?{urlencode(params)}"


# ─── HMAC verification ───────────────────────────────────────────────────────
def verify_hmac(query_params: dict) -> bool:
    """Verify the hmac signature Shopify sends on the callback.

    Per docs: remove hmac (and signature if present), sort remaining params
    alphabetically, build a `&`-joined query string, sign with API secret
    using HMAC-SHA256 (hex), and constant-time compare.
    """
    received = query_params.get("hmac")
    if not received or not SHOPIFY_API_SECRET:
        return False
    msg_params = {k: v for k, v in query_params.items() if k not in ("hmac", "signature")}
    message = "&".join(f"{k}={v}" for k, v in sorted(msg_params.items()))
    computed = hmac_lib.new(
        SHOPIFY_API_SECRET.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac_lib.compare_digest(computed, received)


# ─── Exchange code for access token ─────────────────────────────────────────
async def exchange_code_for_token(shop: str, code: str) -> Optional[dict]:
    """POST to Shopify's token endpoint. Returns {access_token, scope} on
    success, None on failure."""
    url = f"https://{shop}/admin/oauth/access_token"
    payload = {
        "client_id":     SHOPIFY_API_KEY,
        "client_secret": SHOPIFY_API_SECRET,
        "code":          code,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.error(f"Shopify token exchange failed {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            if "access_token" not in data:
                logger.error(f"Shopify token exchange returned no access_token: {data}")
                return None
            return data
    except Exception as e:
        logger.error(f"Shopify token exchange exception: {e}")
        return None


# ─── Connection test (optional, called from "Test Connection" button) ───────
async def test_connection(shop: str, access_token: str) -> tuple[bool, str]:
    """Ping /shop.json to verify the saved credentials still work."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://{shop}/admin/api/2024-01/shop.json",
                headers={"X-Shopify-Access-Token": access_token},
            )
            if resp.status_code == 200:
                shop_data = resp.json().get("shop", {})
                return True, f"Connected to '{shop_data.get('name', shop)}' successfully."
            return False, f"Shopify returned {resp.status_code}"
    except Exception as e:
        return False, f"Connection error: {e}"
