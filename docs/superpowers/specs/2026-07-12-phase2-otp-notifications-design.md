# Design: Security/Product Hardening — Phase 2 (OTP qua Email + SMS)

**Ngày**: 2026-07-12
**Phạm vi**: Backend only (`backend-springboot`). Không đụng `frontend-react/`.

## Bối cảnh

Giai đoạn 1 (`2026-07-11-security-hardening-phase1`) đã đóng các lỗ hổng bảo mật Critical/High/Medium
làm được thuần code. Giai đoạn 2 dùng 2 dịch vụ bên ngoài mới có credentials (SMTP qua Brevo, SMS qua
eSMS.vn) để giải quyết 2 nhu cầu nghiệp vụ thật:

1. **Khôi phục mật khẩu** — tài khoản ADMIN/BROKER (dự án không có tự đăng ký USER — chỉ 2 role này tồn
   tại) hiện không có cách nào tự lấy lại mật khẩu nếu quên; phải nhờ can thiệp DB thủ công.
2. **Chống spam đặt lịch xem nhà** — `POST /properties/{id}/viewings` hiện public, chỉ rate-limit theo
   IP, không xác minh số điện thoại người đặt là thật.

Cả 2 dùng chung 1 cơ chế: **OTP 6 số, TTL ngắn, dùng 1 lần** — quyết định dùng chung hạ tầng OTP thay vì
xây 2 lần.

## Kiến trúc

### Module mới: `modules/notification/`

Theo đúng convention "module theo domain" của dự án (`tech-defaults.md`), notification là 1 domain mới,
không nhét vào `auth/` hay `booking/`:

```java
public interface EmailSender {
    void send(String to, String subject, String body);
}

public interface SmsSender {
    void send(String phone, String message);
}
```

- `SmtpEmailSender implements EmailSender` — dùng `JavaMailSender` (`spring-boot-starter-mail`, dependency
  mới). Cấu hình qua `application.yml`: `spring.mail.host/port/username/password` trỏ tới biến môi trường
  `SMTP_USERNAME`/`SMTP_PASSWORD` (Brevo SMTP relay, `smtp-relay.brevo.com:587`, STARTTLS).
- `EsmsSmsSender implements SmsSender` — dùng `RestClient` (đã có sẵn trong Spring, không cần dependency
  mới) gọi REST API eSMS.vn, credentials từ `API_KEY_eSMS`/`ESMS_SECRET_KEY`. **Lưu ý triển khai**: cần
  đối chiếu đúng field JSON (`Phone`/`Content`/`ApiKey`/`SecretKey`/`SmsType`...) với tài liệu API thật
  của eSMS.vn tại thời điểm code — không giả định cứng từ trí nhớ.
- Không dùng template engine — nội dung email/SMS là text thuần tiếng Việt, ngắn gọn.

### `OtpStore` mới (mirror chính xác pattern `RateLimiter`/`RevokedTokenStore` đã có)

