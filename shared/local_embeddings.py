"""
Local sentence-transformers embeddings using all-MiniLM-L6-v2.

Why local?
  - 5-10ms per query vs 150-300ms for OpenAI API (network hop saved)
  - $0 ongoing cost vs OpenAI embedding fees
  - No rate limits
  - Works offline

Model details:
  - all-MiniLM-L6-v2 is ~80MB, 384-dim output
  - Trained on 1B+ sentence pairs, MTEB score ~58
  - Quality is slightly below OpenAI text-embedding-3-small (~63) but
    perfectly adequate for FAQ-style voice agent KBs

Loaded ONCE per process at startup (via preload.py).
"""
from typing import List, Optional
from loguru import logger

EMBEDDING_DIM = 384
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model = None


def get_model():
    """Lazy-load the SentenceTransformer model. Thread-safe enough for our use."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading local embedding model: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME, device="cpu")
            logger.info(f"✅ Loaded {MODEL_NAME} ({EMBEDDING_DIM} dims)")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts. Returns list of 384-dim vectors."""
    model = get_model()
    # normalize_embeddings=True is critical for cosine-similarity search
    embeddings = model.encode(
        texts,
        normalize_embeddings=True,
        show_progress_bar=False,
        batch_size=32,
    )
    return embeddings.tolist()


def embed_query(query: str) -> List[float]:
    """Embed a single query. Faster path than embed_texts for single inputs."""
    return embed_texts([query])[0]


async def async_embed_query(query: str) -> List[float]:
    """Async-friendly wrapper — runs the embedding in a thread to avoid blocking the event loop."""
    import asyncio
    return await asyncio.to_thread(embed_query, query)


async def async_embed_texts(texts: List[str]) -> List[List[float]]:
    """Async batch embeddings."""
    import asyncio
    return await asyncio.to_thread(embed_texts, texts)
