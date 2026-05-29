"""
AIxCaller — SQLModel Database Schema
=====================================
Clean, purpose-built schema for the Telnyx Conversational AI architecture.

Tables:
  - Tenant          : Multi-tenant root. Owns all resources.
  - Agent           : AI voice agent config. Maps 1:1 to a Telnyx AI Assistant.
  - KnowledgeChunk  : pgvector KB chunks (OpenAI text-embedding-3-small, 1536 dims).
  - CallRecord      : Immutable call log. Analytics fields populated post-call.
  - Lead            : Structured CRM lead captured during a call.
  - Campaign        : Outbound sales/booking calling campaign configuration.
  - CampaignLead    : Leads assigned to an outbound campaign, with live synchronization states.

Design rules:
  - All tables isolated by tenant_id (multi-tenant safety).
  - No cached OAuth access tokens in DB — only refresh tokens + expiry timestamps.
  - No legacy voice-engine fields (idle_timeout, llm_temperature, kb_namespace removed).
  - VoiceOption table removed — Telnyx manages its own voice catalogue.
"""
from sqlmodel import SQLModel, Field, Column, JSON
from sqlalchemy import Text
from typing import List, Optional
import uuid
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# TENANT
# Root entity. One row per customer account (business).
# ─────────────────────────────────────────────────────────────────────────────
class Tenant(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    contact_email: str = Field(unique=True)
    is_active: bool = Field(default=False)
    password_hash: Optional[str] = None

    # ── Subscription / Plan ──────────────────────────────────────────────────
    # plan_tier: free | starter | pro | premium
    plan_tier: str = Field(default="free")
    minutes_included: int = Field(default=0)      # total minutes in current cycle
    minutes_used: float = Field(default=0.0)       # consumed (decimal for partial mins)
    subscription_id: Optional[str] = None          # DodoPayments subscription ID
    subscription_status: str = Field(default="inactive")  # active | inactive | cancelled | past_due
    cycle_start: Optional[datetime] = None
    cycle_end: Optional[datetime] = None

    # ── Notification settings ────────────────────────────────────────────────
    email_summary_enabled: bool = Field(default=True)

    # ── HubSpot OAuth (refresh token + access token) ─────────────────────────
    hubspot_access_token: Optional[str] = None
    hubspot_refresh_token: Optional[str] = None
    hubspot_token_expires_at: Optional[int] = None # unix-ts

    # ── Salesforce OAuth (refresh token + access token + instance URL) ───────
    salesforce_access_token: Optional[str] = None
    salesforce_refresh_token: Optional[str] = None
    salesforce_token_expires_at: Optional[int] = None # unix-ts
    salesforce_instance_url: Optional[str] = None

    # ── Custom Webhook ───────────────────────────────────────────────────────
    webhook_url: Optional[str] = None

    # ── Shopify (per-tenant token-based) ────────────────────────────────────
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None

    # ── Google OAuth (Calendar + Sheets — refresh token only) ───────────────
    google_refresh_token: Optional[str] = None
    google_token_expires_at: Optional[int] = None  # unix-ts
    google_calendar_id: Optional[str] = Field(default="primary")
    google_connected: bool = Field(default=False)
    # ── Knowledge Base Providers (JSON config per provider) ─────────────────────
    kb_providers: dict = Field(default_factory=dict, sa_column=Column(JSON))
    # ── Allowed Phone Numbers (per-tenant whitelist) ──────────────────────────────
    allowed_phone_numbers: dict = Field(default_factory=dict, sa_column=Column(JSON))

    # ── Airtable (Personal Access Token — auto-log calls) ────────────────
    airtable_pat: Optional[str] = None              # Personal Access Token
    airtable_base_id: Optional[str] = None          # e.g. "appXXXXXXXXXXXXXX"
    airtable_table_name: Optional[str] = None       # e.g. "Call Log"

    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# AGENT
# One AI voice agent per phone number. Maps 1:1 to a Telnyx AI Assistant.
# ─────────────────────────────────────────────────────────────────────────────
class Agent(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)

    # ── Identity ─────────────────────────────────────────────────────────────
    name: str                              # e.g. "Sarah" — the persona name
    business_name: Optional[str] = None   # e.g. "NovaEdge Solutions"
    system_prompt: str                     # Full AI instruction set

    # ── Telephony ────────────────────────────────────────────────────────────
    phone_number: Optional[str] = Field(default=None, unique=True)   # E.164 Telnyx number
    telnyx_assistant_id: Optional[str] = Field(default=None, unique=True)  # Telnyx AI Assistant ID

    # ── Voice & Language ─────────────────────────────────────────────────────
    # voice_id maps to a Telnyx Ultra voice via TELNYX_VOICE_MAP in telnyx_assistant.py
    voice_id: str = Field(default="Telnyx.Ultra.Grace")
    language: str = Field(default="en")
    voice_preview_url: Optional[str] = None  # URL to short audio preview of the voice

    # ── Human Transfer (live-agent handoff) ──────────────────────────────────
    # forwarding_number: E.164 number to transfer to when human is needed.
    # human_transfer_enabled: master switch — AI won't offer transfers unless True.
    # human_transfer_timezone: IANA tz name (e.g. "America/New_York").
    # human_transfer_hours: JSON mapping day → list of "HH:MM-HH:MM" windows.
    #   Example: {"mon": ["09:00-18:00"], "sat": ["10:00-14:00"], "sun": []}
    forwarding_number: Optional[str] = None
    human_transfer_enabled: bool = Field(default=False)
    human_transfer_timezone: str = Field(default="UTC")
    human_transfer_hours: dict = Field(default_factory=dict, sa_column=Column(JSON))

    # ── Missed Call Recovery ─────────────────────────────────────────────────
    auto_callback_enabled: bool = Field(default=False)

    # ── Legacy Number Forwarding (Option B) ──────────────────────────────────
    # The client's existing marketing number. Callers ring this; carrier forwards
    # to phone_number (the Telnyx number). Stored for display only.
    legacy_number: Optional[str] = None

    # ── Integration Tools (per-agent JSON blob) ───────────────────────────────
    # Stores Shopify token, Google Sheet ID, and other per-agent tool configs.
    # Schema: {"shopify": {"store_url": ..., "access_token": ..., "scope": ...}}
    tools_config: dict = Field(default_factory=dict, sa_column=Column(JSON))

    @property
    def call_flow(self) -> dict:
        return self.tools_config.get("call_flow", {}) if self.tools_config else {}

    @call_flow.setter
    def call_flow(self, value: dict):
        if self.tools_config is None:
            self.tools_config = {}
        new_config = dict(self.tools_config)
        new_config["call_flow"] = value
        self.tools_config = new_config

    # ── Marketplace ──────────────────────────────────────────────────────────
    template_id: Optional[str] = None     # Template used to create agent (if any)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# KNOWLEDGE DOCUMENT
# Record of an uploaded knowledge base document.
# Vectors and chunking are fully managed natively within Telnyx Cloud Storage.
# ─────────────────────────────────────────────────────────────────────────────
class KnowledgeChunk(SQLModel, table=True):
    __tablename__ = "knowledge_chunks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)
    content: str = Field(sa_column=Column(Text, nullable=False))
    source: Optional[str] = None           # e.g. "https://mysite.com" or "menu.pdf"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# CALL RECORD
# Immutable log of every call handled by an AI agent.
# Analytics fields (summary, sentiment, action_items, call_type) added post-call
# by the AnalyticsService via call_processor.py.
# ─────────────────────────────────────────────────────────────────────────────
class CallRecord(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)

    # ── Call metadata ────────────────────────────────────────────────────────
    call_control_id: Optional[str] = None  # Telnyx Call Control ID or CallSid
    from_number: str                       # Caller's E.164 number
    to_number: str                         # Agent's Telnyx number
    direction: str = Field(default="inbound")   # inbound | outbound
    status: str = Field(default="completed")    # completed | missed | failed
    duration_seconds: int = Field(default=0)

    # ── Transcript & Analytics (populated post-call) ──────────────────────────
    transcript: Optional[str] = None       # Full JSON-encoded message array
    summary: Optional[str] = None          # 1-2 sentence summary from GPT-4o-mini
    sentiment: Optional[str] = None        # Happy | Frustrated | Neutral
    action_items: Optional[str] = None     # JSON-encoded list of follow-up tasks
    call_type: Optional[str] = None        # lead_gen | booking | support | ecommerce | general

    # ── Callback tracking ────────────────────────────────────────────────────
    requires_callback: bool = Field(default=False)
    parent_call_id: Optional[uuid.UUID] = Field(default=None, foreign_key="callrecord.id")

    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# LEAD
# Structured CRM record captured by the AI during a call.
# Created/updated by call_processor.py after call.conversation.ended.
# ─────────────────────────────────────────────────────────────────────────────
class Lead(SQLModel, table=True):
    __tablename__ = "lead"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)
    call_record_id: Optional[uuid.UUID] = Field(default=None, foreign_key="callrecord.id")

    # ── Contact info ─────────────────────────────────────────────────────────
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    # ── Lead qualification ───────────────────────────────────────────────────
    intent: Optional[str] = None           # e.g. "Book appointment", "Product inquiry"
    interest_level: Optional[str] = None   # hot | warm | cold
    notes: Optional[str] = None            # Free-text AI summary
    status: str = Field(default="new")     # new | contacted | booked | closed

    # ── Appointment (if booked during call) ──────────────────────────────────
    appointment_date: Optional[str] = None  # ISO date string e.g. "2026-05-20"
    appointment_time: Optional[str] = None  # e.g. "14:00"
    google_event_id: Optional[str] = None   # Calendar event ID after booking

    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM SETTINGS
