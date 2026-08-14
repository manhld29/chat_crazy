---
name: spec-engineering
description: "Phase 1 & 2 Skill: Generate formal software development specifications (including security remediation specs), verify technical constraints, enforce zero-hallucination verification loop, and refine specs before TDD implementation."
---

# Specification Engineering & Verification Skill

Skill này chịu trách nhiệm cho **Giai đoạn 1 (Spec Generation)** và **Giai đoạn 2 (Spec Verification Loop)** trong quy trình phát triển 15 năm kinh nghiệm.

## 1. Giai đoạn 1: Spec Generation (Tạo & Bổ sung Spec phát triển / Bảo mật)

Khi nhận được mô tả tính năng từ người dùng **HOẶC danh sách lỗ hổng bảo mật phát hiện từ Giai đoạn 4 (Red-Team Audit)**, AI phải lập hoặc cập nhật tài liệu **Development Specification** chuẩn hóa gồm các phần bắt buộc:

### Cấu trúc Tài liệu Spec:
1. **Tổng quan & Mục tiêu (Overview & Scope)**:
   - Mô tả chính xác bài toán cần giải quyết hoặc các lỗ hổng bảo mật cần khắc phục từ Giai đoạn 4.
2. **Kiến trúc Kỹ thuật (System Architecture & Tech Stack)**:
   - Danh sách công nghệ và thư viện bảo mật liên quan.
3. **Data Schemas & Domain Model**:
   - Cấu trúc dữ liệu, ràng buộc bảo mật (Sanitization, Validation rules).
4. **Interface Contracts & API Specification**:
   - API Endpoints, Authentication / Authorization policies (RBAC, Rate Limits).
5. **Kế hoạch TDD & Security Test Cases**:
   - Danh sách các Test Case bắt buộc (Unit Tests, Component Tests, Security Regression Tests).
6. **Spec Bảo vệ & Vá lỗ hổng (Security Remediation Spec)** *(Khi nhận phản hồi từ Giai đoạn 4)*:
   - Chi tiết phương án kỹ thuật khắc phục từng lỗ hổng phát hiện bởi Red-Team (SQLi, XSS, IDOR, Outdated CVEs...).

---

## 2. Giai đoạn 2: Spec Verification & Clarification (Vòng lặp Verify Spec)

Sau khi tạo Spec, AI **KHÔNG ĐƯỢC CHUYỂN SANG CODE NGAY**. AI phải thực hiện vòng lặp xác minh (Verification Loop) theo nguyên tắc Zero-Hallucination:

### Các bước Verify Spec:
1. **Kiểm tra mã nguồn hiện có (Empirical Verification)**:
   - Sử dụng các công cụ `grep_search`, `view_file`, `list_dir` để kiểm tra thực tế xem các file, hàm, thư viện, biến môi trường được nhắc tới trong Spec có tồn tại và đúng kiểu dữ liệu hay không.
2. **Đánh giá tính hợp lý & Feasibility Check**:
   - Phân tích xem giải pháp xử lý trong Spec có triệt tiêu lỗ hổng bảo mật mà không làm phá vỡ logic tính năng cũ hay không.
3. **Phân nhánh xử lý theo kết quả Verification**:
   - 🔴 **NẾU SPEC SAI, MƠ HỒ HOẶC THIẾU THÔNG TIN**:
     - Dừng lại ngay lập tức.
     - **QUAY LẠI GIAI ĐOẠN 1**: Đưa ra bản Spec sửa đổi (Refined Spec) hoặc làm rõ với người dùng.
   - 🟢 **NẾU SPEC ĐÃ ĐÚNG 100% VÀ ĐÃ KIỂM CHỨNG THỰC TẾ**:
     - Tiến sang Giai đoạn 3 (TDD Development).

## 3. Bản cam kết Zero-Hallucination của Chuyên gia 15 năm
- "Tôi không tự bịa tên hàm, endpoint, hay kiểu dữ liệu."
- "Mọi sự cố bảo mật từ Red-Team đều được đưa về Spec thiết kế lại cẩn thận trước khi code sửa."
