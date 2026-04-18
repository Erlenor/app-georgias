"""Pipeline API endpoints with real-time SSE streaming."""

import asyncio
import json
import logging
import threading
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse

from auth.session import get_current_user
from pipeline.agents import AgentCallConfig, run_pipeline
from articles.models import ArticleStatus
from db.firestore import get_db
from agent_config.router import get_user_configs_as_agent_configs
from personas.router import get_persona_by_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])

# Global SSE event queues: article_id → list of asyncio.Queue
_sse_queues: dict[str, list[asyncio.Queue]] = {}
_sse_lock = threading.Lock()


def _push_event(article_id: str, event: dict[str, Any]) -> None:
    """Push an SSE event to all active listeners for an article."""
    with _sse_lock:
        queues = list(_sse_queues.get(article_id, []))
    for q in queues:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass


def _run_pipeline_background(
    article_id: str,
    inputs: dict[str, Any],
    agent_configs: dict[str, AgentCallConfig],
    user_email: str,
    persona: dict[str, Any] | None = None,
) -> None:
    """Execute pipeline in a background thread and update Firestore."""
    db = get_db()

    def on_step_start(step_name: str) -> None:
        _push_event(
            article_id,
            {"event": "step_started", "step": step_name, "data": None},
        )
        db.update(
            "articles",
            article_id,
            {
                "pipeline_step": step_name,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    def on_step_done(step_name: str, result: str) -> None:
        key_map = {
            "research": "research_brief",
            "style_extraction": "style_guide",
            "draft": "draft",
            "reflection": "feedback",
            "finalization": "final_article",
        }
        result_key = key_map.get(step_name, step_name)
        _push_event(
            article_id,
            {"event": "step_completed", "step": step_name, "data": result},
        )
        db.update(
            "articles",
            article_id,
            {
                f"results.{result_key}": result,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    try:
        _push_event(article_id, {"event": "started", "step": None, "data": None})
        db.update(
            "articles",
            article_id,
            {
                "status": ArticleStatus.RUNNING,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        results = run_pipeline(
            inputs=inputs,
            agent_configs=agent_configs,
            on_step_start=on_step_start,
            on_step_done=on_step_done,
            persona=persona,
        )

        db.update(
            "articles",
            article_id,
            {
                "status": ArticleStatus.COMPLETED,
                "pipeline_step": "finalization",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        _push_event(article_id, {"event": "completed", "step": None, "data": results})

    except Exception as exc:
        logger.error("Pipeline failed for article %s: %s", article_id, exc)
        db.update(
            "articles",
            article_id,
            {
                "status": ArticleStatus.FAILED,
                "error": str(exc),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        _push_event(article_id, {"event": "error", "step": None, "error": str(exc)})
    finally:
        _push_event(article_id, {"event": "done", "step": None, "data": None})


@router.post("/{article_id}/run")
def run_article_pipeline(
    article_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    persona_id: str | None = None,
) -> dict:
    """Start the pipeline for an article in the background."""
    db = get_db()
    article = db.get("articles", article_id)

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if article.get("status") == ArticleStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Pipeline is already running")

    inputs = article.get("inputs", {})
    agent_configs = get_user_configs_as_agent_configs(user["email"])

    # Load persona if specified
    persona: dict[str, Any] | None = None
    if persona_id:
        persona = get_persona_by_id(user["email"], persona_id)

    background_tasks.add_task(
        _run_pipeline_background,
        article_id,
        inputs,
        agent_configs,
        user["email"],
        persona,
    )

    return {"success": True, "article_id": article_id, "status": "started"}


@router.get("/{article_id}/stream")
async def stream_pipeline(
    article_id: str,
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """SSE endpoint for real-time pipeline progress."""
    db = get_db()
    article = db.get("articles", article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")

    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    with _sse_lock:
        _sse_queues.setdefault(article_id, []).append(queue)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue

                yield f"data: {json.dumps(event)}\n\n"

                if event.get("event") == "done":
                    break
        finally:
            with _sse_lock:
                queues = _sse_queues.get(article_id, [])
                if queue in queues:
                    queues.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{article_id}/status")
def get_pipeline_status(
    article_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get current pipeline status for an article."""
    db = get_db()
    article = db.get("articles", article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "article_id": article_id,
        "status": article.get("status", "pending"),
        "pipeline_step": article.get("pipeline_step"),
        "error": article.get("error"),
        "results": article.get("results", {}),
    }
