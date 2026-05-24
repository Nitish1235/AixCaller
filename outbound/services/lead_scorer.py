"""
outbound/services/lead_scorer.py
==================================
AI Lead Scoring Engine — evaluates each lead's custom variables
against the campaign context and assigns a score (1-10) and tier
(hot / warm / cold) using the LLM before dialing begins.

Hot leads (score >= 7) are dialed first and get more retry attempts.
Cold leads (score <= 3) are queued last to save minutes on low-intent contacts.
"""

import os
import json
import httpx
from loguru import logger
from sqlmodel import Session, select
from shared.database import engine
from shared.models import CampaignLead, Campaign

# Scoring boundaries
HOT_THRESHOLD = 7
COLD_THRESHOLD = 4

OPENAI_URL = "https://api.openai.com/v1/chat/completions"


def _tier_from_score(score: int) -> str:
    if score >= HOT_THRESHOLD:
        return "hot"
    elif score >= COLD_THRESHOLD:
        return "warm"
    return "cold"


def _build_scoring_prompt(lead: CampaignLead, campaign_name: str) -> str:
    """Build the LLM scoring prompt using lead's custom variables."""
    vars_text = "\n".join(
        f"  - {k}: {v}"
        for k, v in lead.variables.items()
        if k != "sheet_row_number" and v
    )
    return f"""You are a sales lead qualification expert. Score this lead on a scale of 1-10.

Campaign: {campaign_name}
Lead Name: {lead.name}
Phone: {lead.phone}
Email: {lead.email or "N/A"}
Custom Data:
{vars_text or "  (no additional data)"}

Scoring criteria:
- 9-10: Decision maker, strong intent signals, warm relationship or past engagement
- 7-8: Clear need, relevant title/industry, recent activity
- 5-6: Some relevance but incomplete data or unclear intent
- 3-4: Low relevance, wrong industry, or limited data
- 1-2: Junk data, wrong number format, or obvious mismatch

Respond ONLY with a JSON object like:
{{"score": 7, "reason": "One sentence explanation"}}"""


async def score_lead(lead: CampaignLead, campaign: Campaign) -> tuple[int, str]:
    """
    Calls the LLM to score a lead. Returns (score, tier).
    Falls back to (5, 'warm') gracefully on any API failure.
    """
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        logger.debug("OPENAI_API_KEY not set — skipping AI lead scoring, using default score 5.")
        return 5, "warm"

    try:
        prompt = _build_scoring_prompt(lead, campaign.name)
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                OPENAI_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 80,
                }
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"].strip()

            # Parse JSON response
            data = json.loads(content)
            score = max(1, min(10, int(data.get("score", 5))))
            tier = _tier_from_score(score)
            reason = data.get("reason", "")
            logger.info(f"Lead {lead.name} ({lead.phone}) scored {score}/10 ({tier}). Reason: {reason}")
            return score, tier

    except Exception as e:
        logger.warning(f"Lead scoring failed for {lead.id} — defaulting to 5/warm. Error: {e}")
        return 5, "warm"


async def score_campaign_leads(campaign_id) -> int:
    """
    Scores all pending, unscored leads in a campaign.
    Runs once after each sheet sync. Returns number of leads scored.
    """
    scored = 0
    with Session(engine) as db:
        campaign = db.get(Campaign, campaign_id)
        if not campaign:
            return 0

        # Only score leads that still have the default score (5) and are pending
        pending_leads = db.exec(
            select(CampaignLead).where(
                CampaignLead.campaign_id == campaign_id,
                CampaignLead.status == "pending",
                CampaignLead.lead_score == 5,   # default — not yet scored
            )
        ).all()

        for lead in pending_leads:
            score, tier = await score_lead(lead, campaign)
            lead.lead_score = score
            lead.lead_tier = tier
            db.add(lead)
            scored += 1

        db.commit()

    logger.info(f"Scored {scored} leads for campaign {campaign_id}.")
    return scored
