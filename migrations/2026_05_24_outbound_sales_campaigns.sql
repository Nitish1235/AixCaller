-- ============================================================
-- AIxCaller DB Migration: 2026-05-24 Outbound Sales Campaigns
-- ============================================================
-- Apply via direct connection (NOT transaction pooler):
--   DATABASE_DIRECT_URL=<url> psql -f this_file.sql
--
-- Changes:
--   1. Create campaign table
--   2. Create campaignlead table
--   3. Create composite and unique performance indexes
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 1. Create campaign table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'inactive',
    max_concurrent_calls INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 2. Create campaignlead table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaignlead (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL DEFAULT 'Valued Customer',
    phone VARCHAR NOT NULL,
    email VARCHAR,
    status VARCHAR NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    variables JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_call_id UUID REFERENCES callrecord(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 3. Create performance indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS campaign_tenant_idx ON campaign(tenant_id);
CREATE INDEX IF NOT EXISTS campaignlead_campaign_idx ON campaignlead(campaign_id);
CREATE INDEX IF NOT EXISTS campaignlead_campaign_status_idx ON campaignlead(campaign_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS campaignlead_campaign_phone_idx ON campaignlead(campaign_id, phone);

COMMIT;
