-- ============================================================================
-- AIxCaller — Legacy Number Forwarding (Option B) — 2026-05-17
-- ============================================================================
-- Adds the `legacy_number` column to the agent table so users can register
-- their existing marketing number. The actual call forwarding is configured
-- on the carrier side; we store the number for UI display and instructions.
-- Safe to run multiple times (ALTER … IF NOT EXISTS).
-- ============================================================================

BEGIN;

-- ── 1. Add legacy_number column ───────────────────────────────────────────────
ALTER TABLE agent
    ADD COLUMN IF NOT EXISTS legacy_number TEXT DEFAULT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION — run after migration to confirm:
-- ============================================================================
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'agent' AND column_name = 'legacy_number';
-- ============================================================================
