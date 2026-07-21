# Design: MFA (Email OTP) cho tài khoản ADMIN

**Ngày**: 2026-07-16
**Phạm vi**: Backend (`backend-springboot`) + Frontend (`frontend-react`, chỉ `LoginPage.jsx`/`api.js`).

## Bối cảnh

Đánh giá tiêu chuẩn 2026 (backend/DB, xem `2026-07-16-backend-db-2026-standards-upgrade.md`) và đối
chiếu với ASVS 5.0 xác nhận gap kỹ thuật lớn nhất còn lại chưa đóng: **không có MFA cho tài khoản có
quyền cao nhất (ADMIN)** — ASVS L2. Rủi ro thật: nếu mật khẩu ADMIN bị lộ (phishing, tái sử dụng mật
khẩu), kẻ tấn công chiếm toàn quyền hệ thống mà không có lớp chặn thứ hai.

Quyết định phạm vi (đã chốt qua trao đổi với user):
- **Cơ chế**: Email OTP — tái dùng 100% hạ tầng đã có từ Phase 2 (`OtpStore`, `EmailSender`,
  `RateLimiter`), không dùng TOTP (phức tạp hơn nhiều, không cần thiết cho quy mô dự án này).
- **Phạm vi role**: **Chỉ ADMIN**. BROKER không đổi gì (số lượng ADMIN rất ít, chi phí UX thêm bước
  không đáng kể; BROKER đông hơn, chi phí support cao hơn).
- **Bắt buộc**, không tuỳ chọn bật/tắt — đơn giản hơn, không có admin nào "quên bật" giữ nguyên lỗ hổng.
- Cần cả backend lẫn frontend vì `LoginPage.jsx` là flow dùng chung toàn site, không có UI thì admin
  không đăng nhập được nữa.

Ghi chú: dự án đã dọn `UserRole.USER` (không tồn tại từ Pass 3, xoá khỏi enum DB ngày 2026-07-16) — chỉ
còn `BROKER`/`ADMIN`, không ảnh hưởng thiết kế này.

## Luồng đăng nhập ADMIN (thay đổi hành vi)

```
ADMIN nhập email+password → POST /auth/login
  → password đúng  → sinh OTP, gửi email, trả { mfaRequired: true } (KHÔNG có accessToken)
  → password sai   → giữ nguyên hành vi hiện tại (401 + account-lockout rate limit)

Frontend hiện form nhập OTP → POST /auth/login/verify-otp { email, otp }
  → đúng → trả AuthResponse như login() hiện tại (JWT thật) → redirect /admin
  → sai  → 401, có thể thử lại trong TTL (rate-limit riêng cho bước verify)
```

BROKER: **không đổi gì** — `/auth/login` vẫn trả thẳng JWT như hiện tại (field `mfaRequired: false`).

## Backend

### Tái sử dụng hạ tầng OTP đã có (Phase 2)

