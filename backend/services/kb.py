import os
import uuid
from typing import List
from openai import AsyncOpenAI
from sqlmodel import Session, select
from sqlalchemy import text
from loguru import logger
from shared.database import engine
from shared.models import KnowledgeChunk

# Chunk size: 400 words, 50-word overlap keeps context across chunk boundaries
CHUNK_SIZE = 400
CHUNK_OVERLAP = 50
EMBEDDING_MODEL = "text-embedding-3-small"  # 1536 dims, cheap & fast


def _split_into_chunks(text: str) -> List[str]:
    """Split text into overlapping word chunks."""
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = min(start + CHUNK_SIZE, len(words))
        chunks.append(" ".join(words[start:end]))
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return [c for c in chunks if len(c.strip()) > 20]  # skip tiny chunks


async def _get_embeddings(texts: List[str]) -> List[List[float]]:
    """Call OpenAI Embeddings API and return vectors."""
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts
    )
    return [item.embedding for item in response.data]


class IngestionService:
    """Handles ingesting text into pgvector knowledge base."""

    async def ingest_text(
        self,
        content: str,
        tenant_id: uuid.UUID,
        agent_id: uuid.UUID,
        source: str = "manual"
    ) -> int:
        """
        Split content into chunks, embed them, and store in pgvector.
        Returns the number of chunks stored.
        """
        chunks = _split_into_chunks(content)
        if not chunks:
            logger.warning("No valid chunks extracted from content.")
            return 0

        logger.info(f"Embedding {len(chunks)} chunks for agent {agent_id}...")
        embeddings = await _get_embeddings(chunks)

        with Session(engine) as db:
            for chunk_text, embedding in zip(chunks, embeddings):
                chunk = KnowledgeChunk(
                    tenant_id=tenant_id,
                    agent_id=agent_id,
                    content=chunk_text,
                    source=source,
                    embedding=embedding
                )
                db.add(chunk)
            db.commit()

        logger.info(f"Stored {len(chunks)} chunks for agent {agent_id}.")
        return len(chunks)

    async def delete_agent_kb(self, agent_id: uuid.UUID):
        """Delete all knowledge base chunks for a specific agent."""
        with Session(engine) as db:
            chunks = db.exec(
                select(KnowledgeChunk).where(KnowledgeChunk.agent_id == agent_id)
            ).all()
            for chunk in chunks:
                db.delete(chunk)
            db.commit()
        logger.info(f"Deleted KB for agent {agent_id}.")


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
