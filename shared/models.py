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
        sa_column=Column(Vector(1536))    # OpenAI text-embedding-3-small = 1536 dims
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Tenant(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    contact_email: str = Field(unique=True)
    is_active: bool = Field(default=False)
    credits: float = Field(default=0.0)
    zoho_access_token: Optional[str] = None
    zoho_refresh_token: Optional[str] = None
    zoho_org_id: Optional[str] = None
    hubspot_api_key: Optional[str] = None
    salesforce_access_token: Optional[str] = None
    webhook_url: Optional[str] = None # For Zapier/Make.com
    telegram_chat_id: Optional[str] = None # For Telegram alerts
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Agent(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    name: str
    system_prompt: str
    phone_number: str = Field(unique=True)
    voice_id: str = "aura-asteria-en"
    idle_timeout: int = 7 # Default 7 seconds
    llm_temperature: float = 0.7
    language: str = "en"
    kb_namespace: str
    tools_config: dict = Field(default_factory=dict, sa_column=Column(JSON))
    
class CallRecord(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_id: uuid.UUID = Field(foreign_key="tenant.id")
    agent_id: uuid.UUID = Field(foreign_key="agent.id")
    from_number: str
    to_number: str
    direction: str = Field(default="inbound")
    status: str = Field(default="completed")
    requires_callback: bool = Field(default=False)
    parent_call_id: Optional[uuid.UUID] = Field(default=None, foreign_key="callrecord.id")
    transcript: Optional[str] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    action_items: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VoiceOption(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str # e.g., "Asteria"
    gender: str # e.g., "Female"
    voice_id: str = Field(unique=True) # e.g., "aura-asteria-en"
    preview_url: Optional[str] = None # GCS public URL
    language: str = "en"
