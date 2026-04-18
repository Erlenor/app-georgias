"""Google OAuth endpoints and session-backed authentication."""

from secrets import token_urlsafe
import os
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from users.validator import validate_user
from auth.session import (
    SESSION_COOKIE_NAME,
    SESSION_MAX_AGE_SECONDS,
    build_user_payload,
    create_session_token,
    get_current_user,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
OAUTH_STATE_COOKIE_NAME = os.environ.get("OAUTH_STATE_COOKIE_NAME", "oauth_state")
OAUTH_STATE_MAX_AGE_SECONDS = int(os.environ.get("OAUTH_STATE_MAX_AGE_SECONDS", "300"))
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"


class AuthCodePayload(BaseModel):
    auth_code: str
    state: str


@router.get("/state")
def auth_state(response: Response) -> dict:
    state = token_urlsafe(24)
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=state,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=OAUTH_STATE_MAX_AGE_SECONDS,
    )
    return {"state": state}


@router.post("/google")
async def google_auth(payload: AuthCodePayload, request: Request, response: Response) -> dict:
    """Exchange Google auth code for tokens, verify identity, and check authorization."""
    try:
        expected_state = request.cookies.get(OAUTH_STATE_COOKIE_NAME)
        if not expected_state or expected_state != payload.state:
            raise HTTPException(status_code=400, detail="Invalid OAuth state")

        async with httpx.AsyncClient(timeout=10.0) as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": payload.auth_code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": "postmessage",
                    "grant_type": "authorization_code",
                },
            )
            token_data = token_response.json()

        if "error" in token_data:
            logger.warning("Token exchange error: %s", token_data)
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")

        id_token_jwt = token_data.get("id_token")
        if not id_token_jwt:
            raise HTTPException(status_code=400, detail="Missing ID token")

        idinfo = id_token.verify_oauth2_token(
            id_token_jwt, google_requests.Request(), GOOGLE_CLIENT_ID
        )

        email = idinfo.get("email", "")
        if not idinfo.get("email_verified", False):
            raise HTTPException(status_code=401, detail="Unverified Google email")

        allowed_user = validate_user(email)
        if not allowed_user:
            return {
                "success": False,
                "error": "Unauthorized — your email is not in the allowed users list.",
            }

        user = build_user_payload(
            email=email,
            name=allowed_user.get("name") or idinfo.get("name", ""),
            picture=idinfo.get("picture", ""),
            role=allowed_user["role"],
        )
        session_token = create_session_token(user)
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite="lax",
            max_age=SESSION_MAX_AGE_SECONDS,
        )
        response.delete_cookie(OAUTH_STATE_COOKIE_NAME)

        return {"success": True, "user": user}

    except ValueError as exc:
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(status_code=504, detail="Google token exchange timed out") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Auth error: %s", exc)
        raise HTTPException(status_code=500, detail="Authentication server error") from exc


@router.get("/me")
def me(user: dict = Depends(get_current_user)) -> dict:
    return {"authenticated": True, "user": user}


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"success": True}
