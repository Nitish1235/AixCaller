import httpx
import os
from loguru import logger

class ZohoCRMService:
    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = "https://www.zohoapis.com/crm/v2"

    async def create_lead(self, last_name: str, company: str, email: str = None, phone: str = None):
        """
        Creates a new lead in Zoho CRM.
        """
        url = f"{self.base_url}/Leads"
        headers = {"Authorization": f"Zoho-oauthtoken {self.access_token}"}
        data = {
            "data": [
                {
                    "Last_Name": last_name,
                    "Company": company,
                    "Email": email,
                    "Phone": phone,
                    "Lead_Source": "AIxcaller"
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=data)
            if response.status_code == 201:
                return {"status": "success", "message": "Lead created in Zoho"}
            return {"status": "error", "message": response.text}

    async def search_contact(self, phone: str):
        """
        Search for a contact by phone number in Zoho.
        """
        url = f"{self.base_url}/Contacts/search?phone={phone}"
        headers = {"Authorization": f"Zoho-oauthtoken {self.access_token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if data.get("data"):
                    return {"status": "found", "contact": data["data"][0]}
            return {"status": "not_found"}
