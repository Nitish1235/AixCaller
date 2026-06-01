"""
Campaign API — CRUD for outbound calling campaigns and their leads.
All routes require tenant_id for multi-tenant isolation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from pydantic import BaseModel, validator
from shared.database import get_db
from shared.models import Campaign, CampaignLead, Agent, Tenant
from loguru import logger

router = APIRouter(prefix="/api/v1/campaigns", tags=["Campaigns"])


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST SCHEMAS
# ─────────────────────────────────────────────────────────────────────────────
class CreateCampaignRequest(BaseModel):
    tenant_id: str
    agent_id: str
    name: str
    max_concurrent_calls: int = 3          # default 3, hard cap 3
    calling_window_timezone: str = "lead_local"
    calling_window_start: str = "09:00"
    calling_window_end: str = "20:00"
    retry_cadence_hours: List[int] = [2, 24, 72]
    speed_to_lead_enabled: bool = False
    sms_enabled: bool = False
    daily_call_limit: Optional[int] = None
    scheduled_start_at: Optional[str] = None   # ISO-8601 UTC string, e.g. "2026-03-15T10:00:00Z"

    @validator("max_concurrent_calls")
    def cap_concurrency(cls, v: int) -> int:
        return min(max(v, 1), 3)           # clamp to [1, 3]


class UpdateCampaignRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    max_concurrent_calls: Optional[int] = None
    calling_window_timezone: Optional[str] = None
    calling_window_start: Optional[str] = None
    calling_window_end: Optional[str] = None
    retry_cadence_hours: Optional[List[int]] = None
    speed_to_lead_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    scheduled_start_at: Optional[str] = None   # ISO-8601 UTC string or null to clear


class LeadItem(BaseModel):
    name: str = "Valued Customer"
    phone: str
    email: Optional[str] = None
    timezone: str = "UTC"


class BulkLeadsRequest(BaseModel):
    leads: List[LeadItem]


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN CRUD
# ─────────────────────────────────────────────────────────────────────────────
@router.post("", response_model=Campaign)
async def create_campaign(req: CreateCampaignRequest, db: Session = Depends(get_db)):
    """Create a new outbound campaign linked to an existing agent."""
    tenant_uuid = uuid.UUID(req.tenant_id)
    agent_uuid = uuid.UUID(req.agent_id)

    tenant = db.get(Tenant, tenant_uuid)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    agent = db.exec(
        select(Agent).where(Agent.id == agent_uuid, Agent.tenant_id == tenant_uuid)
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found for this tenant")

    # Ensure the selected agent has an assigned phone number
    if not agent.phone_number:
        raise HTTPException(status_code=400, detail="Selected agent does not have a phone number assigned. Please assign a phone number before creating a campaign.")

    # Parse optional scheduled start datetime
    scheduled_dt = None
    if req.scheduled_start_at:
        try:
            scheduled_dt = datetime.fromisoformat(req.scheduled_start_at.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid scheduled_start_at format. Use ISO-8601 UTC, e.g. '2026-03-15T10:00:00Z'")

    campaign = Campaign(
        tenant_id=tenant_uuid,
        agent_id=agent_uuid,
        name=req.name,
        max_concurrent_calls=req.max_concurrent_calls,
        calling_window_timezone=req.calling_window_timezone,
        calling_window_start=req.calling_window_start,
        calling_window_end=req.calling_window_end,
        retry_cadence_hours=req.retry_cadence_hours,
        speed_to_lead_enabled=req.speed_to_lead_enabled,
        sms_enabled=req.sms_enabled,
        daily_call_limit=req.daily_call_limit,
        scheduled_start_at=scheduled_dt,
        # If a future schedule is provided, hold in "scheduled" status
        status="scheduled" if scheduled_dt and scheduled_dt > datetime.now(timezone.utc) else "inactive",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    logger.info(f"Campaign {campaign.id} created for tenant {tenant_uuid} "
                f"(status={campaign.status}, scheduled_start_at={scheduled_dt})")
    return campaign


@router.get("")
async def list_campaigns(tenant_id: str, db: Session = Depends(get_db)):
    """List all campaigns for a tenant, with agent info and lead counts."""
    tenant_uuid = uuid.UUID(tenant_id)

    campaigns = db.exec(
        select(Campaign)
        .where(Campaign.tenant_id == tenant_uuid)
        .order_by(Campaign.created_at.desc())
    ).all()

    results = []
    for c in campaigns:
        # Get agent info
        agent = db.get(Agent, c.agent_id)

        # Count leads
        lead_count = db.exec(
            select(func.count(CampaignLead.id)).where(CampaignLead.campaign_id == c.id)
        ).one()

        results.append({
            "id": str(c.id),
            "name": c.name,
            "status": c.status,
            "agent_id": str(c.agent_id),
            "agent_name": agent.name if agent else "Unknown",
            "agent_phone": agent.phone_number if agent else None,
            "max_concurrent_calls": c.max_concurrent_calls,
            "calling_window_timezone": c.calling_window_timezone,
            "calling_window_start": c.calling_window_start,
            "calling_window_end": c.calling_window_end,
            "speed_to_lead_enabled": c.speed_to_lead_enabled,
            "sms_enabled": c.sms_enabled,
            "leads_count": lead_count,
            "pause_reason": c.pause_reason,
            "scheduled_start_at": c.scheduled_start_at.isoformat() if c.scheduled_start_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })

    return {"campaigns": results}


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: uuid.UUID, tenant_id: str, db: Session = Depends(get_db)):
    """Get a single campaign with details."""
    campaign = db.exec(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == uuid.UUID(tenant_id),
        )
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    agent = db.get(Agent, campaign.agent_id)
    lead_count = db.exec(
        select(func.count(CampaignLead.id)).where(CampaignLead.campaign_id == campaign.id)
    ).one()

    return {
        "id": str(campaign.id),
        "name": campaign.name,
        "status": campaign.status,
        "agent_id": str(campaign.agent_id),
        "agent_name": agent.name if agent else "Unknown",
        "agent_phone": agent.phone_number if agent else None,
        "max_concurrent_calls": campaign.max_concurrent_calls,
        "calling_window_timezone": campaign.calling_window_timezone,
        "calling_window_start": campaign.calling_window_start,
        "calling_window_end": campaign.calling_window_end,
        "retry_cadence_hours": campaign.retry_cadence_hours,
        "speed_to_lead_enabled": campaign.speed_to_lead_enabled,
        "sms_enabled": campaign.sms_enabled,
        "leads_count": lead_count,
        "created_at": campaign.created_at.isoformat() if campaign.created_at else None,
    }


@router.patch("/{campaign_id}")
async def update_campaign(
    campaign_id: uuid.UUID,
    req: UpdateCampaignRequest,
    tenant_id: str,
    db: Session = Depends(get_db),
):
    """Update campaign settings. Use status='active' to start dialing."""
    campaign = db.exec(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == uuid.UUID(tenant_id),
        )
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    was_active_or_scheduled = campaign.status in ("active", "scheduled")

    update_data = req.model_dump(exclude_unset=True)

    # Handle scheduled_start_at parsing separately (string → datetime)
    if "scheduled_start_at" in update_data:
        raw = update_data.pop("scheduled_start_at")
        if raw:
            try:
                update_data["scheduled_start_at"] = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid scheduled_start_at format. Use ISO-8601 UTC.")
        else:
            update_data["scheduled_start_at"] = None

    for key, value in update_data.items():
        setattr(campaign, key, value)
    campaign.updated_at = datetime.now(timezone.utc)

    # If a scheduled_start_at is set and in the future, force status to "scheduled"
    if campaign.scheduled_start_at and campaign.scheduled_start_at > datetime.now(timezone.utc):
        campaign.status = "scheduled"
    # If scheduled_start_at was cleared and status was "scheduled", revert to "inactive"
    elif not campaign.scheduled_start_at and campaign.status == "scheduled":
        campaign.status = "inactive"

    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    logger.info(f"Campaign {campaign.id} updated: {list(update_data.keys())} → status={campaign.status}")

    # Immediate activation: only enqueue ARQ if status just became "active" with no future schedule
    now_active = campaign.status == "active"
    if now_active and not was_active_or_scheduled:
        try:
            import os as _os
            from arq import create_pool as _arq_pool
            from arq.connections import RedisSettings as _RS
            _redis = await _arq_pool(_RS.from_dsn(_os.environ.get("REDIS_URL", "redis://localhost:6379/0")))
            await _redis.enqueue_job("start_campaign", campaign.id)
            logger.info(f"Enqueued start_campaign ARQ job for campaign {campaign.id}")
        except Exception as _e:
            logger.error(f"Failed to enqueue start_campaign for campaign {campaign.id}: {_e}")

    return {
        "status": "updated",
        "campaign_id": str(campaign.id),
        "campaign_status": campaign.status,
        "scheduled_start_at": campaign.scheduled_start_at.isoformat() if campaign.scheduled_start_at else None,
    }


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: uuid.UUID, tenant_id: str, db: Session = Depends(get_db)):
    """Delete a campaign and all its leads."""
    campaign = db.exec(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == uuid.UUID(tenant_id),
        )
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Delete associated leads first
    leads = db.exec(select(CampaignLead).where(CampaignLead.campaign_id == campaign.id)).all()
    for lead in leads:
        db.delete(lead)

    db.delete(campaign)
    db.commit()
    logger.info(f"Campaign {campaign_id} and {len(leads)} leads deleted")
    return {"status": "deleted", "campaign_id": str(campaign_id)}


# ─────────────────────────────────────────────────────────────────────────────
# CAMPAIGN LEADS
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/{campaign_id}/leads")
async def bulk_add_leads(
    campaign_id: uuid.UUID,
    req: BulkLeadsRequest,
    tenant_id: str,
    db: Session = Depends(get_db),
):
    """Bulk add leads to a campaign."""
    campaign = db.exec(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == uuid.UUID(tenant_id),
        )
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    added = 0
    for item in req.leads:
        lead = CampaignLead(
            campaign_id=campaign.id,
            name=item.name,
            phone=item.phone,
            email=item.email,
            timezone=item.timezone,
        )
        db.add(lead)
        added += 1

    db.commit()
    logger.info(f"Added {added} leads to campaign {campaign_id}")
    return {"status": "success", "leads_added": added}


@router.get("/{campaign_id}/leads")
async def list_campaign_leads(
    campaign_id: uuid.UUID,
    tenant_id: str,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List leads for a campaign, optionally filtered by status."""
    campaign = db.exec(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == uuid.UUID(tenant_id),
        )
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    query = select(CampaignLead).where(CampaignLead.campaign_id == campaign.id)
    if status:
        query = query.where(CampaignLead.status == status)

    leads = db.exec(query.order_by(CampaignLead.created_at.desc())).all()
    return {"leads": leads, "total": len(leads)}


@router.get("/{campaign_id}/stats")
async def get_campaign_stats(
    campaign_id: uuid.UUID,
    tenant_id: str,
    db: Session = Depends(get_db),
):
    """Get lead counts by status for a campaign."""
    campaign = db.exec(
        select(Campaign).where(
            Campaign.id == campaign_id,
            Campaign.tenant_id == uuid.UUID(tenant_id),
        )
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    statuses = ["pending", "in_progress", "answered", "voicemail", "failed", "opted_out"]
    stats = {}
    for s in statuses:
        count = db.exec(
            select(func.count(CampaignLead.id)).where(
                CampaignLead.campaign_id == campaign.id,
                CampaignLead.status == s,
            )
        ).one()
        stats[s] = count

    total = sum(stats.values())
    return {"campaign_id": str(campaign_id), "total_leads": total, "by_status": stats}
