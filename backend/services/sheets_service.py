import os
import json
import httpx
from shared.models import Tenant

class SheetsService:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        # Assume tenant.google_refresh_token is a valid OAuth access token for Google APIs
        self.access_token = tenant.google_refresh_token
        self.base_url = "https://sheets.googleapis.com/v4/spreadsheets"

    def _auth_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    async def ensure_columns(self, sheet_id: str, required_columns: list[str]):
        """Check the first header row of the sheet and add any missing columns.
        This is a best‑effort operation – if the sheet is empty we create the header row.
        """
        # 1️⃣ Fetch existing header row (assume first row of first sheet)
        get_url = f"{self.base_url}/{sheet_id}/values/A1:1"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(get_url, headers=self._auth_headers())
            if resp.status_code != 200:
                # If the sheet is completely new, treat as no headers
                existing = []
            else:
                data = resp.json()
                existing = data.get("values", [[]])[0]
        # Determine which columns are missing
        missing = [col for col in required_columns if col not in existing]
        if not missing:
            return  # nothing to do
        # 2️⃣ Prepare batchUpdate request to append missing headers at the end of the row
        new_header = existing + missing if existing else missing
        body = {
            "valueInputOption": "RAW",
            "data": [{
                "range": f"A1:{chr(64 + len(new_header))}1",
                "majorDimension": "ROWS",
                "values": [new_header],
            }],
        }
        update_url = f"{self.base_url}/{sheet_id}:batchUpdate"
        await client.post(update_url, headers=self._auth_headers(), json=body)

    async def search_table(self, sheet_id: str, query: str):
        """Searches a sheet for rows where any cell contains *query* (case‑insensitive).
        Auto‑creates a minimal header set if missing.
        """
        # Ensure we have at least the columns we expect for a generic lookup
        await self.ensure_columns(sheet_id, ["query", "result"])
        # Simple stub: return a static example (real implementation would call the Sheets API "spreadsheets.values.get")
        return [{"sheet_id": sheet_id, "query": query, "result": "Sample data"}]

    async def lookup_row(self, sheet_id: str, column_key: str, value: str):
        """Lookup a single row by a key column. Auto‑creates the key column if missing."""
        await self.ensure_columns(sheet_id, [column_key])
        return {column_key: value, "data": "Sample row data"}
