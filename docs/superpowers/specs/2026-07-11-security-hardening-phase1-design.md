# Design: Security Hardening — Phase 1 (Audit + Quick Fixes)

**Ngày**: 2026-07-11
**Phạm vi**: Backend only (`backend-springboot`). Không bao gồm Cloudflare (chờ domain) và JWT refresh
token (spec riêng, phức tạp hơn).

## Bối cảnh

Sản phẩm sắp giao khách hàng thật. Nghiên cứu bảo mật trước đó xếp hạng các gap theo mức độ ưu tiên;
phase này xử lý các mục Critical/High/Medium khả thi làm ngay trong 1 phiên (thuần code, không cần tài
khoản/dịch vụ bên ngoài).

## 1. IDOR audit (không sửa code)

Đã rà soát toàn bộ controller có path param `{id}` trong `modules/user`, `modules/property`,
`modules/booking`, `modules/media`. Kết quả: ownership check đã tồn tại và hoạt động đúng ở tầng service:
- `PropertyService.findOwnedProperty()` — so sánh `property.broker.id == principal.id`
- `BookingService.updateStatusForBrokerOwner()` — so sánh property sở hữu qua `findIdsByBrokerId`
- `MediaService.requireOwnedProperty()` — cùng pattern

Không phát hiện endpoint nào thiếu ownership check. Không cần sửa code cho mục này — chỉ ghi nhận kết quả
audit vào spec này làm bằng chứng đã kiểm tra.

## 2. SQL injection check (không sửa code)

`PropertySearchRepositoryImpl` build native query động nhưng dùng named parameter binding
(`.setParameter("status", ...)`, `.setParameter("query", ...)`) cho mọi giá trị người dùng nhập — không có
string concatenation nào chứa input trực tiếp vào SQL. Đã an toàn, không cần sửa.

## 3. Đổi 403 → 404 cho ownership-mismatch (tránh resource enumeration)

Khi user cố truy cập resource không thuộc sở hữu của mình, hệ thống hiện trả `403 FORBIDDEN` kèm message
nghiệp vụ cụ thể — điều này tiết lộ resource đó **tồn tại** (khác với 404 "không tồn tại"), cho phép
attacker dò được ID hợp lệ dù không truy cập được nội dung.

**3 vị trí cần sửa** (giữ nguyên message dùng cho case "không tồn tại" thật, chỉ đổi status code cho case
ownership-mismatch để 2 case không phân biệt được từ phía client):

| File:dòng | Hiện tại | Sau khi sửa |
|---|---|---|
| `PropertyService.java:163` | `FORBIDDEN, "Property belongs to another broker"` | `NOT_FOUND, "Property not found"` |
| `BookingService.java:120` | `FORBIDDEN, "Not your appointment"` | `NOT_FOUND, "Appointment not found"` |
| `MediaService.java:120` | `FORBIDDEN, "Property belongs to another broker"` | `NOT_FOUND, "Property not found"` |

**Không đổi** các chỗ 403 do thiếu role (`PropertyService.java:152`, `MediaService.java:111` — "Broker role
is required") — đây là role check hợp lệ, không phải ownership leak, giữ nguyên 403.

## 4. Rate-limit theo account (bổ sung, không thay thế rate-limit theo IP)

`AuthRateLimitFilter` hiện chỉ giới hạn 10 request/phút **theo IP** cho `/auth/login` — không chặn được
credential-stuffing dùng nhiều IP khác nhau nhắm cùng 1 tài khoản.

Thêm check mới trong `AuthService.login()` (business logic layer, vì filter chưa parse được body):
- Trước khi gọi `auth.authenticate(...)`, gọi `rateLimiter.tryAcquire("login-account:" + normalizedEmail, 5, Duration.ofMinutes(15))`.
- Nếu vượt giới hạn → `ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.")`.
- Tái dùng interface `RateLimiter` đã có (`RedisRateLimiter`/`InMemoryRateLimiter`, tuỳ profile) — không cần
  hạ tầng mới.
- Không reset counter khi login thành công (giữ đơn giản — cửa sổ 15 phút tự hết hạn qua TTL Redis).

## 5. Migrate BCrypt → Argon2id (giữ tương thích ngược)

**Vấn đề**: `SecurityConfig.passwordEncoder()` hiện trả thẳng `new BCryptPasswordEncoder()` — strength mặc
định (10), không có prefix `{id}` trên hash lưu trong DB.

**Thiết kế**:
1. Thêm Bouncy Castle (`org.bouncycastle:bcprov-jdk18on`, bản mới nhất tương thích Java 25) vào `pom.xml`
   — cần thiết cho `Argon2PasswordEncoder`.
2. Đổi bean `passwordEncoder()` thành `DelegatingPasswordEncoder`:
   - Encode mới (broker mới, đổi mật khẩu) → Argon2id qua `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()`
     (tham số mặc định của Spring Security — đã theo khuyến nghị OWASP, không tự chọn tham số tay).
   - `setDefaultPasswordEncoderForMatches(bcryptEncoder)` — để `.matches()` verify được các hash BCrypt cũ
     trong DB (không có prefix `{id}`, vì trước đây dùng thẳng `BCryptPasswordEncoder` không bọc
     `DelegatingPasswordEncoder`).
3. **Tự động nâng cấp hash khi login thành công** (không cần script migrate riêng):
   - `JpaUserDetailsService` implement thêm interface `UserDetailsPasswordService`, method
     `updatePassword(UserDetails, String newPassword)` — tìm user theo email, cập nhật `passwordHash`, save.
   - `SecurityConfig.authenticationProvider()` gọi thêm
     `provider.setUserDetailsPasswordService(userDetailsService)` — Spring Security tự phát hiện hash cũ
     encoding lỗi thời sau khi verify thành công và gọi `updatePassword` để nâng cấp, hoàn toàn transparent
     với `AuthService.login()`, không cần sửa gì ở đó.

## 6. Dependabot

Tạo `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "maven"
    directory: "/backend-springboot"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/frontend-react"
    schedule:
      interval: "weekly"
```

## Testing (TDD — RED trước cho mọi business logic)

- **3.** Test HTTP hiện có cho property/booking/media ownership-mismatch cần cập nhật assert status
  `404` thay vì `403` (tìm trong `PropertyHttpTest`, `BookingHttpTest`, test media nếu có).
- **4.** Test mới trong `AuthServiceTest`: login sai 6 lần liên tiếp với cùng email (IP khác nhau nếu test
  cho phép giả lập) → lần thứ 6 trả `429`, dùng `InMemoryRateLimiter` cho test.
- **5.** Test mới: `passwordEncoder().encode(...)` cho ra hash có prefix `{argon2}`; `passwordEncoder().matches(raw, legacyBcryptHashKhôngPrefix)` vẫn trả `true`; test `updatePassword` được gọi sau khi login thành công với hash cũ (verify qua `UserRepository` mock hoặc Testcontainers).
- **6.** Không cần test (config file thuần, không phải business logic).

## Ngoài phạm vi (deferred)

- Cloudflare (1.4) — chờ domain từ Growth-tier deploy plan.
- JWT refresh token (1.7) — spec riêng, phức tạp hơn (rotation, storage, sửa frontend).

## Critical Files

- `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/media/MediaService.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java`
- `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java`
- `backend-springboot/pom.xml`
- `.github/dependabot.yml` (mới)
