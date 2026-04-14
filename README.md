# Web App Template

Minimal starter template for:
- Next.js + React + TypeScript frontend
- FastAPI backend
- Google OAuth login
- Allowlist-based role mapping via `backend/users/allowed_users.json`

The template uses a backend-issued session cookie so frontend auth state is not trusted from local storage.

## Project Structure

- `frontend/`: Next.js app router UI
- `backend/`: FastAPI API and auth endpoints
- `backend/users/allowed_users.json`: role mapping for authorized users

## Environment Variables

Copy the example files and fill in values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### Backend (`backend/.env`)

- `GOOGLE_CLIENT_ID`: Google OAuth web client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret
- `APP_AUTH_SECRET`: random secret used to sign app session JWTs
- `ALLOWED_ORIGINS`: comma-separated allowed frontend origins (for CORS)
- `COOKIE_SECURE`: `false` for local HTTP, `true` for HTTPS deployments
- `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_SECONDS`: app session cookie settings
- `OAUTH_STATE_COOKIE_NAME`, `OAUTH_STATE_MAX_AGE_SECONDS`: OAuth state cookie settings

### Frontend (`frontend/.env.local`)

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: same client ID used for GIS popup
- `NEXT_PUBLIC_API_URL`: backend URL (local: `http://localhost:8000`)

## Local Development

### 1) Run backend

```bash
cd backend
uv sync
cp .env.example .env  # if not already copied from root instructions
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Run frontend

```bash
cd frontend
npm install
npm run dev
```

### 3) Test login flow

1. Open `http://localhost:3000`
2. Click Google Sign-In
3. Backend exchanges auth code, validates allowlist, and sets HTTP-only session cookie
4. Frontend reads authenticated user from `GET /api/auth/me`

## Auth Endpoints

- `GET /api/auth/state`: one-time OAuth state initialization
- `POST /api/auth/google`: code exchange + session creation
- `GET /api/auth/me`: returns authenticated user from session cookie
- `POST /api/auth/logout`: clears session cookie

## Google OAuth Setup

In Google Cloud Console:
- Add `http://localhost:3000` to Authorized JavaScript origins for local dev
- Add your deployed frontend URL(s) for staging/prod
- Use the matching web client credentials in both frontend and backend env files

## Cloud Run Deployment Checklist

1. Rotate and store secrets in Secret Manager (`GOOGLE_CLIENT_SECRET`, `APP_AUTH_SECRET`)
2. Build and deploy backend from `backend/Dockerfile`
3. Build and deploy frontend from `frontend/Dockerfile`
4. Set service env vars in Cloud Run:
   - backend: OAuth/app secrets, CORS origins, cookie flags
   - frontend: public API URL and Google client ID
5. Set `COOKIE_SECURE=true` for HTTPS deployments
6. Configure OAuth authorized origins for deployed frontend domains
7. Verify:
   - `GET /` on backend is healthy
   - login sets cookie
   - `GET /api/auth/me` works after login
   - logout clears session

## Notes

- Do not commit `.env` files.
- `frontend/.next`, `frontend/node_modules`, `backend/.venv`, `backend/venv`, and `__pycache__` are generated artifacts and should stay out of source control.
- Backend dependencies are managed with `uv` via `backend/pyproject.toml`.
