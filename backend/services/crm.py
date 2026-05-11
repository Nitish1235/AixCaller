"""
Zoho CRM v6 client with automatic OAuth-token refresh.

Why this rewrite was needed:
  - Old code used Zoho CRM API v2 (deprecated since 2023).
  - Old code didn't refresh the access_token. Zoho access tokens expire in
    60 minutes, so every tenant's sync silently broke after one hour.
  - Old code hardcoded `.com` data center — Zoho uses different domains per
    region (.com, .eu, .in, .com.au, .jp, .com.cn).

This service:
  - Uses CRM v6 endpoints
  - Auto-refreshes the access_token when within 5 min of expiry, persisting
    the new token + expiry to the Tenant row
  - Uses the tenant's stored `zoho_domain` so it works for ALL data centers
  - Deduplicates leads by phone (searches first, updates if found, else creates)
"""
import os
import re
import time
from typing import Optional
import httpx
from loguru import logger
from sqlmodel import Session


class ZohoCRMService:
    """Per-tenant Zoho client. Pass the Tenant row + DB session at construction;
    we'll handle token refresh and persistence ourselves."""

    REFRESH_BUFFER_SECONDS = 300  # refresh if token expires within 5 min

    def __init__(self, tenant, db_session: Session):
        self.tenant = tenant
        self.db = db_session
        # Zoho data-center domain — e.g. "zohoapis.com" / "zohoapis.eu" / "zohoapis.in"
        self.api_domain = (tenant.zoho_domain or "zohoapis.com").strip()
        # Accounts host is the same DC suffix, just on accounts.zoho.<tld>
        # zohoapis.com  → accounts.zoho.com
        # zohoapis.eu   → accounts.zoho.eu, etc.
        tld = self.api_domain.replace("zohoapis.", "")
        self.accounts_host = f"accounts.zoho.{tld}"

    # ─── Token management ────────────────────────────────────────────────
    async def _ensure_fresh_token(self) -> Optional[str]:
        """Return a valid access_token, refreshing if needed. Returns None if
        we cannot refresh (e.g. user revoked access)."""
        now = int(time.time())
        expires_at = self.tenant.zoho_token_expires_at or 0
        if self.tenant.zoho_access_token and (expires_at - now) > self.REFRESH_BUFFER_SECONDS:
            return self.tenant.zoho_access_token

        if not self.tenant.zoho_refresh_token:
            logger.warning(f"Tenant {self.tenant.id} has no Zoho refresh_token — cannot refresh")
            return None

        client_id     = os.environ.get("ZOHO_CLIENT_ID")
        client_secret = os.environ.get("ZOHO_CLIENT_SECRET")
        if not client_id or not client_secret:
            logger.error("Zoho OAuth not configured on server (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET missing)")
            return None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"https://{self.accounts_host}/oauth/v2/token",
                    params={
                        "refresh_token": self.tenant.zoho_refresh_token,
                        "client_id":     client_id,
                        "client_secret": client_secret,
                        "grant_type":    "refresh_token",
                    },
                )
                if resp.status_code != 200:
                    logger.error(f"Zoho token refresh failed {resp.status_code}: {resp.text}")
                    return None
                data = resp.json()
                if "access_token" not in data:
                    logger.error(f"Zoho refresh response missing access_token: {data}")
                    return None

                new_token = data["access_token"]
                expires_in = int(data.get("expires_in", 3600))
                self.tenant.zoho_access_token = new_token
                self.tenant.zoho_token_expires_at = now + expires_in
                self.db.add(self.tenant)
                self.db.commit()
                logger.info(f"♻️ Zoho token refreshed for tenant {self.tenant.id}")
                return new_token
        except Exception as e:
            logger.error(f"Zoho token refresh exception: {e}")
            return None

    async def _authed_request(self, method: str, path: str, **kwargs) -> Optional[httpx.Response]:
        token = await self._ensure_fresh_token()
        if not token:
            return None
        url = f"https://{self.api_domain}/crm/v6/{path.lstrip('/')}"
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Zoho-oauthtoken {token}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                return await client.request(method, url, headers=headers, **kwargs)
        except Exception as e:
            logger.error(f"Zoho API {method} {path} failed: {e}")
            return None

    # ─── Phone normalization (for deduplication) ─────────────────────────
    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Strip everything except digits. Last 10 digits is the dedup key."""
        digits = re.sub(r"\D", "", phone or "")
        return digits[-10:] if len(digits) >= 10 else digits

    # ─── Search by phone (dedup) ─────────────────────────────────────────
    async def find_lead_by_phone(self, phone: str) -> Optional[dict]:
        """Look for an existing lead with this phone. Returns the Zoho record or None."""
        normalized = self._normalize_phone(phone)
        if not normalized:
            return None
        # Zoho v6 search uses `criteria=(Phone:equals:<value>)`
        resp = await self._authed_request(
            "GET",
            "Leads/search",
            params={"criteria": f"(Phone:equals:{normalized})"},
        )
        if resp is None or resp.status_code != 200:
            return None
        data = resp.json() or {}
        records = data.get("data") or []
        return records[0] if records else None

    # ─── Create or update lead from a call ───────────────────────────────
    async def upsert_lead_from_call(
        self,
        *,
        phone: str,
        summary: str,
        sentiment: str,
        call_id: str,
    ) -> bool:
        """Create a Zoho lead from a finished call, or append the call summary
        to an existing lead with the same phone number."""
        existing = await self.find_lead_by_phone(phone)
        description = f"[{sentiment.upper()}] {summary}\n— AIxCaller, call {call_id[:8]}"

        if existing:
            # Append to existing description rather than overwrite
            old_desc = existing.get("Description") or ""
            new_desc = (old_desc + "\n\n" + description).strip()
            resp = await self._authed_request(
                "PUT",
                f"Leads/{existing['id']}",
                json={"data": [{"Description": new_desc}]},
            )
            ok = bool(resp) and resp.status_code in (200, 202)
            if ok:
                logger.info(f"📇 Zoho: updated existing lead {existing['id']} (tenant {self.tenant.id})")
            else:
                logger.warning(f"Zoho update lead failed: {resp.text if resp else 'no response'}")
            return ok

        # Create new
        lead_payload = {
            "data": [{
                "Last_Name":    f"Caller {phone[-4:]}" if phone else "Unknown Caller",
                "Company":      "AIxCaller Inbound",
                "Phone":        phone,
                "Lead_Source":  "AIxCaller",
                "Description":  description,
            }]
        }
        resp = await self._authed_request("POST", "Leads", json=lead_payload)
        if resp is None:
            return False
        if resp.status_code in (200, 201):
            logger.info(f"📇 Zoho: created new lead for tenant {self.tenant.id}")
            return True
        logger.warning(f"Zoho create lead failed {resp.status_code}: {resp.text}")
        return False

    # ─── Connection test ─────────────────────────────────────────────────
    async def test_connection(self) -> tuple[bool, str]:
        """Hit /users/me to verify the token works."""
        resp = await self._authed_request("GET", "users", params={"type": "CurrentUser"})
        if resp is None:
            return False, "Could not reach Zoho — check your connection or reconnect."
        if resp.status_code != 200:
            return False, f"Zoho returned {resp.status_code}: {resp.text[:200]}"
        data = resp.json() or {}
        users = data.get("users") or []
        if users:
            u = users[0]
            return True, f"Connected as {u.get('full_name', '?')} ({u.get('email', '?')})."
        return True, "Connected — but couldn't read profile."
