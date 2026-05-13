-- ============================================================
-- AIxCaller – Shopify & Google Integration Schema Migration
-- ============================================================

-- 1. Add Shopify columns
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS shopify_domain TEXT,
  ADD COLUMN IF NOT EXISTS shopify_token  TEXT;

-- 2. Add Google Workspace columns
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS google_access_token      TEXT,
  ADD COLUMN IF NOT EXISTS google_refresh_token     TEXT,
  ADD COLUMN IF NOT EXISTS google_token_expires_at  BIGINT,
  ADD COLUMN IF NOT EXISTS google_calendar_id       TEXT DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS google_sheet_id          TEXT,
  ADD COLUMN IF NOT EXISTS google_sheet_name        TEXT DEFAULT 'Leads',
  ADD COLUMN IF NOT EXISTS google_connected         BOOLEAN DEFAULT FALSE;

-- 3. Ensure other required core columns exist (from latest model updates)
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() at time zone 'utc');

SELECT 'Shopify and Google integration columns added successfully' AS status;
