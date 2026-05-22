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

Design rules:
  - All tables isolated by tenant_id (multi-tenant safety).
  - No cached OAuth access tokens in DB — only refresh tokens + expiry timestamps.
  - No legacy voice-engine fields (idle_timeout, llm_temperature, kb_namespace removed).
  - VoiceOption table removed — Telnyx manages its own voice catalogue.
"""
from sqlmodel import SQLModel, Field, Column, JSON
from sqlalchemy import Text
from pgvector.sqlalchemy import Vector
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

    # ── Zoho CRM OAuth (refresh token only — access token is ephemeral) ──────
    zoho_refresh_token: Optional[str] = None
    zoho_domain: Optional[str] = None              # zohoapis.com | zohoapis.eu | ...
    zoho_token_expires_at: Optional[int] = None    # unix-ts for refresh scheduling
    zoho_org_id: Optional[str] = None

    # ── Shopify (per-tenant token-based) ────────────────────────────────────
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None

    # ── Google OAuth (Calendar + Sheets — refresh token only) ───────────────
    google_refresh_token: Optional[str] = None
    google_token_expires_at: Optional[int] = None  # unix-ts
    google_calendar_id: Optional[str] = Field(default="primary")
    google_connected: bool = Field(default=False)

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

    # ── Marketplace ──────────────────────────────────────────────────────────
    template_id: Optional[str] = None     # Template used to create agent (if any)

    # ── Timestamps ───────────────────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# KNOWLEDGE CHUNK
# Single chunk of an agent's knowledge base with its vector embedding.
# Uses OpenAI text-embedding-3-small (1536 dims) for high-quality semantic search.
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
