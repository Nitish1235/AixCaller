import httpx
from loguru import logger

async def fetch_custom_data(query: str, config: dict):
    """
    A universal tool to hit any REST API provided by the user.
    """
    endpoint = config.get("endpoint")
    headers = config.get("headers", {})
    method = config.get("method", "GET").upper()
    
    if not endpoint:
        return "Custom tool misconfigured. Missing endpoint."
        
    try:
        async with httpx.AsyncClient() as client:
            if method == "GET":
                response = await client.get(f"{endpoint}?query={query}", headers=headers)
            else:
                response = await client.post(endpoint, headers=headers, json={"query": query})
                
            if response.status_code < 300:
                # Limit the response length so the AI doesn't read a massive JSON blob aloud
                text = response.text[:300] 
                return f"Here is the raw data I found: {text}. Please summarize it for the user."
            else:
                return f"The custom system returned an error: Status {response.status_code}."
    except Exception as e:
        logger.error(f"Custom API Tool Error: {e}")
        return "I couldn't connect to the internal system right now."
