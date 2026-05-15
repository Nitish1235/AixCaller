import os
import time
import random
import httpx
import json
from typing import Optional
from loguru import logger

# ── Pipecat: Audio ──────────────────────────────────────────────────────────
# ── Pipecat: Audio ──────────────────────────────────────────────────────────
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams

# ── Pipecat: Pipeline ────────────────────────────────────────────────────────
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask

# ── Pipecat: Context & Aggregators ───────────────────────────────────────────
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)

# ── Pipecat: Serializer ──────────────────────────────────────────────────────
from pipecat.serializers.telnyx import TelnyxFrameSerializer

# ── Pipecat: Services ────────────────────────────────────────────────────────
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.deepgram.tts import DeepgramTTSService
from pipecat.services.openai.llm import OpenAILLMService

# ── Pipecat: Frames ──────────────────────────────────────────────────────────
from pipecat.frames.frames import EndFrame, LLMMessagesAppendFrame, TTSSpeakFrame, TextFrame

# ── Pipecat: Transport ───────────────────────────────────────────────────────
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

# ── Base Processor ──────────────────────────────────────────────────────────
from pipecat.processors.frame_processor import FrameProcessor

# ── Internal ─────────────────────────────────────────────────────────────────
import uuid
from shared.kb import search_knowledge_base
from voice_engine.tools import shopify, custom_api, google_calendar as gcal_tools


# ── Custom Processors ────────────────────────────────────────────────────────
class GoodbyeDetector(FrameProcessor):
    """
    Monitor's the assistant's text output. If it sees goodbye keywords,
    it triggers the hangup logic automatically, even if the LLM forgot 
    to call the end_call tool.
    """
    def __init__(self, agent):
        super().__init__()
        self.agent = agent

    async def process_frame(self, frame, direction):
        await super().process_frame(frame, direction)
        if isinstance(frame, TextFrame):
            text = frame.text.lower()
            if any(k in text for k in self.agent.GOODBYE_KEYWORDS):
                logger.info(f"👋 Goodbye detected in assistant speech: '{text}'. Hanging up.")
                # Trigger hangup in background
                import asyncio
                asyncio.create_task(self.agent.trigger_hangup())

