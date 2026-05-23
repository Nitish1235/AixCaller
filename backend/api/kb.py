from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import Optional, List
import uuid
from shared.database import engine, get_db
from shared.models import Agent, KnowledgeChunk, Tenant
from backend.services.kb import IngestionService
from backend.services.google_oauth import fetch_sheet_values
from loguru import logger

router = APIRouter(prefix="/api/v1/kb", tags=["knowledge-base"])
kb_service = IngestionService()


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


class TextUploadBody(BaseModel):
    content: str
    source: Optional[str] = "manual"


@router.post("/upload-text")
async def upload_text(
    agent_id: uuid.UUID,
    body: TextUploadBody,
    db: Session = Depends(get_db)
):
    """
    Ingest plain text into the agent's knowledge base.
    Content is uploaded to Telnyx Cloud Storage and natively embedded.
    Send JSON body: { "content": "...", "source": "manual" }
    """
    agent = db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    count = await kb_service.ingest_text(
        content=body.content,
        tenant_id=agent.tenant_id,
        agent_id=agent.id,
        source=body.source or "manual"
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
            import httpx
            from bs4 import BeautifulSoup
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                resp = await client.get(target_url, headers={"User-Agent": "AIxCaller-KB-Bot/1.0"})
                resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            scraped_text = soup.get_text(separator="\n", strip=True)
            count = await kb_service.ingest_text(
                content=scraped_text,
                tenant_id=tenant_id,
                agent_id=agent_id_val,
                source=target_url,
            )
            logger.info(f"URL sync complete: {target_url} → {count} chunks")
        except Exception as e:
            logger.error(f"Failed to sync {target_url}: {e}")

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


class GoogleSheetSyncRequest(BaseModel):
    agent_id: uuid.UUID
    sheet_id: str
    sheet_name: str = "Sheet1"


@router.post("/sync-google-sheet")
async def sync_google_sheet_kb(body: GoogleSheetSyncRequest, db: Session = Depends(get_db)):
    """
    Fetch data from Google Sheets, serialize rows into semantic paragraphs, and ingest
    them into the agent's RAG system.
    """
    agent = db.get(Agent, body.agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    tenant = db.get(Tenant, agent.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    if not tenant.google_connected:
        raise HTTPException(status_code=400, detail="Google account not connected for this tenant.")

    try:
        # Fetch up to 500 rows across columns A to Z
        range_name = f"{body.sheet_name}!A1:Z500"
        rows = await fetch_sheet_values(tenant, body.sheet_id, range_name)
    except Exception as e:
        logger.error(f"Google Sheet fetch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch Google Sheet: {str(e)}")

    if not rows or len(rows) < 2:
        raise HTTPException(status_code=400, detail="Google Sheet is empty or contains insufficient rows.")

    # Serialize headers and cell values
    headers = [str(h).strip() for h in rows[0]]
    serialized_lines = []

    for idx, row in enumerate(rows[1:]):
        row_parts = []
        for col_idx, val in enumerate(row):
            if col_idx < len(headers):
                header_name = headers[col_idx]
                if header_name:
                    row_parts.append(f"{header_name}: {val}")
            else:
                row_parts.append(f"Column {col_idx+1}: {val}")
        
        if row_parts:
            # Create a coherent semantic representation of this row
            serialized_lines.append(f"Record {idx + 1}: " + " | ".join(row_parts))

    serialized_content = "\n\n".join(serialized_lines)

    # Ingest the generated plain text into the Knowledge Base
    count = await kb_service.ingest_text(
        content=serialized_content,
        tenant_id=agent.tenant_id,
        agent_id=agent.id,
        source=f"Google Sheet: {body.sheet_name} (ID: {body.sheet_id})"
    )

    return {
        "status": "success",
        "chunks_stored": count,
        "rows_processed": len(rows) - 1,
        "message": f"Successfully ingested {len(rows) - 1} rows as {count} knowledge chunks."
    }

