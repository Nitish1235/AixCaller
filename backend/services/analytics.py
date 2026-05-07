import os
import json
from openai import AsyncOpenAI

class AnalyticsService:
    def __init__(self):
        # Use OpenAI gpt-4o-mini — already configured, no extra API key needed.
        # Grok/XAI "grok-beta" model does not exist anymore and caused 400 errors.
        self._client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))

    async def analyze_call(self, transcript) -> dict:
        """
        Analyze the call transcript to extract summary, sentiment, and action items.
        transcript may be a list of message dicts or a plain string.
        """
        # Normalize transcript to a readable string
        if isinstance(transcript, list):
            lines = []
            for m in transcript:
                role = m.get("role", "")
                content = m.get("content", "")
                if role == "system":
                    continue  # skip system prompts from analysis
                lines.append(f"{role.upper()}: {content}")
            transcript_str = "\n".join(lines)
        else:
            transcript_str = str(transcript or "")

        if len(transcript_str.strip()) < 20:
            return {"summary": "Call too short to analyze.", "sentiment": "Neutral", "action_items": []}

        prompt = f"""You are an expert call analyst. Analyze this AI voice call transcript.

Transcript:
{transcript_str}

Return ONLY a valid JSON object with these exact keys:
- summary: A concise 2-sentence summary of the conversation.
- sentiment: Exactly one word — Happy, Frustrated, or Neutral.
- action_items: A JSON array of specific follow-up tasks (can be empty []).
"""
        try:
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            content = response.choices[0].message.content or "{}"
            return json.loads(content)
        except Exception as e:
            print(f"Analytics error: {e}")
            return {"summary": "Error analyzing transcript.", "sentiment": "Neutral", "action_items": []}
