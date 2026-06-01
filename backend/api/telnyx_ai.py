import uuid
import os
import httpx
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from loguru import logger
from sqlmodel import Session, select

from shared.database import get_db
from shared.models import Tenant, Agent, CallRecord
from shared.kb import search_knowledge_base
from backend.services.call_processor import process_completed_call
from backend.services.google_oauth import get_calendar_availability, create_calendar_event, append_lead_to_sheet

router = APIRouter(prefix="/api/v1/telnyx-ai", tags=["telnyx-ai"])


def _extract_query(payload: Any) -> str:
    """Recursively find a 'query' string in any Telnyx webhook payload shape."""
    if isinstance(payload, dict):
        for k, v in payload.items():
            if k.lower() == "query" and isinstance(v, str):
                return v
            found = _extract_query(v)
            if found:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _extract_query(item)
            if found:
                return found
    return ""


async def _get_sheet_token(tenant: Tenant, db: Session) -> str:
    """Return a valid Google access token for the tenant, refreshing if needed."""
    try:
        from outbound.services.sheet_poller import get_valid_google_token
        return await get_valid_google_token(tenant, db) or ""
    except Exception as e:
        logger.warning(f"Could not obtain Google token: {e}")
        return ""

@router.post("/kb-search")
async def telnyx_kb_search(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Synchronous webhook tool for Telnyx Conversational AI to search the Knowledge Base.
    The URL configured in Telnyx should be:
    https://api.aixcaller.com/api/v1/telnyx-ai/kb-search?tenant_id=<id>&agent_id=<id>
    """
    try:
        payload = await request.json()
        logger.info(f"Received Telnyx AI KB Search Webhook: {payload}")

        # Extract search query parameters recursively
        query = "general information" # default fallback
        
        def find_query(d: Any) -> str:
            if isinstance(d, dict):
                for k, v in d.items():
                    if k.lower() == "query" and isinstance(v, str):
                        return v
                    res = find_query(v)
                    if res:
                        return res
            elif isinstance(d, list):
                for item in d:
                    res = find_query(item)
                    if res:
                        return res
            return ""

        extracted_query = find_query(payload)
        if extracted_query:
            query = extracted_query

        logger.info(f"Telnyx AI querying KB for: {query}")

        try:
            t_uuid = uuid.UUID(tenant_id)
            a_uuid = uuid.UUID(agent_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid tenant_id or agent_id format")

        kb_result = await search_knowledge_base(
            query=query,
            tenant_id=t_uuid,
            agent_id=a_uuid,
            limit=3
        )

        return {
            "status": "success",
            "result": kb_result if kb_result else "No information found in the knowledge base."
        }
    except Exception as e:
        logger.error(f"Telnyx KB Search Webhook failed: {e}")
        return {"status": "error", "message": str(e)}


@router.post("/call-ended")
async def telnyx_call_ended(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Async webhook hit by Telnyx when a Conversational AI call ends.
    Configured URL:
    https://api.aixcaller.com/api/v1/telnyx-ai/call-ended?tenant_id=<id>&agent_id=<id>
    """
    try:
        payload = await request.json()
        logger.info(f"Received Telnyx Webhook for Agent {agent_id}: {payload}")

        t_uuid = uuid.UUID(tenant_id)
        a_uuid = uuid.UUID(agent_id)

        # 1. Identify webhook event type
        event_type = payload.get("event_type") or payload.get("data", {}).get("event_type")
        if event_type != "call.conversation.ended":
            logger.info(f"Ignoring non-conversation-ended event: {event_type}")
            return {"status": "ignored", "event_type": event_type}

        # 2. Extract payload block
        data_block = payload.get("data", {})
        event_payload = data_block.get("payload", {}) if isinstance(data_block, dict) else payload.get("payload", {})
        if not event_payload:
            event_payload = payload

        conversation_id = event_payload.get("conversation_id")
        call_control_id = event_payload.get("call_control_id", "unknown")
        duration_sec = int(event_payload.get("duration_sec", 0))

        # Check for from/to number details
        from_number = event_payload.get("from") or event_payload.get("from_number") or "Customer"
        to_number = event_payload.get("to") or event_payload.get("to_number") or "AI Agent"

        logger.info(f"Call conversation ended. ID: {conversation_id}, duration: {duration_sec}s")

        if not conversation_id:
            logger.warning("No conversation_id provided in the ended webhook. Aborting sync.")
            return {"status": "error", "message": "Missing conversation_id"}

        # 3. Pull conversation messages transcript from Telnyx REST API
        api_key = os.environ.get("TELNYX_API_KEY")
        transcript_messages = []
        if api_key:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Accept": "application/json"
            }
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        f"https://api.telnyx.com/v2/ai/conversations/{conversation_id}/messages",
                        headers=headers,
                        timeout=15.0
                    )
                    if response.status_code == 200:
                        resp_json = response.json()
                        messages_data = resp_json.get("data", [])
                        # Normalize into standard system transcript structure
                        for msg in messages_data:
                            role = msg.get("role", "")
                            content = msg.get("content", "")
                            if role and content:
                                transcript_messages.append({
                                    "role": role,
                                    "content": content
                                })
                        logger.info(f"Successfully retrieved {len(transcript_messages)} messages from Telnyx AI conversation")
                    else:
                        logger.error(f"Failed to fetch conversation history from Telnyx: {response.status_code} - {response.text}")
                except Exception as ex:
                    logger.error(f"Failed to retrieve conversation history from Telnyx due to exception: {ex}")
        else:
            logger.error("Missing TELNYX_API_KEY - cannot retrieve conversation transcript")

        # 4. Trigger Shared Call Processor
        # Will handle DB insertion, analytics, email summary notifications, and Zoho CRM
        res = await process_completed_call(
            tenant_id=t_uuid,
            agent_id=a_uuid,
            customer_phone=from_number,
            agent_phone=to_number,
            call_id=call_control_id,
            transcript=transcript_messages,
            duration_seconds=duration_sec,
            db=db
        )

        return {"status": "success", "processed_record": res}

    except Exception as e:
        logger.error(f"Telnyx Call Ended Webhook failed: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/calendar-availability")
