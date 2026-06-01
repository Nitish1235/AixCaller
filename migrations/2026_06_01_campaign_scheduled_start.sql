-- ============================================================
-- AIxCaller DB Migration: 2026-06-01 Campaign Scheduled Start
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   psql $DATABASE_DIRECT_URL -f this_file.sql
--
-- Changes:
--   1. Add scheduled_start_at to campaign — nullable datetime with tz.
--      When set, the campaign stays in "scheduled" status until
--      the ARQ worker detects the time has arrived and auto-activates it.
-- ============================================================

ALTER TABLE campaign
    ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMP WITH TIME ZONE;
