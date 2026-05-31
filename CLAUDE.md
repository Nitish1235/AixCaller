# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Project Is

AIxCaller is a multi-tenant SaaS platform for AI-powered phone agents. Businesses create AI agents that handle inbound calls and run outbound dialing campaigns. Agents are backed by Telnyx Conversational AI and are configured via a Next.js dashboard. A separate outbound microservice handles campaign dialing via ARQ/Redis job queues.

---

## Repository Layout

```
AixCaller/
├── frontend/        # Next.js 16 (App Router), React 19, TypeScript
├── backend/         # FastAPI, SQLModel, Python 3.11 — main API + Telnyx webhooks
├── outbound/        # FastAPI, ARQ — campaign dialer + reminder engine
└── shared/          # models.py, database.py — imported by both Python services
```

The `shared/` package is the single source of truth for the database schema. Both `backend/` and `outbound/` import from it.

---

## Commands

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build
npm run lint         # ESLint
```

### Backend

```bash
cd ..   # repo root (shared/ must be importable)
pip install -r backend/requirements.txt

# One-time DB init (use Direct URL, port 5432, not Transaction Pooler)
python -c "from shared.database import init_db; init_db()"

# Run dev server (from repo root so shared/ resolves)
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Swagger UI at http://localhost:8000/docs
```

### Outbound Service

```bash
pip install -r outbound/requirements.txt
uvicorn outbound.main:app --host 0.0.0.0 --port 8001 --reload
# Cron trigger: POST /api/v1/outbound/cron (called by Cloud Scheduler every minute)
```

### Database Migrations

There is no Alembic. Schema changes are handled with hand-written migration scripts:

```bash
python backend/migrations/add_some_column.py
```

Each migration script calls `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`. Follow this pattern for all schema changes — never drop or rename columns in production.

---

## Architecture

### Request Flow — Inbound Call

```
Telnyx → POST /incoming-call (backend/main.py)
       → looks up Agent by phone_number
       → auto-provisions Telnyx Assistant if missing (telnyx_assistant.py)
       → returns TeXML: <AIAssistant id="..."/>
       → call ends → Telnyx POSTs to /call-status
       → call_processor.py → analytics, lead extraction, email summary, Airtable log
```

### Request Flow — Dashboard UI

```
Frontend (Next.js) → /api/v1/* → rewrites to backend (see next.config.ts)
                   → backend/api/dashboard.py, kb.py, campaigns.py, etc.
```

The `next.config.ts` rewrites `/api/v1/*` and `/incoming-call` to the backend URL set by `NEXT_PUBLIC_API_URL`. The frontend never calls the backend directly in production — all goes through Next.js rewrites.

### Request Flow — Outbound Campaign

```
Cloud Scheduler → POST /api/v1/outbound/cron (every minute)
                → dialer_engine.py picks pending CampaignLeads
                → Telnyx dials lead, connects to agent's Assistant
                → post-call webhook updates CampaignLead status
```

### Multi-Tenant Isolation

Every DB table has a `tenant_id` (UUID FK to `tenant`). All queries must filter by it. `tenant_id` is embedded in the JWT claim and also stored in a browser cookie for the frontend. The frontend extracts it with `getTenantId()` in `src/lib/api.ts`.

---

## Database

**Engine:** PostgreSQL (Supabase) + pgvector extension  
**ORM:** SQLModel (SQLAlchemy + Pydantic merged)  
**Schema:** `shared/models.py` — single source of truth

Key tables:

| Table | Purpose |
|-------|---------|
| `tenant` | Root account. Owns all resources. Holds OAuth tokens for all integrations. |
| `agent` | AI agent config. `telnyx_assistant_id` links to Telnyx. `tools_config` (JSON) stores call flow + Shopify per-agent settings. |
| `callrecord` | Immutable log. Analytics fields (`summary`, `sentiment`, `action_items`) written post-call. |
| `knowledge_chunks` | RAG chunks. `content` (Text) + pgvector `embedding` (1536-dim OpenAI). |
| `campaign` / `campaign_lead` | Outbound dialing. Lead status: `pending → in_progress → answered / voicemail / failed`. |
| `lead` | CRM record extracted from call transcript by analytics service. |

**Connection URLs:**
- `DATABASE_URL` — Supabase Transaction Pooler (port 6543) — used at runtime
- `DATABASE_DIRECT_URL` — Supabase Direct (port 5432) — used only for `init_db()` and migrations (pgvector `CREATE EXTENSION` requires direct connection)

**Shopify fields on Tenant:** `shopify_domain` + `shopify_token` (not `shopify_store_url` / `shopify_access_token` — those are the API-facing names in the dashboard schema but map to the correct model fields).

---

## Backend Patterns

### Creating/updating agent syncs Telnyx

Any time an `Agent` is created or its `system_prompt`, `voice_id`, or tool config changes, call:

```python
from backend.services.telnyx_assistant import sync_agent_with_telnyx
await sync_agent_with_telnyx(agent, db)
```

This provisions or updates the Telnyx AI Assistant and sets `agent.telnyx_assistant_id`.

### Pydantic models for API requests

Request bodies are Pydantic `BaseModel` subclasses defined in the same file as the route. Optional fields that might arrive as `null` from the frontend **must** be typed `Optional[str] = None` — never `str` without a default, or Pydantic will 422 on null.

### Frontend API client

`frontend/src/lib/api.ts` exports typed wrappers (`apiGet`, `apiPost`, `apiPatch`, `apiPut`) that prepend `API_BASE_URL` and add `Content-Type: application/json`. Import from there — never use raw `fetch` in page components.

---

## Key Environment Variables

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Transaction Pooler URL (port 6543) |
| `DATABASE_DIRECT_URL` | Direct URL (port 5432) — migrations only |
| `JWT_SECRET` | Min 32 chars — required at startup, app refuses to start without it |
| `INTERNAL_API_KEY` | Service-to-service auth |
| `OPENAI_API_KEY` | KB embeddings (`text-embedding-3-small`) |
| `XAI_API_KEY` | xAI/Grok — live calls + post-call analytics |
| `DEEPGRAM_API_KEY` | STT/TTS |
| `TELNYX_API_KEY` | Phone numbers + AI Assistant provisioning |
| `SERVER_HOST` | Backend hostname without `https://` — used to build webhook callback URLs |
| `NEXT_PUBLIC_API_URL` | Backend base URL — consumed by Next.js rewrites and client |
| `RESEND_API_KEY` | Email summaries post-call |

---

## Deployment

Three Cloud Run services: `backend`, `frontend`, `outbound`. Built via `cloudbuild.yaml` (parallel Docker builds). Secrets are stored in GCP Secret Manager and mounted as env vars.

**Run migrations after deploy:**
```bash
# Cloud Run Job or one-off container
DATABASE_URL=$DIRECT_URL python -c "from shared.database import init_db; init_db()"
```

New columns must have a corresponding migration script in `backend/migrations/`. Run them once against the live DB before or after deploying the code that references them.

---

## Integration Notes

- **Shopify** per-agent flow uses `Agent.tools_config` JSON (not Tenant). OAuth public app flow is disabled; only direct token entry is active.
- **Google / HubSpot / Salesforce** tokens live on `Tenant` (one per account). OAuth callbacks are in `backend/api/{google,hubspot,salesforce}.py`.
- **Airtable** credentials live on `Tenant` (`airtable_pat`, `airtable_base_id`, `airtable_table_name`).
- **Call flow config** for an agent is stored inside `Agent.tools_config["call_flow"]` as a JSON blob. Access via the `agent.call_flow` property.
