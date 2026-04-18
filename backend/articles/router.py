"""Article CRUD endpoints."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from auth.session import get_current_user
from articles.models import ArticleStatus, CreateArticleRequest, ArticleResponse
from db.firestore import get_db

router = APIRouter(prefix="/api/articles", tags=["articles"])

COLLECTION = "articles"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("", response_model=ArticleResponse)
def create_article(
    payload: CreateArticleRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Create a new article with pipeline inputs."""
    db = get_db()
    article_id = str(uuid.uuid4())
    now = _now()

    doc = {
        "id": article_id,
        "user_email": user["email"],
        "title": payload.title.strip() or "Untitled Article",
        "status": ArticleStatus.PENDING,
        "pipeline_step": None,
        "error": None,
        "inputs": payload.inputs.model_dump(),
        "results": {
            "research_brief": None,
            "style_guide": None,
            "draft": None,
            "feedback": None,
            "final_article": None,
        },
        "created_at": now,
        "updated_at": now,
    }

    db.set(COLLECTION, article_id, doc)
    return doc


@router.get("", response_model=list[ArticleResponse])
def list_articles(
    user: dict = Depends(get_current_user),
    search: str | None = None,
) -> list[dict]:
    """List all articles for the current user, with optional search."""
    db = get_db()
    articles = db.list_by_field(COLLECTION, "user_email", user["email"], order_by="created_at")
    if search:
        q = search.strip().lower()
        articles = [
            a for a in articles
            if q in a.get("title", "").lower() or q in a.get("inputs", {}).get("author_notes", "").lower()
        ]
    return articles


@router.get("/{article_id}", response_model=ArticleResponse)
def get_article(
    article_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Get a single article with all pipeline results."""
    db = get_db()
    article = db.get(COLLECTION, article_id)

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")

    return article


@router.delete("/{article_id}")
def delete_article(
    article_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    """Delete an article."""
    db = get_db()
    article = db.get(COLLECTION, article_id)

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")
    if article.get("status") == ArticleStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Cannot delete a running article")

    db.delete(COLLECTION, article_id)
    return {"success": True, "article_id": article_id}


@router.patch("/{article_id}")
def update_article_title(
    article_id: str,
    payload: dict,
    user: dict = Depends(get_current_user),
) -> dict:
    """Update article title."""
    db = get_db()
    article = db.get(COLLECTION, article_id)

    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    if article.get("user_email") != user["email"]:
        raise HTTPException(status_code=403, detail="Access denied")

    title = payload.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    db.update(COLLECTION, article_id, {"title": title, "updated_at": _now()})
    article["title"] = title
    return article
