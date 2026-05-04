import os
import httpx
import json
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.deepgram.tts import DeepgramTTSService
from pipecat.processors.user_idle_processor import UserIdleProcessor
from shared.kb import search_knowledge_base
import uuid
from voice_engine.tools import shopify, custom_api
from pipecat.services.openai import OpenAILLMService # Grok is OpenAI compatible
from pipecat.frames.frames import LLMMessagesAppendFrame
from pipecat.transports.network.websocket_server import (
    WebsocketServerParams as FastAPIWebsocketParams,
    WebsocketServerTransport as FastAPIWebsocketTransport
)

class VoiceAgent:
    def __init__(self, tenant_id: str, agent_config: dict):
        self.tenant_id = tenant_id
        self.agent_config = agent_config

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

    async def end_call(self):
        """Tool for the AI to gracefully end the call."""
        logger.info(f"AI requested call end for {self.tenant_id}")
        # Signal the pipeline to stop
        return "Ending the call now. Goodbye!"

    async def stream_to_live_hub(self, call_id: str, role: str, context):
        """
        Sends the latest transcript snippet to the Management API Live Hub.
        """
        try:
            # We use a simple HTTP-based relay if WebSockets are too complex 
            # for the engine, but here we'll simulate the broadcast.
            backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
            async with httpx.AsyncClient() as client:
                # We reuse the process-call-data logic or a dedicated live endpoint
                # For Phase 2, we'll use the WebSocket Hub via a lightweight POST relay
                # to keep the Voice Engine simple and stable.
                await client.post(
                    f"{backend_url}/api/v1/live-update",
                    json={
                        "call_id": call_id,
                        "role": role,
                        "text": context.get_transcript_lines()[-1]["content"] if context.get_transcript_lines() else ""
                    }
                )
        except Exception as e:
            pass # Don't let live-streaming failures crash the call

    async def start(self, websocket, stream_id, call_id):
        # 1. Transport & Serializer
        serializer = TwilioFrameSerializer(
            stream_sid=stream_id
        )

        transport = FastAPIWebsocketTransport(
            websocket=websocket,
            params=FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_out_enabled=True,
                serializer=serializer
            )
        )

        # 2. AI Services (Using Nova-3 and Aura-2)
        language = self.agent_config.get("language", "en")
        
        stt = DeepgramSTTService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            model="nova-3",
            params={"language": language}
        )
        
        tts = DeepgramTTSService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            voice=self.agent_config.get("voice_id", "aura-asteria-en")
        )

        # -- LLM: OpenAI (default) --
        # To switch back to Grok, comment this block and uncomment the xAI block below
        llm = OpenAILLMService(
            api_key=os.environ["OPENAI_API_KEY"],
            model="gpt-4o",
            params={"temperature": self.agent_config.get("llm_temperature", 0.7)}
        )

        # -- LLM: xAI Grok (reserved for later) --
        # llm = OpenAILLMService(
        #     api_key=os.environ["XAI_API_KEY"],
        #     base_url="https://api.x.ai/v1",
        #     model="grok-beta",
        #     params={"temperature": self.agent_config.get("llm_temperature", 0.7)}
        # )

        # 3. Context & RAG Tools
        # Add latency masking prompt
        system_prompt = self.agent_config.get("system_prompt")
        
        if self.agent_config.get("is_recovery"):
            system_prompt = "IMPORTANT: You are calling the user back because they just missed us. Start by saying 'Hi there, you just called us a few minutes ago. How can I help you today?'\n\n" + system_prompt
            
        system_prompt += "\nIMPORTANT: If you need to use a tool to check an order or fetch data, tell the user 'Let me pull that up for you, one moment...' before calling the tool."
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": "IMPORTANT: Keep answers brief. Use search_knowledge_base for facts."}
        ]
        
        # Register base tools
        llm.register_function("search_knowledge_base", self.search_kb)
        llm.register_function("end_call", self.end_call)

        # Register dynamic tools
        tools_config = self.agent_config.get("tools_config", {})
        
        if "shopify" in tools_config:
            async def shopify_wrapper(order_number: str):
                return await shopify.check_order_status(order_number, tools_config["shopify"])
            llm.register_function("check_shopify_order", shopify_wrapper)
            
        if "custom_api" in tools_config:
            async def custom_api_wrapper(query: str):
                return await custom_api.fetch_custom_data(query, tools_config["custom_api"])
            llm.register_function("search_internal_database", custom_api_wrapper)

        context = LLMContext(messages=messages)
        aggregators = LLMContextAggregatorPair(
            context,
            user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer())
        )

        # 4. Assemble Pipeline
        # We use the user-specific idle_timeout here
        idle_timeout = self.agent_config.get("idle_timeout", 7.0)
        idle_processor = UserIdleProcessor(timeout=idle_timeout)
        
        pipeline = Pipeline([
            transport.input(),
            stt,
            aggregators.user(),
            idle_processor,     # Watch for silence here
            llm,
            tts,
            transport.output(),
            aggregators.assistant()
        ])

        # 5. Initialize Task
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                allow_interruptions=True,
                enable_metrics=True
            )
        )

        # 6. Event Handlers (Security & Stability)
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, client):
            logger.info("Telnyx audio stream connected.")
            # Auto-greet the caller
            greet_msg = "Please greet the caller warmly."
            if self.agent_config.get("is_recovery"):
                greet_msg = "Please greet the caller warmly and mention we are calling them back."

            await task.queue_frames([
                LLMMessagesAppendFrame(
                    messages=[{"role": "user", "content": greet_msg}],
                    run_llm=True
                )
            ])
        
        @transport.event_handler("on_client_disconnected")
        async def on_disconnected(transport, websocket):
            logger.info(f"Call {call_id} hung up. Sending transcript to backend...")
            await task.cancel()
            
            # 1. Close Live Stream if open
            if hasattr(self, 'live_ws'):
                await self.live_ws.close()

            # 2. Send final data for Analytics
            try:
                transcript = context.get_transcript()
                async with httpx.AsyncClient() as client:
                    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000")
                    await client.post(
                        f"{backend_url}/api/v1/process-call-data",
                        json={
                            "call_id": call_id,
                            "transcript": transcript,
                            "tenant_id": self.tenant_id,
                            "agent_id": self.agent_config.get("agent_id")
                        }
                    )
            except Exception as e:
                logger.error(f"Failed to send post-call hook: {e}")

        # 7. Live Monitoring Stream (Non-blocking)
        @aggregators.user().event_handler("on_context_updated")
        async def on_user_context_updated(processor, context):
            await self.stream_to_live_hub(call_id, "user", context)

        @aggregators.assistant().event_handler("on_context_updated")
        async def on_assistant_context_updated(processor, context):
            await self.stream_to_live_hub(call_id, "assistant", context)

        # 7. Handle AI-driven hangup via tool call
        @llm.event_handler("on_function_call")
        async def on_function_call(llm, name, args, call_id):
            if name == "end_call":
                logger.info("AI calling end_call — initiating hangup.")
                await task.stop_when_llm_finishes()

        # 8. Handle Silence (User Idle)
        @idle_processor.event_handler("on_user_idle")
        async def on_user_idle(processor):
            timeout = self.agent_config.get("idle_timeout", 7.0)
            logger.info(f"User is idle for {timeout}s — sending reminder.")
            await task.queue_frames([
                LLMMessagesAppendFrame(
                    messages=[{"role": "user", "content": "The user has been silent. Please ask them if they are still there or if they need more help."}],
                    run_llm=True
                )
            ])

        runner = PipelineRunner()
        await runner.run(task)
