import os
import time
import uuid
import hashlib
from typing import List, Optional
from collections import OrderedDict
from sqlmodel import Session
from sqlalchemy import text
from loguru import logger
from shared.database import engine
from shared.cache import (
    get_exact_cache,
    set_exact_cache,
    get_hot_kb,
    set_hot_kb,
)
from shared.local_embeddings import (
    async_embed_query,
    async_embed_texts,
    EMBEDDING_DIM,
)

# Local MiniLM model — 384 dims, ~5-10ms per query, $0 ongoing cost
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# ── In-memory LRU cache for embeddings (per-instance) ──────────────────────
# Cuts OpenAI embedding calls for repeated queries within an instance.
_EMBEDDING_CACHE_SIZE = 500
_embedding_cache: "OrderedDict[str, List[float]]" = OrderedDict()

# ── In-memory LRU cache for full search results (per-instance fallback) ────
_RESULT_CACHE_SIZE = 200
_RESULT_TTL_SECONDS = 300
_result_cache: "OrderedDict[str, tuple[float, str]]" = OrderedDict()

_openai_client = None


def get_openai_client():
    """OpenAI client retained for analytics/LLM use cases (NOT embeddings)."""
    global _openai_client
    if _openai_client is None:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    return _openai_client


def _cache_key(text: str) -> str:
    return hashlib.md5(text.lower().strip().encode()).hexdigest()


