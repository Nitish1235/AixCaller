import json
from shared.models import Tenant

class BaseKnowledgeProvider:
    async def query(self, query: str) -> str:
        raise NotImplementedError

class NotionProvider(BaseKnowledgeProvider):
    def __init__(self, token: str):
        self.token = token

    async def query(self, query: str) -> str:
        # Stub implementation – real integration would call Notion API
        return f"[Notion] No results for '{query}'"

class KnowledgeService:
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.providers = []
        # Load configured providers from tenant.kb_providers JSON
        for cfg in tenant.kb_providers.values():
            ptype = cfg.get('type')
            token = cfg.get('token')
            if ptype == 'notion' and token:
                self.providers.append(NotionProvider(token))
            # Add other provider types here as needed

    async def lookup(self, query: str) -> str:
        if not self.providers:
            return "No knowledge base providers configured."
        # Simple first‑provider strategy
        result = await self.providers[0].query(query)
        return result
