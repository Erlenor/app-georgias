"""Session token helpers and auth dependency."""

from datetime import datetime, timedelta, timezone
import os
from typing import Any

import jwt
from fastapi import Cookie, HTTPException


SESSION_COOKIE_NAME = os.environ.get("SESSION_COOKIE_NAME", "georgias_session")
SESSION_MAX_AGE_SECONDS = int(os.environ.get("SESSION_MAX_AGE_SECONDS", "3600"))
APP_AUTH_SECRET = os.environ.get("APP_AUTH_SECRET", "change-me-in-production")


def build_user_payload(email: str, name: str, picture: str, role: str) -> dict[str, str]:
    return {"email": email, "name": name, "picture": picture, "role": role}


def create_session_token(user: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user["email"],
        "user": user,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=SESSION_MAX_AGE_SECONDS)).timestamp()),
    }
    return jwt.encode(payload, APP_AUTH_SECRET, algorithm="HS256")


def decode_session_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, APP_AUTH_SECRET, algorithms=["HS256"])


def get_current_user(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME),
) -> dict[str, Any]:
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_session_token(session_token)
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc
    user = payload.get("user")
    if not isinstance(user, dict):
        raise HTTPException(status_code=401, detail="Invalid session payload")
    return user
