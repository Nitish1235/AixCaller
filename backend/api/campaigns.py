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
from pydantic import BaseModel
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
    max_concurrent_calls: int = 1
    calling_window_start: str = "09:00"
    calling_window_end: str = "20:00"
    retry_cadence_hours: List[int] = [2, 24, 72]
    speed_to_lead_enabled: bool = False
    sms_enabled: bool = False


class UpdateCampaignRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    max_concurrent_calls: Optional[int] = None
    calling_window_start: Optional[str] = None
    calling_window_end: Optional[str] = None
    retry_cadence_hours: Optional[List[int]] = None
    speed_to_lead_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None


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

    campaign = Campaign(
        tenant_id=tenant_uuid,
        agent_id=agent_uuid,
        name=req.name,
        max_concurrent_calls=req.max_concurrent_calls,
        calling_window_start=req.calling_window_start,
        calling_window_end=req.calling_window_end,
        retry_cadence_hours=req.retry_cadence_hours,
        speed_to_lead_enabled=req.speed_to_lead_enabled,
        sms_enabled=req.sms_enabled,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    logger.info(f"Campaign {campaign.id} created for tenant {tenant_uuid}")
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
            "calling_window_start": c.calling_window_start,
            "calling_window_end": c.calling_window_end,
            "speed_to_lead_enabled": c.speed_to_lead_enabled,
            "sms_enabled": c.sms_enabled,
            "leads_count": lead_count,
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

    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(campaign, key, value)
    campaign.updated_at = datetime.now(timezone.utc)

    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    logger.info(f"Campaign {campaign.id} updated: {list(update_data.keys())}")
    return {"status": "updated", "campaign_id": str(campaign.id)}


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
