"""
Zoho CRM OAuth 2.0 helper.

Zoho uses different domains per data center:
   us  → accounts.zoho.com  / www.zohoapis.com
   eu  → accounts.zoho.eu   / www.zohoapis.eu
   in  → accounts.zoho.in   / www.zohoapis.in
   au  → accounts.zoho.com.au / www.zohoapis.com.au
   jp  → accounts.zoho.jp   / www.zohoapis.jp
   cn  → accounts.zoho.com.cn / www.zohoapis.com.cn

The user picks their data center on the connect screen (we default to US).

After the user authorizes, Zoho gives us a code in the callback. We exchange
that for a refresh_token (long-lived) + access_token (60-min). We store the
refresh_token plus the `api_domain` Zoho tells us to use for that account.
"""
import os
import secrets
import time
from typing import Optional
from urllib.parse import urlencode
import httpx
import jwt as pyjwt
from loguru import logger


# ─── Env config ──────────────────────────────────────────────────────────────
ZOHO_CLIENT_ID     = os.environ.get("ZOHO_CLIENT_ID", "")
ZOHO_CLIENT_SECRET = os.environ.get("ZOHO_CLIENT_SECRET", "")
ZOHO_SCOPES        = os.environ.get(
    "ZOHO_SCOPES",
    "ZohoCRM.modules.leads.ALL,ZohoCRM.users.READ",
)
ZOHO_REDIRECT_URI  = os.environ.get(
    "ZOHO_REDIRECT_URI",
    "https://backend-597874469660.europe-west1.run.app/api/v1/zoho/callback",
)
DASHBOARD_URL      = os.environ.get("DASHBOARD_URL", "http://localhost:3000")
JWT_SECRET         = os.environ.get("JWT_SECRET", "super-secret-key")
STATE_TTL_SECONDS  = 600


# ─── Data-center mapping ────────────────────────────────────────────────────
DATA_CENTERS = {
    "us": {"accounts": "accounts.zoho.com",    "api_domain": "zohoapis.com"},
    "eu": {"accounts": "accounts.zoho.eu",     "api_domain": "zohoapis.eu"},
    "in": {"accounts": "accounts.zoho.in",     "api_domain": "zohoapis.in"},
    "au": {"accounts": "accounts.zoho.com.au", "api_domain": "zohoapis.com.au"},
    "jp": {"accounts": "accounts.zoho.jp",     "api_domain": "zohoapis.jp"},
    "cn": {"accounts": "accounts.zoho.com.cn", "api_domain": "zohoapis.com.cn"},
}


def get_dc(dc_code: str) -> dict:
    return DATA_CENTERS.get((dc_code or "us").lower(), DATA_CENTERS["us"])


# ─── State token ─────────────────────────────────────────────────────────────
def make_state_token(tenant_id: str, dc_code: str) -> str:
    payload = {
        "tenant_id": tenant_id,
        "dc":        dc_code,
        "nonce":     secrets.token_urlsafe(16),
        "exp":       int(time.time()) + STATE_TTL_SECONDS,
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")


def decode_state_token(token: str) -> Optional[dict]:
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except pyjwt.ExpiredSignatureError:
        logger.warning("Zoho OAuth state token expired")
        return None
    except Exception as e:
        logger.warning(f"Zoho OAuth state token invalid: {e}")
        return None


# ─── Install URL ─────────────────────────────────────────────────────────────
def build_install_url(dc_code: str, state_token: str) -> str:
    dc = get_dc(dc_code)
    params = {
        "scope":         ZOHO_SCOPES,
        "client_id":     ZOHO_CLIENT_ID,
        "response_type": "code",
        "access_type":   "offline",   # required to receive a refresh_token
        "redirect_uri":  ZOHO_REDIRECT_URI,
        "state":         state_token,
        "prompt":        "consent",   # always show consent screen so we get refresh_token
    }
    return f"https://{dc['accounts']}/oauth/v2/auth?{urlencode(params)}"


# ─── Code → tokens ───────────────────────────────────────────────────────────
async def exchange_code_for_tokens(dc_code: str, code: str) -> Optional[dict]:
    """POST to Zoho token endpoint. Returns dict containing access_token,
    refresh_token, expires_in, api_domain — or None on failure."""
    dc = get_dc(dc_code)
    params = {
        "code":          code,
        "client_id":     ZOHO_CLIENT_ID,
        "client_secret": ZOHO_CLIENT_SECRET,
        "redirect_uri":  ZOHO_REDIRECT_URI,
        "grant_type":    "authorization_code",
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://{dc['accounts']}/oauth/v2/token",
                params=params,
            )
            if resp.status_code != 200:
                logger.error(f"Zoho token exchange failed {resp.status_code}: {resp.text}")
                return None
            data = resp.json()
            if "access_token" not in data or "refresh_token" not in data:
                logger.error(f"Zoho token exchange missing tokens: {data}")
                return None
            return data
    except Exception as e:
        logger.error(f"Zoho token exchange exception: {e}")
        return None
