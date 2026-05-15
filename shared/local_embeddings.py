"""
Local embeddings using FastEmbed (all-MiniLM-L6-v2).

Why FastEmbed?
  - Uses ONNX Runtime: ~150MB RAM vs ~500MB+ for PyTorch
  - Perfect for memory-constrained environments like Cloud Run (512MB tier)
  - 5-10ms per query (comparable to sentence-transformers)
  - $0 ongoing cost
  - No rate limits

Model details:
  - all-MiniLM-L6-v2 is ~80MB, 384-dim output
"""
from typing import List, Optional
from loguru import logger

EMBEDDING_DIM = 384
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model = None


def get_model():
    """Lazy-load the FastEmbed model. Much lighter than sentence-transformers."""
    global _model
    if _model is None:
        try:
            from fastembed import TextEmbedding
            logger.info(f"Loading local embedding model: {MODEL_NAME}")
            # FastEmbed uses ONNX for ~150MB memory footprint vs ~500MB+ for torch
            _model = TextEmbedding(model_name=MODEL_NAME)
            logger.info(f"✅ Loaded {MODEL_NAME} via FastEmbed ({EMBEDDING_DIM} dims)")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts. Returns list of 384-dim vectors."""
    model = get_model()
    # FastEmbed returns an iterator of numpy arrays
    embeddings = list(model.embed(texts))
    return [e.tolist() for e in embeddings]


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
