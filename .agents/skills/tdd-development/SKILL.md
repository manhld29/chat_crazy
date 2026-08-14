---
name: tdd-development
description: "Phase 3 TDD Skill based on Matt Pocock Engineering standards: strict Red-Green-Refactor test-driven development, type checking, and clean software architecture."
---

# Test-Driven Development (TDD) Skill - Matt Pocock Standards

Skill này quản lý quy trình phát triển code dựa trên TDD (Test-Driven Development) theo các nguyên tắc kỹ thuật hàng đầu của Matt Pocock (`mattpocock/skills`).

## 1. Tự động chuẩn bị Môi trường Testing (Tooling Auto-Setup)
Trước khi bắt đầu bất kỳ vòng lặp TDD nào, AI phải:
1. Phát hiện ngôn ngữ và framework của dự án (Node.js/TypeScript, Python, Go, Rust...).
2. Kiểm tra Test Runner tương ứng đã được cài đặt và cấu hình chưa (ví dụ: `vitest`, `jest`, `pytest`, `go test`).
3. **Nếu chưa có công cụ test**: Tự động thực thi lệnh cài đặt (ví dụ: `npm install -D vitest`, `pip install pytest`) và tạo file cấu hình tối thiểu trước khi viết test.

---

## 2. Vòng lặp TDD 3 Bước Nghiêm ngặt (Red - Green - Refactor)

### Bước 1: 🔴 RED (Viết Test trước và Xác nhận Thất bại)
- Dựa trên **Acceptance Criteria (AC)** từ tài liệu Spec đã được verify ở Giai đoạn 2.
- Viết các test case ngắn gọn, tập trung vào 1 hành vi (behavior) duy nhất.
- Chạy test suite bằng lệnh terminal thích hợp.
- **BẮT BỘC KIỂM TRA**: Test suite phải thất bại (FAIL) và nguyên nhân thất bại phải đúng như dự kiến (ví dụ: hàm chưa tồn tại, kết quả trả về chưa đúng). 
- *Tuyệt đối không bỏ qua bước kiểm tra test fail.*

### Bước 2: 🟢 GREEN (Viết Minimal Code để Pass Test)
- Viết mã nguồn sản phẩm với **lượng code tối thiểu nhất có thể** để biến tất cả các test đang fail thành pass (PASS).
- Không bổ sung các logic dư thừa ngoài phạm vi của test case hiện tại.
- Chạy lại lệnh test runner và kiểm tra 100% test pass thành công.

### Bước 3: 🔵 REFACTOR (Tối ưu hóa & Kiểm tra Kiểu dữ liệu)
- **Cải thiện cấu trúc mã nguồn**: Xóa bỏ code trùng lặp, tối ưu thuật toán, làm sạch đặt tên biến/hàm.
- **Type Checking (Type-Driven Development)**:
  - Chạy trình kiểm tra kiểu nghiêm ngặt (ví dụ: `npx tsc --noEmit` đối với TypeScript, `mypy` đối với Python).
  - Đảm bảo 0 lỗi type-check, 0 lỗi linter (`eslint`, `flake8`...).
- **Chạy lại Test Suite**: Đảm bảo sau khi refactor, 100% test vẫn duy trì trạng thái PASS.

---

## 3. Các Quy tắc Kỹ thuật Bắt buộc (Matt Pocock Guidelines)
1. **Never write implementation code without a failing test**: Không bao giờ viết code triển khai trước khi có test thất bại tương ứng.
2. **Small incremental steps**: Chia nhỏ task thành nhiều vòng lặp Red-Green-Refactor ngắn (vài phút mỗi vòng) thay vì viết một file test khổng lồ.
3. **No Mocks for domain logic**: Ưu tiên test tính toán thực tế hoặc dùng in-memory state thay vì mock vô tội vạ. Chỉ mock ở ranh giới hệ thống (I/O, External HTTP APIs).
4. **Empirical Verification**: Sau mỗi bước Green và Refactor, phải chạy lại lệnh test thực tế và đối chiếu log output. Không bao giờ khẳng định code đã pass nếu chưa có log chạy test thành công.
