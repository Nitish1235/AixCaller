import os
import json
from openai import AsyncOpenAI


class AnalyticsService:
    def __init__(self):
        self._client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

    async def analyze_call(self, transcript, agent_context: dict | None = None) -> dict:
        """
        Analyze a call transcript.

        Returns a dict with:
          - call_type:    "lead_gen" | "booking" | "support" | "ecommerce" | "general"
          - summary:      1-2 sentence plain-English outline of what the call was about
          - sentiment:    "Happy" | "Frustrated" | "Neutral"
          - action_items: list of follow-up tasks
          - lead_info:    {"intent": str, "interest_level": "hot|warm|cold"} or null
          - booking_info: {"service": str, "date": str, "time": str, "confirmed": bool} or null
          - issue_info:   {"issue": str, "resolved": bool} or null

        agent_context is an optional dict with keys like tools_config, agent_name,
        used as a hint for call_type classification.
        """
        # ── Normalise transcript to readable string ───────────────────────────
        if isinstance(transcript, list):
            lines = []
            for m in transcript:
                role = m.get("role", "")
                content = m.get("content", "")
                if role == "system":
                    continue
                if isinstance(content, list):
                    # Handle content arrays (tool call results etc.)
                    content = " ".join(
                        p.get("text", "") for p in content if isinstance(p, dict)
                    )
                if content and str(content).strip():
                    lines.append(f"{role.upper()}: {content}")
            transcript_str = "\n".join(lines)
        else:
            transcript_str = str(transcript or "")

        if len(transcript_str.strip()) < 20:
            return {
                "call_type": "general",
                "summary": "Call too short to analyze.",
                "sentiment": "Neutral",
                "action_items": [],
                "lead_info": None,
                "booking_info": None,
                "issue_info": None,
            }

        # ── Build agent context hint ──────────────────────────────────────────
        context_hint = ""
        if agent_context:
            tools = agent_context.get("tools_config", {})
            hints = []
            if tools.get("google_connected"):
                hints.append("agent has calendar/booking tools")
            if "shopify" in tools:
                hints.append("agent has Shopify/ecommerce tools")
            if agent_context.get("forwarding_number"):
                hints.append("agent can transfer to human support")
            agent_name = agent_context.get("name", "")
            if agent_name:
                hints.append(f"agent name: {agent_name}")
            if hints:
                context_hint = f"\nAgent context: {', '.join(hints)}."

        prompt = f"""You are a concise call analyst. Analyze this AI voice call transcript.{context_hint}

Transcript:
{transcript_str}

Return ONLY a valid JSON object with these exact keys:

- "call_type": classify as exactly one of:
    "lead_gen"   — caller is interested in the product/service, asking about pricing, features, or how to sign up
    "booking"    — caller is scheduling or confirming an appointment
    "support"    — caller has a problem, question, or complaint about something they already use
    "ecommerce"  — caller is asking about an order, delivery, return, or product they bought
    "general"    — does not fit the above categories

- "summary": 1-2 sentences MAX. Plain English outline of what the call was about. No fluff.

- "sentiment": exactly one of "Happy", "Frustrated", "Neutral"

- "action_items": JSON array of specific follow-up tasks. Keep each item under 10 words. Empty array if none.

- "lead_info": if call_type is "lead_gen", an object with:
    "intent": what the caller wanted (e.g. "pricing inquiry", "product demo", "partnership")
    "interest_level": "hot" (ready to buy), "warm" (interested, not committed), or "cold" (just browsing)
  otherwise null

- "booking_info": if call_type is "booking", an object with:
    "service": what they booked (e.g. "consultation", "dental checkup", "property viewing")
    "date": date string or "" if not mentioned
    "time": time string or "" if not mentioned
    "confirmed": true if appointment was confirmed, false if tentative
  otherwise null

- "issue_info": if call_type is "support" or "ecommerce", an object with:
    "issue": one-line description of the problem/question
    "resolved": true if resolved on the call, false if escalation or follow-up needed
  otherwise null
"""
        try:
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            content = response.choices[0].message.content or "{}"
            result = json.loads(content)

            # Ensure all expected keys exist with safe defaults
            result.setdefault("call_type", "general")
            result.setdefault("summary", "No summary available.")
            result.setdefault("sentiment", "Neutral")
            result.setdefault("action_items", [])
            result.setdefault("lead_info", None)
            result.setdefault("booking_info", None)
            result.setdefault("issue_info", None)
            return result

        except Exception as e:
            print(f"Analytics error: {e}")
            return {
                "call_type": "general",
                "summary": "Error analyzing transcript.",
                "sentiment": "Neutral",
                "action_items": [],
                "lead_info": None,
                "booking_info": None,
                "issue_info": None,
            }
