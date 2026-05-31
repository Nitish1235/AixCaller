import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select, func, case
from shared.database import get_db
from shared.models import Campaign, CampaignLead
from outbound.services.sheet_poller import GoogleSheetPoller

router = APIRouter(prefix="/api/v1/outbound/campaigns", tags=["Outbound-Campaigns"])
poller = GoogleSheetPoller()

@router.post("")
async def create_campaign(name: str, agent_id: str, tenant_id: str, max_concurrent: int = 1, db: Session = Depends(get_db)):
    try:
        agent_uuid = uuid.UUID(agent_id)
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid agent_id or tenant_id UUID")

    campaign = Campaign(
        name=name,
        agent_id=agent_uuid,
        tenant_id=tenant_uuid,
        max_concurrent_calls=max_concurrent,
        status="inactive"
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("")
async def list_campaigns(tenant_id: str, db: Session = Depends(get_db)):
    try:
        tenant_uuid = uuid.UUID(tenant_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid tenant_id UUID")
    return db.exec(select(Campaign).where(Campaign.tenant_id == tenant_uuid)).all()

@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id UUID")
    
    campaign = db.get(Campaign, campaign_uuid)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/{campaign_id}")
async def update_campaign(campaign_id: str, name: Optional[str] = None, status: Optional[str] = None, max_concurrent: Optional[int] = None, db: Session = Depends(get_db)):
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id UUID")

    campaign = db.get(Campaign, campaign_uuid)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if name is not None:
        campaign.name = name
    if status is not None:
        if status not in ("active", "inactive", "completed"):
            raise HTTPException(status_code=400, detail="Invalid status. Must be active, inactive, or completed")
        
        was_inactive = campaign.status != "active"
        campaign.status = status
        
        if status == "active" and was_inactive:
            try:
                import os
                from loguru import logger
                from arq import create_pool
                from arq.connections import RedisSettings
                redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
                redis = await create_pool(RedisSettings.from_dsn(redis_url))
                await redis.enqueue_job("start_campaign", campaign.id)
                logger.info(f"Triggered start_campaign ARQ job for campaign {campaign.id}")
            except Exception as e:
                logger.error(f"Failed to trigger ARQ start_campaign for campaign {campaign.id}: {e}")

    if max_concurrent is not None:
        campaign.max_concurrent_calls = max_concurrent
        
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, db: Session = Depends(get_db)):
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id UUID")

    campaign = db.get(Campaign, campaign_uuid)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"status": "deleted"}

@router.post("/{campaign_id}/sync")
async def force_sync_campaign_sheet(campaign_id: str):
    """Triggers spreadsheet synchronization instantly."""
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id UUID")
        
    imported = await poller.sync_campaign_sheet(campaign_uuid)
    return {"status": "synced", "leads_imported": imported}

@router.get("/{campaign_id}/leads")
async def get_campaign_leads(campaign_id: str, db: Session = Depends(get_db)):
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id UUID")
        
    return db.exec(select(CampaignLead).where(CampaignLead.campaign_id == campaign_uuid)).all()


# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS ENDPOINTS (Upgrade 5)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{campaign_id}/stats")
async def get_campaign_stats(campaign_id: str, db: Session = Depends(get_db)):
    """
    Returns aggregate call performance metrics for a campaign.
    (Upgrade 5 — Analytics Dashboard)
    """
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign_id UUID")

    campaign = db.get(Campaign, campaign_uuid)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    all_leads = db.exec(
        select(CampaignLead).where(CampaignLead.campaign_id == campaign_uuid)
    ).all()

    if not all_leads:
        return {
            "campaign_id": campaign_id,
            "campaign_name": campaign.name,
            "total_leads": 0,
            "dials_made": 0,
            "answer_rate_pct": 0,
            "voicemail_rate_pct": 0,
            "book_rate_pct": 0,
            "opt_out_count": 0,
            "avg_call_duration_sec": 0,
            "sentiment_breakdown": {"positive": 0, "neutral": 0, "negative": 0},
            "lead_tier_breakdown": {"hot": 0, "warm": 0, "cold": 0},
        }

    total = len(all_leads)
    dialed = [l for l in all_leads if l.attempts > 0]
    answered = [l for l in all_leads if l.status == "answered"]
    voicemail = [l for l in all_leads if l.status == "voicemail"]
    booked = [l for l in all_leads if l.appointment_datetime is not None]
    opted_out = [l for l in all_leads if l.opted_out]
    failed = [l for l in all_leads if l.status == "failed"]

    dials_made = len(dialed)
    answer_rate = round(len(answered) / dials_made * 100, 1) if dials_made else 0
    voicemail_rate = round(len(voicemail) / dials_made * 100, 1) if dials_made else 0
    book_rate = round(len(booked) / dials_made * 100, 1) if dials_made else 0

    durations = [l.call_duration_seconds for l in all_leads if l.call_duration_seconds > 0]
    avg_duration = round(sum(durations) / len(durations)) if durations else 0

    sentiment_breakdown = {
        "positive": len([l for l in all_leads if l.call_sentiment == "positive"]),
        "neutral":  len([l for l in all_leads if l.call_sentiment == "neutral"]),
        "negative": len([l for l in all_leads if l.call_sentiment == "negative"]),
    }

    tier_breakdown = {
        "hot":  len([l for l in all_leads if l.lead_tier == "hot"]),
        "warm": len([l for l in all_leads if l.lead_tier == "warm"]),
        "cold": len([l for l in all_leads if l.lead_tier == "cold"]),
    }

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.name,
        "campaign_status": campaign.status,
        "total_leads": total,
        "dials_made": dials_made,
        "answered_count": len(answered),
        "voicemail_count": len(voicemail),
        "booked_count": len(booked),
        "failed_count": len(failed),
        "opt_out_count": len(opted_out),
        "answer_rate_pct": answer_rate,
        "voicemail_rate_pct": voicemail_rate,
        "book_rate_pct": book_rate,
        "avg_call_duration_sec": avg_duration,
        "sentiment_breakdown": sentiment_breakdown,
        "lead_tier_breakdown": tier_breakdown,
    }


@router.get("/{campaign_id}/leads/{lead_id}/transcript")
async def get_lead_transcript(campaign_id: str, lead_id: str, db: Session = Depends(get_db)):
    """
    Returns the full call transcript, AI summary, and sentiment for a specific lead.
    (Upgrade 5 — Analytics)
    """
    try:
        lead_uuid = uuid.UUID(lead_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid lead_id UUID")

    lead = db.get(CampaignLead, lead_uuid)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {
        "lead_id": lead_id,
        "name": lead.name,
        "phone": lead.phone,
        "status": lead.status,
        "attempts": lead.attempts,
        "lead_score": lead.lead_score,
        "lead_tier": lead.lead_tier,
        "call_duration_seconds": lead.call_duration_seconds,
        "call_sentiment": lead.call_sentiment,
        "call_summary": lead.call_summary,
        "call_transcript": lead.call_transcript,
        "appointment_datetime": lead.appointment_datetime.isoformat() if lead.appointment_datetime else None,
        "opted_out": lead.opted_out,
    }
