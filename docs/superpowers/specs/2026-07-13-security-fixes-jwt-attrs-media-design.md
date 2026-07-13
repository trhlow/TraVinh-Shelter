# Security fixes: JWT revocation on reset, attributes size cap, video signature check — Design

**Ngày**: 2026-07-13
**Branch**: `devlong`
**Phạm vi**: Backend only (`backend-springboot`). 3 fix độc lập, phát hiện qua audit bảo mật toàn backend
(session trước): 1 HIGH + 2 MEDIUM. Không đụng Cloudflare/JWT refresh token/Argon2 migration — các mục đó
thuộc spec khác (`2026-07-11-security-hardening-phase1-design.md`, đang song song, không chồng lấn).

## 1. HIGH — Đặt lại mật khẩu qua OTP không thu hồi session cũ

### Bối cảnh

`PasswordResetService.resetPassword()` (`PasswordResetService.java:67-80`) đổi hash mật khẩu nhưng không
thu hồi bất kỳ JWT nào đang tồn tại. Nếu attacker đã có 1 JWT bị lộ (session hijack, token log leak...), JWT
đó vẫn dùng được bình thường cho đến khi hết hạn tự nhiên — kể cả sau khi chủ tài khoản thật đã "khôi phục"
qua OTP. Đây chính xác là kịch bản mà tính năng forgot-password cần chặn (account recovery sau khi nghi ngờ
bị chiếm quyền), nhưng hiện không có tác dụng đó.

So sánh: `UserProfileService.changePassword()` (`UserProfileService.java:83-91`) có gọi
`jwt.revoke(currentToken)` sau khi đổi hash — nhưng đây là revoke theo **1 token cụ thể** (token đang dùng
để gọi chính request đó), phù hợp vì có session đang hoạt động. `resetPassword()` (flow forgot-password)
không có session/token nào để trỏ vào — không thể tái dùng cơ chế revoke-1-token hiện tại.

Cơ chế revoke hiện tại (`RevokedTokenStore`, `JwtService.revoke()`) hoạt động theo per-jti blacklist — muốn
"thu hồi mọi token của user X" bằng cơ chế này sẽ cần lưu toàn bộ jti đã phát hành cho từng user, tốn kém và
không cần thiết.

### Quyết định

Thêm mốc thời gian `passwordChangedAt` trên `User`. Mọi JWT có `iat` (issued-at) **trước** mốc này bị coi là
không hợp lệ — thu hồi toàn bộ session cũ chỉ bằng 1 so sánh timestamp, không cần theo dõi từng jti.

Chi phí thêm gần như bằng 0: `JwtAuthenticationFilter.doFilterInternal()` (`JwtAuthenticationFilter.java:31`)
đã gọi `userDetailsService.loadUserByUsername(email)` — tức đã truy vấn DB lấy `User` mới nhất **ở mọi
request** rồi, chỉ cần expose thêm 1 field có sẵn qua `UserPrincipal`, không thêm truy vấn DB nào mới.

**Chỉ 2 nơi bump `passwordChangedAt`**: `changePassword()` và `resetPassword()` — 2 chỗ người dùng chủ động
đổi mật khẩu thật. **Không** bump ở `JpaUserDetailsService.updatePassword()` (`JpaUserDetailsService.java:21-29`)
— đây là cơ chế tự động nâng cấp hash cũ (BCrypt) sang Argon2id một cách âm thầm sau khi verify thành công
(thuộc phase Argon2 migration đang làm song song), không phải hành động đổi mật khẩu thật. Nếu bump ở đây,
user sẽ bị đăng xuất khỏi mọi thiết bị khác chỉ vì đăng nhập 1 lần — hành vi bất ngờ, không liên quan đến
scope của fix này.

