import os
import httpx
import json
from loguru import logger

# ── Pipecat: Audio ──────────────────────────────────────────────────────────
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.audio.vad.vad_analyzer import VADParams

# ── Pipecat: Pipeline ────────────────────────────────────────────────────────
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask

# ── Pipecat: Context & Aggregators ───────────────────────────────────────────
# Source-verified: llm_context.py → LLMContext(messages=[...])
from pipecat.processors.aggregators.llm_context import LLMContext
# Source-verified: llm_response_universal.py
#   LLMContextAggregatorPair(context, user_params=LLMUserAggregatorParams(...))
#   LLMUserAggregatorParams(vad_analyzer=...) ← confirmed field name
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)

# ── Pipecat: Serializer ──────────────────────────────────────────────────────
# Source-verified: telnyx.py
#   TelnyxFrameSerializer(stream_id, outbound_encoding, inbound_encoding,
#                         call_control_id=None, api_key=None, params=InputParams())
#   InputParams.auto_hang_up: bool = True  (default)
from pipecat.serializers.telnyx import TelnyxFrameSerializer

# ── Pipecat: Services ────────────────────────────────────────────────────────
# Source-verified: deepgram/stt.py
#   DeepgramSTTService(api_key, settings=Settings(...))
#   Settings = DeepgramSTTSettings — has model, language, smart_format, endpointing, etc.
from pipecat.services.deepgram.stt import DeepgramSTTService
# Source-verified: deepgram/tts.py
from pipecat.services.deepgram.tts import DeepgramTTSService
# Source-verified: openai/llm.py
#   OpenAILLMService(api_key, settings=Settings(model=..., temperature=...))
from pipecat.services.openai.llm import OpenAILLMService

# ── Pipecat: Frames ──────────────────────────────────────────────────────────
# Source-verified: frames.py exports LLMMessagesAppendFrame
from pipecat.frames.frames import EndFrame, LLMMessagesAppendFrame, TTSSpeakFrame

# ── Pipecat: Transport ───────────────────────────────────────────────────────
# Source-verified: transports/websocket/fastapi.py
#   FastAPIWebsocketTransport(websocket, params=FastAPIWebsocketParams(...))
#   FastAPIWebsocketParams: audio_in_enabled, audio_out_enabled, serializer
#   Events: on_client_connected(transport, websocket)
#           on_client_disconnected(transport, websocket)
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

# ── Internal ─────────────────────────────────────────────────────────────────
import uuid
from shared.kb import search_knowledge_base
from voice_engine.tools import shopify, custom_api


