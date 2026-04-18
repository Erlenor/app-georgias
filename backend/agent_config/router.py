"""Agent configuration CRUD endpoints + app settings."""

import json
import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.session import get_current_user
from agent_config.models import AgentConfig, UpdateAgentConfigRequest
from pipeline.models import AgentCallConfig
from db.firestore import get_db

router = APIRouter(prefix="/api/agent-config", tags=["agent-config"])

COLLECTION = "agent_configs"
SETTINGS_COLLECTION = "user_settings"
_DEFAULT_CONFIGS_PATH = os.path.join(os.path.dirname(__file__), "default_configs.json")


# ---------------------------------------------------------------------------
# Settings model
# ---------------------------------------------------------------------------

class AppSettings(BaseModel):
    ai_provider: str = "gemini"  # "gemini" | "openai"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    default_persona_id: str = ""


class UpdateSettingsRequest(BaseModel):
    ai_provider: str | None = None
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    default_persona_id: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_defaults() -> dict[str, dict[str, Any]]:
    """Load default agent configurations from JSON file."""
    with open(_DEFAULT_CONFIGS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {agent["id"]: agent for agent in data["agents"]}


def _get_user_config(user_email: str) -> dict[str, Any] | None:
    db = get_db()
    return db.get(COLLECTION, user_email)


def _get_merged_configs(user_email: str) -> dict[str, dict[str, Any]]:
    """Get configs: user overrides merged on top of defaults."""
    defaults = _load_defaults()
    user_doc = _get_user_config(user_email)
    if not user_doc:
        return defaults

    user_agents = user_doc.get("agents", {})
    merged: dict[str, dict[str, Any]] = {}
    for agent_id, default_cfg in defaults.items():
        merged[agent_id] = {**default_cfg, **user_agents.get(agent_id, {})}
    return merged


def get_user_configs_as_agent_configs(user_email: str) -> dict[str, AgentCallConfig]:
    """Get user's agent configs as AgentCallConfig objects for pipeline execution."""
    configs = _get_merged_configs(user_email)
    return {
        agent_id: AgentCallConfig(
            model=cfg["model"],
            system_prompt=cfg["system_prompt"],
            user_prompt_template=cfg["user_prompt_template"],
        )
        for agent_id, cfg in configs.items()
    }


# ---------------------------------------------------------------------------
# Agent config endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[AgentConfig])
def get_agent_configs(user: dict = Depends(get_current_user)) -> list[dict]:
    configs = _get_merged_configs(user["email"])
    return list(configs.values())


@router.get("/defaults", response_model=list[AgentConfig])
def get_default_configs() -> list[dict]:
    defaults = _load_defaults()
    return list(defaults.values())


@router.put("/{agent_id}", response_model=AgentConfig)
def update_agent_config(
    agent_id: str,
    payload: UpdateAgentConfigRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    defaults = _load_defaults()
    if agent_id not in defaults:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    db = get_db()
    user_doc = db.get(COLLECTION, user["email"]) or {"agents": {}}
    user_agents: dict = user_doc.get("agents", {})

    current = dict(user_agents.get(agent_id, {}))
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    current.update(updates)
    user_agents[agent_id] = current
    db.set(COLLECTION, user["email"], {"agents": user_agents}, merge=True)

    return {**defaults[agent_id], **current}


@router.post("/reset")
def reset_all_configs(user: dict = Depends(get_current_user)) -> dict:
    db = get_db()
    db.delete(COLLECTION, user["email"])
    return {"success": True, "message": "All agent configurations reset to defaults"}


@router.delete("/{agent_id}")
def reset_agent_config(
    agent_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    defaults = _load_defaults()
    if agent_id not in defaults:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    db = get_db()
    user_doc = db.get(COLLECTION, user["email"])
    if user_doc:
        user_agents = user_doc.get("agents", {})
        if agent_id in user_agents:
            del user_agents[agent_id]
            db.set(COLLECTION, user["email"], {"agents": user_agents})

    return {"success": True, "agent_id": agent_id, "config": defaults[agent_id]}


# ---------------------------------------------------------------------------
# App settings endpoints
# ---------------------------------------------------------------------------

@router.get("/settings", response_model=AppSettings)
def get_settings(user: dict = Depends(get_current_user)) -> dict:
    """Get app settings for the current user."""
    db = get_db()
    doc = db.get(SETTINGS_COLLECTION, user["email"])
    if not doc:
        return AppSettings().model_dump()
    # Never expose full key — mask it
    result = dict(doc)
    if result.get("gemini_api_key"):
        result["gemini_api_key"] = "••••••••" + result["gemini_api_key"][-4:]
    if result.get("openai_api_key"):
        result["openai_api_key"] = "••••••••" + result["openai_api_key"][-4:]
    return result


@router.put("/settings", response_model=AppSettings)
def update_settings(
    payload: UpdateSettingsRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update app settings for the current user."""
    db = get_db()
    current = db.get(SETTINGS_COLLECTION, user["email"]) or {}

    updates = payload.model_dump(exclude_none=True)
    current.update(updates)
    db.set(SETTINGS_COLLECTION, user["email"], current)

    # Apply API keys to environment for this process (for immediate use)
    if payload.gemini_api_key:
        os.environ["GEMINI_API_KEY"] = payload.gemini_api_key
    if payload.openai_api_key:
        os.environ["OPENAI_API_KEY"] = payload.openai_api_key
    if payload.ai_provider:
        os.environ["AI_PROVIDER"] = payload.ai_provider

    # Return masked version
    result = dict(current)
    if result.get("gemini_api_key"):
        result["gemini_api_key"] = "••••••••" + result["gemini_api_key"][-4:]
    if result.get("openai_api_key"):
        result["openai_api_key"] = "••••••••" + result["openai_api_key"][-4:]
    return result
