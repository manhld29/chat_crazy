# Architecture

## Tổng quan

```text
Browser
   |
   v
Next.js frontend on Vercel
   |
   v
NestJS backend (Vercel Serverless / Node.js)
   |
   +-- Groq API & OpenRouter API (LLM Providers)
   +-- Tavily / TinyFish API (Web Search Engine)
   +-- SMTP Mailer (Nodemailer)
   +-- PostgreSQL (Prisma ORM / Xata.io / Supabase)
   +-- Upstash Redis (Serverless REST API, Optional)
```

Ứng dụng sử dụng kiến trúc Modular Monolith. Backend giữ toàn bộ nghiệp vụ server-side bao gồm gọi Groq LLM & OpenRouter API, quản lý hội thoại, công cụ tìm kiếm web thời gian thực, gửi mail xác thực/khôi phục mật khẩu, quản lý bộ nhớ (user memory), hạn mức (usage limit) và đánh giá phản hồi. Frontend không giữ API key LLM/Services và không gọi trực tiếp các dịch vụ bên thứ ba.

## Backend Modules (NestJS)

- `api`: Vercel Serverless entrypoint (`api/index.ts`).
- `auth`: Xác thực người dùng, JWT Passport Strategy, Argon2 hashing password, Refresh Token rotation & HttpOnly Cookie.
- `users`: Quản lý tài khoản người dùng và thông tin cá nhân.
- `conversations`: Quản lý danh sách và trạng thái cuộc trò chuyện (cursor pagination, archiving, custom AI nickname).
- `messages`: Lưu vết tin nhắn, hỗ trợ Server-Sent Events (SSE) streaming.
- `chat`: Orchestrator điều phối luồng trò chuyện, SSE response, gọi LLM & Web Search tool.
- `llm`: Adapter kết nối Groq Cloud API & OpenRouter API (hỗ trợ Llama 3.3, Gemini 2.0 Flash, DeepSeek R1/V3,...), quản lý model registry & streaming chunks.
- `search`: Service tìm kiếm Web đa tầng (Tier 1: Tavily API, Tier 2: TinyFish, Tier 3: DuckDuckGo, Tier 4: Wikipedia).
- `mail`: Mail Service sử dụng Nodemailer gửi email khôi phục mật khẩu qua SMTP (Gmail, Resend, SendGrid,...).
- `memory`: Ghi nhớ ngữ cảnh/sở thích cá nhân của người dùng.
- `personalities`: Quản lý các tính cách AI (Hài hước, Trí tuệ, Thân thiện,...).
- `usage`: Quản lý hạn mức tin nhắn (Rate Limiting) & Quota theo ngày.
- `prisma`: Prisma Client & Transaction service kết nối PostgreSQL database.
- `redis`: Upstash Redis REST client cho rate-limiting & caching serverless.
- `observability`: Logging JSON & healthcheck monitor.

## Local & Cloud Deployment Model

- **PostgreSQL**: Local chạy qua Docker Compose (`postgres:16-alpine`); Production triển khai trên **Xata.io** hoặc Supabase với Prisma auto-migration (`node scripts/migrate-db.js`).
- **Redis**: Local chạy qua Docker Compose (`redis:7-alpine`); Production sử dụng **Upstash Redis REST API**.
- **Serverless Hosting**: Triển khai trên **Vercel** với single monorepo project (Frontend Next.js + Backend NestJS Serverless Handler tại `/api/*`).

## Database & ORM

- Prisma ORM 5 với TypeScript types tự động sinh ra từ `backend/prisma/schema.prisma`.
- Auto Migration Script `scripts/migrate-db.js` giúp tự động thực thi `npx prisma migrate deploy` khi build trên Vercel.
- Seed data cho Personalities và mẫu dữ liệu khởi tạo qua `ts-node prisma/seed.ts`.

## Auth & Security

- Access Token: JWT ngắn hạn trả trong response body/header.
- Refresh Token: Opaque token được lưu dưới dạng SHA-256 hash trong database, sử dụng HttpOnly Secure Cookie.
- Mật khẩu mã hóa bằng thuật toán Argon2id chống nổ băm (hash attack).
- CORS restriction, Throttler Rate-Limiting theo IP/User.

## Web Search Engine (Tooling for AI)

- Tích hợp khả năng truy vấn thông tin thời gian thực cho chatbot qua `WebSearchService`:
  - **Tier 1**: Tavily Search API (`TAVILY_API_KEY`) - Search engine dành riêng cho AI.
  - **Tier 2**: TinyFish Search API (`TINYFISH_API_KEY`).
  - **Tier 3**: DuckDuckGo Lite fallback (HTTP Client).
  - **Tier 4**: Wikipedia OpenSearch API fallback.

## Mail Service

- Mail Service (`MailService`) sử dụng `nodemailer` gửi email HTML phản hồi nhanh qua giao thức SMTP.
- Tự động fallback log console nếu môi trường chưa cấu hình SMTP keys.

