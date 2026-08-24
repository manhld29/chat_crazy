# Hướng dẫn Triển khai Chat Crazy lên Vercel & Kết nối Aiven PostgreSQL Database

Tài liệu hướng dẫn chi tiết cách triển khai ứng dụng **Chat Crazy** (bao gồm NestJS Backend và Next.js Frontend) lên nền tảng **Vercel** và tự động cập nhật Migration Database với **Aiven PostgreSQL**.

---

## 🏗️ Kiến trúc ứng dụng trên Vercel

Ứng dụng hỗ trợ 2 phương án triển khai linh hoạt:
- **Phương án A (Khuyên dùng - Monorepo Single Project)**: Triển khai toàn bộ dự án (cả Frontend và Backend) trong **1 dự án Vercel duy nhất**.
  - NestJS sẽ chạy dưới dạng **Vercel Serverless Function** tại đường dẫn `/api/*`.
  - Next.js sẽ đảm nhận giao diện người dùng `/`.
- **Phương án B (Tách riêng 2 Projects)**: Triển khai Backend (`/backend`) và Frontend (`/frontend`) thành 2 dự án Vercel độc lập.

---

## ⚡ Tự động chạy Migration trên Aiven khi Deploy

Ứng dụng đã được tích hợp script tự động kiểm tra và thực thi migration mới trong quá trình build trên Vercel (`node scripts/migrate-db.js`):
1. Mỗi khi bạn đẩy code mới có migration mới trong `backend/prisma/migrations/`, Vercel Build Step sẽ tự động kết nối với **Aiven PostgreSQL** và chạy `npx prisma migrate deploy`.
2. Nếu không có migration mới, hệ thống sẽ bỏ qua và tiếp tục build ứng dụng.
3. Nếu môi trường local không có `DATABASE_URL` kết nối Aiven, script sẽ thông báo bỏ qua migration và không làm gián đoạn việc phát triển cục bộ.

---

## 🚀 Các bước triển khai lên Vercel kết nối Aiven

### Bước 1: Lấy Service URI từ Aiven Console
1. Đăng nhập vào [Aiven Console](https://console.aiven.io).
2. Chọn Service PostgreSQL của bạn (ví dụ: `pg-3509da72`).
3. Trong tab **Overview**, tìm mục **Connection information**.
4. Sao chép **Service URI** (có dạng: `postgres://avnadmin:password@pg-3509da72-project.aivencloud.com:port/defaultdb?sslmode=require`).

### Bước 2: Tạo Dự án trên Vercel
1. Đăng nhập vào [Vercel Dashboard](https://vercel.com).
2. Chọn **Add New...** -> **Project**.
3. Import Repository Git của bạn.
4. Cài đặt các **Environment Variables**:

| Tên biến môi trường | Giá trị ví dụ / Mô tả |
| :--- | :--- |
| `DATABASE_URL` | `postgres://avnadmin:pass@host.aivencloud.com:port/defaultdb?sslmode=require` |
| `JWT_SECRET_KEY` | `super-secret-key-minimum-32-characters-long` |
| `GROQ_API_KEY` | `gsk_...` (API Key từ Groq Console) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` (API Key từ OpenRouter Gateway - Tùy chọn) |
| `FRONTEND_ORIGINS` | `*` hoặc `https://chat-crazy.vercel.app` |
| `APP_ENV` | `production` |

5. Nhấn **Deploy**. Vercel sẽ tự động:
   - Sinh Prisma Client (`prisma generate`)
   - Tự động thực thi Migration DB lên **Aiven PostgreSQL** (`node scripts/migrate-db.js`)
   - Build serverless handler `api/index.ts` cho NestJS
   - Build Next.js app trong `frontend/`

---

## 🗄️ Khởi tạo dữ liệu mẫu (Seed Data) cho Aiven

Nếu muốn khởi tạo dữ liệu mặc định (Personalities AI) cho cơ sở dữ liệu Aiven mới:
```bash
cd backend
# Đặt DATABASE_URL trỏ tới Aiven và chạy seed:
DATABASE_URL="postgres://avnadmin:..." npx ts-node prisma/seed.ts
```

---

## 🛠️ Xử lý lỗi thường gặp (Troubleshooting)

### 1. Lỗi Prisma Engine Binary Target
- **Hiện tượng**: `PrismaClientInitializationError: Query engine binary not found`.
- **Khắc phục**: Đã được xử lý tự động trong `backend/prisma/schema.prisma` với `binaryTargets = ["native", "rhel-openssl-3.0.x"]`.

### 2. Lỗi CORS Credentials
- **Khắc phục**: Đặt `FRONTEND_ORIGINS=*` hoặc điền đúng domain Vercel của bạn vào `FRONTEND_ORIGINS`.

### 3. Serverless Execution Timeout
- Mặc định Vercel Hobby có timeout 15s cho Serverless Function. Các API streaming AI từ Groq hoàn thành trong 1-3 giây nên hoạt động mượt mà.
