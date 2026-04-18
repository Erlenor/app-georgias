"""Tests for article CRUD endpoints."""

import pytest
from fastapi.testclient import TestClient

VALID_INPUTS = {
    "author_notes": "Test article about AI technologies.",
    "sources": ["http://example.com/ai"],
    "reference_url": "",
    "constraints": "",
}


class TestCreateArticle:
    def test_create_success(self, authed_client: TestClient):
        r = authed_client.post("/api/articles", json={"title": "Test", "inputs": VALID_INPUTS})
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Test"
        assert d["status"] == "pending"
        assert d["id"] is not None

    def test_empty_results_on_create(self, authed_client: TestClient):
        r = authed_client.post("/api/articles", json={"title": "T", "inputs": VALID_INPUTS})
        res = r.json()["results"]
        assert all(v is None for v in res.values())

    def test_empty_title_gets_default(self, authed_client: TestClient):
        r = authed_client.post("/api/articles", json={"title": "", "inputs": VALID_INPUTS})
        assert r.json()["title"] == "Untitled Article"

    def test_empty_author_notes_returns_422(self, authed_client: TestClient):
        bad = {**VALID_INPUTS, "author_notes": "   "}
        r = authed_client.post("/api/articles", json={"title": "T", "inputs": bad})
        assert r.status_code == 422

    def test_no_auth_returns_401(self, client: TestClient):
        r = client.post("/api/articles", json={"title": "T", "inputs": VALID_INPUTS})
        assert r.status_code == 401

    def test_reference_url_optional(self, authed_client: TestClient):
        inputs = {**VALID_INPUTS, "reference_url": ""}
        r = authed_client.post("/api/articles", json={"title": "T", "inputs": inputs})
        assert r.status_code == 200


class TestListArticles:
    def test_empty_initially(self, authed_client: TestClient):
        assert authed_client.get("/api/articles").json() == []

    def test_lists_created_articles(self, authed_client: TestClient):
        authed_client.post("/api/articles", json={"title": "A1", "inputs": VALID_INPUTS})
        authed_client.post("/api/articles", json={"title": "A2", "inputs": VALID_INPUTS})
        assert len(authed_client.get("/api/articles").json()) == 2

    def test_search_filters_by_title(self, authed_client: TestClient):
        authed_client.post("/api/articles", json={"title": "AI Article", "inputs": VALID_INPUTS})
        authed_client.post("/api/articles", json={"title": "Blockchain Post", "inputs": VALID_INPUTS})
        r = authed_client.get("/api/articles?search=AI")
        results = r.json()
        assert len(results) == 1
        assert results[0]["title"] == "AI Article"

    def test_no_auth_returns_401(self, client: TestClient):
        assert client.get("/api/articles").status_code == 401


class TestGetArticle:
    def test_get_existing(self, authed_client: TestClient):
        article_id = authed_client.post(
            "/api/articles", json={"title": "Get Test", "inputs": VALID_INPUTS}
        ).json()["id"]
        r = authed_client.get(f"/api/articles/{article_id}")
        assert r.status_code == 200
        assert r.json()["id"] == article_id

    def test_nonexistent_returns_404(self, authed_client: TestClient):
        assert authed_client.get("/api/articles/does-not-exist").status_code == 404

    def test_other_user_returns_403(self, authed_client, editor_token):
        article_id = authed_client.post(
            "/api/articles", json={"title": "Private", "inputs": VALID_INPUTS}
        ).json()["id"]
        authed_client.cookies.set("georgias_session", editor_token)
        assert authed_client.get(f"/api/articles/{article_id}").status_code == 403


class TestDeleteArticle:
    def test_delete_success(self, authed_client: TestClient):
        article_id = authed_client.post(
            "/api/articles", json={"title": "Del", "inputs": VALID_INPUTS}
        ).json()["id"]
        assert authed_client.delete(f"/api/articles/{article_id}").json()["success"] is True
        assert authed_client.get(f"/api/articles/{article_id}").status_code == 404

    def test_nonexistent_returns_404(self, authed_client: TestClient):
        assert authed_client.delete("/api/articles/nope").status_code == 404


class TestUpdateTitle:
    def test_update_title(self, authed_client: TestClient):
        article_id = authed_client.post(
            "/api/articles", json={"title": "Old", "inputs": VALID_INPUTS}
        ).json()["id"]
        r = authed_client.patch(f"/api/articles/{article_id}", json={"title": "New"})
        assert r.json()["title"] == "New"

    def test_empty_title_returns_422(self, authed_client: TestClient):
        article_id = authed_client.post(
            "/api/articles", json={"title": "T", "inputs": VALID_INPUTS}
        ).json()["id"]
        assert authed_client.patch(f"/api/articles/{article_id}", json={"title": ""}).status_code == 422
