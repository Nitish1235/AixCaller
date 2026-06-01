-- ============================================================
-- AIxCaller DB Migration: 2026-06-01 Performance Indexes
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   psql $DATABASE_DIRECT_URL -f this_file.sql
--
-- All indexes are partial/filtered where possible to stay small.
-- Safe to re-run — all use IF NOT EXISTS.
-- ============================================================

-- Dialer main query: pending leads per campaign ordered by AI score
CREATE INDEX IF NOT EXISTS campaignlead_dial_queue_idx
    ON campaignlead (campaign_id, status, lead_score DESC, next_retry_at)
    WHERE status = 'pending' AND opted_out = FALSE;

-- Concurrency check: count in-progress leads per campaign
CREATE INDEX IF NOT EXISTS campaignlead_inprogress_idx
    ON campaignlead (campaign_id, status)
    WHERE status = 'in_progress';

-- reconcile_stuck_calls: find old in-progress leads
CREATE INDEX IF NOT EXISTS campaignlead_updated_status_idx
    ON campaignlead (status, updated_at)
    WHERE status = 'in_progress';

-- Active/scheduled campaign lookup per tenant
CREATE INDEX IF NOT EXISTS campaign_tenant_status_idx
    ON campaign (tenant_id, status);

-- Reminder engine: upcoming appointments
CREATE INDEX IF NOT EXISTS campaignlead_appointment_idx
    ON campaignlead (appointment_datetime, status)
    WHERE appointment_datetime IS NOT NULL AND opted_out = FALSE;

-- Call deduplication: find CallRecord by Telnyx call_control_id
CREATE INDEX IF NOT EXISTS callrecord_call_control_id_idx
    ON callrecord (call_control_id)
    WHERE call_control_id IS NOT NULL;

-- Inbound call routing hot path: agent by phone number
CREATE INDEX IF NOT EXISTS agent_phone_number_idx
    ON agent (phone_number)
    WHERE phone_number IS NOT NULL;
