# AIxCaller — Google Cloud Deployment Guide

This guide walks you through deploying the complete AIxCaller platform to Google Cloud Platform (GCP) **entirely through the Google Cloud Console dashboard** — no CLI commands required.

The platform consists of three Cloud Run services:

| Service | Description | Port |
|---|---|---|
| `aixcaller-backend` | FastAPI — Plivo webhooks, dashboard API, Telegram | 8080 |
| `aixcaller-voice-engine` | FastAPI — Plivo WebSocket `/ws`, Browser Demo `/demo` | 8080 |
| `aixcaller-frontend` | Next.js — User dashboard & landing page | 3000 |

> **Infrastructure Note:** AIxCaller uses **Supabase (PostgreSQL + pgvector)** as its only database.
> Weaviate is **not used**. All vector embeddings for the AI knowledge base are stored directly in Postgres via the `pgvector` extension.

---

## Step 1 — Enable Required GCP APIs

1. Open your GCP project in the [Cloud Console](https://console.cloud.google.com).
2. Navigate to **APIs & Services → Library**.
3. Search and **Enable** each of the following APIs:
   - Cloud Run API
   - Cloud Build API
   - Artifact Registry API
   - Secret Manager API

---

## Step 2 — Create an Artifact Registry Repository

This is where your Docker images will be stored.

1. Navigate to **Artifact Registry → Repositories**.
2. Click **Create Repository**.
3. Fill in the fields:
   - **Name:** `aixcaller-repo`
   - **Format:** Docker
   - **Region:** `us-central1`
4. Click **Create**.

---

## Step 3 — Set Up PostgreSQL + pgvector (Supabase)

AIxCaller uses **Supabase** as its managed PostgreSQL database for **both** relational data and vector embeddings (via the `pgvector` extension). No separate vector database is needed.

> ⚠️ **Important:** Supabase gives you two connection URLs. You need **both**.

1. Go to [supabase.com](https://supabase.com) and click **Start your project**.
2. Create a new project:
   - **Name:** `aixcaller`
   - **Database Password:** Generate a strong password and save it immediately.
   - **Region:** Choose the closest to `us-central1` (e.g., `us-east-1`).
3. Wait for the project to finish provisioning (~2 minutes).
4. Navigate to **Project Settings → Database**.
5. Scroll to **Connection String** and copy both:

   **RUNTIME URL (Transaction Pooler — use this in Cloud Run):**
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```
   **MIGRATION URL (Direct Connection — use this only for `init_db`):**
   ```
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require
   ```

> **Why two URLs?** Cloud Run is serverless — instances spin up and down constantly. The direct connection would exhaust Postgres's connection limit. The **Transaction Pooler** (PgBouncer on port 6543) handles connection pooling automatically.

> **pgvector:** Supabase has the `vector` extension pre-installed. The `init_db` script (Step 8) will automatically enable it with `CREATE EXTENSION IF NOT EXISTS vector;`.

---

## Step 4 — Store Secrets in Secret Manager

Instead of pasting API keys directly into Cloud Run environment variables, store them securely here.

1. Navigate to **Secret Manager**.
2. Click **Create Secret** for each of the following:

| Secret Name | Value |
|---|---|
| `DATABASE_URL` | Supabase **Transaction Pooler** URL (port 6543) |
| `DATABASE_DIRECT_URL` | Supabase **Direct Connection** URL (port 5432) |
| `OPENAI_API_KEY` | OpenAI key — used for KB embeddings (`text-embedding-3-small`) |
| `DEEPGRAM_API_KEY` | Your Deepgram STT/TTS key |
| `XAI_API_KEY` | Your xAI / Grok LLM key |
| `PLIVO_AUTH_ID` | Your Plivo Auth ID |
| `PLIVO_AUTH_TOKEN` | Your Plivo Auth Token |
| `JWT_SECRET` | A long random string (min 32 chars) |
| `TELEGRAM_BOT_TOKEN` | Token from @BotFather |

3. For each secret, click **Create Secret**, paste the value, click **Create**.

---

## Step 5 — Build Docker Images via Cloud Build

1. Connect your GitHub repository to Cloud Build:
   - Navigate to **Cloud Build → Triggers**.
   - Click **Connect Repository** → follow the OAuth flow to link GitHub.
2. Click **Create Trigger**:
   - **Name:** `build-all-images`
   - **Event:** Manual invocation
   - **Repository:** Select your connected repo
   - **Configuration:** `Cloud Build configuration file (YAML)`
   - **File location:** `cloudbuild.yaml`
3. Click **Save**, then click **Run** on the trigger.
4. Wait for the build to complete (usually 5–10 minutes).
5. Verify that 3 images now appear in **Artifact Registry → aixcaller-repo**:
   - `frontend`
   - `backend`
   - `voice-engine`

---

## Step 6 — Deploy Cloud Run Services

### 6A — Deploy the Voice Engine

> Deploy this first so you have its URL ready for the Backend.

1. Navigate to **Cloud Run → Create Service**.
2. Click **Select** under Container Image → choose `voice-engine` from Artifact Registry.
3. Configure:
   - **Service name:** `aixcaller-voice-engine`
   - **Region:** `us-central1`
   - **Authentication:** Allow unauthenticated invocations ✅
4. Expand **Container, Volumes, Networking, Security**:
   - **Container port:** `8080`
   - Under **Variables & Secrets**, add the following as **Secret References**:
     - `DEEPGRAM_API_KEY`
     - `XAI_API_KEY`
     - `JWT_SECRET`
     - `DATABASE_URL`
   - Add as plain **Environment Variables**:
     - `PYTHONUNBUFFERED` = `1`
5. Under the **Networking** tab, enable **Session Affinity** (required for WebSocket stability).
6. Click **Create**.
7. ✅ **Copy the generated service URL** (e.g., `https://aixcaller-voice-engine-xxxx.a.run.app`).

---

### 6B — Deploy the Backend

1. Navigate to **Cloud Run → Create Service**.
2. Select the `backend` image from Artifact Registry.
3. Configure:
   - **Service name:** `aixcaller-backend`
   - **Region:** `us-central1`
   - **Authentication:** Allow unauthenticated invocations ✅
4. Expand **Container, Volumes, Networking, Security**:
   - **Container port:** `8080`
   - Add as **Secret References**:
     - `DATABASE_URL`
     - `DATABASE_DIRECT_URL`
     - `OPENAI_API_KEY`
     - `DEEPGRAM_API_KEY`
     - `PLIVO_AUTH_ID`
     - `PLIVO_AUTH_TOKEN`
     - `JWT_SECRET`
     - `TELEGRAM_BOT_TOKEN`
   - Add as plain **Environment Variables**:
     - `SERVER_HOST` = `aixcaller-backend-xxxx.a.run.app` *(your backend URL without https://)*
     - `VOICE_ENGINE_URL` = `wss://aixcaller-voice-engine-xxxx.a.run.app/ws`
     - `BACKEND_URL` = `https://aixcaller-backend-xxxx.a.run.app`
     - `PYTHONUNBUFFERED` = `1`
5. Click **Create**.
6. ✅ **Copy the generated service URL** (e.g., `https://aixcaller-backend-xxxx.a.run.app`).

---

### 6C — Deploy the Frontend

1. Navigate to **Cloud Run → Create Service**.
2. Select the `frontend` image from Artifact Registry.
3. Configure:
   - **Service name:** `aixcaller-frontend`
   - **Region:** `us-central1`
   - **Authentication:** Allow unauthenticated invocations ✅
4. Expand **Container, Volumes, Networking, Security**:
   - **Container port:** `3000`
   - Add as plain **Environment Variables**:
     - `NEXT_PUBLIC_API_URL` = `https://aixcaller-backend-xxxx.a.run.app`
     - `NEXT_PUBLIC_VOICE_ENGINE_WS_URL` = `wss://aixcaller-voice-engine-xxxx.a.run.app`
     - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = `AIxCaller_Alerts_Bot` *(your bot's username)*
5. Click **Create**.
6. ✅ Your frontend is now live at the generated URL.

---

## Step 7 — Initialize the Database

Run the database initialization script **once** after first deploy. This will:
1. Enable the `pgvector` extension in Supabase
2. Create all PostgreSQL tables (`tenants`, `agents`, `call_records`, `knowledge_chunks`, etc.)
3. Create an **HNSW vector index** on `knowledge_chunks.embedding` for fast semantic search

> ⚠️ This must use the **Direct Connection URL** (port 5432), not the Pooler.

**Cloud Run Job (Recommended):**
1. Navigate to **Cloud Run → Jobs → Create Job**.
2. Select the `backend` image.
3. Set the command override to: `python -m shared.database`
4. Add environment variables:
   - `DATABASE_URL` = your **Direct Connection URL** (port 5432) — override for this job only
   - `DATABASE_DIRECT_URL` = same Direct Connection URL
   - All other secrets same as the backend service
5. Click **Execute** once. All tables and the HNSW index will be created.
6. ✅ Verify the tables appeared in your **Supabase Dashboard → Table Editor**:
   - `tenant`
   - `agent`
   - `callrecord`
   - `knowledge_chunks` ← pgvector table with 1536-dim embeddings
   - `voiceoption`

---

## Step 8 — Configure Plivo Webhooks

1. Log into your [Plivo Console](https://console.plivo.com).
2. Navigate to **Phone Numbers → Your Number → Edit**.
3. Set the following URLs:

| Webhook | URL |
|---|---|
| Answer URL | `https://aixcaller-backend-xxxx.a.run.app/incoming-call` |
| Hangup URL | `https://aixcaller-backend-xxxx.a.run.app/call-status` |

4. Click **Update**.

> The `Hangup URL` powers **Missed Call Auto-Recovery**. Plivo calls this endpoint on every call end, which the backend uses to detect missed calls and schedule automatic callbacks.

---

## Step 9 — Register Telegram Bot Webhook

This is a one-time setup that connects your Telegram bot to your backend.

1. Open your browser and navigate to (replace the placeholders):
   ```
   https://api.telegram.org/bot<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook?url=https://aixcaller-backend-xxxx.a.run.app/api/v1/telegram/webhook
   ```
2. You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`
3. ✅ Telegram will now deliver all bot messages to your backend automatically.

---

## Step 10 — Verify Everything Is Working

| Check | How to Verify |
|---|---|
| Backend is live | Visit `https://<backend-url>/docs` — FastAPI docs should load |
| Voice Engine is live | Visit `https://<voice-engine-url>/docs` — FastAPI docs should load |
| Frontend is live | Open the frontend URL — landing page should appear |
| Demo works | Click 🎤 on the landing page, grant mic access, talk to the AI |
| pgvector KB works | Upload a document in the dashboard → make a call and ask a question from it |
| Inbound call works | Call your Plivo number — AI should answer |
| Missed call recovery | Call and hang up before AI answers — you should get a callback in 60s |
| Telegram alerts | Connect Telegram from the Integrations page, make a call, check Telegram |

---

## Architecture Diagram

```
                    ┌────────────────────────────────┐
                    │       Google Cloud Run         │
                    │                                │
  Browser ─────────▶  aixcaller-frontend (Next.js)  │
                    │          :3000                 │
                    │              │                 │
  Plivo ────────────▶  aixcaller-backend (FastAPI)  │
  Telegram ─────────▶        :8080                  │
                    │              │                 │
  Plivo Audio ──────▶  aixcaller-voice-engine       │
  Browser Demo ─────▶        :8080 /ws /demo        │
                    │                                │
                    └────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Supabase (PostgreSQL)     │
                    │                             │
                    │  • Tenants, Agents, Calls   │
                    │  • knowledge_chunks         │
                    │    └─ pgvector (1536-dim)   │
                    │    └─ HNSW cosine index     │
                    └─────────────────────────────┘
```

---

## Environment Variables Quick Reference

| Variable | Used By | Description |
|---|---|---|
| `DATABASE_URL` | Backend, Voice Engine | Supabase Transaction Pooler URL (port 6543) |
| `DATABASE_DIRECT_URL` | `init_db` job only | Supabase Direct Connection URL (port 5432) |
| `OPENAI_API_KEY` | Backend | OpenAI `text-embedding-3-small` for KB vectors |
| `DEEPGRAM_API_KEY` | Backend, Voice Engine | Deepgram STT & TTS |
| `XAI_API_KEY` | Voice Engine | xAI / Grok LLM API key |
| `PLIVO_AUTH_ID` | Backend, Voice Engine | Plivo account ID |
| `PLIVO_AUTH_TOKEN` | Backend, Voice Engine | Plivo account token |
| `JWT_SECRET` | Backend, Voice Engine | Shared JWT signing secret |
| `SERVER_HOST` | Backend | Backend hostname (no `https://`) |
| `VOICE_ENGINE_URL` | Backend | `wss://` URL to Voice Engine `/ws` |
| `BACKEND_URL` | Voice Engine | `https://` URL to Backend |
| `TELEGRAM_BOT_TOKEN` | Backend | Token from @BotFather |
| `NEXT_PUBLIC_API_URL` | Frontend | Backend public URL |
| `NEXT_PUBLIC_VOICE_ENGINE_WS_URL` | Frontend | Voice Engine public `wss://` URL |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Frontend | Telegram bot username |

---

## Knowledge Base — How pgvector Works

The AI knowledge base is powered by **pgvector** running inside Supabase, replacing any need for a separate vector database.

| Step | What Happens |
|---|---|
| **Upload** | Text is split into 400-word chunks (50-word overlap) |
| **Embed** | Each chunk is embedded via `text-embedding-3-small` (1536 dims) |
| **Store** | Embeddings saved to `knowledge_chunks` table in Supabase |
| **Search** | At call time, query is embedded and top-3 chunks retrieved via `<=>` cosine distance |
| **Inject** | Retrieved chunks are prepended to the LLM system prompt |

The **HNSW index** (`m=16, ef_construction=64`) ensures sub-millisecond vector lookups even at scale, created automatically by `init_db`.
