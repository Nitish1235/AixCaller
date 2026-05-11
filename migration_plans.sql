-- ============================================================
-- AIxCaller – Subscription / Plan schema migration
-- Run this once against your Supabase / PostgreSQL database.
-- Safe to run on existing databases (uses IF NOT EXISTS / DO).
-- ============================================================

-- 1. Add new columns to the "tenant" table
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS plan_tier           TEXT    NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS minutes_included    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_used        FLOAT   NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS subscription_id     TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT    NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS cycle_start         TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cycle_end           TIMESTAMP;

-- 2. Add duration_seconds to the "callrecord" table
ALTER TABLE callrecord
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;

-- 3. Reset existing tenants to the correct baseline (free tier, inactive)
UPDATE tenant
SET
  plan_tier           = 'free',
  minutes_included    = 0,
  minutes_used        = 0.0,
  subscription_status = 'inactive'
WHERE plan_tier IS NULL OR plan_tier = 'none';

-- Done!
SELECT 'Migration complete' AS status;
