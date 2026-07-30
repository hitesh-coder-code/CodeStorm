from __future__ import annotations

import os
import re

import httpx


OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "gemma3:4b",
)

OLLAMA_TIMEOUT_SECONDS = float(
    os.getenv(
        "OLLAMA_TIMEOUT_SECONDS",
        "240",
    )
)


HIGH_RISK_PATTERNS = [
    r"\bkill myself\b",
    r"\bend my life\b",
    r"\bwant to die\b",
    r"\bdon't want to live\b",
    r"\bhurt myself\b",
    r"\bself[- ]?harm\b",
    r"\bsuicid",
]


SYSTEM_PROMPT = """
You are MindVault's supportive reflection assistant.

Respond to the user's personal journal entry with warmth and respect.

Rules:
1. Acknowledge the person's feelings naturally.
2. Do not diagnose any mental-health or medical condition.
3. Do not claim to be a doctor or therapist.
4. Do not shame, judge or lecture.
5. Give one small, practical and safe next step.
6. End with one thoughtful reflection question.
7. Keep the response between 70 and 150 words.
8. Use simple and natural English.
9. Do not use many headings or bullet points.
10. Do not encourage the user to depend only on AI.
11. When the user appears deeply distressed, encourage them to speak
    with a trusted person such as a parent, guardian, teacher,
    counsellor or close friend.
12. Never provide self-harm instructions.

Return only the reflection text.
""".strip()


def contains_high_risk_language(
    journal_text: str,
) -> bool:
    lowered_text = journal_text.lower()

    return any(
        re.search(pattern, lowered_text)
        for pattern in HIGH_RISK_PATTERNS
    )


def create_urgent_response() -> str:
    return (
        "I’m really sorry you’re carrying this right now. "
        "Your immediate safety matters more than completing this journal. "
        "Please move away from anything you could use to hurt yourself "
        "and contact a trusted adult, parent, guardian, teacher or "
        "counsellor now. If you feel that you may act on these thoughts, "
        "contact emergency services or go to the nearest emergency "
        "department. Please tell someone clearly: "
        "“I do not feel safe being alone right now.”"
    )


async def generate_reflection(
    journal_text: str,
    mood: str | None,
) -> tuple[str, bool]:
    cleaned_text = journal_text.strip()

    if contains_high_risk_language(cleaned_text):
        return create_urgent_response(), True

    selected_mood = (
        mood.strip()
        if mood
        else "not specified"
    )

    user_prompt = f"""
Selected mood: {selected_mood}

Journal entry:
{cleaned_text}

Write a supportive response that acknowledges the user's feelings,
offers one realistic next step and ends with one gentle reflection
question.
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        "options": {
            "temperature": 0.6,
            "top_p": 0.9,
            "num_predict": 240,
        },
        "keep_alive": "10m",
    }

    timeout = httpx.Timeout(
        OLLAMA_TIMEOUT_SECONDS
    )

    async with httpx.AsyncClient(
        timeout=timeout
    ) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=payload,
        )

        response.raise_for_status()

        response_data = response.json()

    reflection = str(
        response_data
        .get("message", {})
        .get("content", "")
    ).strip()

    if not reflection:
        raise RuntimeError(
            "Gemma returned an empty response."
        )

    return reflection, False