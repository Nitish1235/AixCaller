"""
Redis cache layer for KB results & pre-warmed hot KB.

Architecture:
- Layer 1 (Exact Match):  kb:exact:{agent_id}:{md5(query)} → JSON KB result
- Layer 3 (Hot KB):       kb:hot:{agent_id}              → JSON list of top chunks

Uses Upstash Redis (or any Redis with TLS) via redis.asyncio.
Falls back gracefully if Redis is unavailable — KB search still works.
"""
import os
import json
import hashlib
from typing import Optional, List
from loguru import logger

try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("redis package not installed — Redis cache disabled")

# ── Configuration ───────────────────────────────────────────────────────────
REDIS_URL = os.environ.get("REDIS_URL", "")
EXACT_CACHE_TTL = 3600       # 1 hour for exact-match cache
HOT_KB_TTL = 1800            # 30 min for pre-warmed hot KB

_redis_client: Optional["redis.Redis"] = None


def _normalize_query(query: str) -> str:
    """Lowercase + strip + collapse whitespace for stable cache keys."""
    return " ".join(query.lower().strip().split())


def _exact_key(agent_id: str, query: str) -> str:
    """Cache key for exact-match lookup."""
    digest = hashlib.md5(_normalize_query(query).encode()).hexdigest()
    return f"kb:exact:{agent_id}:{digest}"


def _hot_kb_key(agent_id: str) -> str:
    """Cache key for pre-warmed hot KB chunks."""
    return f"kb:hot:{agent_id}"


def get_redis() -> Optional["redis.Redis"]:
    """Lazy-init Redis client. Returns None if Redis isn't configured/available."""
    global _redis_client
    if not REDIS_AVAILABLE or not REDIS_URL:
        return None
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_timeout=2,         # fail fast — never block voice path
                socket_connect_timeout=2,
                retry_on_timeout=False,
            )
            logger.info("Redis client initialized")
        except Exception as e:
            logger.error(f"Redis init failed: {e}")
            return None
    return _redis_client


# ── Layer 1: Exact-match cache ─────────────────────────────────────────────
async def get_exact_cache(agent_id: str, query: str) -> Optional[str]:
    """Look up a previous KB result for this exact (normalized) query."""
    client = get_redis()
    if not client:
        return None
    try:
        return await client.get(_exact_key(agent_id, query))
    except Exception as e:
        logger.debug(f"Redis GET miss (graceful): {e}")
        return None


async def set_exact_cache(agent_id: str, query: str, result: str) -> None:
    """Store a KB result for future exact-match lookups."""
    client = get_redis()
    if not client:
        return
    try:
        await client.setex(_exact_key(agent_id, query), EXACT_CACHE_TTL, result)
    except Exception as e:
        logger.debug(f"Redis SET miss (graceful): {e}")


# ── Layer 3: Hot KB pre-warm ───────────────────────────────────────────────
async def get_hot_kb(agent_id: str) -> Optional[List[dict]]:
    """Get the pre-warmed hot KB chunks for this agent (loaded at call start)."""
    client = get_redis()
    if not client:
        return None
    try:
        raw = await client.get(_hot_kb_key(agent_id))
        if not raw:
            return None
        return json.loads(raw)
    except Exception as e:
        logger.debug(f"Redis hot KB miss (graceful): {e}")
        return None


async def set_hot_kb(agent_id: str, chunks: List[dict]) -> None:
    """Store the pre-warmed hot KB chunks (called at call start)."""
    client = get_redis()
    if not client:
        return
    try:
        await client.setex(_hot_kb_key(agent_id), HOT_KB_TTL, json.dumps(chunks))
        logger.info(f"🔥 Hot KB prewarmed: {len(chunks)} chunks for agent {agent_id}")
    except Exception as e:
        logger.debug(f"Redis hot KB SET failed (graceful): {e}")


async def close_redis():
    """Cleanup on shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
