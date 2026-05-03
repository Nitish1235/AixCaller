import httpx
from loguru import logger

class IntegrationService:
    @staticmethod
    async def push_to_hubspot(api_key: str, data: dict):
        """
        Creates a contact/lead in HubSpot.
        """
        url = "https://api.hubapi.com/crm/v3/objects/contacts"
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "properties": {
                "firstname": "AIxcaller",
                "lastname": f"Lead_{data['call_id'][:6]}",
                "phone": data["phone"],
                "description": data["summary"]
            }
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=payload)
            return response.status_code == 201

    @staticmethod
    async def push_to_webhook(webhook_url: str, data: dict):
        """
        Sends call data to a custom webhook (Zapier/Make.com).
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=data)
            return response.status_code < 300

    @staticmethod
    async def push_to_salesforce(access_token: str, data: dict):
        """
        Creates a lead in Salesforce.
        """
        # Note: Salesforce requires an Instance URL usually found during OAuth
        # This is a simplified version
        url = "/services/data/v52.0/sobjects/Lead"
        headers = {"Authorization": f"Bearer {access_token}"}
        payload = {
            "LastName": f"AIxcaller_{data['call_id'][:6]}",
            "Company": "AIxcaller Potential Lead",
            "Phone": data["phone"],
            "Description": data["summary"]
        }
        # In production, we'd use the tenant's specific instance URL
        pass
