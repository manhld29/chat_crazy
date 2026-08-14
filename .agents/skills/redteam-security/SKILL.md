---
name: redteam-security
description: "Phase 4 Security Skill based on Borghei Red-Team standards: security auditing, SAST, DAST, secret scanning, dependency check, OWASP Top 10 evaluation, and mandatory loopback to spec generation when issues are found."
---

# Red-Team Security & Pentesting Skill - Borghei Standards

Skill này chịu trách nhiệm cho **Giai đoạn 4 (Security Audit & Red Team Testing)** trong quy trình phát triển 15 năm kinh nghiệm, đảm bảo phần mềm không chỉ hoạt động đúng mà còn miễn nhiễm trước các cuộc tấn công bảo mật.

## 1. Tự động kiểm tra & Cài đặt Công cụ Security (Tooling Auto-Setup)
AI có nhiệm vụ kiểm tra và cài đặt các công cụ an ninh mạng được phép trong môi trường hiện tại:
- **Dependency Audit**: `npm audit`, `pip-audit`, `cargo audit`, `govulncheck`.
- **SAST (Static Security Analysis)**: `semgrep`, `bandit` (Python), `eslint-plugin-security` (JS/TS), `gosec` (Go).
- **Secret Scanning**: `gitleaks`, `trufflehog` hoặc regex pattern matching quét hardcoded keys/passwords.
- **API & HTTP Security**: `curl`, `nmap` (nếu có), custom python scripts kiểm thử endpoint payload.

---

## 2. Quy trình 4 Bước Red-Team Penetration Testing

### Bước 1: Quét Mã nguồn Tĩnh & Bí mật (SAST & Secret Scanning)
- Quét toàn bộ codebase để phát hiện các thông tin nhạy cảm bị lộ (Hardcoded credentials, API keys, JWT secrets, Private keys).
- Phân tích mã nguồn tĩnh tìm các mẫu code rủi ro:
  - **SQL Injection**: Nối chuỗi trực tiếp trong SQL query.
  - **Command Injection**: Sử dụng `eval()`, `exec()`, `os.system()` với dữ liệu chưa lọc.
  - **XSS (Cross-Site Scripting)**: Render raw HTML (`dangerouslySetInnerHTML`, `v-html`, `innerHTML`).
  - **Path Traversal**: Sử dụng input người dùng trong đường dẫn file (`fs.readFile(userInput)`).

### Bước 2: Kiểm tra Thư viện & Phụ thuộc (Dependency Security Check)
- Thực thi lệnh quét lỗ hổng thư viện tương ứng với ngôn ngữ của dự án (`npm audit --json`, `pip-audit`).
- Lập danh sách các CVE nguy hiểm (Critical / High severity).

### Bước 3: Phân tích Lỗ hổng OWASP Top 10 & API Pentesting (DAST)
Đánh giá ứng dụng theo các danh mục OWASP Top 10:
1. **Broken Access Control (IDOR)**: Kiểm tra xem user A có thể truy cập/sửa tài nguyên của user B bằng cách thay đổi ID không.
2. **Cryptographic Failures**: Đảm bảo mật khẩu được hash bằng bcrypt/argon2, dữ liệu nhạy cảm được mã hóa khi truyền qua TLS.
3. **Injection**: Đảm bảo mọi input từ user đều được validate và sanitize qua ORM / Prepared Statements.
4. **Insecure Design & Rate Limiting**: Kiểm tra khả năng chống tấn công brute-force vào Auth endpoints (Login, Reset password).
5. **Security Misconfiguration**: Kiểm tra các HTTP Security Headers (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`).

### Bước 4: Đánh giá Kết quả & Vòng lặp Phản hồi về Spec (Security Feedback Loop)
- **NẾU PHÁT HIỆN LỖ HỔNG / RỦI RO BẢO MẬT**:
  1. Lập báo cáo chi tiết về lỗ hổng (Security Incident Report): Vị trí file, mức độ nghiêm trọng (CVSS), POC kịch bản khai thác.
  2. **KHÔNG ĐƯỢC VÁ SỬA NGẪU NHIÊN CHỮA CHÁY**.
  3. **BẮT BUỘC CHUYỂN GIAO TOÀN BỘ DANH SÁCH LỖ HỔNG VỀ GIAI ĐOẠN 1 (`spec-engineering`)**:
     - Cập nhật tài liệu Spec phát triển với phần *Security Remediation Spec*.
     - Đi lại quy trình: Verify Spec (Phase 2) ➔ TDD Fix Code (Phase 3) ➔ Red-Team Pentest lại (Phase 4).
- **NẾU KHÔNG CÒN LỖ HỔNG NÀO (0 Vulnerabilities)**:
  - Công bố hệ thống đạt chứng nhận an toàn Red-Team Borghei và hoàn thành nhiệm vụ.

---

## 3. Bản Nguyên tắc An toàn khi Pentest
- "Chỉ thực hiện pentest và kiểm thử an ninh trong phạm vi dự án được cho phép."
- "Không để lại backdoor hoặc mã khai thác thử nghiệm trong sản phẩm cuối."
- "Báo cáo trung thực 100% kết quả từ log công cụ quét thực tế."
- "Mọi lỗ hổng tìm thấy đều phải qua quy trình Spec ➔ Verify ➔ TDD để sửa triệt để."
