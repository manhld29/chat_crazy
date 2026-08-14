---
name: ui-ux-pro-max
description: "Phase 3 UI/UX Skill based on NextLevelBuilder UI-UX Pro Max: design intelligence, premium aesthetics, modern design tokens, responsive layouts, micro-animations, strictly integrated with TDD."
---

# UI/UX Pro Max Skill - NextLevelBuilder Standards (TDD Compliant)

Skill này chịu trách nhiệm kiến tạo giao diện người dùng (UI) và trải nghiệm người dùng (UX) đẳng cấp thế giới, dựa trên triết lý thiết kế của NextLevelBuilder (`nextlevelbuilder/ui-ux-pro-max-skill`), đồng thời **tuân thủ nghiêm ngặt quy trình TDD**.

## 1. Nguyên tắc Thẩm mỹ & Thiết kế Cao cấp (Design Aesthetics)

### A. Color System & Palettes
- Không dùng màu mặc định thô ráp (như red, blue, green cơ bản). Sử dụng bảng màu HSL hài hòa, hiện đại.
- Hỗ trợ Dark Mode chuẩn mực với hiệu ứng tương phản cao, dịu mắt.
- Sử dụng Smooth Gradients (dải màu chuyển tiếp mềm mại) và hiệu ứng Glassmorphism (lớp mờ thủy tinh `backdrop-filter: blur()`).

### B. Typography & Hierarchy
- Sử dụng Font chữ hiện đại từ Google Fonts (như Inter, Outfit, Plus Jakarta Sans, Roboto) thay cho font trình duyệt mặc định.
- Phân cấp font rõ ràng (H1, H2, Body, Caption) với tỉ lệ scale chuẩn (Modular Scale 1.25 / 1.333).

### C. Layout & Micro-Animations
- Layout chuẩn Grid / Flexbox, hỗ trợ Responsive hoàn hảo trên mọi kích thước màn hình (Mobile, Tablet, Desktop).
- Thêm các hiệu ứng vi chuyển động (Micro-animations, smooth transitions, hover effects, active states) giúp ứng dụng sinh động và nhạy bén với tương tác người dùng.

---

## 2. Quy trình TDD Bắt buộc áp dụng cho UI/UX (TDD for Frontend)

Thiết kế giao diện đẹp nhưng **TUYỆT ĐỐI KHÔNG BỎ QUA TDD**. Triển khai component UI theo 3 bước:

### Bước 1: 🔴 RED - Viết Component & DOM Interaction Test trước
- Trước khi tạo file JSX/TSX/HTML, viết test bằng Testing Library (React Testing Library, Vue Test Utils, Vitest DOM, Playwright):
  - Kiểm tra sự xuất hiện của các phần tử UI chính (buttons, inputs, headings, modal).
  - Kiểm tra các thuộc tính Accessibility (ARIA labels, roles, alt text).
  - Kiểm tra trạng thái tương tác (click button kích hoạt callback, input đổi state, error message hiển thị khi invalid).
- Running Test: Xác nhận test bị FAIL vì Component chưa được định nghĩa hoặc chưa render đúng DOM.

### Bước 2: 🟢 GREEN - Viết Code Component & CSS cơ bản
- Tạo Component UI và áp dụng cấu trúc HTML/JSX vừa đủ để pass các bài test DOM và tương tác.
- Chạy lại test suite: Đảm bảo 100% test pass (PASS).

### Bước 3: 🔵 REFACTOR - Nâng cấp Aesthetic & Design Tokens (UI-UX Pro Max Polish)
- Tách biệt Design Tokens (Color variables, Spacing, Typography constants) vào file CSS/Theme chung.
- Bổ sung Styling chuyên nghiệp: Glassmorphism, Gradients, Shadows, Hover states, Animation classes.
- Kiểm tra tính tương thích Responsive.
- Re-run Test: Đảm bảo sau khi nâng cấp giao diện, toàn bộ logic và DOM structure vẫn PASS 100%.

---

## 3. Tooling Auto-Setup cho Frontend & UI Testing
AI phải tự động kiểm tra và cài đặt:
- Test libraries: `@testing-library/react`, `@testing-library/jest-dom`, `vitest` hoặc `happy-dom`/`jsdom`.
- Styling utilities: CSS Variables, Google Fonts link insertion, Icon packs (Lucide Icons, FontAwesome) nếu cần.