Vì `changePassword()` vẫn giữ nguyên `jwt.revoke(currentToken)` (thu hồi tức thì token hiện tại, không cần
chờ request tiếp theo), hành vi hiện tại cho flow đổi mật khẩu (đã đăng xuất session gọi request đó) không
đổi — `passwordChangedAt` chỉ bổ sung lớp phòng thủ cho các session **khác** (thiết bị khác) mà token cụ thể
không có trong tay để revoke riêng lẻ.

### Thay đổi

**1. Migration mới** `backend-springboot/src/main/resources/db/migration/V19__add_user_password_changed_at.sql`:

```sql
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

`DEFAULT now()` backfill toàn bộ user hiện có với 1 mốc hợp lệ (mọi token hiện hành có `iat` trước thời điểm
chạy migration này — an toàn, không có token nào bị vô hiệu hoá oan vì migration chạy 1 lần lúc deploy, thời
điểm đó không có ai đang có token với `iat` tương lai).

**2. `User.java`** (`User.java:56-64` khu vực field, `:96-98` khu vực method):

Thêm field:
```java
@Column(name = "password_changed_at", nullable = false)
private Instant passwordChangedAt;
```

Set trong `register()` (`User.java:69-80`, `createBroker()` gọi qua `register()` nên tự động kế thừa):
```java
user.passwordChangedAt = Instant.now();
```

Đổi `updatePasswordHash()` thành bump timestamp (dùng cho `changePassword()` và `resetPassword()`):
```java
public void updatePasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
    this.passwordChangedAt = Instant.now();
}
```

Thêm method riêng cho path nâng cấp hash tự động (Argon2 auto-upgrade), **không** bump timestamp:
```java
public void upgradePasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
}
```

Thêm getter: `public Instant getPasswordChangedAt() { return passwordChangedAt; }`

**3. `JpaUserDetailsService.updatePassword()`** (`JpaUserDetailsService.java:23-29`): đổi lời gọi
`entity.updatePasswordHash(newPassword)` → `entity.upgradePasswordHash(newPassword)`.

**4. `UserPrincipal.java`**: thêm field `Instant passwordChangedAt` vào record, set trong `from()`:
```java
public record UserPrincipal(UUID id, String email, String passwordHash, UserStatus status,
                            Instant passwordChangedAt, Collection<? extends GrantedAuthority> authorities)
        implements UserDetails {
    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.getStatus(),
                user.getPasswordChangedAt(), List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
    ...
}
```

**5. `JwtService.isTokenValid()`** (`JwtService.java:44-49`): thêm điều kiện `iat >= passwordChangedAt`:
```java
public boolean isTokenValid(String token, UserPrincipal principal) {
    Claims claims = parseClaims(token);
    return claims.getSubject().equals(principal.getUsername())
            && claims.getExpiration().after(new Date())
            && !revokedTokens.isRevoked(claims.getId())
            && !claims.getIssuedAt().toInstant().isBefore(principal.passwordChangedAt());
}
```

**6. `PasswordResetService.resetPassword()`** (`PasswordResetService.java:78`): không cần sửa gì thêm — gọi
`user.updatePasswordHash(...)` sẵn có đã tự bump `passwordChangedAt` qua thay đổi ở mục 2.

### Testing (TDD)

- `JwtServiceTest`: test mới — token với `iat` trước `passwordChangedAt` của principal bị `isTokenValid()`
  từ chối; token với `iat` sau (hoặc bằng) thì hợp lệ. Dùng `ReflectionTestUtils.setField` để set
  `passwordChangedAt` giả lập trên `User`/`UserPrincipal` cho từng kịch bản (không cần chờ `Thread.sleep`).
- `PasswordResetServiceTest`: test hiện có `resetPasswordWithCorrectOtpUpdatesPasswordHash` cần assert thêm
  `user.getPasswordChangedAt()` được cập nhật (không bằng giá trị khởi tạo ban đầu từ `User.register()`).
- `UserProfileServiceTest`: không cần test mới riêng — `changePassword()` đã có test hiện có kiểm tra
  `jwt.revoke()` được gọi; hành vi bump `passwordChangedAt` được cover gián tiếp qua `JwtServiceTest`.
- Chạy toàn bộ `mvn test` sau — xác nhận migration mới không phá test dùng Testcontainers (schema mới nullable
  = false với default, không cần seed lại data test).

---

## 2. MEDIUM — `Property.attributes` (JSONB) không giới hạn kích thước

### Bối cảnh

`CreatePropertyRequest.attributes` (`CreatePropertyRequest.java:16`) là `Map<String, Object>` không có bất
kỳ validation annotation nào. `PropertyService.normalizeAttributes()` (`PropertyService.java:185-190`) chỉ
copy nông (`new LinkedHashMap<>(attributes)`), không giới hạn số lượng entry hay độ dài giá trị. Client có
thể gửi map với hàng nghìn key, hoặc 1 giá trị string khổng lồ (vài chục MB) — không có gì chặn trước khi ghi
xuống cột `jsonb`.

`validAttributeKey()` (`PropertyService.java:192-197`) đã tồn tại — nhưng hiện chỉ dùng ở path tìm kiếm
(`criteriaFrom()`, dòng 130/133/136), kiểm tra format key bằng regex `^[A-Za-z0-9_.-]+$` (không phải
whitelist theo tập key cố định — theo đúng thiết kế JSONB tự do đã ghi trong `tech-defaults.md`, không thêm
whitelist cứng ở batch này).

### Quyết định

Không áp whitelist key cố định (giữ đúng thiết kế "JSONB tự do" đã có). Chỉ chặn 2 vector abuse cụ thể:
số lượng entry và độ dài giá trị string — đủ để chặn payload phình to bất thường mà không giới hạn các
attribute hợp lệ tương lai (schema thật hiện có ~10 key: ward, houseType, area, bedrooms, bathrooms,
direction, legal, image, description, transaction — cap 20 entry còn dư nhiều chỗ trống).

### Thay đổi

**`PropertyService.normalizeAttributes()`** (`PropertyService.java:185-190`), thay:

```java
private Map<String, Object> normalizeAttributes(Map<String, Object> attributes) {
    if (attributes == null) {
        return new LinkedHashMap<>();
    }
    return new LinkedHashMap<>(attributes);
}
```

thành:

```java
private static final int MAX_ATTRIBUTE_ENTRIES = 20;
private static final int MAX_ATTRIBUTE_VALUE_LENGTH = 10_000;

