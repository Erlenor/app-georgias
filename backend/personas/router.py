"""Persona CRUD endpoints — per-user writing profiles for different platforms."""

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.session import get_current_user
from personas.models import CreatePersonaRequest, Persona, UpdatePersonaRequest
from db.firestore import get_db

router = APIRouter(prefix="/api/personas", tags=["personas"])

COLLECTION = "personas"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_persona_by_id(user_email: str, persona_id: str) -> dict[str, Any] | None:
    """Helper used by pipeline router to load a persona."""
    db = get_db()
    doc = db.get(COLLECTION, f"{user_email}_{persona_id}")
    if doc and doc.get("user_email") == user_email:
        return doc
    return None


@router.post("", response_model=Persona)
def create_persona(
    payload: CreatePersonaRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Create a new writing persona."""
    db = get_db()
    persona_id = str(uuid.uuid4())
    now = _now()

    doc = {
        "id": persona_id,
        "user_email": user["email"],
        "name": payload.name.strip(),
        "platform": payload.platform.strip(),
        "description": payload.description.strip(),
        "tone": payload.tone.strip(),
        "style_guide": payload.style_guide.strip(),
        "audience": payload.audience.strip(),
        "language": payload.language.strip() or "English",
        "created_at": now,
        "updated_at": now,
    }

    db.set(COLLECTION, f"{user['email']}_{persona_id}", doc)
    return doc


@router.get("", response_model=list[Persona])
def list_personas(user: dict = Depends(get_current_user)) -> list[dict]:
    """List all personas for the current user."""
    db = get_db()
    return db.list_by_field(COLLECTION, "user_email", user["email"], order_by="created_at")


@router.get("/{persona_id}", response_model=Persona)
def get_persona(
    persona_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    db = get_db()
    doc = db.get(COLLECTION, f"{user['email']}_{persona_id}")
    if not doc:
        raise HTTPException(status_code=404, detail="Persona not found")
    if doc.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")
    return doc


@router.put("/{persona_id}", response_model=Persona)
def update_persona(
    persona_id: str,
    payload: UpdatePersonaRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    db = get_db()
    key = f"{user['email']}_{persona_id}"
    doc = db.get(COLLECTION, key)
    if not doc:
        raise HTTPException(status_code=404, detail="Persona not found")
    if doc.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")

    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    updates["updated_at"] = _now()
    db.update(COLLECTION, key, updates)
    doc.update(updates)
    return doc


@router.delete("/{persona_id}")
def delete_persona(
    persona_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    db = get_db()
    key = f"{user['email']}_{persona_id}"
    doc = db.get(COLLECTION, key)
    if not doc:
        raise HTTPException(status_code=404, detail="Persona not found")
    if doc.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(COLLECTION, key)
    return {"success": True, "persona_id": persona_id}
