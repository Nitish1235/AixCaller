from sqlmodel import SQLModel, Field, Column, JSON
from sqlalchemy import Text
from pgvector.sqlalchemy import Vector
from typing import List, Optional
import uuid
from datetime import datetime

class KnowledgeChunk(SQLModel, table=True):
    """
    Stores a single chunk of a tenant's knowledge base alongside its
    vector embedding for semantic search via pgvector.
    """
    __tablename__ = "knowledge_chunks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)
    content: str = Field(sa_column=Column(Text, nullable=False))
    source: Optional[str] = None          # e.g. "https://mysite.com" or "menu.pdf"
    embedding: List[float] = Field(
        default=None,
        sa_column=Column(Vector(384))     # MiniLM (all-MiniLM-L6-v2) = 384 dims
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Tenant(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    contact_email: str = Field(unique=True)
    is_active: bool = Field(default=False)
    credits: float = Field(default=0.0)
    # ── Subscription / Plan ──────────────────────────────────────────────
    plan_tier: str = Field(default="free")      # free | starter | pro | premium
    minutes_included: int = Field(default=0)    # total minutes for current cycle
    minutes_used: float = Field(default=0.0)    # consumed in current cycle (decimal for partial mins)
    subscription_id: Optional[str] = None       # DodoPayments subscription ID
    subscription_status: str = Field(default="inactive")  # active | inactive | cancelled | past_due
    cycle_start: Optional[datetime] = None      # current billing cycle start
    cycle_end: Optional[datetime] = None        # current billing cycle end
    # ── Integrations ─────────────────────────────────────────────────────
    # Zoho CRM (full OAuth — see backend/services/zoho_oauth.py)
    zoho_access_token: Optional[str] = None
    zoho_refresh_token: Optional[str] = None
    zoho_domain: Optional[str] = None              # zohoapis.com | zohoapis.eu | zohoapis.in | ...
    zoho_token_expires_at: Optional[int] = None    # unix-ts; we refresh ~5 min before
    zoho_org_id: Optional[str] = None
    # Other CRMs (kept as opaque tokens; OAuth flows not yet built)
    hubspot_api_key: Optional[str] = None
    salesforce_access_token: Optional[str] = None
    # NOTE: webhook_url (Zapier/Make.com) was removed — was unmaintained and a
    # security risk (arbitrary outbound POSTs). Re-add only behind an allowlist.
    email_summary_enabled: bool = Field(default=True)
    # Shopify (token-based, per-tenant)
    shopify_domain: Optional[str] = None
    shopify_token: Optional[str] = None
    # Google (OAuth2 — Calendar + Sheets)
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_token_expires_at: Optional[int] = None   # unix timestamp
    google_calendar_id: Optional[str] = Field(default="primary")  # which calendar to use
    google_sheet_id: Optional[str] = None           # spreadsheet ID for leads
    google_sheet_name: Optional[str] = Field(default="Leads")  # tab name
    google_connected: bool = Field(default=False)
    password_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Agent(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)  # indexed for dashboard loads
    name: str                              # e.g. "Sarah" — agent's persona name
    business_name: Optional[str] = None    # e.g. "NovaEdge Solutions" — used in greeting
    system_prompt: str
    phone_number: Optional[str] = Field(default=None, unique=True)
    voice_id: str = "aura-asteria-en"
    idle_timeout: int = 7
    llm_temperature: float = 0.7
    language: str = "en"
    kb_namespace: Optional[str] = None
    # ── Human Transfer (live-agent handoff) ──────────────────────────────
    # forwarding_number: the human's phone the AI transfers to (E.164 format).
    # human_transfer_enabled: master switch — even if a number is saved, the AI
    #   won't offer transfers unless this is True. Lets a business turn off
    #   transfers entirely (AI handles all calls).
    # human_transfer_timezone: IANA tz name (e.g. "America/New_York"). Used to
    #   evaluate whether "now" is within the staffed-hours windows.
    # human_transfer_hours: JSON mapping day → list of "HH:MM-HH:MM" windows.
    #   Empty list = closed that day. Example:
    #     {"mon": ["09:00-18:00"], "tue": ["09:00-18:00"], ...,
    #      "sat": ["10:00-14:00"], "sun": []}
    forwarding_number: Optional[str] = None
    human_transfer_enabled: bool = Field(default=False)
    human_transfer_timezone: str = Field(default="UTC")
    human_transfer_hours: dict = Field(default_factory=dict, sa_column=Column(JSON))
    template_id: Optional[str] = None      # Marketplace template used (clinic, ecommerce, etc.)
    tools_config: dict = Field(default_factory=dict, sa_column=Column(JSON))
    auto_callback_enabled: bool = Field(default=False)
    
class CallRecord(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)   # indexed for /calls dashboard
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)     # indexed for per-agent filters
    from_number: str
    to_number: str
    direction: str = Field(default="inbound")
    status: str = Field(default="completed")
    requires_callback: Optional[bool] = Field(default=False)
    parent_call_id: Optional[uuid.UUID] = Field(default=None, foreign_key="callrecord.id")
    transcript: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    action_items: Optional[str] = None
    duration_seconds: Optional[int] = Field(default=0)  # call duration in seconds
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VoiceOption(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str # e.g., "Asteria"
    gender: str # e.g., "Female"
    voice_id: str = Field(unique=True) # e.g., "aura-asteria-en"
    preview_url: Optional[str] = None # GCS public URL
    language: str = "en"

class Lead(SQLModel, table=True):
    """Structured lead captured by the AI during a call."""
    __tablename__ = "lead"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id", index=True)
    agent_id: uuid.UUID = Field(foreign_key="agent.id", index=True)
    call_record_id: Optional[uuid.UUID] = Field(default=None, foreign_key="callrecord.id")
    # Contact info
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    # Lead metadata
    intent: Optional[str] = None           # e.g. "Book appointment", "Product inquiry"
    notes: Optional[str] = None            # free-text summary from AI
    status: str = Field(default="new")     # new | contacted | booked | closed
    # Appointment (if booked)
    appointment_date: Optional[str] = None  # ISO date string e.g. "2026-05-20"
    appointment_time: Optional[str] = None  # e.g. "14:00"
    appointment_notes: Optional[str] = None
    google_event_id: Optional[str] = None   # Calendar event ID after booking
    google_sheet_row: Optional[int] = None  # Row number in Sheets after logging
    created_at: datetime = Field(default_factory=datetime.utcnow)
