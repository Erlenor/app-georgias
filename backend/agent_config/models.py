"""Agent configuration Pydantic models."""

from pydantic import BaseModel, field_validator


class AgentConfig(BaseModel):
    id: str
    name: str
    description: str
    model: str
    system_prompt: str
    user_prompt_template: str

    @field_validator("system_prompt", "user_prompt_template")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Prompt cannot be empty")
        return v

    @field_validator("model")
    @classmethod
    def model_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Model cannot be empty")
        return v


class UpdateAgentConfigRequest(BaseModel):
    model: str | None = None
    system_prompt: str | None = None
    user_prompt_template: str | None = None
