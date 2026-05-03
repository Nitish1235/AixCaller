import httpx
from loguru import logger

async def check_order_status(order_number: str, config: dict):
    """
    Checks the real-time status of a Shopify order.
    """
    store_url = config.get("store_url")
    token = config.get("access_token")
    
    if not store_url or not token:
        return "I'm sorry, my connection to the store is currently misconfigured."
        
    url = f"https://{store_url}/admin/api/2024-01/orders.json?name={order_number}&status=any"
    headers = {"X-Shopify-Access-Token": token}
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                if not data.get("orders"):
                    return f"I couldn't find an order matching {order_number}."
                
                order = data["orders"][0]
                fulfillment_status = order.get("fulfillment_status") or "unfulfilled"
                financial_status = order.get("financial_status")
                
                return f"Your order {order_number} is currently {fulfillment_status} and the payment is {financial_status}."
            else:
                return "I'm having trouble reaching the store system right now."
    except Exception as e:
        logger.error(f"Shopify Tool Error: {e}")
        return "I encountered an error checking your order."
