"""
gemini_client.py — Diagnoser + Evaluator pipeline with 429 retry/backoff.

Flow for diagnose():
  1. Diagnoser LLM produces a repair diagnosis JSON.
  2. Evaluator LLM audits it for hallucinations, safety issues, and errors.
  3a. Approved  → return (diagnosis, evaluator_notes).
  3b. Evaluator provides corrected_diagnosis → return that instead.
  3c. Rejected with no correction → retry diagnoser with critique (up to MAX_RETRIES).
  3d. Still failing after retries → return best attempt with issues in confidence_note.

All LLM calls are wrapped with _with_retry() which handles ResourceExhausted (429)
by sleeping for the retry_delay the API specifies, then retrying up to LLM_RETRY_MAX times.
"""

import json
import logging
import os
import re
import time

import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted

from evaluator import evaluate
from prompts import (
    CHAT_SYSTEM_PROMPT_TEMPLATE,
    DIAGNOSER_RETRY_PROMPT_TEMPLATE,
    DIAGNOSIS_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)

MAX_RETRIES = 2      # Max diagnoser retries after evaluator rejection
LLM_RETRY_MAX = 3    # Max retries on 429 rate-limit errors
LLM_RETRY_BASE_WAIT = 12  # Fallback wait seconds if API doesn't tell us

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


def _get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")


def _get_model():
    _ensure_configured()
    return genai.GenerativeModel(_get_model_name())


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _extract_retry_delay(exc: ResourceExhausted) -> float:
    """Pull the retry_delay seconds from the 429 error details, with a fallback."""
    try:
        # The error details contain retry_delay { seconds: N }
        msg = str(exc)
        import re as _re
        match = _re.search(r"retry in (\d+(?:\.\d+)?)s", msg)
        if match:
            return float(match.group(1)) + 1.0  # +1s buffer
    except Exception:
        pass
    return float(LLM_RETRY_BASE_WAIT)


def _with_retry(fn, *args, **kwargs):
    """
    Call fn(*args, **kwargs), retrying up to LLM_RETRY_MAX times on 429 errors.
    Sleeps for the duration the API specifies before each retry.
    """
    for attempt in range(LLM_RETRY_MAX + 1):
        try:
            return fn(*args, **kwargs)
        except ResourceExhausted as exc:
            if attempt >= LLM_RETRY_MAX:
                raise
            wait = _extract_retry_delay(exc)
            logger.warning(
                "[RATE LIMIT] 429 hit (attempt %d/%d). Waiting %.1fs before retry...",
                attempt + 1, LLM_RETRY_MAX, wait,
            )
            time.sleep(wait)


def _run_diagnoser(model, image_bytes: bytes, mime_type: str, prompt_text: str) -> dict:
    """Run a single diagnoser LLM call and return parsed JSON."""
    def _call():
        return model.generate_content(
            [
                prompt_text,
                {"mime_type": mime_type, "data": image_bytes},
            ],
            generation_config={"response_mime_type": "application/json"},
        )

    response = _with_retry(_call)
    raw = _strip_code_fences(response.text)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Diagnoser did not return valid JSON: {exc}\nRaw: {raw}")


def diagnose(image_bytes: bytes, mime_type: str, description: str) -> tuple[dict, list[str]]:
    """
    Full pipeline: diagnose → evaluate → retry if needed.

    Returns:
        (diagnosis_dict, evaluator_notes)
        evaluator_notes is a list of strings (empty if fully approved).
    """
    _ensure_configured()
    model = _get_model()
    model_name = _get_model_name()

    # --- Attempt 1: initial diagnosis ---
    initial_prompt = (
        f"{DIAGNOSIS_SYSTEM_PROMPT}\n\nUser's description of the problem: {description}"
    )
    logger.info("[DIAGNOSER] Running initial diagnosis...")
    diagnosis = _run_diagnoser(model, image_bytes, mime_type, initial_prompt)
    logger.info("[DIAGNOSER] Initial diagnosis produced.")

    # --- Evaluation + retry loop ---
    all_issues: list[str] = []

    for attempt in range(MAX_RETRIES + 1):
        logger.info("[EVALUATOR] Running evaluation (attempt %d)...", attempt + 1)

        def _eval_call():
            return evaluate(diagnosis, image_bytes, mime_type, description, model_name)

        eval_result = _with_retry(_eval_call)

        if eval_result.approved:
            logger.info("[EVALUATOR] Diagnosis APPROVED.")
            return diagnosis, eval_result.issues

        all_issues = eval_result.issues

        if eval_result.corrected_diagnosis:
            logger.info("[EVALUATOR] Using evaluator-corrected diagnosis.")
            return eval_result.corrected_diagnosis, eval_result.issues

        # Rejected with no fix — retry diagnoser with critique
        if attempt < MAX_RETRIES:
            issues_text = "\n".join(f"- {i}" for i in eval_result.issues)
            retry_prompt = DIAGNOSER_RETRY_PROMPT_TEMPLATE.format(
                issues=issues_text,
                description=description,
            )
            logger.warning(
                "[DIAGNOSER] Retry %d/%d — evaluator rejected, feeding critique back.",
                attempt + 1, MAX_RETRIES,
            )
            diagnosis = _run_diagnoser(model, image_bytes, mime_type, retry_prompt)

    # All retries exhausted — return best attempt with issues in confidence_note
    logger.error("[EVALUATOR] All retries exhausted. Returning best attempt.")
    issues_summary = " | ".join(all_issues)
    existing_note = diagnosis.get("confidence_note") or ""
    diagnosis["confidence_note"] = (
        f"[Evaluator flagged issues after {MAX_RETRIES + 1} attempts: {issues_summary}] "
        + existing_note
    ).strip()
    return diagnosis, all_issues


