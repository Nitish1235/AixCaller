-- ============================================================================
-- AIxCaller — Schema migration to remove unused integrations (2026-05-21)
-- ============================================================================
-- Run this in your Supabase SQL editor. Safe to run multiple times.
--
-- Changes:
--   1. Drop tenant.hubspot_api_key
--   2. Drop tenant.salesforce_access_token
-- ============================================================================

BEGIN;

ALTER TABLE tenant DROP COLUMN IF EXISTS hubspot_api_key;
ALTER TABLE tenant DROP COLUMN IF EXISTS salesforce_access_token;

COMMIT;

SELECT 'Migration to remove unused integrations complete' AS status;
