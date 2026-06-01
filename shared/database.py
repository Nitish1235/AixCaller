"""
AIxCaller — Database Engine & Initialization
=============================================
PostgreSQL (Supabase) + pgvector.

DATABASE_URL         = Transaction Pooler (port 6543) — runtime queries
DATABASE_DIRECT_URL  = Direct Connection (port 5432)  — migrations only
"""
import os
from sqlmodel import SQLModel, create_engine, text, Session
from loguru import logger

# Import all models so SQLModel.metadata is fully populated
from shared.models import Tenant, Agent, KnowledgeChunk, CallRecord, Lead, SystemSettings, Campaign, CampaignLead, DNCList, PhonePool

DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_DIRECT_URL = os.getenv("DATABASE_DIRECT_URL", DATABASE_URL)

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set.")

# ── Runtime engine — Transaction Pooler ──────────────────────────────────────
# Sized for concurrent AI calls + KB queries running in parallel.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20,
    pool_timeout=5,         # fail fast — don't block voice path
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10,
        "application_name": "aixcaller-backend",
    }
)


def init_db():
    """
    Creates the pgvector extension, all tables, and performance indexes.

    Run ONCE at first deploy using the DIRECT URL (not the Transaction Pooler).
    The Pooler does not support DDL reliably.

    Usage:
        DATABASE_DIRECT_URL=<direct_url> python -c "from shared.database import init_db; init_db()"
    """
    logger.info("Initializing database...")

    init_engine = create_engine(
        DATABASE_DIRECT_URL,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 30,
        }
    )

    with init_engine.connect() as conn:
        logger.info("Initializing connection (pgvector no longer required).")

    # 2. Create all SQLModel tables
    SQLModel.metadata.create_all(init_engine)
    logger.info("All tables created.")

    with init_engine.connect() as conn:
        # 3. Composite B-tree index for fast WHERE filtering
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS knowledge_chunks_agent_tenant_idx
            ON knowledge_chunks (agent_id, tenant_id);
        """))
        conn.commit()
        logger.info("Composite (agent_id, tenant_id) B-tree index created.")

        # 5. Index for call history dashboard queries
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS callrecord_tenant_created_idx
            ON callrecord (tenant_id, created_at DESC);
        """))
        conn.commit()
        logger.info("CallRecord (tenant_id, created_at) index created.")

        # ── Campaign / dialer performance indexes ────────────────────────────
        # These are hit on every cron tick and every webhook — critical at scale.

        # 6. Dialer main query: pick pending leads for a campaign ordered by score
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS campaignlead_dial_queue_idx
            ON campaignlead (campaign_id, status, lead_score DESC, next_retry_at)
            WHERE status = 'pending' AND opted_out = FALSE;
        """))
        conn.commit()
        logger.info("CampaignLead dial-queue index created.")

        # 7. Count in-progress leads per campaign (concurrency check)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS campaignlead_inprogress_idx
            ON campaignlead (campaign_id, status)
            WHERE status = 'in_progress';
        """))
        conn.commit()
        logger.info("CampaignLead in-progress index created.")

        # 8. reconcile_stuck_calls: find old in-progress leads
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS campaignlead_updated_status_idx
            ON campaignlead (status, updated_at)
            WHERE status = 'in_progress';
        """))
        conn.commit()
        logger.info("CampaignLead (status, updated_at) index created.")

        # 9. Active campaigns lookup for dialer engine and scheduled-campaign check
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS campaign_tenant_status_idx
            ON campaign (tenant_id, status);
        """))
        conn.commit()
        logger.info("Campaign (tenant_id, status) index created.")

        # 10. Reminder engine: find leads with upcoming appointments
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS campaignlead_appointment_idx
            ON campaignlead (appointment_datetime, status)
            WHERE appointment_datetime IS NOT NULL AND opted_out = FALSE;
        """))
        conn.commit()
        logger.info("CampaignLead appointment index created.")

        # 11. Call deduplication: look up call by call_control_id quickly
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS callrecord_call_control_id_idx
            ON callrecord (call_control_id)
            WHERE call_control_id IS NOT NULL;
        """))
        conn.commit()
        logger.info("CallRecord call_control_id index created.")

        # 12. Agent lookup by phone_number (inbound call routing — hot path)
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS agent_phone_number_idx
            ON agent (phone_number)
            WHERE phone_number IS NOT NULL;
        """))
        conn.commit()
        logger.info("Agent phone_number index created.")

    logger.info("Database initialization complete.")


def get_db():
    """FastAPI dependency — provides a scoped database session."""
    with Session(engine) as session:
        yield session


if __name__ == "__main__":
    init_db()
