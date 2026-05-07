import os
import httpx
import json
from loguru import logger

# ── Pipecat: Audio ──────────────────────────────────────────────────────────
from pipecat.audio.vad.silero import SileroVADAnalyzer

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
from pipecat.frames.frames import LLMMessagesAppendFrame

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
    async def search_kb(self, query: str):
        """Semantic search via pgvector — finds the most relevant KB chunks for this agent."""
        try:
            return await search_knowledge_base(
                query=query,
                tenant_id=uuid.UUID(self.tenant_id),
                agent_id=uuid.UUID(self.agent_config["agent_id"])
            )
        except Exception as e:
            logger.error(f"KB search error: {e}")
            return "No relevant information found in the knowledge base."

    # ── Tool: End Call ───────────────────────────────────────────────────────
    async def end_call(self):
        logger.info(f"AI requested call end for tenant {self.tenant_id}")
        return "Ending the call now. Goodbye!"

    # ── Tool: Transfer to Human ──────────────────────────────────────────────
    async def transfer_to_human(self):
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
        # Source-verified: FastAPIWebsocketParams(audio_in_enabled, audio_out_enabled, serializer)
        # Event handlers: on_client_connected(transport, websocket)
        #                 on_client_disconnected(transport, websocket)
        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                serializer=serializer,
            )
        )

        # 3. STT
        # Source-verified: DeepgramSTTService(api_key, settings=Settings(...))
        # Settings fields: model, language, smart_format, endpointing (all confirmed in source)
        language = self.agent_config.get("language", "en")
        stt = DeepgramSTTService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            settings=DeepgramSTTService.Settings(
                model="nova-2-phonecall",
                language=language,
                smart_format=True,
                endpointing=300,
            )
        )

        # 4. TTS
        tts = DeepgramTTSService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            voice=self.agent_config.get("voice_id", "aura-asteria-en")
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
        system_prompt = self.agent_config.get("system_prompt", "You are a helpful voice assistant.")
        if self.agent_config.get("is_recovery"):
            system_prompt = (
                "IMPORTANT: You are calling the user back because they just missed us. "
                "Start by saying 'Hi there, you just called us a few minutes ago. How can I help you today?'\n\n"
                + system_prompt
            )
        system_prompt += "\nIMPORTANT: If you need to use a tool, tell the user 'Let me check...' before calling it."

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": (
                "CRITICAL RULE: You are on a live voice call. "
                "Keep answers extremely short and conversational. "
                "1-2 short sentences MAXIMUM. Be brief and direct."
            )}
        ]

        context = LLMContext(messages=messages)
        aggregators = LLMContextAggregatorPair(
            context,
            user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer())
        )

        # 7. Register Tools on LLM
        llm.register_function("search_knowledge_base", self.search_kb)
        llm.register_function("end_call", self.end_call)

        if self.agent_config.get("forwarding_number"):
            llm.register_function("transfer_to_human", self.transfer_to_human)

        tools_config = self.agent_config.get("tools_config", {})
        if "shopify" in tools_config:
            async def shopify_wrapper(order_number: str):
                return await shopify.check_order_status(order_number, tools_config["shopify"])
            llm.register_function("check_shopify_order", shopify_wrapper)

        if "custom_api" in tools_config:
            async def custom_api_wrapper(query: str):
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
        # Source-verified: PipelineTask(pipeline, params=PipelineParams(...))
        # PipelineParams does NOT have allow_interruptions or idle_timeout — those
        # are handled by PipelineTask directly (idle_timeout_secs) and transport.
        # allow_interruptions is NOT a PipelineParams field — removed.
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                enable_metrics=True,
            ),
            idle_timeout_secs=self.agent_config.get("idle_timeout", 300),
        )

        # 10. Event Handlers
        # Source-verified: on_client_connected(transport, websocket)
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, websocket):
            logger.info("Telnyx audio stream connected. Sending greeting.")
            greet_msg = "Please give a very short, warm greeting."
            if self.agent_config.get("is_recovery"):
                greet_msg = "Please give a short greeting and mention we are calling them back."

            # Source-verified: task.queue_frames([...]) ← confirmed method exists
            await task.queue_frames([
                LLMMessagesAppendFrame(
                    messages=[{"role": "user", "content": greet_msg}],
                    run_llm=True
                )
            ])

        # Source-verified: on_client_disconnected(transport, websocket)
        @transport.event_handler("on_client_disconnected")
        async def on_disconnected(transport, websocket):
            logger.info(f"Call {call_id} disconnected. Sending transcript to backend...")

            # Cancel the pipeline task
            # Source-verified: task.cancel() ← confirmed async method
            await task.cancel()

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
