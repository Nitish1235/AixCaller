-- ============================================================================
-- AIxCaller — Remove Zapier/Webhook + upgrade Zoho to full OAuth (2026-05-11)
-- ============================================================================
-- Run this in Supabase SQL editor. Safe to re-run.
--
-- Changes:
--   1. DROP tenant.webhook_url
--      (Zapier/Make.com push-webhook integration removed — was unauthenticated
--       outbound POST with no allowlist; security risk.)
--   2. ADD tenant.zoho_domain  (zohoapis.com / .eu / .in / ... per-account)
--   3. ADD tenant.zoho_token_expires_at  (BIGINT unix-ts for auto-refresh)
--
-- Existing zoho_access_token / zoho_refresh_token columns are kept — they're
-- now populated by the OAuth flow at /api/v1/zoho/callback instead of by
-- manual paste in the dashboard.
-- ============================================================================

BEGIN;

-- 1. Drop the webhook column
ALTER TABLE tenant DROP COLUMN IF EXISTS webhook_url;

-- 2. Add Zoho OAuth fields needed for multi-data-center support + auto-refresh
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS zoho_domain TEXT;
ALTER TABLE tenant ADD COLUMN IF NOT EXISTS zoho_token_expires_at BIGINT;

-- 3. (Optional cleanup) Wipe any existing manually-pasted access tokens
--    — they were short-lived and almost certainly expired anyway. Users must
--    reconnect via the new OAuth button. Comment out if you want to keep them.
UPDATE tenant
SET zoho_access_token = NULL,
    zoho_refresh_token = NULL,
    zoho_token_expires_at = NULL
WHERE zoho_refresh_token IS NULL;  -- only clean up rows that never had a refresh_token

COMMIT;
