# Deploy Backend on Render Free

Use Render only for the FastAPI backend.

```text
Frontend: Vercel
Backend: Render Free Web Service
Database: Supabase Free
LLM: Groq
Redis: disabled at first
```

## 1. Prepare Supabase

Create a Supabase project and copy the direct/session PostgreSQL URL:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/postgres
```

Do not use the transaction pooler URL unless asyncpg prepared statements are explicitly disabled.

## 2. Prepare Groq

Create a Groq API key and choose model IDs.

Example:

```env
GROQ_API_KEY=<groq-key>
GROQ_BASE_URL=https://api.groq.com/openai/v1
DEFAULT_LLM_MODEL=<model-id>
CHEAP_LLM_MODEL=<model-id>
FALLBACK_LLM_MODEL=<model-id>
```

## 3. Deploy with Render Blueprint

Push the repository to GitHub/GitLab first. Render needs a Git repository.

In Render:

```text
New +
Blueprint
Connect repository
Select render.yaml
Apply
```

The root [render.yaml](../render.yaml) creates:

```text
Service type: Web Service
Runtime: Docker
Plan: free
Dockerfile: ./backend/Dockerfile
Docker context: ./backend
Health check: /api/v1/health
Pre-deploy command: alembic upgrade head
```

Render will ask for these values because they are marked `sync: false`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/postgres
GROQ_API_KEY=<groq-key>
DEFAULT_LLM_MODEL=<model-id>
CHEAP_LLM_MODEL=<model-id>
FALLBACK_LLM_MODEL=<model-id>
FRONTEND_ORIGINS=https://<vercel-domain>
```

If the Vercel domain is not ready yet, put the temporary local value first:

```env
FRONTEND_ORIGINS=http://localhost:3000
```

Then update it after Vercel deploys.

## 4. Manual Web Service Setup

If you do not use Blueprint, create a Render Web Service manually:

```text
Language: Docker
Plan: Free
Root Directory: backend
Dockerfile Path: ./backend/Dockerfile
Docker Build Context Directory: ./backend
Health Check Path: /api/v1/health
Pre-Deploy Command: alembic upgrade head
```

Use the same environment variables from the Blueprint section.

## 5. Verify Backend

After deploy:

```bash
curl https://<render-service>.onrender.com/api/v1/health
curl https://<render-service>.onrender.com/api/v1/ready
```

Expected:

```json
{"status":"ok", "...":"..."}
{"status":"ready","database":"ok"}
```

If `/ready` returns `503`, check:

- `DATABASE_URL` is the asyncpg URL.
- Supabase database is awake.
- `alembic upgrade head` completed in Render logs.

## 6. Configure Vercel Frontend

Set frontend env:

```env
NEXT_PUBLIC_API_BASE_URL=https://<render-service>.onrender.com/api/v1
```

Then update Render backend env:

```env
FRONTEND_ORIGINS=https://<vercel-domain>
```

Redeploy backend after changing CORS.

## Render Free Notes

- Free web services sleep after inactivity.
- First request after sleep can be slow.
- Do not run Redis on Render Free for this app; leave `REDIS_URL` empty.
- Keep Supabase as the database to avoid tying app data to a temporary backend service.

