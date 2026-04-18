# App Georgias

AI-powered article generation platform with a 5-step pipeline.

```
✦ App Georgias
├── 🔍 Research Brief    — analyses notes & sources
├── 🎨 Style Extraction  — extracts writing style
├── ✍️  Draft            — writes first draft
├── 🔄 Reflection        — critical feedback
└── ✅ Finalization      — polished final article
```

## Tech Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind v4 |
| Backend  | FastAPI (Python 3.12)                         |
| Auth     | Google OAuth 2.0 (session cookie)             |
| AI       | Google Gemini **or** OpenAI (configurable)    |
| Database | Firestore (in-memory fallback for dev)        |
| Secrets  | Google Secret Manager                         |
| Deploy   | Google Cloud Run (Docker)                     |

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, APP_AUTH_SECRET

uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_GOOGLE_CLIENT_ID

npm install
npm run dev
```

### 3. Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Setting up AI Keys

Open **Settings** in the app and enter your API key for either provider.

| Provider    | Where to get key                       |
|-------------|----------------------------------------|
| Gemini      | https://aistudio.google.com            |
| OpenAI      | https://platform.openai.com            |

In production, store keys in Google Secret Manager instead — see deployment section.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                  | Description                                     |
|---------------------------|-------------------------------------------------|
| `GOOGLE_CLIENT_ID`        | Google OAuth Client ID                          |
| `GOOGLE_CLIENT_SECRET`    | Google OAuth Client Secret                      |
| `APP_AUTH_SECRET`         | JWT signing secret (min 32 chars)               |
| `GEMINI_API_KEY`          | Gemini API key (optional — can set in UI)       |
| `OPENAI_API_KEY`          | OpenAI API key (optional — can set in UI)       |
| `AI_PROVIDER`             | `gemini` or `openai` (default: `gemini`)        |
| `ALLOWED_ORIGINS`         | CORS origins (e.g. `http://localhost:3000`)     |
| `COOKIE_SECURE`           | `false` for HTTP, `true` for HTTPS              |
| `GCP_PROJECT_ID`          | GCP project ID                                  |
| `FIRESTORE_PROJECT_ID`    | Firestore project ID                            |
| `USE_FIRESTORE`           | `true` for Firestore, `false` for in-memory     |
| `USE_SECRET_MANAGER`      | `true` to use Google Secret Manager             |

### Frontend (`frontend/.env.local`)

| Variable                     | Description             |
|------------------------------|-------------------------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `NEXT_PUBLIC_API_URL`        | Backend URL             |

---

## Features

### Generator
- Author notes (protected — cannot be fully deleted)
- Source URLs (dynamic list)
- Reference URL for style analysis (now **optional**)
- Persona selector — applies platform-specific style automatically
- Real-time pipeline progress with partial results as each step completes
- Download final article as `.md`

### Personas
- Create writing profiles for different platforms (LinkedIn, Facebook, Blog, etc.)
- Set tone, target audience, language, style guide
- Style guide used automatically when no Reference URL is provided

### Agent Configuration
- Edit system prompt, user prompt template, and model per pipeline step
- Template variables shown as read-only badges — cannot accidentally break them
- Reset individual agents or all at once

### Settings
- Choose AI provider: **Gemini** or **OpenAI**
- Enter API keys securely (masked after save)
- Set default persona

---

## Project Structure

```
app-georgias/
├── backend/
│   ├── main.py                   # FastAPI app + all routers
│   ├── auth/                     # Google OAuth + JWT session
│   ├── users/                    # Allowlist validation
│   ├── pipeline/                 # AI pipeline (5 steps, Gemini + OpenAI)
│   ├── articles/                 # Article CRUD + search
│   ├── personas/                 # Writing persona CRUD
│   ├── agent_config/             # Per-user agent config + app settings
│   ├── db/                       # Firestore wrapper + in-memory fallback
│   ├── secrets_manager.py        # Google Secret Manager helper
│   └── tests/                    # pytest tests (TDD)
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx           # Login
        │   ├── generator/         # Article generation (main screen)
        │   ├── personas/          # Persona management
        │   ├── agents/            # Agent configuration
        │   └── settings/          # API keys + preferences
        ├── components/            # Shared UI components
        ├── context/               # AuthContext
        ├── lib/api.ts             # Type-safe API client
        └── types/index.ts         # TypeScript types
```

---

## Running Tests

```bash
cd backend
uv run --with pytest,pytest-asyncio,httpx python -m pytest tests/ -v
```

---

## Deployment (Google Cloud Run)

### 1. Store secrets

```bash
echo -n "your-secret" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo -n "your-key"    | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-jwt"    | gcloud secrets create APP_AUTH_SECRET --data-file=-
```

### 2. Service account for local development

In Google Cloud Console → IAM → Service Accounts → Create key → JSON.
Save as `service_account.json` in `backend/` — **never commit this file** (it is gitignored).

Set the path:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=./service_account.json
```

### 3. Deploy backend

```bash
gcloud run deploy app-georgias-backend \
  --source=./backend \
  --set-env-vars="USE_FIRESTORE=true,USE_SECRET_MANAGER=true,GCP_PROJECT_ID=YOUR_PROJECT,COOKIE_SECURE=true" \
  --allow-unauthenticated
```

### 4. Deploy frontend

```bash
gcloud run deploy app-georgias-frontend \
  --source=./frontend \
  --set-env-vars="NEXT_PUBLIC_API_URL=https://YOUR_BACKEND_URL,NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID" \
  --allow-unauthenticated
```

### 5. Google OAuth setup

In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Web Client:
- Authorized JavaScript origins: `http://localhost:3000`, your deployed frontend URL
- Redirect URIs: not needed (uses `postmessage`)

---

## Security Notes

- API keys are **never** committed to the repository
- HTTP-only session cookies (not localStorage)
- CORS whitelist via `ALLOWED_ORIGINS`
- Allowlist in `backend/users/allowed_users.json`
- Each user sees only their own articles and personas
