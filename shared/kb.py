"""
AIxCaller Knowledge Base — Native Telnyx Similarity Search RAG
=====================================================
Clean, high-performance implementation:
  - Telnyx Embeddings & Similarity Search APIs.
  - No local vector storage or pgvector cosine similarity overhead.
  - In-process LRU cache for repeated identical queries within a call session.
"""
import os
import time
import uuid
import hashlib
import httpx
from typing import List, Optional
from collections import OrderedDict
from loguru import logger

# ── In-process LRU result cache (per-instance fallback) ─────────────────────
# Prevents hitting Telnyx for the exact same query within 5 minutes.
_RESULT_CACHE_SIZE = 300
_RESULT_TTL_SECONDS = 300
_result_cache: "OrderedDict[str, tuple[float, str]]" = OrderedDict()


def _cache_key(agent_id: uuid.UUID, query: str) -> str:
    return hashlib.md5(f"{agent_id}:{query.lower().strip()}".encode()).hexdigest()


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Embed a batch of texts using Telnyx's OpenAI-compatible Embeddings API.
    """
    if not texts:
        return []
    
    api_key = os.environ.get("TELNYX_API_KEY")
    if not api_key:
        logger.error("Missing TELNYX_API_KEY — cannot generate embeddings")
        return [[] for _ in texts]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "BAAI/bge-large-en-v1.5",
        "input": texts
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.telnyx.com/v2/ai/openai/embeddings",
                headers=headers,
                json=payload,
                timeout=20.0
            )
            if response.status_code != 200:
                logger.error(f"Telnyx embedding API failed: {response.status_code} - {response.text}")
                return [[] for _ in texts]
            
            resp_json = response.json()
            return [item["embedding"] for item in resp_json.get("data", [])]
        except Exception as e:
            logger.error(f"Telnyx embedding error: {e}")
            return [[] for _ in texts]


async def search_knowledge_base(
    query: str,
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    limit: int = 3,
) -> Optional[str]:
    """
    Search the agent's knowledge base semantically using Telnyx's native Similarity Search API.

    Includes a 5-minute in-process LRU cache to avoid repeated expensive calls
    for the same query within a call session.

    Returns:
        Formatted string of KB results for LLM context injection,
        or None if no documents are found.
    """
    total_start = time.time()
    bucket_name = f"aixcaller-agent-{str(agent_id).lower()}"

    # ── In-process LRU cache ─────────────────────────────────────────────────
    cache_key = _cache_key(agent_id, query)
    if cache_key in _result_cache:
        cached_at, cached_result = _result_cache[cache_key]
        if time.time() - cached_at < _RESULT_TTL_SECONDS:
            _result_cache.move_to_end(cache_key)
            logger.info(f"⚡ KB cache HIT ({(time.time() - total_start) * 1000:.0f}ms)")
            return cached_result
        else:
            del _result_cache[cache_key]

    # ── Query Telnyx similarity-search ─────────────────────────────────────────
    api_key = os.environ.get("TELNYX_API_KEY")
    if not api_key:
        logger.error("Missing TELNYX_API_KEY — cannot perform similarity search")
        return "No relevant information found in the knowledge base."

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "bucket_name": bucket_name,
        "query": query,
        "num_docs": limit
    }

    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Querying Telnyx native similarity search on bucket {bucket_name}...")
            response = await client.post(
                "https://api.telnyx.com/v2/ai/embeddings/similarity-search",
                headers=headers,
                json=payload,
                timeout=15.0
            )
            
            if response.status_code != 200:
                logger.error(f"Telnyx similarity-search failed: {response.status_code} - {response.text}")
                return "No relevant information found in the knowledge base."

            resp_json = response.json()
            data = resp_json.get("data", [])

            if not data:
                logger.warning(f"Telnyx similarity-search returned no results for: {query[:60]!r}")
                return "No relevant information found in the knowledge base."

            # Format retrieved document chunks into clean context blocks
            parts = []
            for i, item in enumerate(data):
                content = item.get("document_chunk", "")
                metadata = item.get("metadata", {}) or {}
                source = metadata.get("source", "knowledge_base")
                filename = metadata.get("filename", "")

                source_tag = f" (source: {source or filename})" if source or filename else ""
                parts.append(f"[{i + 1}]{source_tag}\n{content}")

            formatted = "\n\n---\n\n".join(parts)
            formatted_result = (
                f"KNOWLEDGE BASE RESULTS — use this to answer accurately:\n\n"
                f"{formatted}\n\n"
                f"---\nAnswer based only on the above information."
            )

            # Cache the formatted result
            _result_cache[cache_key] = (time.time(), formatted_result)
            if len(_result_cache) > _RESULT_CACHE_SIZE:
                _result_cache.popitem(last=False)

            logger.info(f"KB similarity-search complete: {(time.time() - total_start) * 1000:.0f}ms")
            return formatted_result

        except Exception as e:
            logger.error(f"Exception during Telnyx similarity-search: {e}")
            return "No relevant information found in the knowledge base."
