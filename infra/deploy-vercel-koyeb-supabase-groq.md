# Deploy: Vercel + Koyeb + Supabase + Groq

## Order

1. Create Supabase project.
2. Run backend migrations against Supabase.
3. Deploy backend to Koyeb.
4. Deploy frontend to Vercel.
5. Update CORS and frontend API URL after final domains are known.

## Supabase

Create a Supabase project and copy the PostgreSQL connection string.

Use the direct/session database URL for this FastAPI backend:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/postgres
```

Avoid the transaction pooler URL unless asyncpg prepared statements are explicitly disabled.

Run migrations:

```bash
cd backend
DATABASE_URL='postgresql+asyncpg://postgres:<password>@<host>:5432/postgres' \
  .venv/bin/alembic upgrade head
```

## Groq

Create a Groq API key and choose model IDs in Groq Console.

Recommended environment variables:

```env
GROQ_API_KEY=<groq-key>
GROQ_BASE_URL=https://api.groq.com/openai/v1
DEFAULT_LLM_MODEL=<model-id>
CHEAP_LLM_MODEL=<model-id>
FALLBACK_LLM_MODEL=<model-id>
```

## Koyeb Backend

Create a Koyeb Web Service from the Git repository.

Settings:

```text
Work directory: backend
Builder: Dockerfile
Exposed port: 8000
Health check path: /api/v1/health
Instance type: Free
```

Environment variables:

```env
APP_ENV=production
APP_NAME=Funny Chatbot API
APP_VERSION=0.1.0
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/postgres
GROQ_API_KEY=<groq-key>
GROQ_BASE_URL=https://api.groq.com/openai/v1
DEFAULT_LLM_MODEL=<model-id>
CHEAP_LLM_MODEL=<model-id>
FALLBACK_LLM_MODEL=<model-id>
LLM_TIMEOUT_SECONDS=30
LLM_MAX_RETRIES=1
LLM_MAX_OUTPUT_TOKENS=1024
JWT_SECRET_KEY=<at-least-32-random-characters>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
REFRESH_TOKEN_COOKIE_NAME=chat_crazy_refresh
REFRESH_TOKEN_COOKIE_SAMESITE=none
REFRESH_TOKEN_COOKIE_SECURE=true
FRONTEND_ORIGINS=https://<vercel-domain>
REDIS_URL=
LOG_LEVEL=INFO
SENTRY_DSN=
METRICS_ENABLED=true
METRICS_TOKEN=<optional-random-token>
RATE_LIMIT_PER_MINUTE=60
MAX_INPUT_TOKENS=4096
MAX_OUTPUT_TOKENS=1024
CONVERSATION_WINDOW_MESSAGES=20
CONTEXT_TOKEN_BUDGET=4096
SUMMARY_MESSAGE_THRESHOLD=40
SUMMARY_TOKEN_THRESHOLD=3000
```

After deploy, verify:

```bash
curl https://<koyeb-domain>/api/v1/health
curl https://<koyeb-domain>/api/v1/ready
```

## Vercel Frontend

Create a Vercel project from the same Git repository.

Settings:

```text
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
```

Environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://<koyeb-domain>/api/v1
```

After Vercel gives the final domain, update Koyeb:

```env
FRONTEND_ORIGINS=https://<vercel-domain>
```

Redeploy backend after changing `FRONTEND_ORIGINS`.

## Optional Upstash Redis

Leave `REDIS_URL` empty for the first deploy. The backend starts without Redis.

When ready, create Upstash Redis and set:

```env
REDIS_URL=<upstash-redis-url>
```

## Admin User

Create the first admin user after migrations using a one-off backend shell/script, then log in at:

```text
https://<vercel-domain>/admin/login
```

