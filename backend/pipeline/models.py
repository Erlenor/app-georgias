"""Pydantic models for pipeline inputs, results and progress."""

from typing import Any
from pydantic import BaseModel, field_validator


class PipelineInputs(BaseModel):
    author_notes: str
    sources: list[str] = []
    reference_url: str = ""
    constraints: str = ""

    @field_validator("author_notes")
    @classmethod
    def author_notes_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("author_notes cannot be empty")
        return v


class PipelineResults(BaseModel):
    research_brief: str | None = None
    style_guide: str | None = None
    draft: str | None = None
    feedback: str | None = None
    final_article: str | None = None


class PipelineStepEvent(BaseModel):
    """Event emitted during pipeline execution for SSE streaming."""

    event: str  # "started" | "step_started" | "step_completed" | "completed" | "error"
    step: str | None = None
    data: Any = None
    error: str | None = None


class AgentCallConfig(BaseModel):
    """Configuration for a single agent invocation."""

    model: str
    system_prompt: str
    user_prompt_template: str
