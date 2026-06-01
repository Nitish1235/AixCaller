-- ============================================================
-- AIxCaller DB Migration: 2026-06-01 Campaign Missing Columns
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   psql $DATABASE_DIRECT_URL -f this_file.sql
--
-- Fixes:
--   1. calling_window_timezone — omitted from 2026_05_24_outbound_upgrades.sql
--   2. daily_call_limit        — present in model but never migrated
-- ============================================================

ALTER TABLE campaign
    ADD COLUMN IF NOT EXISTS calling_window_timezone VARCHAR NOT NULL DEFAULT 'lead_local',
    ADD COLUMN IF NOT EXISTS daily_call_limit        INTEGER;
