"""Article domain models."""

from pydantic import BaseModel
from pipeline.models import PipelineInputs, PipelineResults


class ArticleStatus:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class CreateArticleRequest(BaseModel):
    title: str
    inputs: PipelineInputs


class ArticleResponse(BaseModel):
    id: str
    user_email: str
    title: str
    status: str
    pipeline_step: str | None = None
    error: str | None = None
    inputs: dict
    results: dict
    created_at: str
    updated_at: str
