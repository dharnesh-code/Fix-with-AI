import json
import os
import re

import google.generativeai as genai

from prompts import CHAT_SYSTEM_PROMPT_TEMPLATE, DIAGNOSIS_SYSTEM_PROMPT

_configured = False


def _ensure_configured():
    global _configured
    if _configured:
        return
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Copy backend/.env.example to backend/.env "
            "and paste your key in."
        )
    genai.configure(api_key=api_key)
    _configured = True


def _get_model():
    _ensure_configured()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    return genai.GenerativeModel(model_name)


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def diagnose(image_bytes: bytes, mime_type: str, description: str) -> dict:
    """Send an image + description to Gemini and return the parsed diagnosis JSON."""
    model = _get_model()

    response = model.generate_content(
        [
            DIAGNOSIS_SYSTEM_PROMPT,
            {"mime_type": mime_type, "data": image_bytes},
            f"User's description of the problem: {description}",
        ],
        generation_config={"response_mime_type": "application/json"},
    )

    raw_text = _strip_code_fences(response.text)

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Gemini did not return valid JSON: {exc}\nRaw response: {raw_text}")


def chat_reply(diagnosis: dict, history: list[dict], user_message: str) -> str:
    """Continue a follow-up chat conversation grounded in the original diagnosis."""
    model = _get_model()

    system_prompt = CHAT_SYSTEM_PROMPT_TEMPLATE.format(
        diagnosis_json=json.dumps(diagnosis, indent=2)
    )

    # Rebuild conversation for Gemini's chat interface
    gemini_history = [{"role": "user", "parts": [system_prompt]},
                       {"role": "model", "parts": ["Understood, I'll help with follow-up questions about this repair."]}]

    for turn in history:
        role = "user" if turn["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [turn["content"]]})

    chat_session = model.start_chat(history=gemini_history)
    response = chat_session.send_message(user_message)
    return response.text.strip()
