# 🤪 Chat Crazy

Monorepo ứng dụng AI Chatbot tiếng Việt hài hước, thông minh và phản hồi thời gian thực.

---

## 📚 Tài liệu dự án (Documentation Links)

Hệ thống tài liệu hướng dẫn kỹ thuật chi tiết trong thư mục [`docs/`](docs/):

* 🏗️ **[Kiến trúc Hệ thống (Architecture)](docs/architecture.md)**: Sơ đồ tổng quan kiến trúc Monorepo, NestJS Backend modules, Prisma ORM, Auth JWT + Argon2, Web Search Tool, SSE Streaming, Memory Context và Safety Policy.
* 🚀 **[Hướng dẫn Deployment Vercel & Xata DB](docs/VERCEL_DEPLOYMENT.md)**: Hướng dẫn chi tiết cách triển khai Monorepo lên nền tảng Vercel, cấu hình Cloud Database Xata.io PostgreSQL và tự động thực thi Prisma Migration khi deploy.

---

## 🛠️ Các dịch vụ & Công nghệ đang sử dụng (Services & Tech Stack)

### 🔹 Core Frameworks & Runtime
* **Backend**: **NestJS 10** (Node.js, TypeScript strict mode) — RESTful API, Server-Sent Events (SSE) streaming handler, Passport JWT Authentication, Throttler Rate Limiting.
* **Frontend**: **Next.js 16** (App Router, React 19) — Tailwind CSS v4, Lucide Icons, Vitest, Responsive UI/UX.

### 🔹 Database & Storage Services
* **Prisma ORM 5**: Quản lý Data Schema, Type-safe client và cơ chế Auto Migration (`scripts/migrate-db.js`).
* **Xata.io PostgreSQL (Production)**: Cloud Serverless PostgreSQL Database kết nối qua SSL endpoint.
* **PostgreSQL 16 (Local)**: Chạy qua Docker Compose (`docker-compose.yml`).
* **Upstash Redis**: Serverless Redis REST API (`@upstash/redis`) phục vụ Rate Limiting và session caching.

### 🔹 External AI & Cloud Services
* ⚡ **Groq Cloud API**: Dịch vụ suy luận LLM tốc độ cực cao (các model `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`,...).
* 🌐 **OpenRouter API**: Nền tảng kết nối đa dạng các model AI hàng đầu (hỗ trợ Meta Llama 3.3 70B, Google Gemini 2.0 Flash, DeepSeek R1/V3, Qwen 2.5 Coder, Mistral,...).
* 🔍 **Tavily Search API**: Công cụ tìm kiếm Web thời gian thực chuyên biệt cho AI (kèm hệ thống tự động fallback sang **TinyFish API**, **DuckDuckGo Lite**, và **Wikipedia OpenSearch**).
* 📧 **SMTP Mailer Service (Nodemailer)**: Dịch vụ gửi Email HTML khôi phục mật khẩu tài khoản qua giao thức SMTP (tương thích Gmail, Resend SMTP, SendGrid, Mailtrap).
* ☁️ **Vercel Cloud Hosting**: Triển khai Monorepo Single-Project với Next.js Frontend và NestJS Serverless Function backend tại đường dẫn `/api/*`.

---

## 💻 Biến môi trường (Environment Variables)

Sao chép file mẫu để cấu hình môi trường phát triển local:

```bash
cp backend/.env.example backend/.env
```

Các biến môi trường chính trong `backend/.env`:
* `DATABASE_URL`: Chuỗi kết nối PostgreSQL (Xata.io / Supabase / Local Docker).
* `GROQ_API_KEY`: API Key kết nối Groq Cloud LLM.
* `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`: API Key và Base URL kết nối OpenRouter AI Gateway.
* `TAVILY_API_KEY`: API Key tìm kiếm Web cho AI (tùy chọn, tự động fallback nếu không cấu hình).
* `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Cấu hình máy chủ SMTP gửi Email khôi phục mật khẩu.
* `JWT_SECRET_KEY`: Chuỗi secret key mã hóa JWT Token.
* `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`: Cấu hình kết nối Upstash Redis Serverless.

---

## 🚀 Hướng dẫn Chạy ứng dụng (Local Development)

### 1. Cài đặt Dependencies & Sinh Prisma Client
```bash
make install
```
*(Hoặc `cd backend && npm install && npx prisma generate` và `cd frontend && npm install`)*

### 2. Khởi chạy Database Local (nếu không dùng Xata.io)
```bash
make compose-up
```

### 3. Chạy Migration & Seed Data (nếu cần)
```bash
cd backend
npx prisma db push
npx ts-node prisma/seed.ts
```

### 4. Khởi chạy Development Server
```bash
# Terminal 1: Backend NestJS (http://localhost:8000/api/v1/health)
make dev-backend

# Terminal 2: Frontend Next.js (http://localhost:3000)
make dev-frontend
```

---

## 🧪 Kiểm thử & Quality Assurance

```bash
make lint       # Kiểm tra ESLint cho cả Backend & Frontend
make typecheck  # Kiểm tra kiểu TypeScript strict
make test       # Chạy Unit Tests với Jest (Backend) và Vitest (Frontend)
```

---

## 🛡️ Bảo mật & Best Practices

* Browser chỉ giao tiếp qua API Backend, **tuyệt đối không tiết lộ `GROQ_API_KEY` hay Secret Keys** ở client-side.
* Refresh Token được lưu dạng SHA-256 hash và truyền qua `HttpOnly`, `SameSite`, `Secure` Cookie.
* Mật khẩu mã hóa chuẩn **Argon2id**.