private Map<String, Object> normalizeAttributes(Map<String, Object> attributes) {
    if (attributes == null) {
        return new LinkedHashMap<>();
    }
    if (attributes.size() > MAX_ATTRIBUTE_ENTRIES) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Too many attribute entries (max " + MAX_ATTRIBUTE_ENTRIES + ")");
    }
    Map<String, Object> normalized = new LinkedHashMap<>();
    for (Map.Entry<String, Object> entry : attributes.entrySet()) {
        String key = validAttributeKey(entry.getKey());
        Object value = entry.getValue();
        if (value instanceof String stringValue && stringValue.length() > MAX_ATTRIBUTE_VALUE_LENGTH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Attribute value too long for key: " + key);
        }
        normalized.put(key, value);
    }
    return normalized;
}
```

(2 hằng số đặt cạnh các hằng số khác đầu class, ví dụ gần `ATTRIBUTE_KEY_PATTERN` dòng 36.)

`validAttributeKey()` trả `ResponseStatusException(BAD_REQUEST, "Invalid attribute filter key")` khi key
không khớp regex — tái dùng nguyên message hiện có (dùng chung cho cả path search lẫn path write, nhất quán).

### Testing (TDD)

Cần tìm/tạo test cho `PropertyService.create()`/`update()` (`PropertyHttpTest.java` — hiện chưa có test nào
cho `attributes`, xác nhận qua grep). Test mới:
- `attributes` với 21 entry → `400 Bad Request`.
- `attributes` với 1 giá trị string 10_001 ký tự → `400 Bad Request`.
- `attributes` với key chứa khoảng trắng/ký tự lạ (ví dụ `"bad key"`) → `400 Bad Request`.
- `attributes` hợp lệ (đúng như seed data hiện dùng, ví dụ `ward`, `houseType`...) → vẫn tạo thành công như
  cũ (regression test cho hành vi hiện có, đảm bảo không phá path tạo BĐS bình thường).

---

## 3. MEDIUM — Video upload không xác thực nội dung thật

### Bối cảnh

`LocalMediaStorage.detectKnownContentType()` (`LocalMediaStorage.java:134-152`) chỉ nhận diện chữ ký của 4
định dạng ảnh (JPEG/PNG/GIF/WEBP). Với video, hàm luôn trả `null` — và logic gọi nó
(`validateFileSignature()`, dòng 111-132) chỉ từ chối khi `detected != null && !detected.equals(contentType)`
(mâu thuẫn chữ ký đã nhận diện với content-type khai báo). Vì video không bao giờ được nhận diện, điều kiện
này luôn bỏ qua cho mọi upload khai `video/mp4`/`video/webm`/`video/quicktime` — file thật sự chứa gì cũng
lọt qua (trừ khi vô tình trùng 1 trong các prefix bị chặn cứng ở `looksLikeActiveContent()`, dòng 154-165,
như `<html`, `<script`, `%pdf`...).

Xác nhận qua đọc test hiện có: mọi test dùng `MockMultipartFile(..., "video/mp4", "video".getBytes())`
(`MediaHttpTest.java:231,252,276`, `MediaConcurrencyIntegrationTest.java:99`) — chuỗi `"video"` không phải
magic byte thật của bất kỳ định dạng nào, và test kỳ vọng upload **thành công**. Điều này tự nó minh chứng
lỗ hổng: hệ thống hiện tại chấp nhận bất kỳ nội dung nào được khai là video, kể cả không phải video thật.

### Quyết định

Chuyển model xác thực cho **video** từ blacklist (chỉ chặn khi phát hiện mâu thuẫn) sang whitelist bắt buộc
(chỉ chấp nhận khi chữ ký khớp đúng 1 trong các định dạng video được phép — từ chối nếu không nhận diện
được). Đây là fix thật sự đóng lỗ hổng, không chỉ thu hẹp một phần.

**Không đổi hành vi cho ảnh** — ngoài phạm vi báo cáo, giữ nguyên model blacklist hiện tại cho
`MediaType.IMAGE` để không phá vỡ các test ảnh hiện có (`"fake-png".getBytes()`...) không thuộc scope fix
này.

Do đó 4 chỗ dùng `"video".getBytes()` trong test hiện có (dòng nêu trên) sẽ **cần đổi sang byte thật** của
1 định dạng container hợp lệ (ftyp box tối thiểu) — nếu không đổi, các test này sẽ đỏ sau khi áp whitelist,
đúng như kỳ vọng (chúng đang test hành vi lỗ hổng, giờ hành vi đó bị chặn).

### Thay đổi

**1. `detectKnownContentType()`** (`LocalMediaStorage.java:134-152`): thêm nhận diện container ISO-BMFF
(dùng chung cho `video/mp4` và `video/quicktime` — cả 2 đều là container `ftyp` ở offset 4, không phân biệt
được brand chính xác chỉ từ 16 byte đầu mà không cần thiết cho mục đích chặn nội dung giả mạo) và EBML
(WebM):

```java
private String detectKnownContentType(byte[] header, int read) {
    // ... 4 nhánh ảnh hiện có giữ nguyên ...
    if (read >= 8 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) {
        return "video/mp4"; // ISO-BMFF container (ftyp box) — dùng chung mp4/mov, xem isVideoContainerMatch()
    }
    if (read >= 4 && header[0] == (byte) 0x1a && header[1] == 0x45
            && header[2] == (byte) 0xdf && header[3] == (byte) 0xa3) {
        return "video/webm";
    }
    return null;
}
```

**2. `validateFileSignature()`** (`LocalMediaStorage.java:111-132`): thêm nhánh whitelist bắt buộc riêng cho
video, đặt sau khối kiểm tra hiện có:

```java
private void validateFileSignature(MultipartFile file, String contentType) {
    // ... đọc header giữ nguyên như cũ ...

    String detected = detectKnownContentType(header, read);
    if (VIDEO_CONTENT_TYPES.contains(contentType)) {
        if (detected == null || !isVideoContainerMatch(detected, contentType)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Media content does not match the declared content type");
        }
        return;
    }
    if (detected != null && !detected.equals(contentType)) {
        throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Media content does not match the declared content type");
    }
    if (looksLikeActiveContent(header, read)) {
        throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "Media content does not match allowed upload types");
    }
}

