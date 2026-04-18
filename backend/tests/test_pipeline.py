"""Tests for pipeline agents and orchestration."""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from pipeline.agents import (
    make_research, extract_style, write_draft,
    reflect_on_draft, finalize_article, run_pipeline, _build_prompt,
)
from pipeline.models import AgentCallConfig, PipelineInputs


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def cfg() -> AgentCallConfig:
    return AgentCallConfig(
        model="gemini-2.0-flash",
        system_prompt="You are a helpful assistant.",
        user_prompt_template="Process: {input}",
    )

@pytest.fixture
def research_cfg() -> AgentCallConfig:
    return AgentCallConfig(
        model="gemini-2.0-flash",
        system_prompt="Research expert.",
        user_prompt_template="Research: {author_notes}\nSources: {sources}\nConstraints: {constraints}\nPersona: {persona_context}",
    )

@pytest.fixture
def style_cfg() -> AgentCallConfig:
    return AgentCallConfig(
        model="gemini-2.0-flash",
        system_prompt="Style analyst.",
        user_prompt_template="Style URL: {reference_url}\nPersona guide: {persona_style_guide}",
    )

@pytest.fixture
def draft_cfg() -> AgentCallConfig:
    return AgentCallConfig(
        model="gemini-2.0-flash",
        system_prompt="Writer.",
        user_prompt_template="Write: {research_brief} Style: {style_guide} Notes: {author_notes} Constraints: {constraints} Persona: {persona_context}",
    )

@pytest.fixture
def reflection_cfg() -> AgentCallConfig:
    return AgentCallConfig(
        model="gemini-2.0-flash",
        system_prompt="Editor.",
        user_prompt_template="Review: {draft} Brief: {research_brief} Style: {style_guide}",
    )

@pytest.fixture
def finalization_cfg() -> AgentCallConfig:
    return AgentCallConfig(
        model="gemini-2.0-flash",
        system_prompt="Master editor.",
        user_prompt_template="Finalize: {draft} Feedback: {feedback} Style: {style_guide} Persona: {persona_context}",
    )

@pytest.fixture
def all_configs(research_cfg, style_cfg, draft_cfg, reflection_cfg, finalization_cfg):
    return {
        "research": research_cfg,
        "style_extraction": style_cfg,
        "draft": draft_cfg,
        "reflection": reflection_cfg,
        "finalization": finalization_cfg,
    }

MOCK = "Mocked AI response."


# ── _build_prompt ─────────────────────────────────────────────────────────────

class TestBuildPrompt:
    def test_substitution(self):
        assert _build_prompt("Hello {name}.", {"name": "Alice"}) == "Hello Alice."

    def test_missing_key_keeps_placeholder(self):
        result = _build_prompt("Hello {name}.", {})
        assert "{name}" in result

    def test_empty_template(self):
        assert _build_prompt("", {"key": "val"}) == ""


# ── Agent functions ───────────────────────────────────────────────────────────

class TestMakeResearch:
    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_returns_string(self, _, research_cfg):
        assert make_research("notes", [], "", research_cfg) == MOCK

    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_sources_in_prompt(self, mock_ai, research_cfg):
        make_research("notes", ["http://a.com", "http://b.com"], "", research_cfg)
        user_prompt = mock_ai.call_args[0][2]
        assert "http://a.com" in user_prompt

    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_persona_context_in_prompt(self, mock_ai, research_cfg):
        make_research("notes", [], "", research_cfg, persona_context="LinkedIn")
        user_prompt = mock_ai.call_args[0][2]
        assert "LinkedIn" in user_prompt


class TestExtractStyle:
    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_returns_string(self, _, style_cfg):
        assert extract_style("https://example.com", style_cfg) == MOCK

    def test_no_url_uses_persona_guide(self, style_cfg):
        result = extract_style("", style_cfg, persona_style_guide="Use short sentences.")
        assert result == "Use short sentences."

    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_url_in_prompt(self, mock_ai, style_cfg):
        extract_style("https://ref.com", style_cfg)
        assert "https://ref.com" in mock_ai.call_args[0][2]


class TestWriteDraft:
    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_all_inputs_in_prompt(self, mock_ai, draft_cfg):
        write_draft("BRIEF", "STYLE", "NOTES", "CONSTRAINTS", draft_cfg)
        prompt = mock_ai.call_args[0][2]
        assert all(x in prompt for x in ["BRIEF", "STYLE", "NOTES", "CONSTRAINTS"])


