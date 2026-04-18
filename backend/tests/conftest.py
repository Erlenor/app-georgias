"""Shared pytest fixtures for App Georgias backend tests."""

import os
import pytest
from fastapi.testclient import TestClient

# Set test environment before importing app
os.environ.setdefault("APP_AUTH_SECRET", "test-secret-for-testing-only-32ch")
os.environ.setdefault("SESSION_COOKIE_NAME", "georgias_session")
os.environ.setdefault("SESSION_MAX_AGE_SECONDS", "3600")
os.environ.setdefault("GOOGLE_CLIENT_ID", "test-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000")
os.environ.setdefault("USE_FIRESTORE", "false")
os.environ.setdefault("USE_SECRET_MANAGER", "false")
# No AI keys in tests — agents return stub responses

from main import app
from auth.session import create_session_token, build_user_payload
from db.firestore import get_db


@pytest.fixture(autouse=True)
def clear_memory_store():
    db = get_db()
    db.clear_memory_store()
    yield
    db.clear_memory_store()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app, raise_server_exceptions=True)


@pytest.fixture
def admin_user() -> dict:
    return build_user_payload(
        email="david.klinko@lyceum.sk",
        name="David Klinko",
        picture="https://example.com/pic.jpg",
        role="admin",
    )


@pytest.fixture
def editor_user() -> dict:
    return build_user_payload(
        email="editor@example.com",
        name="Editor User",
        picture="",
        role="editor",
    )


@pytest.fixture
def admin_token(admin_user: dict) -> str:
    return create_session_token(admin_user)


@pytest.fixture
def editor_token(editor_user: dict) -> str:
    return create_session_token(editor_user)


@pytest.fixture
def authed_client(client: TestClient, admin_token: str) -> TestClient:
    client.cookies.set("georgias_session", admin_token)
    return client
