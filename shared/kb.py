import os
import uuid
from typing import List
from openai import AsyncOpenAI
from sqlmodel import Session
from sqlalchemy import text
from loguru import logger
from .database import engine

EMBEDDING_MODEL = "text-embedding-3-small"

async def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Call OpenAI Embeddings API and return vectors."""
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts
    )
    return [item.embedding for item in response.data]

async def search_knowledge_base(
    query: str,
    tenant_id: uuid.UUID,
    agent_id: uuid.UUID,
    limit: int = 3
) -> str:
    """
    Semantic search via pgvector cosine similarity.
    Returns the top matching chunks as a single string for LLM context injection.
    """
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    embed_response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query]
    )
    query_vector = embed_response.data[0].embedding

    # Format as pgvector literal
    vector_str = "[" + ",".join(str(x) for x in query_vector) + "]"

    with Session(engine) as db:
        rows = db.exec(
            text("""
                SELECT content
                FROM knowledge_chunks
                WHERE agent_id = :agent_id
                  AND tenant_id = :tenant_id
                ORDER BY embedding <=> :query_vec
                LIMIT :limit
            """),
            params={
                "agent_id": str(agent_id),
                "tenant_id": str(tenant_id),
                "query_vec": vector_str,
                "limit": limit
            }
        ).fetchall()

    if not rows:
        return "No relevant information found in the knowledge base."

    return "\n\n".join(row[0] for row in rows)
