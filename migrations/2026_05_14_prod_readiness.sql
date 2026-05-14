-- ============================================================================
-- AIxCaller — Create Lead Table + Production Readiness Indexes (2026-05-14)
-- ============================================================================
-- Run this in your Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================================

BEGIN;

-- ── 1. Create the `lead` table (was in models.py but never migrated) ─────────
CREATE TABLE IF NOT EXISTS lead (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    agent_id          UUID NOT NULL REFERENCES agent(id)  ON DELETE CASCADE,
    call_record_id    UUID REFERENCES callrecord(id) ON DELETE SET NULL,
    -- Contact info
    name              TEXT,
    phone             TEXT,
    email             TEXT,
    -- Lead metadata
    intent            TEXT,
    notes             TEXT,
    status            TEXT NOT NULL DEFAULT 'new',   -- new | contacted | booked | closed
    -- Appointment fields
    appointment_date  TEXT,
    appointment_time  TEXT,
    appointment_notes TEXT,
    google_event_id   TEXT,
    google_sheet_row  INTEGER,
    created_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

-- ── 2. Indexes on `lead` ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS lead_tenant_id_idx       ON lead (tenant_id);
CREATE INDEX IF NOT EXISTS lead_agent_id_idx        ON lead (agent_id);
CREATE INDEX IF NOT EXISTS lead_call_record_id_idx  ON lead (call_record_id) WHERE call_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_created_at_idx      ON lead (created_at DESC);

-- ── 3. Indexes on `agent` ─────────────────────────────────────────────────────
-- tenant_id queried on every dashboard load
CREATE INDEX IF NOT EXISTS agent_tenant_id_idx      ON agent (tenant_id);
-- phone_number already has a UNIQUE constraint → already indexed automatically

-- ── 4. Indexes on `callrecord` ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS callrecord_tenant_id_idx ON callrecord (tenant_id);
CREATE INDEX IF NOT EXISTS callrecord_agent_id_idx  ON callrecord (agent_id);
CREATE INDEX IF NOT EXISTS callrecord_created_at_idx ON callrecord (created_at DESC);

COMMIT;

-- ============================================================================
-- VERIFICATION — run after migration to confirm:
-- ============================================================================
-- SELECT tablename FROM pg_tables WHERE tablename = 'lead';
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('lead','agent','callrecord');
-- ============================================================================
