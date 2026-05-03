import os
from sqlmodel import SQLModel, create_engine, text
from sqlalchemy import event
from loguru import logger
from .models import Tenant, Agent, CallRecord, VoiceOption, KnowledgeChunk

# ------------------------------------------------------------------
# Supabase PostgreSQL + pgvector
#
# DATABASE_URL      = Transaction Pooler (port 6543) — runtime queries
# DATABASE_DIRECT_URL = Direct Connection (port 5432) — migrations only
# ------------------------------------------------------------------

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_DIRECT_URL = os.getenv("DATABASE_DIRECT_URL", DATABASE_URL)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

# Runtime engine — Transaction Pooler for Cloud Run
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10,
        "application_name": "aixcaller-backend",
    }
)


def init_db():
    """
    Creates the pgvector extension, all tables, and the HNSW vector index.
    Run ONCE at first deploy using the DIRECT URL (not the Pooler).
    """
    logger.info("Initializing database with pgvector...")

    init_engine = create_engine(
        DATABASE_DIRECT_URL,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 30,
        }
    )

    with init_engine.connect() as conn:
        # 1. Enable pgvector extension (Supabase has it pre-installed)
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
        logger.info("pgvector extension enabled.")

    # 2. Create all SQLModel tables
    SQLModel.metadata.create_all(init_engine)
    logger.info("All tables created.")

    with init_engine.connect() as conn:
        # 3. Create HNSW index for fast approximate nearest-neighbor search
        # m=16, ef_construction=64 are good defaults for this scale
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
            ON knowledge_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64);
        """))
        conn.commit()
        logger.info("HNSW vector index created on knowledge_chunks.")

    logger.info("Database initialization complete.")


if __name__ == "__main__":
    init_db()