private boolean isVideoContainerMatch(String detected, String declaredContentType) {
    if ("video/webm".equals(detected)) {
        return "video/webm".equals(declaredContentType);
    }
    // ftyp box (ISO-BMFF) — mp4 và quicktime dùng chung container, chấp nhận cả 2 khai báo
    return "video/mp4".equals(declaredContentType) || "video/quicktime".equals(declaredContentType);
}
```

(Nhánh ảnh phía dưới giữ nguyên y hệt logic cũ — không đổi hành vi cho ảnh.)

### Testing (TDD)

- **Sửa 4 fixture hiện có** dùng byte giả `"video".getBytes()` → đổi thành byte ftyp box hợp lệ tối thiểu,
  ví dụ:
  ```java
  byte[] MP4_HEADER = {0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
                        0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00};
  ```
  (offset 4-7 = `ftyp`, đủ để `detectKnownContentType` nhận diện — phần còn lại là padding hợp lệ bất kỳ.)
  Áp dụng cho `MediaHttpTest.java:231,252,276` và `MediaConcurrencyIntegrationTest.java:99`.
- Test mới trong `MediaHttpTest`: upload `video/mp4` với byte không khớp ftyp/EBML (ví dụ `"not-a-video".getBytes()`)
  → `415 Unsupported Media Type`.
- Test mới: upload khai `video/mp4` nhưng byte thật là ảnh PNG thật (magic byte PNG) → vẫn bị từ chối (giữ
  nguyên hành vi chặn mismatch, giờ qua nhánh whitelist).
- Test mới: upload `video/webm` với byte EBML header thật (`1A 45 DF A3` + padding) → thành công.
- Test hiện có cho ảnh (`"fake-png".getBytes()` ở dòng 111 và tương tự) — **không đổi**, phải vẫn pass
  nguyên trạng (xác nhận scope fix không lan sang ảnh).

## Ngoài phạm vi

- Không đụng JWT refresh token, Cloudflare, migrate BCrypt→Argon2, IDOR audit, 403→404, rate-limit theo
  account — thuộc `2026-07-11-security-hardening-phase1-design.md`, đang làm song song, không xung đột file.
- Không thêm whitelist key cố định cho `attributes` — giữ đúng thiết kế JSONB tự do hiện có.
- Không đổi model xác thực cho ảnh (`MediaType.IMAGE`) — chỉ video theo đúng finding gốc.
- Không thêm giới hạn kích thước file tổng thể (byte count) — đã có giới hạn khác ở tầng Spring
  (`multipart.max-file-size` nếu cấu hình) hoặc `V2__media_video_limit.sql`, ngoài phạm vi audit lần này.

## Critical Files

- `backend-springboot/src/main/resources/db/migration/V19__add_user_password_changed_at.sql` (mới)
- `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/UserPrincipal.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JwtService.java`
- `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java`
- `backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java`
- Tests: `JwtServiceTest.java`, `PasswordResetServiceTest.java`, `PropertyHttpTest.java`, `MediaHttpTest.java`,
  `MediaConcurrencyIntegrationTest.java`