`modules/auth/security/OtpStore.java`:
```java
public interface OtpStore {
    String generate(String key, Duration ttl); // sinh mã 6 số, lưu, trả về mã
    boolean verify(String key, String code);   // đúng thì xoá (dùng 1 lần) + true; sai/hết hạn thì false
}
```
- `RedisOtpStore` — `SETEX key ttl code` / `GET` + so khớp + `DEL`. Giống hệt cấu trúc
  `RedisRevokedTokenStore` (key prefix riêng `otp:`, fail-open có kiểm soát khi Redis down — nhưng khác
  `RateLimiter`/`RevokedTokenStore`: **OTP không nên fail-open** (fail-open ở đây nghĩa là "coi như đúng
  mã" — nguy hiểm). Khi Redis lỗi, `verify()` trả `false` (từ chối) và `generate()` ném lỗi 503 — an toàn
  hơn là mở khoá nhầm.
- **`verify(key, code)` sai thì KHÔNG xoá mã** (cho phép nhập lại trong thời gian TTL còn hiệu lực — UX
  thân thiện hơn, người dùng gõ nhầm 1 số không phải xin gửi lại SMS/email tốn phí). Để tránh việc này mở
  đường brute-force mã 6 số (1 triệu khả năng) trong lúc TTL còn sống, endpoint `reset-password` và
  `verify-otp` (không phải `OtpStore` tự nó) phải tự rate-limit theo cùng key
  (`password-reset-verify:`+email, `viewing-otp-verify:`+phone — 5 lần/TTL window, dùng `RateLimiter` có
  sẵn) — tách riêng khỏi rate-limit của bước request/forgot (3 lần/15 phút, chống spam gửi SMS/email tốn
  phí) vì đây là 2 rủi ro khác nhau (tốn phí gửi vs. đoán mã).
- `InMemoryOtpStore` — `ConcurrentHashMap<String, ExpiringEntry>`, giống `InMemoryRateLimiter`. Dùng khi
  không có `StringRedisTemplate` (dev/test), theo đúng cách `SecurityConfig` đã wire `RateLimiter`.
- Wiring trong `SecurityConfig` (thêm 1 `@Bean` mới, cùng chỗ với `rateLimiter()`/`revokedTokenStore()`):
  ```java
  @Bean
  OtpStore otpStore(ObjectProvider<StringRedisTemplate> redisTemplate) {
      StringRedisTemplate template = redisTemplate.getIfAvailable();
      return template != null ? new RedisOtpStore(template) : new InMemoryOtpStore();
  }
  ```

## Luồng 1 — Khôi phục mật khẩu

Service mới `PasswordResetService` (`modules/auth/`) — tách riêng khỏi `AuthService` (single
responsibility, giống cách `UserProfileService`/`BookingService`/`MediaService` mỗi service 1 domain hẹp),
gắn vào `AuthController` hiện có (vẫn dưới `/auth/**`).

```
POST /auth/forgot-password
Body: { "email": "broker@congtinland.vn" }
→ LUÔN 200 dù email có tồn tại hay không: { "message": "Nếu email tồn tại, mã OTP đã được gửi." }
→ 429 nếu vượt rate-limit (key "password-reset-request:"+email, 3 lần/15 phút, dùng lại RateLimiter có sẵn)
```
```
POST /auth/reset-password
Body: { "email": "...", "otpCode": "123456", "newPassword": "..." } (newPassword @Size(min=8), giống ChangePasswordRequest)
→ 200: { "message": "Mật khẩu đã được đặt lại." }
→ 400 nếu OTP sai/hết hạn/không tồn tại: "Mã OTP không hợp lệ hoặc đã hết hạn"
→ 429 nếu vượt rate-limit thử mã (key "password-reset-verify:"+email, 5 lần/10 phút — chống brute-force)
→ đổi mật khẩu qua đúng cơ chế Argon2id có sẵn (passwordEncoder.encode(...) + user.updatePasswordHash(...))
```

**Nguyên tắc chống resource-enumeration (giống Task 1 Phase 1)**: nếu email KHÔNG tồn tại,
`forgot-password` vẫn trả 200 y hệt — không gọi SMTP, trả ngay. Nếu email TỒN TẠI nhưng gửi SMTP thất bại
(Brevo lỗi/mạng lỗi) — vẫn phải trả 200 giống hệt (không được trả 500 riêng cho case này), chỉ log lỗi ở
mức ERROR để ops biết — nếu không, chênh lệch status code giữa "email không tồn tại" (200 nhanh) và "email
tồn tại nhưng SMTP lỗi" (500) chính là 1 kênh side-channel lộ thông tin y hệt lỗ hổng Task 1 đã vá.

**Không đổi phạm vi**: JWT hiện có của user (nếu đang đăng nhập ở thiết bị khác) KHÔNG bị thu hồi tự động
khi đổi mật khẩu qua flow này — cơ chế thu hồi theo `userId` (không phải theo từng token) chưa tồn tại
trong dự án. Ghi nhận là hạn chế đã biết, không tự ý xây thêm hạ tầng revoke-by-user (ngoài phạm vi được
yêu cầu, tránh over-engineering).

## Luồng 2 — Chống spam đặt lịch xem nhà

Mở rộng `BookingService` (không tạo service mới — cùng domain, tái dùng logic `create()` hiện có nguyên
vẹn) + 2 endpoint mới trong `BookingController`. **Endpoint cũ `POST /properties/{propertyId}/viewings`
(tạo lịch trực tiếp, không xác minh) bị XOÁ** — nếu giữ lại sẽ là đường vòng qua toàn bộ cơ chế chống spam.
`BookingService.create(propertyId, request)` (logic tạo) vẫn giữ nguyên, chỉ không còn endpoint public gọi
thẳng vào nó nữa — nó trở thành internal, chỉ được gọi từ `verifyOtpAndCreate(...)` mới, sau khi OTP đã
xác minh.

```
POST /properties/{propertyId}/viewings/request-otp
Body: { "visitorPhone": "0912345678" }
→ 200: { "message": "Mã OTP đã được gửi qua SMS." }
→ 404 nếu property không tồn tại/không AVAILABLE (check giống create() hiện tại)
→ 429 nếu vượt rate-limit (key "viewing-otp-request:"+phone, 3 lần/15 phút)
→ 503 nếu gửi eSMS thất bại (KHÔNG cần giấu lỗi này — không phải account lookup, không có rủi ro
  enumeration, trả lỗi thật cho khách biết để thử lại)
```
```
POST /properties/{propertyId}/viewings/verify-otp
Body: { "booking": { ...toàn bộ field CreateViewingRequest hiện có... }, "otpCode": "123456" }
→ 201, trả về ViewingResponse y hệt endpoint cũ (tạo appointment thật)
→ 400 nếu OTP sai/hết hạn: "Mã OTP không hợp lệ hoặc đã hết hạn"
→ 429 nếu vượt rate-limit thử mã (key "viewing-otp-verify:"+phone, 5 lần/5 phút — chống brute-force)
```
DTO mới `VerifyViewingOtpRequest(@Valid CreateViewingRequest booking, @NotBlank String otpCode)` — bọc lại
`CreateViewingRequest` thay vì lặp field, validation cascade tự động qua `@Valid`.

**⚠️ Breaking change cho frontend**: `services/api.js` hiện gọi thẳng `POST /properties/{id}/viewings` cho
luồng "đặt lịch xem" trên `PropertyDetailPage`. Sau Phase 2, luồng này PHẢI đổi thành 2 bước (gọi
`request-otp` → hiện modal nhập OTP → gọi `verify-otp`). Đây là việc của devnguyen (frontend), không thuộc
phạm vi backend — nhưng phải bàn giao rõ contract mới này, nếu không booking sẽ hỏng hoàn toàn ở frontend
cho tới khi được cập nhật.

## Cấu hình / biến môi trường

`.env` đã có (đã sửa lại đúng ở phiên brainstorm này):
```
API_KEY_eSMS=...
ESMS_SECRET_KEY=...
SMTP_USERNAME=b1a2ba001@smtp-brevo.com
SMTP_PASSWORD=xsmtpsib-...
```
Thêm vào `application.yml`:
```yaml
spring:
  mail:
    host: smtp-relay.brevo.com
    port: 587
    username: ${SMTP_USERNAME}
    password: ${SMTP_PASSWORD}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
esms:
  api-key: ${API_KEY_eSMS}
  secret-key: ${ESMS_SECRET_KEY}
  api-url: https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/
```
Thêm `.env.example`: 4 biến trên với placeholder (không commit giá trị thật, `.env` đã gitignore sẵn).

## Testing (TDD — RED trước cho mọi business logic)

- `InMemoryOtpStoreTest` (unit) — generate/verify/expire/single-use, giống `InMemoryRateLimiter` không có
  test riêng thì có thể bỏ qua, nhưng OTP có logic phức tạp hơn (single-use, expiry) nên cần test — mirror
  cách `RedisRateLimiterIntegrationTest`/`RedisRevokedTokenStoreIntegrationTest` đã kiểm tra Redis-backed
  implementation (Testcontainers Redis) cho `RedisOtpStore`.
- `PasswordResetServiceTest` (unit, mock `OtpStore`+`EmailSender`+`UserRepository`) — email tồn tại thì
  gửi OTP; email không tồn tại vẫn trả "thành công" y hệt (assert KHÔNG gọi `EmailSender.send`); OTP đúng
  thì đổi mật khẩu; OTP sai/hết hạn thì 400, không đổi mật khẩu.
- `BookingServiceTest` mở rộng — `requestOtp` gửi SMS đúng số; `verifyOtpAndCreate` với OTP đúng thì tạo
  appointment (tái dùng logic `create()` hiện có, không viết lại); OTP sai thì KHÔNG tạo appointment nào
  (assert `appointments.save` không được gọi).
- `SmtpEmailSender`/`EsmsSmsSender` — unit test mock `JavaMailSender`/`RestClient` để verify tham số gửi
  đúng (host/to/subject hoặc phone/content/apikey). **Không** test tích hợp với server Brevo/eSMS thật
  (tốn phí, cần secret thật trong CI, không đáng tin cậy cho automated test) — việc gửi thật được xác minh
  thủ công 1 lần khi deploy (smoke test), không phải trong `mvn test`.
- `BookingHttpTest`/`AuthServiceTest`/HTTP test mới cho 2 endpoint mới — theo pattern `@WebMvcTest` +
  `MockMvcBuilderCustomizer` đã thiết lập từ đợt nâng Spring Boot 4.

## Ngoài phạm vi (deferred)

- Thu hồi JWT theo `userId` khi đổi mật khẩu (chưa có hạ tầng, ghi nhận technical debt).
- Template email/SMS đẹp (HTML, branding) — chỉ text thuần cho Phase 2.
- Cập nhật frontend cho luồng OTP mới — bàn giao cho devnguyen, không thuộc backend.
- 2FA khi login (không phải yêu cầu của Phase 2 — chỉ dùng OTP cho 2 luồng cụ thể ở trên).

## Critical Files

- `backend-springboot/pom.xml` (thêm `spring-boot-starter-mail`)
- `backend-springboot/src/main/resources/application.yml` (mail + esms config)
- `backend-springboot/src/main/java/com/travinh/realty/modules/notification/` (mới —
  `EmailSender.java`, `SmtpEmailSender.java`, `SmsSender.java`, `EsmsSmsSender.java`)
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/OtpStore.java` (mới)
  + `RedisOtpStore.java` + `InMemoryOtpStore.java` (mới)
- `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java` (thêm bean
  `otpStore(...)`)
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java` (mới)
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java` (thêm 2
  endpoint)
- `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java` (thêm
  `requestOtp`/`verifyOtpAndCreate`, `create(...)` giữ nguyên làm internal helper)
- `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingController.java` (xoá
  endpoint cũ, thêm 2 endpoint mới)
- `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/VerifyViewingOtpRequest.java`
  (mới)
- `.env.example`, root `.env` (đã cập nhật ở phiên brainstorm)