def chat_reply(diagnosis: dict, history: list[dict], user_message: str) -> str:
    """Continue a follow-up chat conversation grounded in the original diagnosis."""
    model = _get_model()

    system_prompt = CHAT_SYSTEM_PROMPT_TEMPLATE.format(
        diagnosis_json=json.dumps(diagnosis, indent=2)
    )

    gemini_history = [
        {"role": "user", "parts": [system_prompt]},
        {"role": "model", "parts": ["Understood, I'll help with follow-up questions about this repair."]},
    ]

    for turn in history:
        role = "user" if turn["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [turn["content"]]})

    def _call():
        chat_session = model.start_chat(history=gemini_history)
        return chat_session.send_message(user_message)

    response = _with_retry(_call)
    return response.text.strip()


def fetch_resources(problem_identified: str) -> list[dict]:
    """
    Uses Gemini with Google Search Grounding to find YouTube tutorials and blogs.
    Uses REST API directly to ensure grounding works independently of SDK versions.
    Gracefully returns [] if the API is exhausted (429) or fails.
    """
    logger.info("[RESOURCES] Fetching grounded resources for: %s", problem_identified)
    import requests
    
    api_key = os.getenv("GEMINI_API_KEY")
    # Using a fast model capable of search
    model = "gemini-3.5-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    
    prompt = f"Find 3 highly relevant and helpful YouTube video tutorials or step-by-step guides for fixing this specific issue: {problem_identified}. Return the links."
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"googleSearch": {}}]
    }
    
    try:
        r = requests.post(url, json=payload, timeout=15)
        data = r.json()
        
        if "error" in data:
            logger.warning("[RESOURCES] Failed to fetch resources: %s", data["error"].get("message", ""))
            return []
            
        chunks = data.get("candidates", [{}])[0].get("groundingMetadata", {}).get("groundingChunks", [])
        
        resources = []
        for chunk in chunks:
            web = chunk.get("web", {})
            if web.get("title") and web.get("uri"):
                resources.append({
                    "title": web["title"],
                    "url": web["uri"]
                })
        
        # Deduplicate by URL
        unique_urls = set()
        final_resources = []
        for r in resources:
            if r["url"] not in unique_urls:
                final_resources.append(r)
                unique_urls.add(r["url"])
                
        # --- Fallback for demonstration if API quota is exhausted ---
        if not final_resources:
            logger.info("[RESOURCES] Quota exhausted or no links found. Using mock resources for demonstration.")
            final_resources = [
                {
                    "title": f"How to Fix: {problem_identified.split('.')[0][:40]}... (YouTube)",
                    "url": "https://www.youtube.com/results?search_query=" + problem_identified.replace(" ", "+")
                },
                {
                    "title": "Step-by-Step DIY Repair Guide (Home Depot)",
                    "url": "https://www.homedepot.com/c/diy_projects_and_ideas"
                },
                {
                    "title": "Common Troubleshooting and Safety Precautions (iFixit)",
                    "url": "https://www.ifixit.com/Troubleshooting"
                }
            ]
                
        logger.info("[RESOURCES] Returning %d resources.", len(final_resources))
        return final_resources[:5]
        
    except Exception as e:
        logger.warning("[RESOURCES] Error fetching resources: %s", e)
        return []