async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Local MiniLM batch embeddings (replaces OpenAI text-embedding-3-small)."""
    return await async_embed_texts(texts)


async def _get_query_embedding_cached(query: str) -> List[float]:
    """Get embedding for a single query, with LRU caching.

    Uses local MiniLM — ~5-10ms per uncached call (vs 150-300ms for OpenAI API).
    Cached lookups are ~0.1ms.
    """
    key = _cache_key(query)

    if key in _embedding_cache:
        _embedding_cache.move_to_end(key)
        logger.debug(f"KB embedding cache HIT for: {query[:50]}...")
        return _embedding_cache[key]

    t0 = time.time()
    vector = await async_embed_query(query)
    logger.info(f"KB MiniLM embed: {(time.time() - t0) * 1000:.0f}ms for: {query[:50]}...")

    _embedding_cache[key] = vector
    if len(_embedding_cache) > _EMBEDDING_CACHE_SIZE:
        _embedding_cache.popitem(last=False)
    return vector


def _format_chunks_for_llm(chunks: List[dict]) -> str:
    """Standard format for LLM context injection."""
    if not chunks:
        return "No relevant information found in the knowledge base."
    formatted = "\n\n---\n\n".join(
        f"[Source {i+1}] {c['content']}" for i, c in enumerate(chunks)
    )
    return (
        f"KNOWLEDGE BASE RESULTS (use this information to answer):\n\n"
        f"{formatted}\n\n"
        f"---\nUse the above to answer the user's question accurately and concisely."
    )


async def _vector_search(
    query_vector: List[float],
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    limit: int = 5,
) -> List[dict]:
    """Run pgvector cosine similarity search. Returns list of {content, source, distance}."""
    vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

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
                    limit=limit,
                )
            )
            rows = result.fetchall()
            logger.info(f"KB DB query: {(time.time() - db_start) * 1000:.0f}ms, {len(rows)} chunks")
            return rows

    import asyncio
    rows = await asyncio.to_thread(_run_db_query)
    return [
        {"content": row[0], "source": row[1] or "knowledge_base", "distance": float(row[2])}
        for row in rows
    ]


# ════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ════════════════════════════════════════════════════════════════════════════

# L3 distance threshold — higher = more lenient cache hits.
# 0.5 was too strict (only ~30% hit rate on basic questions).
# 0.7 covers most variations of "business name", "hours", "services", etc.
HOT_KB_DISTANCE_THRESHOLD = 0.7


async def search_knowledge_base(
    query: str,
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    limit: int = 5,
    fast_only: bool = False,
) -> "str | None":
    """
    Multi-layer KB search:
      L1: Redis exact-match cache (1ms)        ← if cached
      L2: In-memory result cache (1ms)         ← per-instance fallback
      L3: Hot KB pre-warmed chunks (5-10ms)   ← matches basic FAQ-type questions
      L4: Full pgvector search (700ms)         ← last resort, only if fast_only=False

    Args:
        fast_only: If True, only checks L1/L2/L3 (all <50ms).
                   Returns None on cache miss instead of falling through to L4.
                   Use this to decide whether to play a filler phrase before
                   the expensive L4 search.

    Returns:
        Formatted KB string for LLM, or None if fast_only=True and all caches missed.
    """
    total_start = time.time()
    agent_id_str = str(agent_id)

    # ── Layer 1: Redis exact-match cache ──────────────────────────────────
    redis_cached = await get_exact_cache(agent_id_str, query)
    if redis_cached:
        logger.info(f"⚡ L1 Redis exact-match HIT ({(time.time() - total_start) * 1000:.0f}ms)")
        return redis_cached

    # ── Layer 2: In-memory result cache (per-instance) ────────────────────
    mem_key = f"{agent_id}:{_cache_key(query)}"
    if mem_key in _result_cache:
        cached_at, cached_result = _result_cache[mem_key]
        if time.time() - cached_at < _RESULT_TTL_SECONDS:
            _result_cache.move_to_end(mem_key)
            logger.info(f"⚡ L2 in-memory HIT ({(time.time() - total_start) * 1000:.0f}ms)")
            await set_exact_cache(agent_id_str, query, cached_result)
            return cached_result
        else:
            del _result_cache[mem_key]

    # ── Layer 3: Hot KB (pre-warmed at call start) ────────────────────────
    hot_chunks = await get_hot_kb(agent_id_str)
    if hot_chunks:
        query_vector = await _get_query_embedding_cached(query)
        try:
            scored = [
                (_cosine_distance(query_vector, c["embedding"]), c)
                for c in hot_chunks
                if "embedding" in c
            ]
            scored.sort(key=lambda x: x[0])
            top = [c for dist, c in scored[:limit] if dist < HOT_KB_DISTANCE_THRESHOLD]
            if top:
                formatted = _format_chunks_for_llm(top)
                logger.info(f"🔥 L3 Hot KB HIT ({(time.time() - total_start) * 1000:.0f}ms, top dist: {scored[0][0]:.3f})")
                await set_exact_cache(agent_id_str, query, formatted)
                _result_cache[mem_key] = (time.time(), formatted)
                return formatted
            else:
                logger.info(f"L3 Hot KB no good match (best dist: {scored[0][0]:.3f})")
        except Exception as e:
            logger.warning(f"Hot KB ranking failed: {e}, falling through")

    # ── Fast-only mode: return None to signal cache miss (no L4 fallback) ─
    if fast_only:
        logger.info(f"Fast-only mode: cache miss in {(time.time() - total_start) * 1000:.0f}ms, returning None")
        return None

    # ── Layer 4: Full pgvector search (the slow path) ─────────────────────
    query_vector = await _get_query_embedding_cached(query)
    chunks = await _vector_search(query_vector, tenant_id, agent_id, limit)

    if not chunks:
        logger.warning(f"KB search returned NO results for: {query[:50]}...")
        return "No relevant information found in the knowledge base."

    formatted = _format_chunks_for_llm(chunks)

    await set_exact_cache(agent_id_str, query, formatted)
    _result_cache[mem_key] = (time.time(), formatted)
    if len(_result_cache) > _RESULT_CACHE_SIZE:
        _result_cache.popitem(last=False)

    logger.info(f"L4 Full KB search done ({(time.time() - total_start) * 1000:.0f}ms)")
    return formatted


async def prewarm_hot_kb(
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    chunks_per_query: int = 7,
) -> int:
    """
    Pre-warm the hot KB cache for an agent at call start.
    Runs 3 broad queries in parallel and caches the deduplicated top chunks.

    Adapts to ANY business type — no hard-coded categories.
    Returns the number of unique chunks cached.
    """
    import asyncio
    t0 = time.time()
    agent_id_str = str(agent_id)

    # Three broad queries that cover the typical "first questions" any caller asks
    seed_queries = [
        "general business overview information about company",
        "services products offered pricing packages",
        "contact location hours availability schedule",
    ]

    try:
        # Embed all 3 broad queries locally via MiniLM (one batch call)
        vectors = await async_embed_texts(seed_queries)

        # Run all 3 vector searches in parallel
        results = await asyncio.gather(*[
            _vector_search(v, tenant_id, agent_id, chunks_per_query)
            for v in vectors
        ])

        # Deduplicate by content hash, keep best distance
        seen: dict[str, dict] = {}
        for chunk_list in results:
            for chunk in chunk_list:
                content_hash = hashlib.md5(chunk["content"].encode()).hexdigest()
                if content_hash not in seen or chunk["distance"] < seen[content_hash]["distance"]:
                    seen[content_hash] = chunk

        # Attach embeddings to each chunk so we can re-rank locally on user queries
        unique_chunks = list(seen.values())

        # Re-embed the unique chunks locally for L3 re-ranking
        contents = [c["content"] for c in unique_chunks]
        if contents:
            chunk_vectors = await async_embed_texts(contents)
            for c, vec in zip(unique_chunks, chunk_vectors):
                c["embedding"] = vec

        await set_hot_kb(agent_id_str, unique_chunks)
        logger.info(
            f"🔥 Hot KB pre-warm complete: {len(unique_chunks)} chunks "
            f"in {(time.time() - t0) * 1000:.0f}ms"
        )
        return len(unique_chunks)
    except Exception as e:
        logger.error(f"Hot KB pre-warm failed: {e}")
        return 0


def _cosine_distance(a: List[float], b: List[float]) -> float:
    """Cosine distance (0=identical, 2=opposite). Pure Python — no numpy needed."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 2.0
    return 1.0 - (dot / (norm_a * norm_b))
