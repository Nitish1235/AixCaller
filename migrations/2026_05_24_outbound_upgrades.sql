-- ============================================================
-- AIxCaller DB Migration: 2026-05-24 Outbound Upgrades
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   DATABASE_DIRECT_URL=<url> psql -f this_file.sql
--
-- Changes (all additive — zero data loss):
--   1. Add timezone-aware calling window columns to campaign
--   2. Add smart retry cadence columns to campaign
--   3. Add SMS drip template columns to campaign
--   4. Add speed_to_lead column to campaign
--   5. Add timezone & next_retry_at to campaignlead
--   6. Add AI lead scoring columns to campaignlead
--   7. Add appointment_datetime, opted_out to campaignlead
--   8. Add post-call analytics columns to campaignlead
--   9. Create dnclist table
--  10. Create phonepool table
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1-4. Campaign table upgrades
-- ─────────────────────────────────────────────────────────────
ALTER TABLE campaign
    ADD COLUMN IF NOT EXISTS calling_window_start VARCHAR NOT NULL DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS calling_window_end   VARCHAR NOT NULL DEFAULT '20:00',
    ADD COLUMN IF NOT EXISTS retry_cadence_hours  JSONB   NOT NULL DEFAULT '[2, 24, 72]'::jsonb,
    ADD COLUMN IF NOT EXISTS speed_to_lead_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sms_enabled           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS sms_voicemail_template TEXT,
    ADD COLUMN IF NOT EXISTS sms_no_answer_template TEXT,
    ADD COLUMN IF NOT EXISTS sms_booked_template   TEXT,
    ADD COLUMN IF NOT EXISTS sms_reminder_template  TEXT;

-- ─────────────────────────────────────────────────────────────
-- 5-8. CampaignLead table upgrades
-- ─────────────────────────────────────────────────────────────
ALTER TABLE campaignlead
    ADD COLUMN IF NOT EXISTS timezone              VARCHAR NOT NULL DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS next_retry_at         TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS lead_score            INTEGER NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS lead_tier             VARCHAR NOT NULL DEFAULT 'warm',
    ADD COLUMN IF NOT EXISTS appointment_datetime  TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS opted_out             BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS call_duration_seconds INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS call_transcript       TEXT,
    ADD COLUMN IF NOT EXISTS call_summary          TEXT,
    ADD COLUMN IF NOT EXISTS call_sentiment        VARCHAR;

-- ─────────────────────────────────────────────────────────────
-- 9. Create dnclist table (Do Not Call per-tenant registry)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dnclist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    phone      VARCHAR NOT NULL,
    reason     VARCHAR NOT NULL DEFAULT 'opted_out',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS dnclist_tenant_idx ON dnclist(tenant_id);
CREATE INDEX IF NOT EXISTS dnclist_phone_idx  ON dnclist(phone);
CREATE UNIQUE INDEX IF NOT EXISTS dnclist_tenant_phone_idx ON dnclist(tenant_id, phone);

-- ─────────────────────────────────────────────────────────────
-- 10. Create phonepool table (Local presence number pool)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phonepool (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    phone_number VARCHAR NOT NULL,
    area_code    VARCHAR NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS phonepool_tenant_idx     ON phonepool(tenant_id);
CREATE INDEX IF NOT EXISTS phonepool_area_code_idx  ON phonepool(tenant_id, area_code);

-- ─────────────────────────────────────────────────────────────
-- Performance: index for smart retry scheduler
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS campaignlead_retry_idx
    ON campaignlead(campaign_id, status, next_retry_at)
    WHERE status = 'pending';

COMMIT;
