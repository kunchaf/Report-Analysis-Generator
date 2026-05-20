import os
import re
import asyncio
import google.generativeai as genai
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

_backend_root = Path(__file__).parent.parent.parent
load_dotenv(dotenv_path=_backend_root / ".env")
load_dotenv(dotenv_path=_backend_root / "app" / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise EnvironmentError("GEMINI_API_KEY is not set. Please add it to backend/.env")

genai.configure(api_key=GEMINI_API_KEY)

# Fallback chain — each model has its own separate daily quota bucket
GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
]

PERSPECTIVE_PROMPTS = {
    "executive_summary": {
        "label": "Executive Summary",
        "icon": "📋",
        "prompt": (
            "You are a senior executive analyst. Provide a concise executive summary of the following topic. "
            "Cover the core essence, key facts, current state, and overall significance. "
            "Be authoritative, clear, and strategic. Use 3-5 well-structured paragraphs.\n\nTopic: {topic}"
        ),
    },
    "strategic_analysis": {
        "label": "Strategic Analysis",
        "icon": "♟️",
        "prompt": (
            "You are a strategic management consultant. Perform a deep strategic analysis of the following topic. "
            "Include market positioning, competitive dynamics, key drivers, and long-term implications. "
            "Reference frameworks like SWOT, Porter's Five Forces, or PESTEL where relevant. "
            "Use 4-6 structured paragraphs.\n\nTopic: {topic}"
        ),
    },
    "critical_analysis": {
        "label": "Critical Analysis",
        "icon": "🔬",
        "prompt": (
            "You are a critical thinker and academic researcher. Critically examine the following topic. "
            "Challenge assumptions, identify weaknesses, contradictions, or controversies. "
            "Provide a balanced, evidence-based critique. Use 3-5 structured paragraphs.\n\nTopic: {topic}"
        ),
    },
    "opportunities_risks": {
        "label": "Opportunities & Risks",
        "icon": "⚡",
        "prompt": (
            "You are a risk and opportunity analyst. Analyze the following topic to identify "
            "the top opportunities and risks involved. Structure your response with clearly labeled "
            "Opportunities (at least 3) and Risks (at least 3), each with a brief explanation of impact "
            "and likelihood.\n\nTopic: {topic}"
        ),
    },
    "future_outlook": {
        "label": "Future Outlook",
        "icon": "🔭",
        "prompt": (
            "You are a futurist and trend analyst. Provide a forward-looking analysis of the following topic. "
            "Discuss short-term (1-2 years), medium-term (3-5 years), and long-term (10+ years) outlooks. "
            "Highlight emerging trends, disruptive forces, and potential scenarios.\n\nTopic: {topic}"
        ),
    },
    "stakeholder_impact": {
        "label": "Stakeholder Impact",
        "icon": "👥",
        "prompt": (
            "You are an organizational analyst. Analyze the impact of the following topic on key stakeholders. "
            "Consider: investors/shareholders, employees, customers, regulators, and communities. "
            "For each group, describe the nature and magnitude of impact.\n\nTopic: {topic}"
        ),
    },
}

_SYSTEM_INSTRUCTION = (
    "You are a world-class analyst producing content for a professional intelligence report. "
    "Write in clear, formal prose. Use markdown formatting with **bold** for key terms, "
    "bullet points where appropriate, and ensure professional quality throughout."
)

_INTER_REQUEST_DELAY = 3.0

# Models that have hit their daily quota this session — skip them
_exhausted_models: set[str] = set()


def _is_daily_quota_error(err: str) -> bool:
    return "PerDay" in err or "per_day" in err.lower()


def _parse_retry_seconds(err: str) -> int:
    match = re.search(r'retry_delay\s*\{\s*seconds:\s*(\d+)', err)
    return int(match.group(1)) + 2 if match else 30


async def _call_gemini_with_fallback(prompt: str) -> str:
    """
    Try each model in order. Daily-quota errors skip to next model.
    Per-minute quota errors wait the retry_delay then retry once.
    """
    available = [m for m in GEMINI_MODELS if m not in _exhausted_models]

    if not available:
        raise RuntimeError(
            "All Gemini models have hit their daily free-tier quota (20 req/day each). "
            "Quotas reset at midnight Pacific Time. To remove limits, enable billing at "
            "https://aistudio.google.com"
        )

    last_error: Exception | None = None

    for model_name in available:
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=_SYSTEM_INSTRUCTION,
        )

        for attempt in range(2):
            try:
                response = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=1500,
                    ),
                )
                return response.text

            except Exception as e:
                last_error = e
                err_str = str(e)
                is_quota = (
                    "429" in err_str
                    or "quota" in err_str.lower()
                    or "ResourceExhausted" in err_str
                )

                if not is_quota:
                    raise  # non-quota error, don't retry

                if _is_daily_quota_error(err_str):
                    # Daily limit hit — mark exhausted and try next model
                    _exhausted_models.add(model_name)
                    break  # break inner loop, continue to next model

                # Per-minute quota — wait then retry once
                if attempt == 0:
                    wait = _parse_retry_seconds(err_str)
                    await asyncio.sleep(wait)
                    continue

                # Second attempt also failed — try next model
                break

    raise last_error or RuntimeError("All Gemini models failed.")


async def _analyze_perspective(topic: str, perspective_key: str) -> dict:
    config = PERSPECTIVE_PROMPTS.get(perspective_key)
    if not config:
        return {"key": perspective_key, "label": perspective_key, "content": "Perspective not found.", "icon": "?"}

    prompt = config["prompt"].format(topic=topic)
    try:
        content = await _call_gemini_with_fallback(prompt)
    except Exception as e:
        content = f"Error generating content: {str(e)}"

    return {
        "key": perspective_key,
        "label": config["label"],
        "icon": config["icon"],
        "content": content,
    }


async def analyze_topic(topic: str, perspectives: list[str]) -> dict:
    valid = [p for p in perspectives if p in PERSPECTIVE_PROMPTS]
    if not valid:
        valid = list(PERSPECTIVE_PROMPTS.keys())[:4]

    results = []
    for i, perspective in enumerate(valid):
        result = await _analyze_perspective(topic, perspective)
        results.append(result)
        if i < len(valid) - 1:
            await asyncio.sleep(_INTER_REQUEST_DELAY)

    return {
        "topic": topic,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "perspectives": {r["key"]: r for r in results},
    }