# Singleton table to store global configurations (always id=1).
# ─────────────────────────────────────────────────────────────────────────────
class SystemSettings(SQLModel, table=True):
    __tablename__ = "system_settings"

    id: int = Field(default=1, primary_key=True)
    global_model: str = Field(default="openai/gpt-4o-mini")
    api_key: Optional[str] = Field(default=None)
    telnyx_secret_id: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN
# Outbound dialing campaign configuration.
# ─────────────────────────────────────────────────────────────────────────────
class Campaign(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)
    name: str
    status: str = Field(default="inactive")  # active | inactive | completed
    max_concurrent_calls: int = Field(default=1)
    daily_call_limit: Optional[int] = Field(default=None)

    # ── Timezone-Aware Calling Window ────────────────────────────────────────
    # HH:MM strings in the lead's local time. Default: 9am-8pm.
    calling_window_start: str = Field(default="09:00")
    calling_window_end: str = Field(default="20:00")

    # ── Smart Retry Cadence ──────────────────────────────────────────────────
    # Hours between retry attempts. e.g. [2, 24, 72] = retry after 2h, 1 day, 3 days.
    retry_cadence_hours: List[int] = Field(default_factory=lambda: [2, 24, 72], sa_column=Column(JSON))

    # ── Speed-to-Lead ────────────────────────────────────────────────────────
    # If True, a new lead arriving via webhook is dialed within 60 seconds.
    speed_to_lead_enabled: bool = Field(default=False)

    # ── Post-Call SMS Drip ───────────────────────────────────────────────────
    sms_enabled: bool = Field(default=False)
    # Template variables: {name}, {agent_name}, {booking_link}, {appointment_date}, {appointment_time}
    sms_voicemail_template: Optional[str] = Field(default="Hi {name}! I just tried calling you. Want to find a time to connect? {booking_link}")
    sms_no_answer_template: Optional[str] = Field(default="Hi {name}! I missed you earlier. Let's connect: {booking_link}")
    sms_booked_template: Optional[str] = Field(default="Confirmed, {name}! Your appointment is on {appointment_date} at {appointment_time}. See you then! 🗓")
    sms_reminder_template: Optional[str] = Field(default="Hi {name}! Reminder: your call is tomorrow at {appointment_time}. Reply YES to confirm or NO to reschedule.")

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN LEAD
# Individual contact details and live sync status for a campaign run.
# ─────────────────────────────────────────────────────────────────────────────
class CampaignLead(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    campaign_id: uuid.UUID = Field(foreign_key="campaign.id", index=True)
    name: str = Field(default="Valued Customer")
    phone: str
    email: Optional[str] = None
    status: str = Field(default="pending")  # pending | in_progress | answered | voicemail | failed | opted_out
    attempts: int = Field(default=0)
    variables: dict = Field(default_factory=dict, sa_column=Column(JSON))
    last_call_id: Optional[uuid.UUID] = Field(default=None, foreign_key="callrecord.id")

    # ── Timezone & Smart Retry ───────────────────────────────────────────────
    # IANA timezone string auto-detected from phone area code (e.g. "America/New_York").
    timezone: str = Field(default="UTC")
    # When None, lead is ready to dial immediately. When set, dialer waits until this UTC datetime.
    next_retry_at: Optional[datetime] = None

    # ── AI Lead Scoring ──────────────────────────────────────────────────────
    lead_score: int = Field(default=5)           # 1-10 (10 = hottest)
    lead_tier: str = Field(default="warm")       # hot | warm | cold

    # ── Appointment Tracking ─────────────────────────────────────────────────
    appointment_datetime: Optional[datetime] = None  # Confirmed booking datetime (UTC)

    # ── DNC / Opt-Out ────────────────────────────────────────────────────────
    opted_out: bool = Field(default=False)

    # ── Post-Call Analytics ──────────────────────────────────────────────────
    call_duration_seconds: int = Field(default=0)
    call_transcript: Optional[str] = Field(default=None, sa_column=Column(Text))
    call_summary: Optional[str] = None
    call_sentiment: Optional[str] = None         # positive | neutral | negative

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# DNC LIST
# Per-tenant Do Not Call suppression registry.
# Numbers here are NEVER dialed regardless of campaign status.
# ─────────────────────────────────────────────────────────────────────────────
class DNCList(SQLModel, table=True):
    __tablename__ = "dnclist"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    phone: str = Field(index=True)              # E.164 normalized number
    reason: str = Field(default="opted_out")    # opted_out | user_requested | manual
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# PHONE POOL
# Per-tenant pool of claimed Telnyx numbers for local-presence rotation.
# The dialer picks the number whose area code best matches the lead's area code.
# ─────────────────────────────────────────────────────────────────────────────
class PhonePool(SQLModel, table=True):
    __tablename__ = "phonepool"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    phone_number: str                            # E.164 Telnyx claimed number
    area_code: str                               # e.g. "415", "212"
    is_active: bool = Field(default=True)
    last_used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
