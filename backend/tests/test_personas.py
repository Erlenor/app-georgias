"""Tests for persona CRUD endpoints."""

import pytest
from fastapi.testclient import TestClient

VALID_PERSONA = {
    "name": "LinkedIn Pro",
    "platform": "LinkedIn",
    "description": "Professional posts",
    "tone": "Professional",
    "style_guide": "Short paragraphs, use bullet points.",
    "audience": "B2B decision makers",
    "language": "English",
}


class TestCreatePersona:
    def test_create_success(self, authed_client: TestClient):
        r = authed_client.post("/api/personas", json=VALID_PERSONA)
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "LinkedIn Pro"
        assert d["platform"] == "LinkedIn"
        assert d["id"] is not None

    def test_empty_name_returns_422(self, authed_client: TestClient):
        bad = {**VALID_PERSONA, "name": ""}
        assert authed_client.post("/api/personas", json=bad).status_code == 422

    def test_no_auth_returns_401(self, client: TestClient):
        assert client.post("/api/personas", json=VALID_PERSONA).status_code == 401


class TestListPersonas:
    def test_empty_initially(self, authed_client: TestClient):
        assert authed_client.get("/api/personas").json() == []

    def test_returns_created(self, authed_client: TestClient):
        authed_client.post("/api/personas", json=VALID_PERSONA)
        authed_client.post("/api/personas", json={**VALID_PERSONA, "name": "Facebook Casual", "platform": "Facebook"})
        assert len(authed_client.get("/api/personas").json()) == 2


class TestUpdatePersona:
    def test_update_tone(self, authed_client: TestClient):
        pid = authed_client.post("/api/personas", json=VALID_PERSONA).json()["id"]
        r = authed_client.put(f"/api/personas/{pid}", json={"tone": "Casual"})
        assert r.json()["tone"] == "Casual"

    def test_update_nonexistent_returns_404(self, authed_client: TestClient):
        assert authed_client.put("/api/personas/nope", json={"tone": "x"}).status_code == 404


class TestDeletePersona:
    def test_delete_success(self, authed_client: TestClient):
        pid = authed_client.post("/api/personas", json=VALID_PERSONA).json()["id"]
        assert authed_client.delete(f"/api/personas/{pid}").json()["success"] is True
        assert authed_client.get(f"/api/personas/{pid}").status_code == 404

    def test_delete_nonexistent_returns_404(self, authed_client: TestClient):
        assert authed_client.delete("/api/personas/nope").status_code == 404
