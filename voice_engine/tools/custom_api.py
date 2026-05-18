import json
import httpx
from loguru import logger


async def fetch_custom_data(query: str, config: dict) -> str:
    """
    Universal tool: hits any REST endpoint configured by the user.

    Config keys (stored in agent.tools_config["custom_api"]):
      endpoint     – full URL (required)
      method       – "GET" | "POST"  (default: GET)
      auth_header  – Authorization header value, e.g. "Bearer sk-xxx" (optional)
      description  – used by the LLM as the tool description (read in bot.py)
    """
    endpoint = config.get("endpoint", "").strip()
    if not endpoint:
        return "Custom URL tool is misconfigured — no endpoint set."

    method = config.get("method", "GET").upper()

    # Build headers — support both legacy dict form and new auth_header string
    headers: dict = {}
    raw_auth = config.get("auth_header", "")
    legacy_headers = config.get("headers", {})
    if isinstance(legacy_headers, dict):
        headers.update(legacy_headers)
    if isinstance(raw_auth, str) and raw_auth.strip():
        headers["Authorization"] = raw_auth.strip()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if method == "POST":
                resp = await client.post(
                    endpoint,
                    headers=headers,
                    json={"query": query},
                )
            else:
                resp = await client.get(
                    endpoint,
                    headers=headers,
                    params={"query": query},
                )

        if resp.status_code >= 300:
            logger.warning(f"Custom URL returned {resp.status_code}: {resp.text[:200]}")
            return f"The custom system returned an error (HTTP {resp.status_code}). Please try again later."

        # Parse response — prefer JSON, fall back to plain text
        try:
            data = resp.json()
            # Flatten nested JSON into a readable string (cap at 600 chars)
            text = json.dumps(data, ensure_ascii=False)[:600]
        except Exception:
            text = resp.text[:600]

        return (
            f"Here is the data from the custom system: {text}. "
            "Please extract the most relevant parts and summarise them clearly for the caller in one or two sentences."
        )

    except httpx.TimeoutException:
        logger.error(f"Custom URL timeout: {endpoint}")
        return "The custom system took too long to respond. Please try again in a moment."
    except Exception as e:
        logger.error(f"Custom URL error: {e}")
        return "I couldn't connect to the custom system right now."