class VoiceAgent:
    def __init__(self, tenant_id: str, agent_config: dict):
        self.tenant_id = tenant_id
        self.agent_config = agent_config

    # ── Tool: Knowledge Base Search ──────────────────────────────────────────
    async def search_kb(self, args):
        """Semantic search via pgvector — finds the most relevant KB chunks for this agent."""
        try:
            query = args.arguments.get("query", "")
            return await search_knowledge_base(
                query=query,
                tenant_id=uuid.UUID(self.tenant_id),
                agent_id=uuid.UUID(self.agent_config["agent_id"])
            )
        except Exception as e:
            logger.error(f"KB search error: {e}")
            return "No relevant information found in the knowledge base."

    # ── Tool: End Call ───────────────────────────────────────────────────────
    async def end_call(self, args):
        logger.info(f"AI requested call end for tenant {self.tenant_id}")
        return "Ending the call now. Goodbye!"

    # ── Tool: Transfer to Human ──────────────────────────────────────────────
    async def transfer_to_human(self, args):
        logger.info(f"AI requested transfer for tenant {self.tenant_id}")
        return "Please hold while I transfer you to a human representative."

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

        # 2. Transport
        # Official Pipecat Telnyx example uses audio_out_sample_rate=8000, audio_in_sample_rate=8000
        # because Telnyx streams PCMU at 8kHz. Default pipeline rates (24k/16k) cause silent audio.
        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                audio_in_sample_rate=8000,
                audio_out_sample_rate=8000,
                serializer=serializer,
            )
        )

        # 3. STT — latency optimizations:
        # - nova-3-general: lower latency than nova-2-phonecall for streaming
        # - endpointing=100: fire transcript after 100ms silence (was 300ms = 200ms extra wait)
        # - smart_format: keep on for punctuation
        language = self.agent_config.get("language", "en")
        stt = DeepgramSTTService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            sample_rate=8000,
            audio_passthrough=True,
            settings=DeepgramSTTService.Settings(
                model="nova-2-phonecall",
                language=language,
                smart_format=True,
                endpointing=300,   # ms of silence before transcript fires
                interim_results=True,  # get partial results for faster perceived response
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
                voice=self.agent_config.get("voice_id", "aura-2-thalia-en")
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

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": (
                "CRITICAL RULE: You are on a live voice call. "
                "Keep answers extremely short and conversational. "
                "1-2 short sentences MAXIMUM. Be brief and direct."
            )}
        ]

        from pipecat.adapters.schemas.function_schema import FunctionSchema
        from pipecat.adapters.schemas.tools_schema import ToolsSchema

        # Define OpenAI tool schemas using Pipecat's 1.1.0 FunctionSchema
        standard_tools = [
            FunctionSchema(
                name="search_knowledge_base",
                description="Searches the internal knowledge base for answers to user questions about the business, products, or services. Use this when the user asks a question you don't know the answer to.",
                properties={
                    "query": {
                        "type": "string",
                        "description": "The search query to look up in the knowledge base."
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

        if self.agent_config.get("forwarding_number"):
            standard_tools.append(
                FunctionSchema(
                    name="transfer_to_human",
                    description="Transfers the call to a human representative. Use this when the user specifically asks to speak to a human or manager, or if you cannot help them.",
                    properties={},
                    required=[]
                )
            )

        tools_config = self.agent_config.get("tools_config", {})
        if "shopify" in tools_config:
            standard_tools.append(
                FunctionSchema(
                    name="check_shopify_order",
                    description="Checks the status of a Shopify order given the order number.",
                    properties={
                        "order_number": {
                            "type": "string",
                            "description": "The order number provided by the user (e.g. 1001)."
                        }
                    },
                    required=["order_number"]
                )
            )

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

        context = LLMContext(messages=messages, tools=ToolsSchema(standard_tools=standard_tools))
        aggregators = LLMContextAggregatorPair(
            context,
            user_params=LLMUserAggregatorParams(
                # VAD latency tuning (source: vad_analyzer.py defaults: start=0.2, stop=0.2)
                # stop_secs=0.3: wait 300ms of silence before deciding user stopped speaking.
                # Shorter = faster response but more false-positives (cuts off mid-sentence).
                # 0.3s is optimal for phone calls per Pipecat phone-chatbot examples.
                vad_analyzer=SileroVADAnalyzer(
                    sample_rate=8000,
                    params=VADParams(
                        start_secs=0.2,   # confirm speech start after 200ms
                        stop_secs=0.2,    # confirm speech stop after 200ms (recommended)
                    )
                ),
                # user_turn_stop_timeout: max wait after VAD stop before forcing LLM run.
                # Reduce from default 5.0s to 1.0s for snappy responses.
                user_turn_stop_timeout=1.0,
            )
        )

        # 7. Register Tools on LLM
        llm.register_function("search_knowledge_base", self.search_kb)
        llm.register_function("end_call", self.end_call)

        if self.agent_config.get("forwarding_number"):
            llm.register_function("transfer_to_human", self.transfer_to_human)

        tools_config = self.agent_config.get("tools_config", {})
        if "shopify" in tools_config:
            async def shopify_wrapper(args):
                order_number = args.arguments.get("order_number", "")
                return await shopify.check_order_status(order_number, tools_config["shopify"])
            llm.register_function("check_shopify_order", shopify_wrapper)

        if "custom_api" in tools_config:
            async def custom_api_wrapper(args):
                query = args.arguments.get("query", "")
                return await custom_api.fetch_custom_data(query, tools_config["custom_api"])
            llm.register_function("search_internal_database", custom_api_wrapper)

        # 8. Assemble Pipeline
        pipeline = Pipeline([
            transport.input(),
            stt,
            aggregators.user(),
            llm,
            tts,
            transport.output(),
            aggregators.assistant()
        ])

        # 9. Pipeline Task
        # idle_timeout_secs: how long with NO speaking activity before auto-cancelling.
        # 30 seconds is a reasonable "dead air" limit for a voice call.
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                enable_metrics=True,
            ),
            idle_timeout_secs=30,  # hang up after 30s of total silence
        )

        # 10. Event Handlers
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, client):
            logger.info("Telnyx audio stream connected. Sending instant TTS greeting.")
            
            agent_name = self.agent_config.get("name", "our assistant")
            if self.agent_config.get("is_recovery"):
                greeting_text = f"Hi there, this is {agent_name}. You just called us a few minutes ago. How can I help you?"
            else:
                greeting_text = f"Hi there, this is {agent_name}. How can I help you today?"

            # 1. INSTANT AUDIO: Send text directly to TTS, bypassing the LLM completely
            await task.queue_frames([
                TTSSpeakFrame(text=greeting_text)
            ])

            # 2. QUIET MEMORY UPDATE: Tell the LLM what it just said by directly mutating context
            # This is safer than queuing LLMMessagesAppendFrame(run_llm=False) which can cause pipeline race conditions
            context.add_message({"role": "assistant", "content": greeting_text})

        # Official example: on_client_disconnected sends EndFrame (graceful shutdown)
        # then does post-call processing. task.cancel() is too abrupt.
        @transport.event_handler("on_client_disconnected")
        async def on_disconnected(transport, client):
            logger.info(f"Call {call_id} disconnected. Sending transcript to backend...")

            # Graceful shutdown — matches official Pipecat Telnyx example
            await task.queue_frames([EndFrame()])

            # Send transcript to backend for analytics
            try:
                transcript = context.get_messages()
                async with httpx.AsyncClient() as client:
                    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
                    await client.post(
                        f"{backend_url}/api/v1/process-call-data",
                        json={
                            "call_id": call_id,
                            "transcript": transcript,
                            "tenant_id": self.tenant_id,
                            "agent_id": self.agent_config.get("agent_id")
                        },
                        timeout=10.0
                    )
            except Exception as e:
                logger.error(f"Failed to send post-call hook: {e}")

        # 11. Run
        runner = PipelineRunner()
        await runner.run(task)
