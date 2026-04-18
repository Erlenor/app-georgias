"""AI pipeline agents for article generation.

Supports both Google Gemini and OpenAI as AI providers.

Pipeline steps:
  1. make_research       — builds a research brief
  2. extract_style       — extracts writing style from a reference URL (or persona style guide)
  3. write_draft         — writes a first draft
  4. reflect_on_draft    — provides critical feedback on the draft
  5. finalize_article    — produces the polished final article
"""

import logging
import os
from typing import Any

from pipeline.models import AgentCallConfig

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# AI provider helpers
# ---------------------------------------------------------------------------

def _get_provider() -> str:
    """Determine which AI provider to use based on available API keys."""
    if os.environ.get("OPENAI_API_KEY", ""):
        preferred = os.environ.get("AI_PROVIDER", "openai").lower()
        if preferred == "openai":
            return "openai"
    if os.environ.get("GEMINI_API_KEY", ""):
        return "gemini"
    if os.environ.get("OPENAI_API_KEY", ""):
        return "openai"
    return "stub"


def _call_gemini(model: str, system_prompt: str, user_prompt: str) -> str:
    """Call the Gemini API and return the generated text."""
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not set")

    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=api_key)
        gemini_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_prompt,
        )
        response = gemini_model.generate_content(
            user_prompt,
            safety_settings={
                "HARM_CATEGORY_HARASSMENT": "BLOCK_NONE",
                "HARM_CATEGORY_HATE_SPEECH": "BLOCK_NONE",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_NONE",
                "HARM_CATEGORY_DANGEROUS_CONTENT": "BLOCK_NONE",
            }
        )
        # Handle blocked or empty responses
        try:
            text = response.text.strip()
        except Exception:
            if response.candidates:
                parts = response.candidates[0].content.parts
                text = " ".join(p.text for p in parts if hasattr(p, "text")).strip()
            else:
                text = "[No response generated — Gemini blocked this content. Try rephrasing your prompt.]"
        return text if text else "[Empty response from Gemini. Try rephrasing your prompt.]"
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc


