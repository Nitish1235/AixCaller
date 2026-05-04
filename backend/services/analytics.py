import os
import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate

class AnalyticsService:
    def __init__(self):
        # Using Grok for post-call analysis
        self.llm = ChatOpenAI(
            api_key=os.getenv("XAI_API_KEY"),
            base_url="https://api.x.ai/v1",
            model="grok-beta"
        )

    async def analyze_call(self, transcript: str):
        """
        Analyze the call transcript using Grok to extract summary, sentiment, and action items.
        """
        if not transcript or len(transcript) < 10:
            return None

        prompt = PromptTemplate.from_template("""
        You are an expert call analyst. Analyze the following transcript from an AI voice call.
        
        Transcript:
        {transcript}
        
        Return ONLY a JSON object with the following keys:
        - summary: A concise 2-sentence summary of the conversation.
        - sentiment: One word (Happy, Frustrated, or Neutral).
        - action_items: A list of specific tasks or follow-ups extracted from the call.
        """)
        
        try:
            chain = prompt | self.llm
            response = await chain.ainvoke({"transcript": transcript})
            
            # Parse the response (Grok usually returns a string that might contain JSON)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            
            return json.loads(content)
        except Exception as e:
            print(f"Analytics error: {e}")
            return {
                "summary": "Error analyzing transcript.",
                "sentiment": "Neutral",
                "action_items": []
            }
