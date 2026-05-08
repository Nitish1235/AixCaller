import asyncio
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

from shared.kb import search_knowledge_base

async def test():
    print("Testing knowledge base search...")
    # Generate dummy UUIDs just to see if it connects and queries without error
    agent_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    
    try:
        res = await search_knowledge_base('business name', tenant_id, agent_id)
        print("RESULT:")
        print(res)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(test())