class VoiceAgent:
    # Filler phrases — randomized so it doesn't sound robotic
    FILLER_PHRASES = [
        "Let me check that for you.",
        "One moment, looking that up.",
        "Sure, let me find that.",
        "Just a sec, checking now.",
    ]

    # Don't play another filler within this window (prevents stacking when LLM
    # makes parallel function calls — e.g. "Let me check that..." playing twice)
    FILLER_COOLDOWN_SECONDS = 4.0

    # Phrases that trigger automatic hangup if detected in assistant speech
    GOODBYE_KEYWORDS = ["bye", "goodbye", "see you", "take care", "have a great day"]

    def __init__(self, tenant_id: str, agent_config: dict):
        self.tenant_id = tenant_id
        self.agent_config = agent_config
        self.task = None  # Pipeline task ref — set in start() so tools can push frames
        self._last_filler_time = 0.0  # for filler debounce
        self._transfer_off_hours_reason: Optional[str] = None  # set in start()
        self._hangup_triggered = False  # guard against double-hangup (GoodbyeDetector + end_call)

    # ── Hot KB Pre-warm (background task) ────────────────────────────────────
    async def _prewarm_hot_kb_safe(self):
        """Pre-warm hot KB cache at call start. Failures are non-fatal."""
        try:
            from shared.kb import prewarm_hot_kb
            await prewarm_hot_kb(
                tenant_id=uuid.UUID(self.tenant_id),
                agent_id=uuid.UUID(self.agent_config["agent_id"]),
            )
        except Exception as e:
            logger.warning(f"Hot KB pre-warm skipped: {e}")

    # ── Tool: Knowledge Base Search ──────────────────────────────────────────
    async def search_kb(self, params):
        """Semantic search via pgvector with smart filler logic.

        Pipecat 1.x API: must call params.result_callback(result) to deliver the result.

        UX strategy:
          1. First try the fast cache layers (L1/L2/L3) — all <50ms.
             If hit, deliver the answer instantly with NO filler phrase.
             (Basic questions like "business name", "hours", "services" hit Hot KB.)
          2. Only if all caches miss do we fall through to the slow L4 path.
             In that case, queue a filler phrase so the user knows we're working,
             then run the full pgvector search (~700ms).
        """
        t0 = time.time()
        try:
            query = params.arguments.get("query", "")
            logger.info(f"🔍 KB SEARCH started for query: '{query}'")

            tenant_uuid = uuid.UUID(self.tenant_id)
            agent_uuid = uuid.UUID(self.agent_config["agent_id"])

            # ── Step 1: Try the fast cache layers (L1 → L2 → L3) ────────────
            # Returns None if all caches miss (no filler needed yet).
            result = await search_knowledge_base(
                query=query,
                tenant_id=tenant_uuid,
                agent_id=agent_uuid,
                fast_only=True,
            )

            if result is not None:
                # Fast cache hit — answer is ready in <50ms. NO filler needed.
                logger.info(f"⚡ KB SEARCH fast-cache hit in {(time.time() - t0) * 1000:.0f}ms (no filler)")
                await params.result_callback(result)
                return

            # ── Step 2: Cache missed — going to slow L4 path. Play filler. ──
            now = time.time()
            if self.task and (now - self._last_filler_time) > self.FILLER_COOLDOWN_SECONDS:
                self._last_filler_time = now
                filler = random.choice(self.FILLER_PHRASES)
                await self.task.queue_frames([TTSSpeakFrame(text=filler)])
                logger.info(f"🗣️  Filler spoken (slow path): '{filler}'")
            else:
                logger.info("🤐 Filler skipped (debounce — another just played)")

            # ── Step 3: Run the slow L4 search ──────────────────────────────
            result = await search_knowledge_base(
                query=query,
                tenant_id=tenant_uuid,
                agent_id=agent_uuid,
                fast_only=False,
            )
            logger.info(f"✅ KB SEARCH completed (L4 path) in {(time.time() - t0) * 1000:.0f}ms")
            await params.result_callback(result)
        except Exception as e:
            logger.error(f"❌ KB search error after {(time.time() - t0) * 1000:.0f}ms: {e}")
            await params.result_callback("No relevant information found in the knowledge base.")

    # ── Tool: End Call ───────────────────────────────────────────────────────
    async def end_call(self, params):
        """LLM decided the conversation is over via tool call."""
        await params.result_callback("Goodbye message delivered. Hanging up now.")
        await self.trigger_hangup()

    async def trigger_hangup(self):
        """Internal hangup logic. Guarded against double-fire (end_call + GoodbyeDetector)."""
        if self._hangup_triggered:
            logger.info("Hangup already in progress — skipping duplicate trigger")
            return
        self._hangup_triggered = True
        import asyncio
        logger.info(f"🛑 Initiating hangup for tenant {self.tenant_id}")

        call_control_id = self.agent_config.get("call_control_id")
        telnyx_api_key = os.environ.get("TELNYX_API_KEY")

        if not call_control_id or not telnyx_api_key:
            logger.warning("Cannot hang up — missing call_control_id or TELNYX_API_KEY")
            return

        # Give the farewell TTS ~2.5 seconds to play out before hanging up
        async def _delayed_hangup():
            await asyncio.sleep(2.5)
            
            # Gracefully stop Pipecat pipeline to free server resources
            if self.task:
                try:
                    from pipecat.frames.frames import EndFrame
                    await self.task.queue_frames([EndFrame()])
                except Exception as e:
                    logger.warning(f"Failed to push EndFrame: {e}")

            try:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(
                        f"https://api.telnyx.com/v2/calls/{call_control_id}/actions/hangup",
                        headers={
                            "Authorization": f"Bearer {telnyx_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={},
                    )
                    if resp.status_code in (200, 201, 204):
                        logger.info(f"✅ Telnyx hangup successful for call {call_control_id}")
                    else:
                        logger.warning(f"Telnyx hangup returned {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Telnyx hangup failed: {e}")

        asyncio.create_task(_delayed_hangup())

    # ── Tool: Transfer to Human (Telnyx blind transfer) ──────────────────────
    async def transfer_to_human(self, params):
        """Forward the live call to the agent's configured forwarding_number.

        Flow:
          1. Verify forwarding_number + Telnyx credentials are present
          2. Acknowledge the LLM tool call (LLM has already said its farewell)
          3. Wait ~2 seconds for the farewell TTS to play
          4. POST to Telnyx /actions/transfer — Telnyx will:
             - Hang up the current AI media-stream leg
             - Dial the forwarding_number from our Telnyx number
             - Bridge the original caller to that destination
          5. The on_client_disconnected handler will fire automatically when
             Telnyx tears down the WebSocket
        """
        import asyncio

        forwarding_number = self.agent_config.get("forwarding_number")
        agent_phone_number = self.agent_config.get("agent_phone_number")
        call_control_id = self.agent_config.get("call_control_id")
        telnyx_api_key = os.environ.get("TELNYX_API_KEY")

        # Pre-flight validation
        if not forwarding_number:
            logger.warning("transfer_to_human invoked but no forwarding_number configured")
            await params.result_callback(
                "I don't have a transfer number set up. Let me try to help you here instead."
            )
            return
        if not call_control_id or not telnyx_api_key:
            logger.error("Cannot transfer — missing call_control_id or TELNYX_API_KEY")
            await params.result_callback(
                "I'm having trouble transferring right now. Could I help you another way?"
            )
            return

        logger.info(f"🔀 Initiating transfer to {forwarding_number} for tenant {self.tenant_id}")
        # Tell the LLM the transfer is in motion. The LLM has already spoken a
        # farewell like "Transferring you now, please hold." in its turn.
        await params.result_callback(
            f"Transfer initiated to {forwarding_number}. The caller will be bridged shortly."
        )

        async def _do_transfer():
            # Give the LLM's "transferring you now" TTS a moment to finish playing
            await asyncio.sleep(2.5)
            try:
                payload = {"to": forwarding_number}
                # Telnyx requires "from" to be a number you own. We use the agent's
                # Telnyx number — the caller-ID the human will see when their phone rings.
                if agent_phone_number:
                    payload["from"] = agent_phone_number

                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"https://api.telnyx.com/v2/calls/{call_control_id}/actions/transfer",
                        headers={
                            "Authorization": f"Bearer {telnyx_api_key}",
                            "Content-Type": "application/json",
                        },
                        json=payload,
                    )
                    if resp.status_code in (200, 201, 202, 204):
                        logger.info(f"✅ Telnyx transfer accepted: {resp.status_code}")
                    else:
                        logger.error(f"Telnyx transfer failed {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Telnyx transfer exception: {e}")

        asyncio.create_task(_do_transfer())

    # ── Main Entry Point ─────────────────────────────────────────────────────
    async def start(self, websocket, stream_id: str, call_id: str):

        # 1. Serializer
        # Source-verified signature:
        #   TelnyxFrameSerializer(stream_id, outbound_encoding, inbound_encoding,
        #                         call_control_id=None, api_key=None, params=None)
        # auto_hang_up=False via InputParams so NO api_key validation is triggered.
        serializer = TelnyxFrameSerializer(
            stream_id=stream_id,
            outbound_encoding="PCMU",
            inbound_encoding="PCMU",
            params=TelnyxFrameSerializer.InputParams(
                auto_hang_up=False
            )
        )

        # 2. Transport — matches OFFICIAL Pipecat Telnyx example
        # NO vad_analyzer here, NO sample rates here (those go in PipelineParams below)
        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                add_wav_header=False,
                serializer=serializer,
            )
        )

        # 3. STT — Phone-optimized model + keyword boosting for agent name
        # Deepgram supports `keywords` (model bias) — useful since phone audio
        # often mishears proper nouns. Boost the agent name + business terms.
        language = self.agent_config.get("language", "en")
        agent_name_for_stt = self.agent_config.get("name", "")
        keywords = []
        if agent_name_for_stt:
            # Format: "word:weight" — weight 2-5 nudges Deepgram toward this word
            keywords.append(f"{agent_name_for_stt}:3")

        stt = DeepgramSTTService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            settings=DeepgramSTTService.Settings(
                model="nova-2-phonecall",
                language=language,
                smart_format=True,
                keywords=keywords if keywords else None,
            )
        )

        # 4. TTS — latency optimizations:
        # - encoding="linear16": skip PCMU→PCM resampling inside TTS service;
        #   the TelnyxFrameSerializer does PCM→PCMU so one less codec hop.
        # - aura-2-thalia-en: faster model than aura-asteria-en
        tts = DeepgramTTSService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            encoding="linear16",
            settings=DeepgramTTSService.Settings(
                voice=self.agent_config.get("voice_id", "aura-2-thalia-en"),
                sample_rate=8000,
            )
        )

        # 5. LLM
        # Source-verified: OpenAILLMService(api_key, settings=Settings(model, temperature))
        # params={} dict is DEPRECATED since 0.0.105 — use Settings object only.
        llm = OpenAILLMService(
            api_key=os.environ["OPENAI_API_KEY"],
            settings=OpenAILLMService.Settings(
                model="gpt-4o-mini",
                temperature=self.agent_config.get("llm_temperature", 0.7)
            )
        )

        # 6. Context & Aggregators
        # Source-verified: LLMContext(messages=[...])
        # Source-verified: LLMContextAggregatorPair(context, user_params=LLMUserAggregatorParams(...))
        # Source-verified: LLMUserAggregatorParams(vad_analyzer=...) ← field confirmed
        agent_name = self.agent_config.get("name", "AI Assistant")
        system_prompt = f"Your name is {agent_name}. " + self.agent_config.get("system_prompt", "You are a helpful voice assistant.")
        
        if self.agent_config.get("is_recovery"):
            system_prompt = (
                "IMPORTANT: You are calling the user back because they just missed us. "
                f"Start by saying 'Hi there, this is {agent_name}, you just called us a few minutes ago. How can I help you today?'\n\n"
                + system_prompt
            )

        # ── Human Transfer: Check availability BEFORE building system prompt ──
        from shared.transfer_hours import is_human_transfer_available
        transfer_available, transfer_reason = is_human_transfer_available(
            enabled=self.agent_config.get("human_transfer_enabled", False),
            forwarding_number=self.agent_config.get("forwarding_number"),
            timezone=self.agent_config.get("human_transfer_timezone", "UTC"),
            hours=self.agent_config.get("human_transfer_hours", {}),
        )
        self._transfer_off_hours_reason = transfer_reason if not transfer_available else None
        logger.info(f"Human transfer check: {transfer_available} ({transfer_reason})")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": (
                "CRITICAL RULES — YOU MUST FOLLOW THESE:\n"
                "1. You are on a live voice call. Keep answers EXTREMELY short — 1-2 sentences MAX.\n"
                "2. KNOWLEDGE BASE USAGE (MANDATORY): For ANY question about this business — "
                "products, services, pricing, hours, location, policies, features, availability, "
                "shipping, returns, contact info, or anything specific to the company — "
                "you MUST call `search_knowledge_base` FIRST before answering. "
                "NEVER answer business questions from memory or general knowledge — only from KB results.\n"
                "3. If KB returns 'No relevant information found', say: "
                "'I don't have that information right now, would you like me to connect you with a human?'\n"
                "4. Be conversational and natural — sound like a real person, not a robot.\n"
                "5. NEVER use lists, bullet points, or markdown — this is a phone call.\n"
                "6. If user asks something off-topic, gently redirect to how you can help.\n"
                "7. CLARIFICATION: If the user's message is garbled, incomplete, makes no sense "
                "in context, sounds like background noise, or is just one or two unclear words "
                "(e.g. 'hello?', random fragments, transcription gibberish), DO NOT guess. "
                "Politely ask them to repeat using ONE of these natural phrases (vary it):\n"
                "   - 'Sorry, I didn't quite catch that. Could you say it again?'\n"
                "   - 'I'm having trouble hearing you. Could you repeat that?'\n"
                "   - 'Could you say that one more time, please?'\n"
                "   - 'Sorry, the line broke up. What did you say?'\n"
                "Never echo back gibberish. Never invent a question. Just ask politely.\n"
                "8. NAME RECOGNITION: Your name (the agent's name) might be misheard by speech "
                "recognition (e.g. 'Sarah' → 'Sheila', 'Cita'). If the user calls you by a similar-"
                "sounding name, just continue naturally — assume they meant you.\n"
                + (
                    "8b. SHOPIFY ORDER QUESTIONS: When the caller asks about an order (status, "
                    "shipping, items, total, refund), ALWAYS use the Shopify tools — never guess. "
                    "If you don't have an order number yet, ask: 'Sure, what's your order number? "
                    "It's in your order confirmation email, usually starts with #'. Once you have "
                    "it, call the right tool: lookup_order for status, get_order_tracking for "
                    "shipping/ETA, get_order_items for what's in it, get_order_total for cost, "
                    "get_shipping_address for delivery address, get_refund_status for refunds. "
                    "Don't read tracking numbers digit-by-digit unless asked — just say them once.\n"
                    if "shopify" in (self.agent_config.get("tools_config") or {})
                    and (self.agent_config.get("tools_config") or {}).get("shopify", {}).get("access_token")
                    else ""
                )
                + "9. END THE CALL when the conversation is clearly over. Call `end_call` "
                "immediately (no warning, no asking 'is there anything else?') when the user:\n"
                "   - Says goodbye: 'bye', 'goodbye', 'see you', 'talk to you later', 'have a good day'\n"
                "   - Says thanks and signals they're done: 'thanks, that's all', 'okay thanks bye', "
                "'great, thank you', 'perfect, thanks'\n"
                "   - Explicitly asks to hang up: 'I have to go', 'I'll call back later', "
                "'that's it', 'we're done', 'hang up'\n"
                "   - Has no more questions after you ask if they need anything else\n"
                "Before calling end_call, say ONE short farewell like: 'You're welcome, have a "
                "great day!' or 'Glad I could help. Take care!' or 'Thanks for calling. Bye!' — "
                "then immediately call end_call. Don't drag it out.\n"
                "10. HUMAN TRANSFER POLICY:\n"
                + (
                    # AVAILABLE NOW — tool registered with LLM
                    "   Human transfer IS available right now. If the caller asks for a human, "
                    "or you can't help (refund disputes, account-specific issues, complex "
                    "complaints, frustrated after 2 failed KB tries), say one brief reassurance "
                    "like 'Sure, let me transfer you to a team member now — one moment please.' "
                    "and IMMEDIATELY call `transfer_to_human`. The transfer takes ~2 seconds. "
                    "Don't call it for routine questions you can answer from the KB."
                    if transfer_available
                    else
                    # OFF-HOURS — tool NOT registered, AI must politely decline + offer alternative
                    f"   Human transfer is NOT available right now. Reason: "
                    f"{self._transfer_off_hours_reason or 'transfer is disabled for this agent'}. "
                    "DO NOT promise to transfer the caller — you literally cannot. If they ask "
                    "for a human, respond warmly with something like:\n"
                    "   - 'Our team isn't available to take calls at the moment. I'd be happy "
                    "to help you here, or I can take a message and have someone reach out.'\n"
                    "   - 'Right now I'm the one staffing the line, but I can help with most "
                    "questions. What do you need?'\n"
                    "   - 'Our team is offline at the moment. Let me see if I can help — what's "
                    "your question?'\n"
                    "Never say 'I'll transfer you' or 'please hold' when transfer is unavailable."
                )
            )}
        ]

        from pipecat.adapters.schemas.function_schema import FunctionSchema
        from pipecat.adapters.schemas.tools_schema import ToolsSchema

        # Define OpenAI tool schemas using Pipecat's 1.1.0 FunctionSchema
        standard_tools = [
            FunctionSchema(
                name="search_knowledge_base",
                description=(
                    "MANDATORY for any business-specific question. Searches the company's knowledge base "
                    "for accurate answers about products, services, pricing, hours, policies, locations, "
                    "shipping, returns, features, availability, contact info, or anything specific to this company. "
                    "ALWAYS call this FIRST before answering — never guess or use general knowledge."
                ),
                properties={
                    "query": {
                        "type": "string",
                        "description": "The user's question, rephrased as a clear search query. Include key terms."
                    }
                },
                required=["query"]
            ),
            FunctionSchema(
                name="end_call",
                description="Ends the call. Use this when the conversation is over, the user says goodbye, or they ask to hang up.",
                properties={},
                required=[]
            )
        ]

        # (Transfer check moved to top of start())

        if transfer_available:
            standard_tools.append(
                FunctionSchema(
                    name="transfer_to_human",
                    description=(
                        "Forwards the caller to a human team member at the business. "
                        "Only available right now because the business has enabled human "
                        "transfer AND the current time is within their staffed hours. "
                        "Use this ONLY when: (1) the caller explicitly asks for a human/"
                        "manager/owner; (2) the request needs human judgment you cannot "
                        "provide (refund disputes, account-specific issues, complex complaints); "
                        "or (3) the caller is clearly frustrated after KB lookups failed twice. "
                        "Before calling, say one short reassurance like 'Sure, let me transfer "
                        "you now — one moment please.' Don't call it for routine questions."
                    ),
                    properties={},
                    required=[]
                )
            )

        tools_config = self.agent_config.get("tools_config", {})
        if "shopify" in tools_config and tools_config["shopify"].get("access_token"):
            # Rich Shopify tools — one per query type so the LLM picks the right one.
            _order_arg = {
                "order_number": {
                    "type": "string",
                    "description": "The order number the caller provides, e.g. '1042' or '#1042'.",
                }
            }
            standard_tools += [
                FunctionSchema(
                    name="lookup_order",
                    description=(
                        "Look up the headline status of a Shopify order: payment, "
                        "fulfillment, item count, and total. Use this FIRST when the "
                        "caller asks anything about their order (status, paid, shipped, etc)."
                    ),
                    properties=_order_arg, required=["order_number"],
                ),
                FunctionSchema(
                    name="get_order_tracking",
                    description=(
                        "Get the tracking number, carrier, and estimated delivery date "
                        "for a Shopify order. Use when caller asks 'where is my order', "
                        "'when will it arrive', 'tracking number', or 'has it shipped'."
                    ),
                    properties=_order_arg, required=["order_number"],
                ),
                FunctionSchema(
                    name="get_order_items",
                    description=(
                        "List what items are in a Shopify order. Use when caller asks "
                        "'what did I order', 'what's in my order', 'list my items'."
                    ),
                    properties=_order_arg, required=["order_number"],
                ),
                FunctionSchema(
                    name="get_order_total",
                    description=(
                        "Get the total cost of an order including subtotal, shipping, and tax. "
                        "Use when caller asks 'how much did I pay', 'what's the total', 'price'."
                    ),
                    properties=_order_arg, required=["order_number"],
                ),
                FunctionSchema(
                    name="get_shipping_address",
                    description=(
                        "Get the shipping address for an order. Use when caller asks "
                        "'where is it being shipped', 'confirm my address', 'delivery address'."
                    ),
                    properties=_order_arg, required=["order_number"],
                ),
                FunctionSchema(
                    name="get_refund_status",
                    description=(
                        "Check if a refund has been processed for an order. Use when caller "
                        "asks 'has my refund gone through', 'where is my money', 'refund status'."
                    ),
                    properties=_order_arg, required=["order_number"],
                ),
            ]

        if "custom_api" in tools_config:
            standard_tools.append(
                FunctionSchema(
                    name="search_internal_database",
                    description="Searches an external database or API for custom information based on the user's query.",
                    properties={
                        "query": {
                            "type": "string",
                            "description": "The query to search in the internal database."
                        }
                    },
                    required=["query"]
                )
            )

        # Google Calendar + Sheets tools
        google_connected = tools_config.get("google_connected", False)
        if google_connected:
            standard_tools += [
                FunctionSchema(
                    name="check_availability",
                    description=(
                        "Check what appointment slots are available on a specific date. "
                        "Call this FIRST before offering or booking any appointment. "
                        "Use it when the caller asks 'when can I come in', 'what slots do you have', "
                        "'are you free on Tuesday', or any availability question."
                    ),
                    properties={
                        "date": {"type": "string", "description": "The date to check in YYYY-MM-DD format. Convert spoken dates like 'next Monday' to this format."}
                    },
                    required=["date"]
                ),
                FunctionSchema(
                    name="book_appointment",
                    description=(
                        "Book a confirmed appointment on Google Calendar and save the lead. "
                        "Only call this after you have: caller's name, phone number, preferred date, and preferred time. "
                        "If you're missing any of these, ask for them first."
                    ),
                    properties={
                        "caller_name":  {"type": "string", "description": "Full name of the caller"},
                        "caller_phone": {"type": "string", "description": "Caller's phone number (use the incoming call number if they don't provide one)"},
                        "date":         {"type": "string", "description": "Appointment date in YYYY-MM-DD format"},
                        "time_str":     {"type": "string", "description": "Appointment time in HH:MM 24-hour format, e.g. '14:00'"},
                        "purpose":      {"type": "string", "description": "Brief reason for the appointment e.g. 'Dental checkup', 'Property viewing'"},
                        "caller_email": {"type": "string", "description": "Caller's email for calendar invite (optional, ask if relevant)"},
                    },
                    required=["caller_name", "caller_phone", "date", "time_str"]
                ),
                FunctionSchema(
                    name="record_lead",
                    description=(
                        "Save a qualified lead's contact details to the CRM (database + Google Sheets). "
                        "Use this when: the caller is interested but not booking right now, "
                        "they want to be called back, or they've shared contact details worth saving. "
                        "Gather name and phone at minimum before calling."
                    ),
                    properties={
                        "caller_name":  {"type": "string", "description": "Full name of the caller"},
                        "caller_phone": {"type": "string", "description": "Caller's phone number"},
                        "intent":       {"type": "string", "description": "What they are interested in, e.g. 'Pricing inquiry', 'Product demo', 'Follow-up call'"},
                        "notes":        {"type": "string", "description": "Any extra context worth noting for the sales team"},
                        "caller_email": {"type": "string", "description": "Email address if provided"},
                    },
                    required=["caller_name", "caller_phone", "intent"]
                ),
            ]

        context = LLMContext(messages=messages, tools=ToolsSchema(standard_tools=standard_tools))
        # VAD with PHONE-tuned params (defaults are too strict for 8kHz PCMU phone audio).
        # NOTE: We instantiate fresh per call because Silero has per-call internal state
        # (self._state, self._context) that must not be shared. Preload at startup just
        # warms the ONNX runtime + OS file cache so this instantiation is fast.
        phone_vad = SileroVADAnalyzer(
            sample_rate=8000,
            params=VADParams(
                confidence=0.5,    # ↓ from 0.7 (phone has noise)
                min_volume=0.15,   # ↓ from 0.6 (phone audio is quiet)
                start_secs=0.15,   # ↓ from 0.2 (faster start)
                stop_secs=0.4,     # ↑ from 0.2 (allow natural pauses)
            )
        )
        aggregators = LLMContextAggregatorPair(
            context,
            user_params=LLMUserAggregatorParams(
                vad_analyzer=phone_vad,
            )
        )

        # 7. Register Tools on LLM
        llm.register_function("search_knowledge_base", self.search_kb)
        llm.register_function("end_call", self.end_call)

        # Register transfer_to_human only when transfer is currently available
        # (enabled + within staffed hours). When unavailable, the AI cannot call it.
        if transfer_available:
            llm.register_function("transfer_to_human", self.transfer_to_human)

        tools_config = self.agent_config.get("tools_config", {})
        if "shopify" in tools_config and tools_config["shopify"].get("access_token"):
            shopify_cfg = tools_config["shopify"]
            caller_phone = self.agent_config.get("from_number")  # for caller-ID verification

            def _make_shopify_wrapper(fn):
                async def _wrapper(params):
                    order_number = params.arguments.get("order_number", "")
                    try:
                        result = await fn(order_number, shopify_cfg, caller_phone=caller_phone)
                    except Exception as e:
                        logger.error(f"Shopify tool '{fn.__name__}' failed: {e}")
                        result = "I'm having trouble reaching the store system right now."
                    await params.result_callback(result)
                return _wrapper

            llm.register_function("lookup_order",          _make_shopify_wrapper(shopify.lookup_order))
            llm.register_function("get_order_tracking",    _make_shopify_wrapper(shopify.get_order_tracking))
            llm.register_function("get_order_items",       _make_shopify_wrapper(shopify.get_order_items))
            llm.register_function("get_order_total",       _make_shopify_wrapper(shopify.get_order_total))
            llm.register_function("get_shipping_address",  _make_shopify_wrapper(shopify.get_shipping_address))
            llm.register_function("get_refund_status",     _make_shopify_wrapper(shopify.get_refund_status))

        if "custom_api" in tools_config:
            async def custom_api_wrapper(params):
                query = params.arguments.get("query", "")
                result = await custom_api.fetch_custom_data(query, tools_config["custom_api"])
                await params.result_callback(result)
            llm.register_function("search_internal_database", custom_api_wrapper)

        # Google Calendar + Sheets tools
        if tools_config.get("google_connected", False):
            _tenant_id   = self.tenant_id
            _agent_id    = self.agent_config.get("agent_id", "")
            _agent_name  = self.agent_config.get("name", "AI Agent")
            _caller_phone = self.agent_config.get("from_number", "")

            async def _check_availability_wrapper(params):
                date   = params.arguments.get("date", "")
                result = await gcal_tools.check_availability(_tenant_id, date)
                await params.result_callback(result)

            async def _book_appointment_wrapper(params):
                args = params.arguments
                result = await gcal_tools.book_appointment(
                    tenant_id=_tenant_id,
                    agent_id=_agent_id,
                    agent_name=_agent_name,
                    caller_name=args.get("caller_name", "Unknown"),
                    caller_phone=args.get("caller_phone") or _caller_phone,
                    date=args.get("date", ""),
                    time_str=args.get("time_str", ""),
                    purpose=args.get("purpose", ""),
                    caller_email=args.get("caller_email", ""),
                )
                await params.result_callback(result)

            async def _record_lead_wrapper(params):
                args = params.arguments
                result = await gcal_tools.record_lead(
                    tenant_id=_tenant_id,
                    agent_id=_agent_id,
                    agent_name=_agent_name,
                    caller_name=args.get("caller_name", "Unknown"),
                    caller_phone=args.get("caller_phone") or _caller_phone,
                    intent=args.get("intent", ""),
                    notes=args.get("notes", ""),
                    caller_email=args.get("caller_email", ""),
                )
                await params.result_callback(result)

            llm.register_function("check_availability",  _check_availability_wrapper)
            llm.register_function("book_appointment",    _book_appointment_wrapper)
            llm.register_function("record_lead",         _record_lead_wrapper)

        # 8. Assemble Pipeline
        # NOTE: VAD is NOT a separate processor in the pipeline.
        # Instead, it's passed to LLMUserAggregatorParams above,
        # where it controls when user turns start/stop and triggers the LLM.
        pipeline = Pipeline([
            transport.input(),
            stt,
            aggregators.user(),
            llm,
            GoodbyeDetector(self),  # Automatically detect goodbye and end call
            tts,
            transport.output(),
            aggregators.assistant()
        ])

        # 9. Pipeline Task — sample rates go HERE per official example
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                audio_in_sample_rate=8000,   # Telnyx PCMU is 8kHz
                audio_out_sample_rate=8000,  # Telnyx PCMU is 8kHz
                enable_metrics=True,
                enable_usage_metrics=True,
            ),
            idle_timeout_secs=self.agent_config.get("idle_timeout", 15),
        )
        # Expose task to tool functions so they can push filler audio (TTSSpeakFrame)
        # while long-running operations like KB search are in progress.
        self.task = task

        # Track call start so we can compute duration on disconnect
        call_started_at = {"value": None}

        # 10. Event Handlers
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, client):
            logger.info("Telnyx audio stream connected. Sending instant TTS greeting.")
            call_started_at["value"] = time.time()

            agent_name = self.agent_config.get("name", "our assistant")
            business_name = self.agent_config.get("business_name")

            # Build greeting — include business name when available for natural intro
            if self.agent_config.get("is_recovery"):
                if business_name:
                    greeting_text = f"Hi, this is {agent_name} from {business_name}. You just called us a few minutes ago — how can I help you?"
                else:
                    greeting_text = f"Hi, this is {agent_name}. You just called us a few minutes ago. How can I help you?"
            else:
                if business_name:
                    greeting_text = f"Hi, thanks for calling {business_name}. This is {agent_name} — how can I help you today?"
                else:
                    greeting_text = f"Hi there, this is {agent_name}. How can I help you today?"

            # 1. INSTANT AUDIO: Send text directly to TTS, bypassing the LLM completely
            await task.queue_frames([
                TTSSpeakFrame(text=greeting_text)
            ])

            # 2. QUIET MEMORY UPDATE: Tell the LLM what it just said
            context.add_message({"role": "assistant", "content": greeting_text})

            # 3. PRE-WARM HOT KB IN BACKGROUND
            # Fires 3 broad KB queries in parallel and caches the top chunks in Redis.
            # By the time the user asks their first question, results are ready (5-10ms vs 700ms).
            # Runs as a background task — does NOT block the greeting.
            import asyncio
            asyncio.create_task(self._prewarm_hot_kb_safe())

        # Official example: on_client_disconnected sends EndFrame (graceful shutdown)
        # then does post-call processing. task.cancel() is too abrupt.
        @transport.event_handler("on_client_disconnected")
        async def on_disconnected(transport, client):
            logger.info(f"Call {call_id} disconnected. Sending transcript to backend...")

            # Graceful shutdown — matches official Pipecat Telnyx example
            await task.queue_frames([EndFrame()])

            # Compute call duration in seconds
            duration_seconds = 0
            if call_started_at["value"]:
                duration_seconds = int(time.time() - call_started_at["value"])

            # Send transcript + duration to backend for analytics + minute tracking
            try:
                transcript = context.get_messages()
                internal_key = os.environ.get("INTERNAL_API_KEY", "")
                async with httpx.AsyncClient() as client:
                    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
                    await client.post(
                        f"{backend_url}/api/v1/process-call-data",
                        headers={"X-Internal-Key": internal_key},
                        json={
                            "call_id":          call_id,
                            "transcript":       transcript,
                            "tenant_id":        self.tenant_id,
                            "agent_id":         self.agent_config.get("agent_id"),
                            "duration_seconds": duration_seconds,
                            "from_number":      self.agent_config.get("from_number", "unknown"),
                            "to_number":        self.agent_config.get("to_number", "unknown"),
                        },
                        timeout=10.0
                    )
                logger.info(f"📞 Call duration: {duration_seconds}s — sent to backend")
            except Exception as e:
                logger.error(f"Failed to send post-call hook: {e}")

        # 11. Run
        runner = PipelineRunner()
        await runner.run(task)
