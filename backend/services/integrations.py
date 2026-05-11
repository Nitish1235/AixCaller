import httpx
from loguru import logger


class IntegrationService:
    """Outbound CRM integrations triggered after each call.

    Zoho lives in services/crm.py (full OAuth). Salesforce/HubSpot are still
    raw-token integrations and should be migrated to OAuth before public launch.

    NOTE: The previous push_to_webhook (Zapier/Make.com) was removed — it allowed
    arbitrary outbound POSTs with no allowlist, which was a security risk.
    Add it back behind a verified-URL allowlist if needed.
    """

    @staticmethod
    async def push_to_hubspot(api_key: str, data: dict):
        """Creates a contact/lead in HubSpot."""
        url = "https://api.hubapi.com/crm/v3/objects/contacts"
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "properties": {
                "firstname": "AIxcaller",
                "lastname":  f"Lead_{data['call_id'][:6]}",
                "phone":     data["phone"],
                "description": data["summary"],
            }
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                return response.status_code == 201
        except Exception as e:
            logger.error(f"HubSpot push failed: {e}")
            return False

    @staticmethod
    async def push_to_salesforce(access_token: str, data: dict):
        """Salesforce lead creation. Placeholder — needs OAuth + instance URL."""
        logger.warning("Salesforce push not yet implemented (needs OAuth + instance URL)")
        return False
