-- ============================================================
-- AIxCaller – Agent Table Integration & Advanced Features Migration
-- ============================================================

-- 1. Add missing integration and control columns to "agent" table
ALTER TABLE agent
  ADD COLUMN IF NOT EXISTS business_name            TEXT,
  ADD COLUMN IF NOT EXISTS kb_namespace             TEXT,
  ADD COLUMN IF NOT EXISTS forwarding_number        TEXT,
  ADD COLUMN IF NOT EXISTS human_transfer_enabled   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS human_transfer_timezone  TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS human_transfer_hours     JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS template_id              TEXT,
  ADD COLUMN IF NOT EXISTS tools_config             JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS auto_callback_enabled    BOOLEAN DEFAULT FALSE;

-- 2. Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_tenant_id ON agent(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agent_phone_number ON agent(phone_number);

SELECT 'Agent table columns updated successfully' AS status;