- `OtpStore` (Redis prod / in-memory dev) — key `"login-mfa:" + email`, TTL **5 phút** (ngắn hơn
  forgot-password's 10 phút vì đây là luồng đăng nhập tức thời).
- `EmailSender` — gửi mã theo đúng cách `PasswordResetService` đang làm.
- `RateLimiter` — 2 lớp độc lập, cùng số với `PasswordResetService` để nhất quán:
  - Gửi OTP: `login-mfa-request:` + email, 3 lần/15 phút (chặn spam email tốn phí).
  - Xác minh OTP: `login-mfa-verify:` + email, 5 lần/10 phút (chặn brute-force mã 6 số).
- `OtpStore.verify()` sai KHÔNG xoá mã (cho retry trong TTL) — đúng theo docstring hiện có của
  `OtpStore`; rate-limit ở tầng verify là lớp chặn brute-force, không phải `OtpStore` tự nó.

### File mới

- `modules/auth/LoginMfaService.java`
  - `void requestOtp(User user)` — rate-limit request, sinh OTP, gửi email, `log.info` sự kiện bảo mật.
  - `AuthResponse verifyOtp(String email, String code)` — rate-limit verify, `OtpStore.verify()`, nếu
    đúng: load `User`, phát JWT (dùng lại logic hiện có trong `AuthService`), `log.info` đăng nhập MFA
    thành công; nếu sai: `log.warn`, ném `ResponseStatusException(UNAUTHORIZED)`.
- `modules/auth/dto/VerifyLoginOtpRequest.java` — record `(String email, String otp)`.
- `modules/auth/dto/LoginResponse.java` — record thay thế kiểu trả về hiện tại của `/auth/login`:
  ```java
  public record LoginResponse(String accessToken, String tokenType, Long expiresIn,
                               UUID userId, String email, UserRole role, boolean mfaRequired) {
      static LoginResponse authenticated(AuthResponse auth) { ... } // mfaRequired=false
      static LoginResponse mfaChallenge() { ... }                   // toàn bộ field JWT = null
  }
  ```

### File sửa

- `AuthService.login()` — sau khi xác thực mật khẩu thành công (không đổi phần rate-limit/lockout khi
  sai mật khẩu), nếu `user.getRole() == UserRole.ADMIN` → gọi `LoginMfaService.requestOtp(user)`, trả
  `LoginResponse.mfaChallenge()`; ngược lại trả `LoginResponse.authenticated(...)` bọc JWT như cũ.
- `AuthController` — đổi kiểu trả về `login()` sang `LoginResponse`; thêm:
  ```java
  @PostMapping("/login/verify-otp")
  public AuthResponse verifyLoginOtp(@Valid @RequestBody VerifyLoginOtpRequest request) {
      return loginMfaService.verifyOtp(request.email(), request.otp());
  }
  ```
- Audit logging: nối tiếp Task 6 (đã merge, `AuthService`/`UserProfileService` đã có `log.warn`/
  `log.info` cho sự kiện bảo mật) — `LoginMfaService` theo đúng convention đó (SLF4J, không ghi
  `audit_logs` table vì tần suất cao, không cần lưu vĩnh viễn).

## Frontend

- `services/api.js`:
  - `login()` — trả nguyên response thay vì giả định luôn có `accessToken` (giờ có thể có
    `mfaRequired: true`). Mock mode: nếu `email.includes('admin')` → trả `{ mfaRequired: true }` thay vì
    token thật (giữ song song hành vi thật để test UI không cần backend chạy).
  - `verifyLoginOtp(email, otp)` mới — gọi `POST /auth/login/verify-otp`. Mock mode: chấp nhận mã cố
    định `'123456'`, sai thì reject.
- `pages/LoginPage.jsx`:
  - Thêm `mode: 'mfa'` vào `MODE_COPY` (title "Xác minh 2 bước", subtitle nhắc kiểm tra email).
  - Sau khi `login()` trả `mfaRequired: true` → `setMode('mfa')` thay vì tạo session ngay (không đổi
    hash URL, không lộ qua `switchMode` vì đây là bước kế tiếp trong cùng phiên submit, không phải
    điều hướng người dùng chủ động).
  - Form mode `'mfa'` chỉ hiện field `otpCode` (tái dùng field đã có từ mode `'reset'`) + nút xác nhận
    gọi `verifyLoginOtp(values.email, values.otpCode)`.
  - Tách logic "hoàn tất session" (`fetchCurrentUser` → `createSession` → `onLogin` → redirect theo
    role) thành 1 hàm dùng chung cho cả luồng login thẳng (BROKER) và luồng verify-otp (ADMIN), tránh
    lặp code giữa `handleSubmit`'s nhánh login và nhánh mfa.

## Kiểm thử (TDD)

- Backend: Mockito unit test `LoginMfaServiceTest` (mirror cấu trúc `PasswordResetServiceTest`) +
  `AuthServiceTest` thêm case verify `mfaRequired` đúng theo role (ADMIN → true, BROKER → false) + case
  rate-limit 2 lớp. HTTP test (`AuthControllerHttpTest` hoặc mở rộng `SecurityHttpTest`) cho endpoint
  mới.
- Frontend: Vitest cho `LoginPage.jsx` — mode chuyển đúng khi `mfaRequired: true`, submit OTP gọi đúng
  `verifyLoginOtp`, lỗi OTP sai hiển thị đúng, BROKER login vẫn đăng nhập thẳng như cũ (regression).
- Không cần docker-compose live-check (gửi email SMTP thật) trừ khi user yêu cầu — Phase 2 đã verify
  `SmtpEmailSender` hoạt động thật rồi, không cần lặp lại ở đây.

## Ngoài phạm vi (không làm trong thiết kế này)

- TOTP/authenticator app — có thể là bước tiếp theo nếu cần, không phải bây giờ.
- MFA cho BROKER — quyết định rõ ràng: không, theo lựa chọn của user.
- Cấu hình bật/tắt MFA theo từng admin — bắt buộc toàn bộ, không có cờ cấu hình.
