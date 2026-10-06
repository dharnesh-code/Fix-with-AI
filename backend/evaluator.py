"""
evaluator.py — LLM-as-Judge agent.

Uses Groq (fast, text-only) when GROQ_API_KEY is set.
Falls back to Gemini (with image) when Groq is unavailable.

Groq evaluator: checks safety, consistency, risk level — everything derivable from text.
               Completes in ~0.5–1 second vs ~8–12 seconds for Gemini.
Gemini evaluator: additionally checks for image hallucinations (visual grounding).

Returns an EvalResult dataclass:
  - approved (bool)
  - issues  (list of human-readable problem strings)
  - corrected_diagnosis (dict | None)
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass, field
from typing import Optional

from prompts import EVALUATOR_PROMPT, GROQ_EVALUATOR_PROMPT

logger = logging.getLogger(__name__)


@dataclass
class EvalResult:
    approved: bool
    issues: list[str] = field(default_factory=list)
    corrected_diagnosis: Optional[dict] = None


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text


def _parse_eval_response(raw: str) -> EvalResult:
    """Parse the evaluator JSON response into an EvalResult."""
    result = json.loads(_strip_code_fences(raw))
    approved = bool(result.get("approved", True))
    issues = result.get("issues", [])
    corrected = result.get("corrected_diagnosis")

    if approved:
        logger.info("[EVALUATOR] Diagnosis APPROVED.")
    else:
        logger.warning("[EVALUATOR] Diagnosis REJECTED. Issues: %s", issues)
        if corrected:
            logger.info("[EVALUATOR] Corrected diagnosis provided.")

    return EvalResult(
        approved=approved,
        issues=issues if isinstance(issues, list) else [],
        corrected_diagnosis=corrected if isinstance(corrected, dict) else None,
    )


# ---------------------------------------------------------------------------
# Groq evaluator (text-only, fast)
# ---------------------------------------------------------------------------

def _evaluate_with_groq(diagnosis: dict, description: str) -> EvalResult:
    """
    Run evaluation using Groq — text-only, no image.
    Checks: dangerous DIY, risk level, category match, step consistency,
            missing precautions, unrealistic time, internal consistency.
    """
    from groq import Groq  # lazy import — only needed when Groq key is set

    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_EVAL_MODEL", "llama-3.3-70b-versatile")

    client = Groq(api_key=api_key)

    user_content = (
        f"User's description of the problem:\n{description}\n\n"
        f"Diagnosis to audit:\n{json.dumps(diagnosis, indent=2)}"
    )

    logger.info("[EVALUATOR] Running Groq evaluation (model: %s)...", model)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": GROQ_EVALUATOR_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.1,   # Low temp for consistent, deterministic auditing
        max_tokens=2048,
    )

    raw = response.choices[0].message.content
    return _parse_eval_response(raw)


# ---------------------------------------------------------------------------
# Gemini evaluator (vision, slower — fallback)
# ---------------------------------------------------------------------------

def _evaluate_with_gemini(
    diagnosis: dict,
    image_bytes: bytes,
    mime_type: str,
    description: str,
    model_name: str,
) -> EvalResult:
    """Run evaluation using Gemini with image — slower but catches visual hallucinations."""
    import google.generativeai as genai

    model = genai.GenerativeModel(model_name)
    prompt_parts = [
        EVALUATOR_PROMPT,
        {"mime_type": mime_type, "data": image_bytes},
        f"User's description: {description}",
        f"Diagnosis to audit:\n{json.dumps(diagnosis, indent=2)}",
    ]

    logger.info("[EVALUATOR] Running Gemini evaluation (model: %s)...", model_name)

    response = model.generate_content(
        prompt_parts,
        generation_config={"response_mime_type": "application/json"},
    )
    return _parse_eval_response(response.text)


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def evaluate(
    diagnosis: dict,
    image_bytes: bytes,
    mime_type: str,
    description: str,
    gemini_model_name: str,
) -> EvalResult:
    """
    Evaluate a diagnosis using the fastest available evaluator:
      - Groq (preferred): text-only, ~0.5s, free tier very generous
      - Gemini (fallback): vision-based, ~8–12s, uses quota

    Args:
        diagnosis:         JSON dict from the diagnoser.
        image_bytes:       Raw image bytes (used only for Gemini fallback).
        mime_type:         Image MIME type (used only for Gemini fallback).
        description:       User's text description.
        gemini_model_name: Gemini model to use if falling back.
    """
    groq_key = os.getenv("GROQ_API_KEY")

    try:
        if groq_key:
            logger.info("[EVALUATOR] Groq key found — using fast text evaluator.")
            return _evaluate_with_groq(diagnosis, description)
        else:
            logger.info("[EVALUATOR] No GROQ_API_KEY — falling back to Gemini evaluator.")
            return _evaluate_with_gemini(diagnosis, image_bytes, mime_type, description, gemini_model_name)

    except Exception as exc:
        # Never let evaluator failure block the user — log and approve
        logger.warning("[EVALUATOR] Evaluation failed (%s). Passing diagnosis through.", exc)
        return EvalResult(
            approved=True,
            issues=["Evaluator could not run; diagnosis passed through unverified."],
        )
