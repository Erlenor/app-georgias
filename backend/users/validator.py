"""Email-based user validation against allowed_users.json."""

import json
import os

_USERS_FILE = os.path.join(os.path.dirname(__file__), "allowed_users.json")


def _load_users() -> list[dict]:
    """Load the allowed users list from JSON."""
    with open(_USERS_FILE, "r") as f:
        data = json.load(f)
    return data.get("users", [])


def validate_user(email: str) -> dict | None:
    """Check if an email is in the allowed users list.

    Returns the user record (email, role, name) if found, or None if unauthorized.
    """
    email = email.strip().lower()
    for user in _load_users():
        if user.get("email", "").strip().lower() == email:
            return user
    return None
