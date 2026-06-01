-- ============================================================
-- AIxCaller DB Migration: 2026-06-01 Campaign Pause Reason
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   psql $DATABASE_DIRECT_URL -f this_file.sql
-- ============================================================

ALTER TABLE campaign
    ADD COLUMN IF NOT EXISTS pause_reason VARCHAR;
