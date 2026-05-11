-- ============================================================================
-- AIxCaller — Human Transfer feature (2026-05-11)
-- ============================================================================
-- Adds opt-in human-transfer with per-day staffed hours and timezone awareness.
--
-- Two distinct concepts (not to be confused):
--   • CALL FORWARDING (handled by the business at their carrier):
--     Their existing public number forwards to our Telnyx number. We don't
--     touch this — it's an inbound-routing setup outside our app.
--
--   • HUMAN TRANSFER (this migration):
--     During an AI call, the agent can optionally hand the live caller off to
--     a real person. Only allowed when:
--       1. The business has opted in (human_transfer_enabled = true)
--       2. A forwarding_number is set (already existed)
--       3. The current time in the business's timezone falls inside a
--          configured staffed-hours window
--
-- Run this in Supabase SQL editor. Safe to re-run.
-- ============================================================================

BEGIN;

ALTER TABLE agent ADD COLUMN IF NOT EXISTS human_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE agent ADD COLUMN IF NOT EXISTS human_transfer_timezone TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE agent ADD COLUMN IF NOT EXISTS human_transfer_hours JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMIT;

-- ============================================================================
-- Example: enable transfer for an existing agent with standard 9-6 weekdays + Sat half-day
-- (run only if you want to set defaults for an existing agent)
-- ============================================================================
-- UPDATE agent
-- SET
--   human_transfer_enabled  = true,
--   human_transfer_timezone = 'America/New_York',
--   human_transfer_hours    = '{
--     "mon": ["09:00-18:00"],
--     "tue": ["09:00-18:00"],
--     "wed": ["09:00-18:00"],
--     "thu": ["09:00-18:00"],
--     "fri": ["09:00-18:00"],
--     "sat": ["10:00-14:00"],
--     "sun": []
--   }'::jsonb
-- WHERE id = '<your-agent-uuid>';
