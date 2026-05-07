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
from shared.kb import search_knowledge_base
import uuid
from voice_engine.tools import shopify, custom_api
from pipecat.services.openai.llm import OpenAILLMService # Grok is OpenAI compatible
from pipecat.frames.frames import LLMMessagesAppendFrame
from pipecat.transports.websocket.fastapi import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport
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
        return "Ending the call now. Goodbye!"

    async def transfer_to_human(self):
        """Tool for the AI to transfer the caller to a human representative."""
        logger.info(f"AI requested transfer for {self.tenant_id}")
        return "Please hold while I transfer you to a human representative."

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
                    f"{backend_url}/api/v1/live/update",
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
            stream_sid=stream_id,
            auto_hang_up=False
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
            model="nova-2-phonecall",
            params={
                "language": language,
                "endpointing": 300,
                "smart_format": True
            }
        )
        
        tts = DeepgramTTSService(
            api_key=os.environ["DEEPGRAM_API_KEY"],
            voice=self.agent_config.get("voice_id", "aura-asteria-en")
        )

        # -- LLM: OpenAI (default) --
        # To switch back to Grok, comment this block and uncomment the xAI block below
        llm = OpenAILLMService(
            api_key=os.environ["OPENAI_API_KEY"],
            model="gpt-4o-mini",
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
            
        system_prompt += "\nIMPORTANT: If you need to use a tool to check an order or fetch data, tell the user 'Let me check...' before calling the tool."
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": "CRITICAL RULE: You are on a live voice call. Keep answers extremely short and conversational. 1-2 short sentences MAXIMUM. Do not list bullet points or ramble. Be brief and direct."}
        ]
        
        # Register base tools
        llm.register_function("search_knowledge_base", self.search_kb)
        llm.register_function("end_call", self.end_call)
        
        if self.agent_config.get("forwarding_number"):
            llm.register_function("transfer_to_human", self.transfer_to_human)

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
        pipeline = Pipeline([
            transport.input(),
            stt,
            aggregators.user(),
            llm,
            tts,
            transport.output(),
            aggregators.assistant()
        ])

        # 5. Initialize Task
        idle_timeout = self.agent_config.get("idle_timeout", 7)
        task = PipelineTask(
            pipeline,
            params=PipelineParams(
                allow_interruptions=True,
                enable_metrics=True,
                idle_timeout=idle_timeout
            )
        )

        # 6. Event Handlers (Security & Stability)
        @transport.event_handler("on_client_connected")
        async def on_connected(transport, client):
            logger.info("Telnyx audio stream connected.")
            # Auto-greet the caller
            greet_msg = "Please give a very short, warm greeting."
            if self.agent_config.get("is_recovery"):
                greet_msg = "Please give a short greeting and mention we are calling them back."

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
            if name == "end_call":
                logger.info("AI calling end_call — initiating hangup.")
                await task.stop_when_llm_finishes()
            
            if name == "transfer_to_human":
                logger.info("AI calling transfer_to_human — initiating Telnyx transfer.")
                forwarding_num = self.agent_config.get("forwarding_number")
                if forwarding_num:
                    try:
                        async with httpx.AsyncClient() as client:
                            # Telnyx Call Control: Transfer
                            # Note: call_id here is the Call Control ID (CallUUID)
                            url = f"https://api.telnyx.com/v2/calls/{call_id}/actions/transfer"
                            headers = {
                                "Authorization": f"Bearer {os.environ['TELNYX_API_KEY']}",
                                "Content-Type": "application/json"
                            }
                            payload = {"to": forwarding_num}
                            await client.post(url, headers=headers, json=payload)
                            logger.info(f"Telnyx transfer command sent to {forwarding_num}")
                    except Exception as e:
                        logger.error(f"Transfer failed: {e}")
                await task.stop_when_llm_finishes()


        runner = PipelineRunner()
        await runner.run(task)
