import os
import json
import httpx
from shared.models import Tenant

class SheetsService:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        # NOTE: Do not use google_refresh_token directly as a Bearer token.
        # Always call get_valid_token(tenant) to get a fresh access token.
        self.base_url = "https://sheets.googleapis.com/v4/spreadsheets"

    async def _get_auth_headers(self) -> dict:
        from backend.services.google_oauth import get_valid_token
        token = await get_valid_token(self.tenant)
        if not token:
            raise ValueError("No valid Google access token available for SheetsService")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def ensure_columns(self, sheet_id: str, required_columns: list[str]):
        """Check the first header row of the sheet and add any missing columns.
        This is a best-effort operation – if the sheet is empty we create the header row.
        """
        headers = await self._get_auth_headers()
        get_url = f"{self.base_url}/{sheet_id}/values/A1:1"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(get_url, headers=headers)
            if resp.status_code != 200:
                existing = []
            else:
                data = resp.json()
                existing = data.get("values", [[]])[0]

            missing = [col for col in required_columns if col not in existing]
            if not missing:
                return
            new_header = existing + missing if existing else missing
            body = {
                "valueInputOption": "RAW",
                "data": [{
                    "range": f"A1:{chr(64 + len(new_header))}1",
                    "majorDimension": "ROWS",
                    "values": [new_header],
                }],
            }
            update_url = f"{self.base_url}/{sheet_id}/values:batchUpdate"
            await client.post(update_url, headers=headers, json=body)

    async def search_table(self, sheet_id: str, query: str):
        """Searches a sheet for rows where any cell contains *query* (case-insensitive).
        Returns matching rows as a list of dicts keyed by column headers.
        """
        if not sheet_id:
            return []

        headers = await self._get_auth_headers()
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{self.base_url}/{sheet_id}/values/Sheet1",
                headers=headers,
            )
            if resp.status_code != 200:
                return []

            data = resp.json()
            values = data.get("values", [])
            if not values:
                return []

            col_headers = values[0]
            results = []
            query_lower = query.lower()
            for row in values[1:]:
                row_padded = row + [""] * (len(col_headers) - len(row))
                if any(query_lower in str(cell).lower() for cell in row_padded):
                    results.append(dict(zip(col_headers, row_padded)))
            return results

    async def lookup_row(self, sheet_id: str, column_key: str, value: str):
        """Lookup a single row by a key column value."""
        rows = await self.search_table(sheet_id, value)
        for row in rows:
            if str(row.get(column_key, "")).lower() == value.lower():
                return row
        return {}
