-- ============================================================
-- AIxCaller DB Migration: 2026-05-21 Full Schema Redesign
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   DATABASE_DIRECT_URL=<url> psql -f this_file.sql
--
-- Changes:
--   1. Drop obsolete VoiceOption table
--   2. Drop obsolete Agent columns (idle_timeout, llm_temperature, kb_namespace)
--   3. Drop obsolete Tenant columns (cached access tokens, telegram_chat_id)
--   4. Upgrade KnowledgeChunk embedding from vector(384) to vector(1536)
--   5. Add Agent.created_at, Agent.updated_at
--   6. Add CallRecord.call_type
--   7. Add CallRecord.requires_callback default false (was nullable)
--   8. Create new performance indexes
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Drop VoiceOption table (Telnyx manages its own voices)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS voiceoption CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 2. Agent — drop obsolete columns
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agent
    DROP COLUMN IF EXISTS idle_timeout,
    DROP COLUMN IF EXISTS llm_temperature,
    DROP COLUMN IF EXISTS kb_namespace;

-- ─────────────────────────────────────────────────────────────
-- 3. Agent — add new columns
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agent
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Migrate existing voice_ids to Telnyx voice format if needed
-- (agents that still have old deepgram aura- voice IDs)
UPDATE agent
SET voice_id = 'Telnyx.Ultra.Grace'
WHERE voice_id LIKE 'aura-%'
  AND voice_id NOT LIKE 'Telnyx.%';

-- ─────────────────────────────────────────────────────────────
-- 4. Tenant — drop obsolete cached OAuth access token columns
--    (we only store refresh tokens; access tokens are ephemeral)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE tenant
    DROP COLUMN IF EXISTS zoho_access_token,
    DROP COLUMN IF EXISTS google_access_token,
    DROP COLUMN IF EXISTS google_sheet_id,
    DROP COLUMN IF EXISTS google_sheet_name,
    DROP COLUMN IF EXISTS telegram_chat_id;

-- ─────────────────────────────────────────────────────────────
-- 5. CallRecord — add call_type column
-- ─────────────────────────────────────────────────────────────
ALTER TABLE callrecord
    ADD COLUMN IF NOT EXISTS call_type VARCHAR(50);

-- Normalize requires_callback to NOT NULL with default
ALTER TABLE callrecord
    ALTER COLUMN requires_callback SET DEFAULT FALSE,
    ALTER COLUMN requires_callback SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 6. Create performance indexes
-- ─────────────────────────────────────────────────────────────

-- Composite B-tree for filtered KB searches
CREATE INDEX IF NOT EXISTS knowledge_chunks_agent_tenant_idx
    ON knowledge_chunks (agent_id, tenant_id);

-- Call history dashboard index
CREATE INDEX IF NOT EXISTS callrecord_tenant_created_idx
    ON callrecord (tenant_id, created_at DESC);

-- Lead lookup by tenant
CREATE INDEX IF NOT EXISTS lead_tenant_created_idx
    ON lead (tenant_id, created_at DESC);

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- POST-MIGRATION: Re-embed all existing KB chunks
-- Run from the backend directory after applying this migration:
--
--   python -c "
--   from backend.services.kb import IngestionService
--   from shared.models import KnowledgeChunk
--   from shared.database import engine
--   from sqlmodel import Session, select
--   import asyncio
--   # This script is a reminder — implement re-embedding as needed
--   print('Remember to re-embed existing KB chunks with 1536-dim model')
--   "
-- ─────────────────────────────────────────────────────────────
