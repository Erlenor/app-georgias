"""Persona domain models."""

from pydantic import BaseModel, field_validator


class Persona(BaseModel):
    id: str
    name: str
    platform: str  # e.g. "LinkedIn", "Facebook", "Blog", "Instagram"
    description: str = ""
    tone: str = ""  # e.g. "professional", "casual", "inspiring"
    style_guide: str = ""  # freeform style notes
    audience: str = ""  # target audience description
    language: str = "English"
    created_at: str = ""
    updated_at: str = ""

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Persona name cannot be empty")
        return v

    @field_validator("platform")
    @classmethod
    def platform_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Platform cannot be empty")
        return v


class CreatePersonaRequest(BaseModel):
    name: str
    platform: str
    description: str = ""
    tone: str = ""
    style_guide: str = ""
    audience: str = ""
    language: str = "English"


class UpdatePersonaRequest(BaseModel):
    name: str | None = None
    platform: str | None = None
    description: str | None = None
    tone: str | None = None
    style_guide: str | None = None
    audience: str | None = None
    language: str | None = None
