# Architecture

## Tổng quan

```text
Browser
   |
   v
Next.js frontend on Vercel
   |
   v
FastAPI backend
   |
   +-- Groq API
   +-- PostgreSQL/Supabase
   +-- Upstash Redis, optional
```

Ứng dụng dùng modular monolith. Backend giữ toàn bộ nghiệp vụ server-side, bao gồm gọi Groq, quản lý hội thoại, bộ nhớ, hạn mức và đánh giá phản hồi. Frontend không giữ API key LLM và không gọi Groq trực tiếp.

## Backend domains

- `api`: định tuyến HTTP và versioning.
- `core`: cấu hình, app factory, database primitives.
- `auth`: xác thực và token.
- `users`: người dùng.
- `conversations`: hội thoại.
- `messages`: tin nhắn.
- `llm`: adapter Groq và streaming.
- `memory`: ghi nhớ sở thích/ngữ cảnh quan trọng.
- `personalities`: tính cách chatbot.
- `usage`: hạn mức sử dụng.
- `moderation`: kiểm duyệt đầu vào/đầu ra.
- `feedback`: đánh giá câu trả lời.
- `repositories`: truy cập dữ liệu dùng SQLAlchemy async.
- `observability`: logging JSON, tracing/metrics sau này.

## Local deployment model

- PostgreSQL chạy mặc định trong Docker Compose.
- Redis nằm sau profile `redis`, chỉ bật khi cần cache/rate limit/session phụ trợ.
- Backend chạy được một worker, RAM thấp, không yêu cầu worker pool riêng.

## Backend database nền tảng

- SQLAlchemy 2 async dùng `create_async_engine` và `async_sessionmaker`.
- FastAPI lifespan tạo engine/sessionmaker một lần cho process và dispose khi shutdown.
- Session dependency rollback khi request có exception, nhưng không tự commit.
- Commit thuộc business service hoặc transaction helper.
- Alembic đọc `Base.metadata` từ `app.core.models` và dùng async database URL.

## Auth nền tảng

- Access token là JWT ngắn hạn trả trong response body.
- Refresh token là opaque random token; database chỉ lưu SHA-256 hash.
- Refresh token rotation tạo session mới, revoke session cũ và revoke toàn bộ active session của user khi phát hiện reuse token đã bị revoke.
- Production ưu tiên refresh token trong HttpOnly Secure cookie; SameSite và domain cấu hình qua environment để hỗ trợ frontend khác domain.
- API vẫn trả refresh token trong body để hỗ trợ non-browser client và test; frontend browser nên ưu tiên cookie.
- Password dùng Argon2, giới hạn độ dài đầu vào và không bao giờ lưu plain password.

## Personality Service

- Personality là dữ liệu hệ thống trong bảng `personalities`, seed bằng Alembic migration.
- Public API chỉ trả personality active; chưa có admin write API vì chưa có admin authorization.
- Prompt builder ghép theo thứ tự: base safety, personality, user preference, memory, conversation summary.
- Dữ liệu user/memory/summary luôn nằm trong block `BEGIN_DATA/END_DATA` để không ghi đè system instruction.
- Builder áp dụng character budget trước khi gửi sang LLM layer.

## Conversations

- Conversation query luôn lọc `user_id` ngay trong database query.
- Danh sách dùng cursor pagination theo `last_message_at` và `id`, không dùng offset.
- Archived conversation bị ẩn mặc định và có thể lấy lại bằng `include_archived=true`.
- Delete hiện là hard delete vì chưa có message/audit table cần giữ tham chiếu; khi có message history có thể chuyển sang soft delete.
- Title generator hiện dùng fallback `Cuoc tro chuyen moi` hoặc cắt gọn tin nhắn đầu, chưa gọi LLM.

## Messages

- Message là plain text hoặc Markdown; backend không render HTML từ model.
- Không lưu system prompt đầy đủ theo từng lượt chat nếu không có yêu cầu audit riêng.
- Message query luôn đi qua conversation ownership, lọc `Conversation.user_id` tại database.
- Danh sách message dùng cursor pagination theo `created_at` và `id`.
- Khi chuẩn bị một lượt chat, service lưu user message và assistant placeholder `pending`, rồi commit trước khi lớp streaming chạy.
- Khi stream hoàn tất, assistant message được cập nhật `completed`; khi lỗi, cập nhật `failed` với `error_code` đã sanitize để tránh lưu secret.
- Endpoint gửi message streaming thuộc Chat Orchestrator và dùng message domain để lưu trạng thái.

## Chat Orchestrator