async def telnyx_calendar_availability(request: Request, tenant_id: str, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        date = payload.get("date")
        if not date:
            return {"status": "success", "result": "Please provide a valid date in YYYY-MM-DD format."}

        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant or not tenant.google_connected:
            return {"status": "success", "result": "Calendar integration is not connected for this business."}
            
        busy_slots = await get_calendar_availability(tenant, date)
        if not busy_slots:
            return {"status": "success", "result": f"The calendar is completely free on {date}."}
            
        return {"status": "success", "result": f"The following times are busy on {date}: {', '.join(busy_slots)}."}
    except Exception as e:
        logger.error(f"Telnyx calendar availability failed: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/calendar-book")
async def telnyx_calendar_book(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        name = payload.get("name")
        phone = payload.get("phone")
        date = payload.get("date")
        time = payload.get("time")
        
        if not all([name, phone, date, time]):
            return {"status": "success", "result": "Missing required information to book the appointment."}

        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant or not tenant.google_connected:
            return {"status": "success", "result": "Calendar integration is not connected."}
            
        title = f"Meeting: {name}"
        desc = f"Phone: {phone}\nPurpose: {payload.get('purpose', 'General Inquiry')}"
        
        event = await create_calendar_event(tenant, title, date, time, 60, desc, payload.get("email"))
        return {"status": "success", "result": f"Appointment successfully booked for {name} on {date} at {time}."}
    except Exception as e:
        logger.error(f"Telnyx calendar book failed: {e}")
        return {"status": "success", "result": "Failed to book the appointment due to a calendar error."}

@router.post("/record-lead")
async def telnyx_record_lead(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant or not tenant.google_connected:
            return {"status": "success", "result": "Lead capture is not configured."}
            
        lead_data = {
            "name": payload.get("name", "Unknown"),
            "phone": payload.get("phone", "Unknown"),
            "email": payload.get("email", ""),
            "intent": payload.get("intent", ""),
            "notes": payload.get("notes", ""),
            "status": "new",
            "agent_name": "AI Assistant"
        }
        
        # We need to map the agent's sheet config if it exists
        agent = db.get(Agent, uuid.UUID(agent_id))
        sheet_id = (agent.tools_config or {}).get("google_sheet", {}).get("sheet_id")
        
        if sheet_id:
            # Overwrite tenant's default sheet ID for this tool call
            tenant.google_sheet_id = sheet_id
            
        row = await append_lead_to_sheet(tenant, lead_data)
        if row:
            return {"status": "success", "result": "Lead information successfully recorded."}
        return {"status": "success", "result": "Failed to record lead info."}
    except Exception as e:
        logger.error(f"Telnyx record lead failed: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/custom-api")
async def telnyx_custom_api(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Mid-call webhook tool: proxies the AI's query to the agent's configured custom REST endpoint.
    Returns the response text back to Telnyx so the AI can speak the answer.
    """
    try:
        payload = await request.json()

        def find_query(d: Any) -> str:
            if isinstance(d, dict):
                for k, v in d.items():
                    if k.lower() == "query" and isinstance(v, str):
                        return v
                    res = find_query(v)
                    if res:
                        return res
            elif isinstance(d, list):
                for item in d:
                    res = find_query(item)
                    if res:
                        return res
            return ""

        query = find_query(payload) or payload.get("query", "")

        agent = db.get(Agent, uuid.UUID(agent_id))
        if not agent:
            return {"status": "error", "result": "Agent not found."}

        custom_api_cfg = (agent.tools_config or {}).get("custom_api", {})
        endpoint = custom_api_cfg.get("endpoint", "").strip()
        method = (custom_api_cfg.get("method") or "GET").upper()
        auth_header = custom_api_cfg.get("auth_header", "").strip()

        if not endpoint:
            return {"status": "error", "result": "Custom API is not configured for this agent."}

        headers: dict = {"Content-Type": "application/json", "Accept": "application/json"}
        if auth_header:
            headers["Authorization"] = auth_header

        async with httpx.AsyncClient(timeout=10.0) as client:
            if method == "POST":
                resp = await client.post(endpoint, headers=headers, json={"query": query})
            else:
                resp = await client.get(endpoint, headers=headers, params={"query": query})

        if resp.status_code == 200:
            # Cap response at 800 chars so it fits comfortably in TTS
            result_text = resp.text[:800]
            logger.info(f"Custom API lookup succeeded for agent {agent_id}: {len(resp.text)} bytes")
            return {"status": "success", "result": result_text}
        else:
            logger.warning(f"Custom API returned {resp.status_code} for agent {agent_id}")
            return {"status": "error", "result": "The data lookup service is temporarily unavailable. Please try again or ask your question differently."}

    except httpx.TimeoutException:
        logger.error(f"Custom API timed out for agent {agent_id}")
        return {"status": "error", "result": "The data lookup timed out. Please try again in a moment."}
    except Exception as e:
        logger.error(f"Custom API lookup failed for agent {agent_id}: {e}")
        return {"status": "error", "result": "An error occurred while fetching the data."}


@router.post("/sheet-search")
async def telnyx_sheet_search(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Mid-call tool: keyword-searches the agent's Google Sheet for structured data
    (pricing, packages, service details, staff, policies, etc.) and returns the
    most relevant rows as spoken-friendly text.
    """
    try:
        payload = await request.json()
        query = (_extract_query(payload) or "").lower().strip()
        if not query:
            return {"status": "success", "result": "Please repeat your question and I'll look it up for you."}

        agent = db.get(Agent, uuid.UUID(agent_id))
        if not agent:
            return {"status": "error", "result": "Agent not configured."}

        sheet_cfg  = (agent.tools_config or {}).get("google_sheet", {})
        sheet_id   = sheet_cfg.get("sheet_id", "").strip()
        sheet_name = sheet_cfg.get("sheet_name", "Sheet1").strip() or "Sheet1"

        if not sheet_id:
            return {"status": "success", "result": "No data sheet is configured for this business yet."}

        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant or not tenant.google_connected:
            return {"status": "success", "result": "The data sheet is not connected right now."}

        token = await _get_sheet_token(tenant, db)
        if not token:
            return {"status": "error", "result": "Unable to access the data sheet at this moment."}

        # Fetch all sheet values in one API call
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_name}",
                headers={"Authorization": f"Bearer {token}"},
            )

        if resp.status_code != 200:
            logger.warning(f"Sheet search API returned {resp.status_code} for agent {agent_id}")
            return {"status": "error", "result": "The data sheet is temporarily unavailable."}

        values = resp.json().get("values", [])
        if not values:
            return {"status": "success", "result": "The data sheet appears to be empty."}

        headers_row = [str(h).strip() for h in values[0]] if values else []
        data_rows   = values[1:] if len(values) > 1 else []

        # Keyword relevance scoring: each query word earns 1 point per row-cell match
        query_words = [w for w in query.split() if len(w) > 2]
        scored = []
        for row in data_rows:
            row_text = " ".join(str(c) for c in row).lower()
            score = sum(1 for w in query_words if w in row_text)
            if score > 0:
                scored.append((score, row))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:3]

        if not top:
            return {
                "status": "success",
                "result": (
                    "I couldn't find that specific detail in our data sheet. "
                    "Let me answer from what I know, or I can note your question for the team."
                )
            }

        # Format rows as natural key:value pairs
        parts = []
        for _, row in top:
            if headers_row:
                pairs = [
                    f"{headers_row[i]}: {row[i]}"
                    for i in range(min(len(headers_row), len(row)))
                    if i < len(row) and str(row[i]).strip()
                ]
                parts.append(" | ".join(pairs))
            else:
                parts.append(" | ".join(str(c) for c in row if str(c).strip()))

        result = "  ".join(parts)
        logger.info(f"Sheet KB search returned {len(top)} rows for agent {agent_id}")
        return {"status": "success", "result": result[:700]}

    except httpx.TimeoutException:
        logger.error(f"Sheet search timed out for agent {agent_id}")
        return {"status": "error", "result": "The data lookup timed out. Please ask again in a moment."}
    except Exception as e:
        logger.error(f"Sheet search failed for agent {agent_id}: {e}")
        return {"status": "error", "result": "An error occurred looking up that information."}


@router.post("/sheet-slots")
async def telnyx_sheet_slots(request: Request, tenant_id: str, agent_id: str, db: Session = Depends(get_db)):
    """
    Mid-call tool: checks available booking slots for a given date.

    Strategy (latency-optimised, graceful degradation):
      1. If agent has a slots sheet (columns: date, time, status) → read it.
         Free = rows where status is blank / 'available'.
         Booked = rows where status contains 'book' / 'taken' / 'unavailable'.
      2. If sheet has no slot structure for that date → fall back to Google Calendar
         FreeBusy API and synthesise free slots (9 AM–5 PM, 1-hour blocks).
      3. If neither source has data → return a helpful fallback message.
    """
    try:
        payload  = await request.json()
        date_str = (payload.get("date") or "").strip()
        if not date_str:
            return {"status": "success", "result": "Please tell me the date you'd like to check."}

        agent = db.get(Agent, uuid.UUID(agent_id))
        if not agent:
            return {"status": "error", "result": "Agent not configured."}

        sheet_cfg  = (agent.tools_config or {}).get("google_sheet", {})
        sheet_id   = sheet_cfg.get("sheet_id", "").strip()
        sheet_name = sheet_cfg.get("sheet_name", "Sheet1").strip() or "Sheet1"

        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant or not tenant.google_connected:
            return {"status": "success", "result": "Calendar integration is not connected."}

        token = await _get_sheet_token(tenant, db)

        # ── 1. Check the slots sheet ──────────────────────────────────────────
        sheet_used   = False
        free_slots:  list[str] = []
        booked_slots: list[str] = []

        if sheet_id and token:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{sheet_name}",
                    headers={"Authorization": f"Bearer {token}"},
                )

            if resp.status_code == 200:
                values = resp.json().get("values", [])
                if values and len(values) > 1:
                    h = [str(c).lower().strip() for c in values[0]]
                    # Auto-detect column positions by header name
                    date_col   = next((i for i, v in enumerate(h) if "date" in v), None)
                    time_col   = next((i for i, v in enumerate(h) if "time" in v or "slot" in v), None)
                    status_col = next((i for i, v in enumerate(h)
                                       if "status" in v or "booked" in v or "available" in v), None)

                    if date_col is not None and time_col is not None:
                        for row in values[1:]:
                            safe = lambda idx: str(row[idx]).strip() if idx is not None and idx < len(row) else ""
                            row_date   = safe(date_col)
                            row_time   = safe(time_col)
                            row_status = safe(status_col).lower() if status_col is not None else ""

                            if row_time and (row_date == date_str or date_str in row_date):
                                sheet_used = True
                                if any(k in row_status for k in ("book", "taken", "unavailable", "busy")):
                                    booked_slots.append(row_time)
                                else:
                                    free_slots.append(row_time)

        if sheet_used:
            if free_slots:
                booked_note = f" Already booked: {', '.join(booked_slots)}." if booked_slots else ""
                return {
                    "status": "success",
                    "result": (
                        f"On {date_str}, I have these slots available: {', '.join(free_slots)}.{booked_note} "
                        f"Which time works best for you?"
                    )
                }
            return {
                "status": "success",
                "result": (
                    f"{date_str} is fully booked. "
                    "Would you like me to check the next day, or do you have another date in mind?"
                )
            }

        # ── 2. Fallback — Google Calendar FreeBusy ────────────────────────────
        try:
            busy = await get_calendar_availability(tenant, date_str) or []
            all_slots  = [f"{h:02d}:00" for h in range(9, 18)]   # 9 AM – 5 PM
            cal_free   = [s for s in all_slots if s not in busy]

            if cal_free:
                return {
                    "status": "success",
                    "result": (
                        f"On {date_str}, my calendar shows these times are free: "
                        f"{', '.join(cal_free[:6])}. Which works for you?"
                    )
                }
            elif busy is not None:
                return {
                    "status": "success",
                    "result": (
                        f"{date_str} is fully booked on the calendar. "
                        "Shall I check the next day for you, or is there another date you'd prefer?"
                    )
                }
        except Exception as cal_err:
            logger.warning(f"Calendar fallback failed for slot check: {cal_err}")

        # ── 3. Neither source had data ────────────────────────────────────────
        return {
            "status": "success",
            "result": (
                f"I wasn't able to verify availability for {date_str} right now. "
                "What time of day do you prefer — morning or afternoon? "
                "I'll do my best to accommodate you."
            )
        }

    except httpx.TimeoutException:
        logger.error(f"Sheet slots check timed out for agent {agent_id}")
        return {"status": "success", "result": "The availability check timed out. Please try once more or tell me your preferred time."}
    except Exception as e:
        logger.error(f"Sheet slots check failed for agent {agent_id}: {e}")
        return {"status": "success", "result": "I'm having trouble checking availability right now. Please tell me your preferred time and I'll do my best to help."}


