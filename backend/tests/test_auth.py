"""Tests for authentication and session management."""

import time
import pytest
import jwt
from fastapi.testclient import TestClient

from auth.session import (
    create_session_token,
    decode_session_token,
    build_user_payload,
    APP_AUTH_SECRET,
)


class TestSessionTokens:
    def test_create_session_token_returns_string(self, admin_user):
        token = create_session_token(admin_user)
        assert isinstance(token, str) and len(token) > 0

    def test_decode_returns_user(self, admin_user):
        token = create_session_token(admin_user)
        payload = decode_session_token(token)
        assert payload["user"]["email"] == admin_user["email"]
        assert payload["user"]["role"] == admin_user["role"]

    def test_token_has_expiry(self, admin_user):
        payload = decode_session_token(create_session_token(admin_user))
        assert payload["exp"] > int(time.time())

    def test_invalid_token_raises(self):
        with pytest.raises(jwt.PyJWTError):
            decode_session_token("invalid.token.here")

    def test_tampered_token_raises(self, admin_user):
        token = create_session_token(admin_user)
        parts = token.split(".")
        parts[2] = "tampered"
        with pytest.raises(jwt.PyJWTError):
            decode_session_token(".".join(parts))


class TestAuthEndpoints:
    def test_health_check(self, client: TestClient):
        assert client.get("/").json()["status"] == "ok"

    def test_me_without_auth_returns_401(self, client: TestClient):
        assert client.get("/api/auth/me").status_code == 401

    def test_me_with_valid_session(self, authed_client: TestClient, admin_user):
        data = authed_client.get("/api/auth/me").json()
        assert data["authenticated"] is True
        assert data["user"]["email"] == admin_user["email"]

    def test_logout_clears_session(self, authed_client: TestClient):
        r = authed_client.post("/api/auth/logout")
        assert r.json()["success"] is True

    def test_auth_state_returns_state(self, client: TestClient):
        data = client.get("/api/auth/state").json()
        assert "state" in data and len(data["state"]) > 10

    def test_me_with_invalid_token_returns_401(self, client: TestClient):
        client.cookies.set("georgias_session", "bad.token")
        assert client.get("/api/auth/me").status_code == 401
