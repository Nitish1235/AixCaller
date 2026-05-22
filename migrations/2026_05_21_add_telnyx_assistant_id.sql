-- Migration: Add telnyx_assistant_id to Agent table
-- Created: 2026-05-21

ALTER TABLE agent ADD COLUMN telnyx_assistant_id VARCHAR(255) UNIQUE NULL;