@router.post("/shopify-lookup")
async def telnyx_shopify_lookup(request: Request, tenant_id: str, db: Session = Depends(get_db)):
    try:
        payload = await request.json()
        query = payload.get("query")
        if not query:
            return {"status": "success", "result": "Please provide an order number or email."}
            
        tenant = db.get(Tenant, uuid.UUID(tenant_id))
        if not tenant or not tenant.shopify_domain or not tenant.shopify_token:
            return {"status": "success", "result": "Shopify integration is not connected."}

        # Call Shopify GraphQL/REST Admin API
        url = f"https://{tenant.shopify_domain}/admin/api/2024-01/orders.json"
        
        # Determine if query is email or order number
        params = {"status": "any"}
        if "@" in query:
            params["email"] = query
        elif query.isdigit():
            params["name"] = query
        else:
            params["query"] = query
            
        headers = {"X-Shopify-Access-Token": tenant.shopify_token}
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, params=params, timeout=10.0)
            if resp.status_code == 200:
                orders = resp.json().get("orders", [])
                if not orders:
                    return {"status": "success", "result": f"I couldn't find any orders matching {query}."}
                
                # Format first order
                o = orders[0]
                status = o.get("fulfillment_status") or "unfulfilled"
                financial = o.get("financial_status") or "pending"
                total = o.get("total_price")
                
                return {"status": "success", "result": f"Order {o.get('name')} was placed on {o.get('created_at')[:10]}. Total is ${total}. Financial status is {financial}. Fulfillment status is {status}."}
            else:
                return {"status": "success", "result": "I'm having trouble looking up the order right now."}
                
    except Exception as e:
        logger.error(f"Telnyx shopify lookup failed: {e}")
        return {"status": "error", "message": str(e)}

