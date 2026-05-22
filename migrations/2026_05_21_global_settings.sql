-- ============================================================
-- AIxCaller DB Migration: 2026-05-21 Global System Settings
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   DATABASE_DIRECT_URL=<url> psql -f this_file.sql
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    global_model VARCHAR(255) NOT NULL DEFAULT 'openai/gpt-4o-mini',
    api_key TEXT,
    telnyx_secret_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row if it doesn't exist
INSERT INTO system_settings (id, global_model, api_key, telnyx_secret_id)
VALUES (1, 'openai/gpt-4o-mini', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

COMMIT;
