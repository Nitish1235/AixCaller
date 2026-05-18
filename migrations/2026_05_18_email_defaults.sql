-- ============================================================================
-- AIxCaller — Email summary defaults (2026-05-18)
-- ============================================================================
-- Ensures email_summary_enabled column exists with DEFAULT TRUE so every
-- tenant (new and existing) gets call summary emails out of the box.
-- Safe to run multiple times (uses IF NOT EXISTS / DO block).
-- ============================================================================

BEGIN;

-- Add column if it doesn't exist yet (no-op if already present)
ALTER TABLE tenant
  ADD COLUMN IF NOT EXISTS email_summary_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Back-fill any existing rows that have NULL (e.g. rows added before this column
-- existed — ALTER TABLE ... DEFAULT does not update existing NULLs).
UPDATE tenant
   SET email_summary_enabled = TRUE
 WHERE email_summary_enabled IS NULL;

COMMIT;

-- VERIFY:
-- SELECT id, contact_email, email_summary_enabled FROM tenant LIMIT 10;
