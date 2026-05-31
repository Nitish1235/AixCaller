import os
import httpx
from loguru import logger
from sqlmodel import Session
from shared.models import Agent, Tenant

# Default voice fallback if agent.voice_id is not set
DEFAULT_VOICE = "Telnyx.Ultra.Grace"

async def sync_agent_with_telnyx(agent: Agent, db: Session) -> str:
    """
    Syncs the Agent's system prompt, voice, tools, and business details 
    with Telnyx's native AI Assistants API (v2/ai/assistants).
    
    If the agent has no telnyx_assistant_id, it is created.
    If it exists, it is fully updated via PUT.
    
    Returns the telnyx_assistant_id.
    """
    api_key = os.environ.get("TELNYX_API_KEY")
    server_host = os.environ.get("SERVER_HOST", "api.aixcaller.com")
    
    if not api_key:
        logger.error("Missing TELNYX_API_KEY — cannot sync assistant")
        return ""

    # Construct the query webhook URL absolute address
    if not server_host.startswith("http"):
        kb_webhook_url = f"https://{server_host}/api/v1/telnyx-ai/kb-search?tenant_id={agent.tenant_id}&agent_id={agent.id}"
    else:
        kb_webhook_url = f"{server_host}/api/v1/telnyx-ai/kb-search?tenant_id={agent.tenant_id}&agent_id={agent.id}"

    # Build tools array
    tools = [
        {"type": "hangup", "hangup": {}}
    ]
    
    tenant = db.get(Tenant, agent.tenant_id)

    flow = agent.call_flow or {}
    during = flow.get("during_call", {})
    tool_config = during.get("tools", {})
    
    # 1. Knowledge Base synchronous Webhook Tool
    if tool_config.get("knowledge_base", {}).get("enabled", True):
        tools.append({
            "type": "webhook",
            "webhook": {
                "name": "search_knowledge_base",
                "url": kb_webhook_url,
                "method": "POST",
                "async": False,
                "description": "Searches the business knowledge base to answer questions about the business, services, products, pricing, or details.",
                "body_parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The search query or keyword phrase to find relevant information in the knowledge base."
                        }
                    },
                    "required": ["query"]
                }
            }
        })

    # 2. Transfer tool if enabled and forwarding number set
    if agent.human_transfer_enabled and agent.forwarding_number and tool_config.get("human_transfer", {}).get("enabled", True):
        tools.append({
            "type": "transfer",
            "transfer": {
                "targets": [
                    {
                        "name": "Live Support Representative",
                        "to": agent.forwarding_number
                    }
                ]
            }
        })

    # 3. Google Calendar Tools
    if tenant and tenant.google_connected and tool_config.get("google_calendar", {}).get("enabled", True):
        base_url = f"https://{server_host}" if not server_host.startswith("http") else server_host
        
        tools.append({
            "type": "webhook",
            "webhook": {
                "name": "check_calendar_availability",
                "url": f"{base_url}/api/v1/telnyx-ai/calendar-availability?tenant_id={agent.tenant_id}",
                "method": "POST",
                "async": False,
                "description": "Checks the business calendar to see what time slots are busy on a specific date.",
                "body_parameters": {
                    "type": "object",
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "The date to check in YYYY-MM-DD format."
                        }
                    },
                    "required": ["date"]
                }
            }
        })
        
        tools.append({
            "type": "webhook",
            "webhook": {
                "name": "book_appointment",
                "url": f"{base_url}/api/v1/telnyx-ai/calendar-book?tenant_id={agent.tenant_id}&agent_id={agent.id}",
                "method": "POST",
                "async": False,
                "description": "Books an appointment on the business calendar.",
                "body_parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "The customer's full name."},
                        "phone": {"type": "string", "description": "The customer's phone number."},
                        "email": {"type": "string", "description": "The customer's email address (optional)."},
                        "date": {"type": "string", "description": "The date for the appointment in YYYY-MM-DD format."},
                        "time": {"type": "string", "description": "The time for the appointment in HH:MM format (24-hour clock)."},
                        "purpose": {"type": "string", "description": "The reason or purpose of the appointment."}
                    },
                    "required": ["name", "phone", "date", "time"]
                }
            }
        })
        
    # 4. Google Sheets Lead Record Tool
    if tenant and tenant.google_connected and (agent.tools_config or {}).get("google_sheet", {}).get("sheet_id"):
        base_url = f"https://{server_host}" if not server_host.startswith("http") else server_host
        tools.append({
            "type": "webhook",
            "webhook": {
                "name": "record_lead",
                "url": f"{base_url}/api/v1/telnyx-ai/record-lead?tenant_id={agent.tenant_id}&agent_id={agent.id}",
                "method": "POST",
                "async": False,
                "description": "Records customer information, contact details, and intent into a Google Sheet.",
                "body_parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "The customer's full name."},
                        "phone": {"type": "string", "description": "The customer's phone number."},
                        "email": {"type": "string", "description": "The customer's email address (optional)."},
                        "intent": {"type": "string", "description": "The intent or interest of the lead."},
                        "notes": {"type": "string", "description": "Any additional notes from the conversation."}
                    },
                    "required": ["name", "phone"]
                }
            }
        })
        
    # 5. Shopify Lookup Tool
    if tenant and tenant.shopify_domain and tenant.shopify_token and tool_config.get("shopify", {}).get("enabled", True):
        base_url = f"https://{server_host}" if not server_host.startswith("http") else server_host
        tools.append({
            "type": "webhook",
            "webhook": {
                "name": "check_order_status",
                "url": f"{base_url}/api/v1/telnyx-ai/shopify-lookup?tenant_id={agent.tenant_id}",
                "method": "POST",
                "async": False,
                "description": "Checks the status of an order on Shopify using an order number or customer email.",
                "body_parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The order number (e.g. 1001) or customer email address to lookup."
                        }
                    },
                    "required": ["query"]
                }
            }
        })

    # Build natural introduction greeting
    if agent.business_name:
        greeting_text = f"Hi, thanks for calling {agent.business_name}. This is {agent.name} — how can I help you today?"
    else:
        greeting_text = f"Hi there, this is {agent.name}. How can I help you today?"

    # Use voice_id directly (now stored as Telnyx voice name, e.g. 'Telnyx.Ultra.Grace')
    ui_voice = agent.voice_id or DEFAULT_VOICE
    telnyx_voice = ui_voice # Default to what is in the db
    
    try:
        from backend.api.admin import TELNYX_VOICES
        for v in TELNYX_VOICES:
            if v["name"].lower() in ui_voice.lower() or v["voice_id"] == ui_voice:
                telnyx_voice = v["voice_id"] # Use the exact UUID from the catalogue
                break
    except Exception:
        pass

    # Fetch global system settings (singleton id=1)
    from shared.models import SystemSettings
    from sqlmodel import select
    settings = db.exec(select(SystemSettings).where(SystemSettings.id == 1)).first()

    global_model = "openai/gpt-4o-mini"
    telnyx_secret_id = None

    if settings:
        global_model = settings.global_model
        telnyx_secret_id = settings.telnyx_secret_id

    # Enforce transfer behavior securely at the backend level
    final_instructions = agent.system_prompt
    if agent.human_transfer_enabled and agent.forwarding_number:
        final_instructions += "\n\nCRITICAL INSTRUCTION: You have access to a 'transfer' tool. ONLY use this tool to transfer the call if the user explicitly asks to speak to a human/representative, or if the user is highly upset. Otherwise, you MUST attempt to answer the question yourself using your knowledge base."
    else:
        final_instructions += "\n\nCRITICAL INSTRUCTION: You DO NOT have the ability to transfer calls to a human or live representative. Do NOT offer to transfer the call under any circumstances. If you cannot help the user, apologize and suggest they email support or check the website."

    # Tell AI about its extra tools
    if tenant and tenant.google_connected and tool_config.get("google_calendar", {}).get("enabled", True):
        final_instructions += "\n\nCALENDAR INSTRUCTIONS: You have access to the 'check_calendar_availability' and 'book_appointment' tools. To book an appointment, ALWAYS ask the user for their preferred date first, check availability, offer them available times, and then ask for their name and phone to book it."
        
    if tenant and tenant.shopify_domain and tool_config.get("shopify", {}).get("enabled", True):
        final_instructions += "\n\nSHOPIFY INSTRUCTIONS: You have access to the 'check_order_status' tool. If the user asks about an order, ask for their order number or email, and use the tool to fetch their status."

    # Define full request payload
    payload = {
        "name": f"AixCaller_{agent.name}_{str(agent.id)[:8]}",
        "instructions": final_instructions,
        "greeting": greeting_text,
        "voice_settings": {
            "voice": telnyx_voice,
            "expressive_mode": True
        },
        "telephony_settings": {
            "noise_suppression": "krisp",
            "recording_settings": {
                "enabled": False,
                "channels": "dual",
                "format": "mp3"
            }
        },
        "transcription": {
            "language": "en"
        },
        "post_conversation_settings": {
            "enabled": True
        },
        "tools": tools
    }

    if telnyx_secret_id and global_model.startswith("openai/"):
        model_name = global_model.split("/")[-1]
        payload["external_llm"] = {
            "base_url": "https://api.openai.com/v1",
            "model_name": model_name,
            "integration_secret_id": telnyx_secret_id,
            "forward_metadata": False
        }
    else:
        payload["model"] = global_model

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            if not agent.telnyx_assistant_id:
                # Create a new assistant
                logger.info(f"Creating a new Telnyx Assistant for agent {agent.id}")
                response = await client.post(
                    "https://api.telnyx.com/v2/ai/assistants",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to create Telnyx Assistant: {response.status_code} - {response.text}")
                    return ""
                
                resp_json = response.json()
                assistant_id = resp_json.get("data", {}).get("id") or resp_json.get("id")
                if assistant_id:
                    logger.info(f"Successfully created Telnyx Assistant {assistant_id} for agent {agent.id}")
                    agent.telnyx_assistant_id = assistant_id
                    db.add(agent)
                    db.commit()
                    db.refresh(agent)
                    return assistant_id
                else:
                    logger.error(f"Unexpected Telnyx response structure: {resp_json}")
                    return ""
            else:
                # Update existing assistant via PUT
                assistant_id = agent.telnyx_assistant_id
                logger.info(f"Updating existing Telnyx Assistant {assistant_id} for agent {agent.id}")
                response = await client.put(
                    f"https://api.telnyx.com/v2/ai/assistants/{assistant_id}",
                    headers=headers,
                    json=payload,
                    timeout=30.0
                )
                if response.status_code not in [200, 204]:
                    logger.error(f"Failed to update Telnyx Assistant {assistant_id}: {response.status_code} - {response.text}")
                    # If assistant was deleted on Telnyx, reset local id to create a new one on next try
                    if response.status_code == 404:
                        logger.warning(f"Assistant {assistant_id} not found on Telnyx. Resetting agent.telnyx_assistant_id to recreate.")
                        agent.telnyx_assistant_id = None
                        db.add(agent)
                        db.commit()
                        db.refresh(agent)
                        return await sync_agent_with_telnyx(agent, db)
                    return assistant_id
                
                logger.info(f"Successfully updated Telnyx Assistant {assistant_id} for agent {agent.id}")
                return assistant_id
        except Exception as e:
            logger.error(f"Exception during Telnyx Assistant sync: {e}")
            return agent.telnyx_assistant_id or ""
