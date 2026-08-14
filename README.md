# Chat Crazy

Monorepo cho chatbot tiếng Việt vui vẻ, hài hước và thân thiện.

## Stack

- Frontend: Next.js App Router, TypeScript strict, Tailwind CSS.
- Backend: Python 3.12, FastAPI, Pydantic Settings, SQLAlchemy async, Alembic.
- Local infra: PostgreSQL, Redis optional qua Docker Compose profile.

## Chạy local

```bash
make install
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
make dev-backend
make dev-frontend
```

Backend: `http://localhost:8000/api/v1/health`
Readiness: `http://localhost:8000/api/v1/ready`

Frontend: `http://localhost:3000`

Docker Compose:

```bash
make compose-up
```

Bật Redis local khi cần:

```bash
docker compose --profile redis up --build
```

## Kiểm tra

```bash
make lint
make typecheck
make test
```

## Database migrations

```bash
cd backend
. .venv/bin/activate
alembic upgrade head
alembic downgrade -1
```

## Ghi chú bảo mật

- Trình duyệt chỉ gọi backend, không gọi Groq trực tiếp.
- Không commit `.env` thật.
- `GROQ_API_KEY`, JWT secret, database URL production phải cấu hình qua môi trường deploy.
- Access token trả trong response body; refresh token được set bằng HttpOnly cookie và chỉ lưu hash trong database.
