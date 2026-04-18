"""Tests for agent configuration management."""

import pytest
from fastapi.testclient import TestClient

AGENT_IDS = ["research", "style_extraction", "draft", "reflection", "finalization"]


class TestGetAgentConfigs:
    def test_returns_five_agents(self, authed_client: TestClient):
        r = authed_client.get("/api/agent-config")
        assert r.status_code == 200
        assert len(r.json()) == 5

    def test_each_has_required_fields(self, authed_client: TestClient):
        for agent in authed_client.get("/api/agent-config").json():
            for field in ("id", "name", "description", "model", "system_prompt", "user_prompt_template"):
                assert field in agent

    def test_all_agent_ids_present(self, authed_client: TestClient):
        ids = [a["id"] for a in authed_client.get("/api/agent-config").json()]
        for expected in AGENT_IDS:
            assert expected in ids

    def test_no_auth_returns_401(self, client: TestClient):
        assert client.get("/api/agent-config").status_code == 401


class TestUpdateAgentConfig:
    def test_update_model(self, authed_client: TestClient):
        r = authed_client.put("/api/agent-config/research", json={"model": "gpt-4o"})
        assert r.status_code == 200
        assert r.json()["model"] == "gpt-4o"

    def test_update_persists(self, authed_client: TestClient):
        authed_client.put("/api/agent-config/research", json={"model": "gpt-4o"})
        configs = authed_client.get("/api/agent-config").json()
        research = next(a for a in configs if a["id"] == "research")
        assert research["model"] == "gpt-4o"

    def test_nonexistent_agent_returns_404(self, authed_client: TestClient):
        assert authed_client.put("/api/agent-config/fake", json={"model": "x"}).status_code == 404

    def test_empty_body_returns_422(self, authed_client: TestClient):
        assert authed_client.put("/api/agent-config/research", json={}).status_code == 422

    def test_update_preserves_other_fields(self, authed_client: TestClient):
        original = next(
            a for a in authed_client.get("/api/agent-config").json() if a["id"] == "research"
        )
        authed_client.put("/api/agent-config/research", json={"model": "gpt-4o"})
        updated = next(
            a for a in authed_client.get("/api/agent-config").json() if a["id"] == "research"
        )
        assert updated["system_prompt"] == original["system_prompt"]


class TestResetAgentConfig:
    def test_reset_single(self, authed_client: TestClient):
        authed_client.put("/api/agent-config/research", json={"model": "gpt-4o"})
        r = authed_client.delete("/api/agent-config/research")
        assert r.status_code == 200
        assert "gemini" in r.json()["config"]["model"]

    def test_reset_all(self, authed_client: TestClient):
        authed_client.put("/api/agent-config/research", json={"model": "gpt-4o"})
        authed_client.post("/api/agent-config/reset")
        configs = authed_client.get("/api/agent-config").json()
        research = next(a for a in configs if a["id"] == "research")
        assert "gemini" in research["model"]


class TestSettings:
    def test_get_settings_returns_defaults(self, authed_client: TestClient):
        r = authed_client.get("/api/agent-config/settings")
        assert r.status_code == 200
        d = r.json()
        assert "ai_provider" in d

    def test_update_ai_provider(self, authed_client: TestClient):
        r = authed_client.put("/api/agent-config/settings", json={"ai_provider": "openai"})
        assert r.status_code == 200
        assert r.json()["ai_provider"] == "openai"

    def test_no_auth_returns_401(self, client: TestClient):
        assert client.get("/api/agent-config/settings").status_code == 401
