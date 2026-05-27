"""
AIxCaller — Airtable Integration Service
==========================================
Auto-logs completed calls to a user's Airtable base via the Airtable REST API.
Uses Personal Access Tokens (PATs) for authentication — no OAuth flow required.

API Reference: https://airtable.com/developers/web/api/create-records
Rate Limit: 5 requests/sec/base (more than enough for call logging).
"""
import httpx
from loguru import logger
from shared.models import Tenant

AIRTABLE_API_URL = "https://api.airtable.com/v0"


class AirtableService:
    """Lightweight Airtable REST client for call logging."""

    def __init__(self, tenant: Tenant):
        self.pat = tenant.airtable_pat
        self.base_id = tenant.airtable_base_id
        self.table_name = tenant.airtable_table_name or "Call Log"
        self.headers = {
            "Authorization": f"Bearer {self.pat}",
            "Content-Type": "application/json",
        }

    @property
    def table_url(self) -> str:
        return f"{AIRTABLE_API_URL}/{self.base_id}/{self.table_name}"

    async def test_connection(self) -> dict:
        """
        Verify the PAT + base ID are valid by listing records (limit 1).
        Returns {"status": "ok", "table": "..."} on success, raises on failure.
        """
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                self.table_url,
                headers=self.headers,
                params={"maxRecords": 1},
            )
            if resp.status_code == 200:
                return {"status": "ok", "table": self.table_name}
            elif resp.status_code == 401:
                raise ValueError("Invalid Personal Access Token. Please check and re-enter.")
            elif resp.status_code == 403:
                raise ValueError("Token doesn't have access to this base. Check your token's scopes and base access.")
            elif resp.status_code == 404:
                raise ValueError(f"Table \"{self.table_name}\" not found in base \"{self.base_id}\". Please check the names.")
            else:
                raise ValueError(f"Airtable returned {resp.status_code}: {resp.text[:200]}")

    async def log_call(
        self,
        phone: str,
        summary: str,
        sentiment: str,
        duration: int,
        action_items: str,
        agent_name: str,
        call_id: str,
    ) -> dict:
        """
        Create a single row in the user's Airtable base after a completed call.
        Field names match the expected Airtable table structure.
        """
        from datetime import datetime, timezone

        payload = {
            "fields": {
                "Phone": phone,
                "Summary": summary,
                "Sentiment": sentiment,
                "Duration (s)": duration,
                "Action Items": action_items,
                "Agent": agent_name,
                "Call ID": call_id,
                "Timestamp": datetime.now(timezone.utc).isoformat(),
            }
        }

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                self.table_url,
                headers=self.headers,
                json=payload,
            )
            if resp.status_code in (200, 201):
                result = resp.json()
                logger.info(f"Airtable row created: {result.get('id', 'unknown')}")
                return result
            else:
                logger.warning(f"Airtable log_call failed [{resp.status_code}]: {resp.text[:300]}")
                raise ValueError(f"Airtable error {resp.status_code}: {resp.text[:200]}")
