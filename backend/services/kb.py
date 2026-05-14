import os
import uuid
from typing import List
from sqlmodel import Session, select
from sqlalchemy import text
from loguru import logger
from shared.database import engine
from shared.models import KnowledgeChunk

# get_embeddings now uses local MiniLM (see shared/local_embeddings.py)
from shared.kb import get_embeddings as _get_embeddings, search_knowledge_base

# Chunk size: 400 words, 50-word overlap keeps context across chunk boundaries
CHUNK_SIZE = 400
CHUNK_OVERLAP = 50

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
            db.execute(
                text("DELETE FROM knowledge_chunks WHERE agent_id = CAST(:agent_id AS UUID)"),
                {"agent_id": str(agent_id)}
            )
            db.commit()
        logger.info(f"Deleted KB for agent {agent_id}.")
