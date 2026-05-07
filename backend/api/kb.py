from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlmodel import Session, select
from typing import Optional, List
import uuid
from shared.database import engine, get_db
from shared.models import Agent, KnowledgeChunk
from backend.services.kb import IngestionService
from backend.services.scraper import ScraperService

router = APIRouter(prefix="/api/v1/kb", tags=["knowledge-base"])
kb_service = IngestionService()
scraper_service = ScraperService()


@router.get("/chunks")
async def list_kb_chunks(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """
    List all knowledge base chunks for a specific agent.
    Returns source groups with chunk counts so the dashboard can show what's ingested.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    chunks = db.exec(
        select(KnowledgeChunk)
        .where(KnowledgeChunk.agent_id == agent_id)
        .order_by(KnowledgeChunk.created_at.desc())
    ).all()

    # Group by source for a compact summary
    sources: dict = {}
    for c in chunks:
        src = c.source or "manual"
        if src not in sources:
            sources[src] = {"source": src, "chunks": 0, "created_at": str(c.created_at)}
        sources[src]["chunks"] += 1

    return {
        "total_chunks": len(chunks),
        "sources": list(sources.values())
    }


@router.post("/upload-text")
async def upload_text(
    agent_id: uuid.UUID,
    content: str,
    source: Optional[str] = "manual",
    db: Session = Depends(get_db)
):
    """
    Ingest plain text into the agent's knowledge base.
    Content is chunked, embedded, and stored in pgvector.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    count = await kb_service.ingest_text(
        content=content,
        tenant_id=agent.tenant_id,
        agent_id=agent.id,
        source=source
    )
    return {"status": "success", "chunks_stored": count}


@router.post("/upload-file")
async def upload_file(
    agent_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a text file (.txt, .md) directly into the knowledge base.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    raw = await file.read()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text.")

    count = await kb_service.ingest_text(
        content=text,
        tenant_id=agent.tenant_id,
        agent_id=agent.id,
        source=file.filename or "uploaded-file"
    )
    return {"status": "success", "chunks_stored": count, "filename": file.filename}


@router.post("/sync-url")
async def sync_website_url(
    url: str,
    agent_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Scrapes a website and ingests the content into the agent's knowledge base.
    Runs in the background to avoid blocking the request.
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    tenant_id = agent.tenant_id
    agent_id_val = agent.id

    async def process_url_sync(target_url: str):
        try:
            scraped_text = scraper_service.scrape_url(target_url, max_pages=5)
            count = await kb_service.ingest_text(
                content=scraped_text,
                tenant_id=tenant_id,
                agent_id=agent_id_val,
                source=target_url
            )
            print(f"Synced {target_url}: {count} chunks stored.")
        except Exception as e:
            print(f"Failed to sync {target_url}: {e}")

    background_tasks.add_task(process_url_sync, url)
    return {"message": "Sync started. Content will be available shortly."}


@router.delete("/clear")
async def clear_agent_kb(agent_id: uuid.UUID, db: Session = Depends(get_db)):
    """Delete all knowledge base chunks for a specific agent."""
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await kb_service.delete_agent_kb(agent_id)
    return {"status": "success", "message": "Knowledge base cleared."}
