import os
import time
import uuid
import hashlib
from typing import List
from collections import OrderedDict
from openai import AsyncOpenAI
from sqlmodel import Session
from sqlalchemy import text
from loguru import logger
from shared.database import engine

EMBEDDING_MODEL = "text-embedding-3-small"

# ── In-memory LRU cache for embeddings ──────────────────────────────────────
# Caches up to 500 query embeddings. Same query within process lifetime = no API call.
# This is a HUGE latency win for repeated questions ("what are your hours" gets asked a lot).
_EMBEDDING_CACHE_SIZE = 500
_embedding_cache: "OrderedDict[str, List[float]]" = OrderedDict()

# ── In-memory cache for KB search results (5-min TTL) ───────────────────────
# Same query+agent → same answer for 5 minutes. Saves embedding + DB.
_RESULT_CACHE_SIZE = 200
_RESULT_TTL_SECONDS = 300  # 5 minutes
_result_cache: "OrderedDict[str, tuple[float, str]]" = OrderedDict()

# Global OpenAI client for connection pooling (lazy-loaded inside event loop)
_openai_client = None


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _openai_client


def _cache_key(text: str) -> str:
    """Stable hash for cache lookups — handles long texts cleanly."""
    return hashlib.md5(text.lower().strip().encode()).hexdigest()


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Call OpenAI Embeddings API and return vectors."""
    client = get_openai_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts
    )
    return [item.embedding for item in response.data]


async def _get_query_embedding_cached(query: str) -> List[float]:
    """Get embedding for a single query, with LRU caching."""
    key = _cache_key(query)

    # Cache hit
    if key in _embedding_cache:
        _embedding_cache.move_to_end(key)
        logger.debug(f"KB embedding cache HIT for query: {query[:50]}...")
        return _embedding_cache[key]

    # Cache miss — call OpenAI
    t0 = time.time()
    client = get_openai_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query]
    )
    vector = response.data[0].embedding
    logger.info(f"KB embedding API call: {(time.time() - t0) * 1000:.0f}ms for query: {query[:50]}...")

    # Store in cache (evict oldest if full)
    _embedding_cache[key] = vector
    if len(_embedding_cache) > _EMBEDDING_CACHE_SIZE:
        _embedding_cache.popitem(last=False)
    return vector


async def search_knowledge_base(
    query: str,
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    limit: int = 5  # ← INCREASED from 3 to 5 for better coverage
) -> str:
    """
    Semantic search via pgvector cosine similarity.
    Returns top matching chunks formatted for LLM context injection.
    Uses LRU cache for embeddings + 5-min TTL cache for results.
    """
    total_start = time.time()

    # ── 1. Check result cache first (avoids both embedding + DB) ────────────
    result_key = f"{agent_id}:{_cache_key(query)}"
    if result_key in _result_cache:
        cached_at, cached_result = _result_cache[result_key]
        if time.time() - cached_at < _RESULT_TTL_SECONDS:
            _result_cache.move_to_end(result_key)
            logger.info(f"KB result cache HIT (saved ~{(time.time() - total_start) * 1000:.0f}ms)")
            return cached_result
        else:
            # Expired
            del _result_cache[result_key]

    # ── 2. Get query embedding (cached) ─────────────────────────────────────
    query_vector = await _get_query_embedding_cached(query)

    # Format as pgvector literal string
    vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

    # ── 3. Run pgvector similarity search ───────────────────────────────────
    def _run_db_query():
        db_start = time.time()
        with Session(engine) as db:
            result = db.execute(
                text("""
                    SELECT content, source, embedding <=> CAST(:query_vec AS vector) AS distance
                    FROM knowledge_chunks
                    WHERE agent_id = CAST(:agent_id AS UUID)
                      AND tenant_id = CAST(:tenant_id AS UUID)
                    ORDER BY embedding <=> CAST(:query_vec AS vector)
                    LIMIT :limit
                """).bindparams(
                    agent_id=str(agent_id),
                    tenant_id=str(tenant_id),
                    query_vec=vector_str,
                    limit=limit
                )
            )
            rows = result.fetchall()
            logger.info(f"KB DB query: {(time.time() - db_start) * 1000:.0f}ms, {len(rows)} chunks returned")
            return rows

    import asyncio
    rows = await asyncio.to_thread(_run_db_query)

    if not rows:
        logger.warning(f"KB search returned NO results for query: {query[:50]}... (agent: {agent_id})")
        return "No relevant information found in the knowledge base."

    # ── 4. Format results for the LLM ───────────────────────────────────────
    # Structured format makes it easier for the LLM to use the right info
    formatted_chunks = []
    for i, row in enumerate(rows, 1):
        content = row[0]
        source = row[1] if len(row) > 1 and row[1] else "knowledge_base"
        # Lower distance = higher similarity (cosine distance: 0=identical, 2=opposite)
        formatted_chunks.append(f"[Source {i}] {content}")

    formatted = "\n\n---\n\n".join(formatted_chunks)
    final_result = (
        f"KNOWLEDGE BASE RESULTS (use this information to answer):\n\n"
        f"{formatted}\n\n"
        f"---\nUse the above to answer the user's question accurately and concisely."
    )

    # ── 5. Cache the result ─────────────────────────────────────────────────
    _result_cache[result_key] = (time.time(), final_result)
    if len(_result_cache) > _RESULT_CACHE_SIZE:
        _result_cache.popitem(last=False)

    logger.info(f"KB search TOTAL: {(time.time() - total_start) * 1000:.0f}ms")
    return final_result