def _call_openai(model: str, system_prompt: str, user_prompt: str) -> str:
    """Call the OpenAI API and return the generated text."""
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    try:
        from openai import OpenAI  # type: ignore

        client = OpenAI(api_key=api_key)
        # Map Gemini model names to OpenAI equivalents if needed
        openai_model = _map_model_to_openai(model)
        response = client.chat.completions.create(
            model=openai_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as exc:
        logger.error("OpenAI API call failed: %s", exc)
        raise RuntimeError(f"OpenAI API call failed: {exc}") from exc


def _map_model_to_openai(model: str) -> str:
    """Map a model name to an OpenAI-compatible model string."""
    mapping = {
        "gemini-2.0-flash": "gpt-4o-mini",
        "gemini-2.0-flash-lite": "gpt-4o-mini",
        "gemini-1.5-pro": "gpt-4o",
        "gemini-1.5-flash": "gpt-4o-mini",
        "gemini-1.0-pro": "gpt-3.5-turbo",
    }
    # If it's already an OpenAI model name, return as-is
    if model.startswith("gpt-") or model.startswith("o1") or model.startswith("o3"):
        return model
    return mapping.get(model, "gpt-4o-mini")


def _call_ai(model: str, system_prompt: str, user_prompt: str) -> str:
    """Call the configured AI provider. Falls back to stub when no keys set."""
    provider = _get_provider()

    if provider == "stub":
        logger.warning("No AI API key set — returning stub response.")
        return (
            f"[STUB] Provider: none\nModel: {model}\n"
            f"System: {system_prompt[:80]}...\nUser: {user_prompt[:80]}..."
        )

    if provider == "openai":
        return _call_openai(model, system_prompt, user_prompt)

    return _call_gemini(model, system_prompt, user_prompt)


def _build_prompt(template: str, variables: dict[str, Any]) -> str:
    """Substitute {placeholders} in template with actual values."""
    try:
        return template.format(**variables)
    except KeyError as exc:
        logger.warning("Missing template variable %s — keeping placeholder.", exc)
        return template


def _enforce_constraints(text: str, constraints: str, model: str, system_prompt: str) -> str:
    """If constraints mention a word limit, hard-enforce it by trimming or re-calling AI."""
    if not constraints:
        return text

    import re
    # Look for word count constraints like "500 words", "max 500 words", "500 word max"
    match = re.search(r'(\d+)\s*word', constraints, re.IGNORECASE)
    if not match:
        return text

    limit = int(match.group(1))
    word_count = len(text.split())

    if word_count <= limit:
        return text

    logger.warning("Output %d words exceeds constraint of %d words. Trimming via AI.", word_count, limit)

    trim_prompt = (
        f"The following article is {word_count} words long. "
        f"You MUST rewrite it to be STRICTLY under {limit} words. "
        f"Do not exceed {limit} words under any circumstances. "
        f"Preserve the structure, headings, and key points as much as possible."
        f"ARTICLE:{text}"
    )

    try:
        trimmed = _call_ai(model, system_prompt, trim_prompt)
        trimmed_count = len(trimmed.split())
        logger.info("Trimmed article from %d to %d words.", word_count, trimmed_count)
        return trimmed
    except Exception as exc:
        logger.warning("Trim call failed: %s. Returning hard-truncated version.", exc)
        # Hard truncate as last resort
        words = text.split()
        return " ".join(words[:limit]) + "*[Article truncated to meet word limit.]*"


# ---------------------------------------------------------------------------
# Pipeline step functions
# ---------------------------------------------------------------------------

def make_research(
        author_notes: str,
        sources: list[str],
        constraints: str,
        config: AgentCallConfig,
        persona_context: str = "",
) -> str:
    """Step 1: Create a research brief from author notes and source URLs."""
    sources_text = "\n".join(f"- {s}" for s in sources) if sources else "No sources provided."
    user_prompt = _build_prompt(
        config.user_prompt_template,
        {
            "author_notes": author_notes,
            "sources": sources_text,
            "constraints": constraints or "None",
            "persona_context": persona_context or "No persona specified.",
        },
    )
    return _call_ai(config.model, config.system_prompt, user_prompt)


def extract_style(
        reference_url: str,
        config: AgentCallConfig,
        persona_style_guide: str = "",
) -> str:
    """Step 2: Extract writing style from a reference URL, or use persona style guide."""
    # If no reference URL but we have a persona style guide, use that directly
    if not reference_url.strip() and persona_style_guide:
        return persona_style_guide

    user_prompt = _build_prompt(
        config.user_prompt_template,
        {
            "reference_url": reference_url or "No reference URL provided.",
            "persona_style_guide": persona_style_guide or "No persona style guide.",
        },
    )
    return _call_ai(config.model, config.system_prompt, user_prompt)


def write_draft(
        research_brief: str,
        style_guide: str,
        author_notes: str,
        constraints: str,
        config: AgentCallConfig,
        persona_context: str = "",
) -> str:
    """Step 3: Write a first draft of the article."""
    user_prompt = _build_prompt(
        config.user_prompt_template,
        {
            "research_brief": research_brief,
            "style_guide": style_guide,
            "author_notes": author_notes,
            "constraints": constraints or "None",
            "persona_context": persona_context or "No persona specified.",
        },
    )
    return _call_ai(config.model, config.system_prompt, user_prompt)


def reflect_on_draft(
        draft: str,
        research_brief: str,
        style_guide: str,
        config: AgentCallConfig,
) -> str:
    """Step 4: Critically review the draft and provide structured feedback."""
    user_prompt = _build_prompt(
        config.user_prompt_template,
        {
            "draft": draft,
            "research_brief": research_brief,
            "style_guide": style_guide,
        },
    )
    return _call_ai(config.model, config.system_prompt, user_prompt)


def finalize_article(
        draft: str,
        feedback: str,
        style_guide: str,
        config: AgentCallConfig,
        persona_context: str = "",
) -> str:
    """Step 5: Produce the final, polished article incorporating feedback."""
    # Inject constraints into system prompt so model is explicitly aware
    system = config.system_prompt
    if persona_context:
        system = system

    user_prompt = _build_prompt(
        config.user_prompt_template,
        {
            "draft": draft,
            "feedback": feedback,
            "style_guide": style_guide,
            "persona_context": persona_context or "No persona specified.",
        },
    )
    result = _call_ai(config.model, config.system_prompt, user_prompt)
    return result


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

PIPELINE_STEPS = [
    "research",
    "style_extraction",
    "draft",
    "reflection",
    "finalization",
]


from typing import Dict, Any, Optional

def run_pipeline(
        inputs: Dict[str, Any],
        agent_configs: Dict[str, AgentCallConfig],
        on_step_start: Any = None,
        on_step_done: Any = None,
        persona: Optional[Dict[str, Any]] = None,
) -> Dict[str, str]:
    """Run the full 5-step pipeline synchronously.

    Args:
        inputs: Dict with author_notes, sources, reference_url, constraints.
        agent_configs: Dict mapping agent_id → AgentCallConfig.
        on_step_start: Optional callback(step_name) called before each step.
        on_step_done: Optional callback(step_name, result) called after each step.
        persona: Optional persona dict with name, platform, style_guide, tone, etc.

    Returns:
        Dict with research_brief, style_guide, draft, feedback, final_article.
    """
    results: dict[str, str] = {}

    author_notes = inputs["author_notes"]
    sources = inputs.get("sources", [])
    reference_url = inputs.get("reference_url", "")
    constraints = inputs.get("constraints", "")

    # Build persona context string for agents that support it
    persona_context = ""
    persona_style_guide = ""
    if persona:
        platform = persona.get("platform", "")
        tone = persona.get("tone", "")
        style_guide = persona.get("style_guide", "")
        persona_context = (
            f"Platform: {platform}\nTone: {tone}\n"
            f"Style notes: {style_guide}"
        ).strip()
        persona_style_guide = style_guide

    steps = [
        (
            "research",
            lambda: make_research(
                author_notes,
                sources,
                constraints,
                agent_configs["research"],
                persona_context,
            ),
        ),
        (
            "style_extraction",
            lambda: extract_style(
                reference_url,
                agent_configs["style_extraction"],
                persona_style_guide,
            ),
        ),
        (
            "draft",
            lambda: write_draft(
                results["research_brief"],
                results["style_guide"],
                author_notes,
                constraints,
                agent_configs["draft"],
                persona_context,
            ),
        ),
        (
            "reflection",
            lambda: reflect_on_draft(
                results["draft"],
                results["research_brief"],
                results["style_guide"],
                agent_configs["reflection"],
            ),
        ),
        (
            "finalization",
            lambda: finalize_article(
                results["draft"],
                results["feedback"],
                results["style_guide"],
                agent_configs["finalization"],
                persona_context,
            ),
        ),
    ]

    result_keys = ["research_brief", "style_guide", "draft", "feedback", "final_article"]

    for (step_name, fn), result_key in zip(steps, result_keys):
        if on_step_start:
            on_step_start(step_name)
        try:
            output = fn()
            # Enforce word constraints on the final article
            if step_name == "finalization" and constraints:
                output = _enforce_constraints(
                    output, constraints,
                    agent_configs["finalization"].model,
                    agent_configs["finalization"].system_prompt,
                )
        except Exception as exc:
            logger.error("Step '%s' failed: %s", step_name, exc)
            output = f"[Step failed: {exc}]"
        results[result_key] = output
        if on_step_done:
            on_step_done(step_name, output)

    return results