- `POST /api/v1/conversations/{conversation_id}/messages/stream` trả Server-Sent Events.
- Route chỉ điều phối HTTP; business flow nằm trong `app.chat.service.ChatOrchestrator`.
- SSE events hiện có: `message.created`, `message.delta`, `message.completed`, `message.failed`, `usage.updated`, `conversation.updated`, `done`.
- `client_message_id` được lưu trong `Message.metadata.client_message_id` và khóa bằng Postgres advisory lock theo user/conversation/client ID.
- Nếu retry cùng `client_message_id` sau khi completed, API replay `message.completed` và `done`, không tạo thêm message hoặc usage event.
- Nếu retry khi lượt cũ còn pending/streaming, API trả `409`.
- Khi client disconnect, assistant message được đánh dấu `cancelled`, usage reservation được chuyển sang failed để không treo trạng thái.
- Fallback model chỉ được dùng khi provider lỗi trước chunk đầu tiên; sau khi đã emit delta thì không retry/fallback để tránh lặp nội dung.
- Chat stream không giữ transaction DB mở trong suốt thời gian gọi provider; mỗi bước persistence dùng session ngắn.

## Memory và Context Window

- Phiên bản này không dùng vector database.
- User memory lưu trong PostgreSQL theo `user_id`; mọi API list/delete đều owner-scoped.
- Người dùng có thể xem, thêm chủ động và xóa memory; dữ liệu nhạy cảm như password, token, API key, CVV bị chặn trước khi lưu.
- Extraction policy tách khỏi persistence: service hiện chỉ cung cấp persistence và helper deactivate cho yêu cầu "hãy quên".
- `ContextBuilder` chỉ nhận dữ liệu đã load sẵn và dựng context theo thứ tự: system, personality, user memory, conversation summary, recent messages, message hiện tại.
- Token estimation dùng heuristic an toàn theo ký tự; system và message hiện tại được ưu tiên, message cũ bị bỏ khi vượt budget.
- Summary policy chỉ tạo quyết định và request text; gọi LLM thật thuộc Chat Orchestrator sau này.

## LLM Provider

- API và domain chỉ phụ thuộc vào protocol `LLMProvider` và DTO trong `app.llm.types`.
- Groq integration nằm trong `app.llm.groq`, dùng HTTPX async và endpoint OpenAI-compatible của Groq.
- Provider không log API key và không log toàn bộ nội dung chat theo mặc định.
- Retry chỉ áp dụng trước khi client nhận chunk streaming đầu tiên; lỗi validation không retry.
- Lỗi provider được chuẩn hóa thành taxonomy riêng: validation, timeout, rate limit, unavailable, stream.
- Model registry hiện là typed settings, chưa dùng database; không hardcode model trong route hoặc domain.
- `MockLLMProvider` phục vụ unit test và phát triển Chat Orchestrator mà không gọi mạng thật.

## Usage và Abuse Control

- Usage plan được cấu hình tập trung trong `app.usage.plans`: `guest` và `free`.
- `UsageEvent` là event table ghi reservation, success, failed và refunded request.
- Chat Orchestrator sau này phải gọi reservation trước provider, rồi complete/failed/refund sau khi biết kết quả.
- Reservation dùng Postgres advisory transaction lock theo user để tránh race condition khi gửi đồng thời.
- Rate limit ưu tiên external `RateLimiter` nếu được truyền vào; Redis adapter là optional và fallback về DB khi không cấu hình hoặc không khả dụng.
- Daily quota và aggregate `/usage/me` tính theo ngày UTC.
- Retry nội bộ provider không tạo thêm usage event; một lượt chat chỉ có một reservation.
- Cost estimation đọc bảng giá vận hành trong `app.usage.plans`, model chưa biết có cost mặc định `0`.

## Safety Layer

- Safety layer nằm trong `app.moderation.safety`, gồm `InputSafetyService`, `OutputSafetyService`, `SafetyPolicy`, `SafetyCategory` và `SafetyDecision`.
- Phiên bản đầu dùng rule-based checks có thể cấu hình, không gọi provider và không dùng keyword đơn lẻ nếu thiếu ngữ cảnh.
- Prompt injection, yêu cầu API key/secret/system prompt và output chứa secret-like token bị từ chối bằng tiếng Việt tự nhiên.
- Tình huống tự gây hại hoặc đe dọa bạo lực trả về decision `escalate`, ép personality `listener` và thêm constraint `no_roast/no_jokes`.
- Service không log nguyên văn nội dung nhạy cảm; decision mặc định `should_log_content=false`.
- Chat Orchestrator sau này chịu trách nhiệm áp dụng decision trước/sau khi gọi LLM.

## Ranh giới hiện tại

Scaffold này chỉ triển khai health endpoint và shell frontend. Các domain đã có ranh giới thư mục nhưng chưa có nghiệp vụ giả.
