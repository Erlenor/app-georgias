"""Thales — FastAPI backend entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from auth.google import router as auth_router

app = FastAPI(title="Thales API", version="1.0.0")

allowed_origins = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
cors_origins = [origin.strip() for origin in allowed_origins.split(",") if origin.strip()]

# CORS — env-driven origins for dev/staging/prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)


@app.get("/")
def health():
    return {"status": "ok", "service": "thales-api"}
