"""App Georgias — FastAPI backend entry point."""

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables before importing modules that use them
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from auth.google import router as auth_router
from articles.router import router as articles_router
from pipeline.router import router as pipeline_router
from agent_config.router import router as agent_config_router
from personas.router import router as personas_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="App Georgias API",
    description="AI-powered article generation pipeline",
    version="1.0.0",
)

# CORS configuration — driven by environment
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
cors_origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth_router)
app.include_router(articles_router)
app.include_router(pipeline_router)
app.include_router(agent_config_router)
app.include_router(personas_router)


@app.get("/")
def health() -> dict:
    return {"status": "ok", "service": "app-georgias-api", "version": "1.0.0"}