class TestReflectOnDraft:
    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_returns_feedback(self, _, reflection_cfg):
        assert reflect_on_draft("draft", "brief", "style", reflection_cfg) == MOCK


class TestFinalizeArticle:
    @patch("pipeline.agents._call_ai", return_value=MOCK)
    def test_draft_and_feedback_in_prompt(self, mock_ai, finalization_cfg):
        finalize_article("DRAFT", "FEEDBACK", "STYLE", finalization_cfg)
        prompt = mock_ai.call_args[0][2]
        assert "DRAFT" in prompt and "FEEDBACK" in prompt


# ── run_pipeline ──────────────────────────────────────────────────────────────

class TestRunPipeline:
    @patch("pipeline.agents._call_ai", side_effect=[
        "research", "style", "draft", "feedback", "final"
    ])
    def test_all_five_results(self, _, all_configs):
        inputs = {"author_notes": "notes", "sources": [], "reference_url": "", "constraints": ""}
        r = run_pipeline(inputs, all_configs)
        assert r["research_brief"] == "research"
        assert r["style_guide"] == "style"
        assert r["draft"] == "draft"
        assert r["feedback"] == "feedback"
        assert r["final_article"] == "final"

    @patch("pipeline.agents._call_ai", side_effect=["r", "s", "d", "f", "fin"])
    def test_callbacks_called(self, _, all_configs):
        started, done = [], []
        inputs = {"author_notes": "n", "sources": [], "reference_url": "", "constraints": ""}
        run_pipeline(inputs, all_configs,
                     on_step_start=lambda s: started.append(s),
                     on_step_done=lambda s, r: done.append(s))
        assert len(started) == 5
        assert started[0] == "research"
        assert done[-1] == "finalization"

    @patch("pipeline.agents._call_ai", side_effect=RuntimeError("API error"))
    def test_propagates_errors(self, _, all_configs):
        inputs = {"author_notes": "n", "sources": [], "reference_url": "", "constraints": ""}
        with pytest.raises(RuntimeError, match="API error"):
            run_pipeline(inputs, all_configs)

    @patch("pipeline.agents._call_ai", side_effect=["r", "s", "d", "f", "fin"])
    def test_persona_passed_through(self, mock_ai, all_configs):
        inputs = {"author_notes": "n", "sources": [], "reference_url": "", "constraints": ""}
        persona = {"platform": "LinkedIn", "tone": "Professional", "style_guide": "Short."}
        run_pipeline(inputs, all_configs, persona=persona)
        # persona_context should appear in at least one call
        calls_with_persona = [
            c for c in mock_ai.call_args_list
            if "LinkedIn" in str(c)
        ]
        assert len(calls_with_persona) > 0


# ── PipelineInputs model ──────────────────────────────────────────────────────

class TestPipelineInputs:
    def test_valid(self):
        p = PipelineInputs(author_notes="notes", sources=[], reference_url="")
        assert p.author_notes == "notes"

    def test_empty_notes_raises(self):
        with pytest.raises(Exception):
            PipelineInputs(author_notes="   ", sources=[], reference_url="")

    def test_reference_url_optional(self):
        p = PipelineInputs(author_notes="notes", sources=[], reference_url="")
        assert p.reference_url == ""

    def test_constraints_default_empty(self):
        p = PipelineInputs(author_notes="notes", sources=[])
        assert p.constraints == ""


# ── API endpoints ─────────────────────────────────────────────────────────────

class TestPipelineEndpoints:
    def test_run_nonexistent_returns_404(self, authed_client: TestClient):
        assert authed_client.post("/api/pipeline/nope/run").status_code == 404

    def test_status_nonexistent_returns_404(self, authed_client: TestClient):
        assert authed_client.get("/api/pipeline/nope/status").status_code == 404

    def test_run_no_auth_returns_401(self, client: TestClient):
        assert client.post("/api/pipeline/some-id/run").status_code == 401

    def test_run_other_users_article_returns_403(self, authed_client, editor_token):
        article_id = authed_client.post("/api/articles", json={
            "title": "Test", "inputs": {
                "author_notes": "notes", "sources": [],
                "reference_url": "", "constraints": "",
            }
        }).json()["id"]
        authed_client.cookies.set("georgias_session", editor_token)
        assert authed_client.post(f"/api/pipeline/{article_id}/run").status_code == 403
