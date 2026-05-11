-- ============================================================================
-- AIxCaller — Schema migration for v2 features (2026-05-11)
-- ============================================================================
-- Run this in your Supabase SQL editor. Safe to run multiple times.
--
-- Changes:
--   1. agent.business_name      — used in greeting
--   2. agent.template_id        — marketplace template id (clinic, ecommerce, ...)
--   3. callrecord.duration_seconds — for plan minute tracking
--   4. tenant.plan_tier         — free | starter | pro | premium
--   5. tenant.minutes_included  — monthly allowance per plan
--   6. tenant.minutes_used      — usage in current cycle
--   7. tenant.subscription_id   — DodoPayments subscription id
--   8. tenant.subscription_status — active | inactive | cancelled | past_due
--   9. tenant.cycle_start, cycle_end — current billing cycle bounds
--  10. knowledge_chunks.embedding — RESIZE from 1536 (OpenAI) to 384 (MiniLM)
--      *** WARNING: This wipes existing embeddings — they must be re-ingested. ***
-- ============================================================================

BEGIN;

-- ── 1-2: Agent fields ────────────────────────────────────────────────────
ALTER TABLE agent ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS template_id  TEXT;

-- ── 3: Call record duration ──────────────────────────────────────────────
ALTER TABLE callrecord ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;

-- ── 4-9: Tenant subscription fields ──────────────────────────────────────
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS plan_tier            TEXT NOT NULL DEFAULT 'free';
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS minutes_included     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS minutes_used         DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS subscription_id      TEXT;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS subscription_status  TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS cycle_start          TIMESTAMP;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS cycle_end            TIMESTAMP;

-- ── 10: Embedding dimension migration (OpenAI 1536 → MiniLM 384) ─────────
-- pgvector doesn't allow ALTER COLUMN TYPE for Vector dims — must drop & recreate.
-- ⚠️  All existing knowledge_chunks rows will be DELETED. Re-ingest after migration.

-- Drop the HNSW index first (it depends on the column)
DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;

-- Wipe existing rows (they are 1536-dim and won't fit the new 384-dim column)
DELETE FROM knowledge_chunks;

-- Resize the column
ALTER TABLE knowledge_chunks
  ALTER COLUMN embedding TYPE vector(384);

-- Recreate the HNSW index for fast cosine search
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index (filter speed-up)
CREATE INDEX IF NOT EXISTS knowledge_chunks_agent_tenant_idx
  ON knowledge_chunks (agent_id, tenant_id);

COMMIT;

-- ============================================================================
-- POST-MIGRATION STEPS:
-- ============================================================================
-- 1. Have each tenant re-upload their knowledge base content from the dashboard
--    (or run a backfill script that re-embeds from `source` URLs).
-- 2. Set DodoPayments product IDs in env vars on backend Cloud Run:
--      DODO_PRODUCT_STARTER  = "prod_xxxx"   (matching $50 / 200min)
--      DODO_PRODUCT_PRO      = "prod_yyyy"   (matching $119 / 500min)
--      DODO_PRODUCT_PREMIUM  = "prod_zzzz"   (matching $250 / 1100min)
-- 3. Set up the DodoPayments webhook to POST to:
--      https://<your-backend-url>/api/v1/billing/webhook
-- ============================================================================
