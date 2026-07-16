# MFA (Email OTP) cho tài khoản ADMIN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm MFA bắt buộc (Email OTP) cho đăng nhập tài khoản ADMIN, đóng gap ASVS L2 lớn nhất còn lại
— dựa trên spec đã duyệt tại `docs/superpowers/specs/2026-07-16-admin-mfa-otp-design.md`.

**Architecture:** `/auth/login` khi role=ADMIN không trả JWT ngay mà sinh+gửi OTP qua email, trả
`{mfaRequired: true}`; endpoint mới `/auth/login/verify-otp` xác minh mã và trả JWT thật. BROKER không
đổi hành vi. Tái dùng 100% hạ tầng OTP đã có (`OtpStore`, `EmailSender`, `RateLimiter`) từ
`PasswordResetService`.

**Tech Stack:** Spring Boot 4.0.5 / Java 25, React 19, JUnit 5 + Mockito + AssertJ, Vitest + Testing
Library.

## Global Constraints

- Test command backend: `JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test`
  chạy từ `backend-springboot/` (máy dev này có 2 JDK, `JAVA_HOME` mặc định trỏ JDK 21 — luôn set
  tường minh JDK 25 trong mọi lệnh `mvn`).
- Test command frontend: `cd frontend-react && npm test -- --run`.
- MFA chỉ áp dụng ADMIN, bắt buộc (không có cờ bật/tắt). BROKER không đổi hành vi.
- Commit message tiếng Anh, conventional commits, KHÔNG có dòng `Co-Authored-By`.
- Không tự ý mở rộng phạm vi ngoài spec (không làm TOTP, không thêm MFA cho BROKER).

---

## Task 1: `LoginMfaService` — sinh & xác minh OTP đăng nhập (self-contained, chưa nối vào login flow)

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/VerifyLoginOtpRequest.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/LoginMfaService.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/LoginMfaServiceTest.java`

**Interfaces:**
- Consumes: `OtpStore` (`generate(String key, Duration ttl)`, `verify(String key, String code)`),
  `RateLimiter` (`tryAcquire(String key, int limit, Duration window)`), `EmailSender`
  (`send(String to, String subject, String body)`), `JwtService.generateToken(User)`, `JwtProperties`
  (record field `expiration()` — kiểu `long`), `UserRepository.findByEmail(String)`,
  `AuthResponse.of(String token, long expiresIn, User user)`.
- Produces: `LoginMfaService.requestOtp(User user)` (void, ném `ResponseStatusException` 429 nếu vượt
  rate limit) và `LoginMfaService.verifyOtp(VerifyLoginOtpRequest request)` (trả `AuthResponse`, ném
  `ResponseStatusException` 429 hoặc 401) — Task 2 sẽ gọi 2 method này từ `AuthService`/`AuthController`.

- [ ] **Step 1: Tạo DTO `VerifyLoginOtpRequest`**

Tạo file `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/VerifyLoginOtpRequest.java`:

```java
package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyLoginOtpRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode
) {
}
```

- [ ] **Step 2: Viết test trước (RED) — `LoginMfaServiceTest`**

Tạo file `backend-springboot/src/test/java/com/travinh/realty/modules/auth/LoginMfaServiceTest.java`:

```java
package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.VerifyLoginOtpRequest;
import com.travinh.realty.modules.auth.security.InMemoryOtpStore;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserRole;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

class LoginMfaServiceTest {

    private UserRepository users;
    private OtpStore otpStore;
    private RateLimiter rateLimiter;
    private EmailSender emailSender;
    private JwtService jwt;
    private JwtProperties properties;
    private LoginMfaService service;

    @BeforeEach
    void setUp() {
        users = Mockito.mock(UserRepository.class);
        otpStore = new InMemoryOtpStore();
        rateLimiter = new InMemoryRateLimiter();
        emailSender = Mockito.mock(EmailSender.class);
        properties = new JwtProperties(
                "a-development-secret-that-is-at-least-thirty-two-characters-long", 86_400_000);
        jwt = new JwtService(properties);
        service = new LoginMfaService(users, otpStore, rateLimiter, emailSender, jwt, properties);
    }

    private User admin() {
        User user = User.register("admin", "admin@congtinland.vn",
                new BCryptPasswordEncoder(4).encode("irrelevant"), "Admin", "0900000000");
        ReflectionTestUtils.setField(user, "role", UserRole.ADMIN);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        return user;
    }

    @Test
    void requestOtpSendsEmailWithCode() {
        service.requestOtp(admin());

        verify(emailSender).send(eq("admin@congtinland.vn"), anyString(), anyString());
    }

    @Test
    void requestOtpIsRateLimitedAfterThreeRequests() {
        User admin = admin();
        for (int attempt = 0; attempt < 3; attempt++) {
            service.requestOtp(admin);
        }

        assertThatThrownBy(() -> service.requestOtp(admin))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void verifyOtpWithCorrectCodeReturnsAuthResponseWithJwt() {
        User admin = admin();
        when(users.findByEmail("admin@congtinland.vn")).thenReturn(Optional.of(admin));
        String code = otpStore.generate("login-mfa:admin@congtinland.vn", Duration.ofMinutes(5));

        AuthResponse response = service.verifyOtp(new VerifyLoginOtpRequest("admin@congtinland.vn", code));

        assertThat(response.email()).isEqualTo("admin@congtinland.vn");
        assertThat(response.role()).isEqualTo(UserRole.ADMIN);
        assertThat(response.accessToken()).isNotBlank();
    }

    @Test
    void verifyOtpWithWrongCodeReturnsUnauthorized() {
        otpStore.generate("login-mfa:admin@congtinland.vn", Duration.ofMinutes(5));

        assertThatThrownBy(() -> service.verifyOtp(
                new VerifyLoginOtpRequest("admin@congtinland.vn", "000000")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("401");
    }

    @Test
    void verifyOtpIsRateLimitedAfterFiveAttempts() {
        VerifyLoginOtpRequest request = new VerifyLoginOtpRequest("limited@congtinland.vn", "000000");
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.verifyOtp(request)).isInstanceOf(ResponseStatusException.class);
        }

        assertThatThrownBy(() -> service.verifyOtp(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
        verify(users, never()).findByEmail(anyString());
    }
}
```

- [ ] **Step 3: Chạy test, xác nhận FAIL (lỗi biên dịch — `LoginMfaService` chưa tồn tại)**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test-compile
```

Expected: FAIL — `cannot find symbol: class LoginMfaService`.

- [ ] **Step 4: Viết `LoginMfaService`**

Tạo file `backend-springboot/src/main/java/com/travinh/realty/modules/auth/LoginMfaService.java`:

```java
package com.travinh.realty.modules.auth;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.VerifyLoginOtpRequest;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LoginMfaService {
    private static final Logger log = LoggerFactory.getLogger(LoginMfaService.class);
    private static final Duration OTP_TTL = Duration.ofMinutes(5);
    private static final int REQUEST_LIMIT = 3;
    private static final Duration REQUEST_WINDOW = Duration.ofMinutes(15);
    private static final int VERIFY_LIMIT = 5;
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(10);
    private static final String INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private final UserRepository users;
    private final OtpStore otpStore;
    private final RateLimiter rateLimiter;
    private final EmailSender emailSender;
    private final JwtService jwt;
    private final JwtProperties properties;

    public LoginMfaService(UserRepository users, OtpStore otpStore, RateLimiter rateLimiter,
                           EmailSender emailSender, JwtService jwt, JwtProperties properties) {
        this.users = users;
        this.otpStore = otpStore;
        this.rateLimiter = rateLimiter;
        this.emailSender = emailSender;
        this.jwt = jwt;
        this.properties = properties;
    }

    public void requestOtp(User user) {
        String email = user.getEmail();
        if (!rateLimiter.tryAcquire("login-mfa-request:" + email, REQUEST_LIMIT, REQUEST_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
        }
        String code = otpStore.generate("login-mfa:" + email, OTP_TTL);
        emailSender.send(email, "Mã xác minh đăng nhập - Công Tín Land",
                "Mã xác minh đăng nhập của bạn là: " + code
                        + ". Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.");
        log.info("Login MFA OTP sent for email={}", email);
    }

    @Transactional(readOnly = true)
    public AuthResponse verifyOtp(VerifyLoginOtpRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("login-mfa-verify:" + email, VERIFY_LIMIT, VERIFY_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
        }
        if (!otpStore.verify("login-mfa:" + email, request.otpCode())) {
            log.warn("Login MFA verification failed for email={}", email);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_OTP_MESSAGE);
        }
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_OTP_MESSAGE));
        log.info("Login MFA verified successfully for email={}", email);
        return AuthResponse.of(jwt.generateToken(user), properties.expiration(), user);
    }
}
```

- [ ] **Step 5: Chạy lại test, xác nhận PASS**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=LoginMfaServiceTest
```

Expected: 5/5 test PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/VerifyLoginOtpRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/LoginMfaService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/LoginMfaServiceTest.java
git commit -m "feat(auth): add LoginMfaService for admin login OTP request/verify"
```

---

## Task 2: Nối MFA vào luồng đăng nhập — `AuthService`, `AuthController`, `SecurityConfig`, `AuthRateLimitFilter`

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/LoginResponse.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java:69`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java`
- Modify (fix breaking change): `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`
- Modify (fix breaking change): `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceRehashIntegrationTest.java`
- Modify (fix breaking change + new tests): `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java`
- Modify (new test): `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilterTest.java`

**Interfaces:**
- Consumes: `LoginMfaService.requestOtp(User)`, `LoginMfaService.verifyOtp(VerifyLoginOtpRequest)` từ
  Task 1.
- Produces: `AuthService.login(LoginRequest)` giờ trả `LoginResponse` (không phải `AuthResponse` nữa).
  `POST /auth/login/verify-otp` endpoint mới, request body `VerifyLoginOtpRequest`, trả `AuthResponse`.

**Lưu ý quan trọng:** đổi kiểu trả về của `AuthService.login()` từ `AuthResponse` sang `LoginResponse` là
**breaking change nội bộ** — 3 file test hiện có (`AuthServiceTest`, `AuthServiceRehashIntegrationTest`,
`SecurityHttpTest`) sẽ vỡ biên dịch nếu không sửa cùng lúc trong task này. Không tách các fix đó ra task
khác.

- [ ] **Step 1: Viết test trước (RED) — thêm case mới vào `AuthServiceTest`**

Sửa `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`: thêm import
và 2 test case mới. Thêm vào đầu file (sau import `UserRepository`):

```java
import com.travinh.realty.modules.user.model.UserRole;
```

Thêm cuối class (trước dấu `}` đóng), và **sửa cả 4 lời gọi `new AuthService(...)` hiện có** để thêm
tham số thứ 7 `Mockito.mock(LoginMfaService.class)`:

Có 4 lời gọi `new AuthService(...)` trong file cần sửa (tìm bằng grep `new AuthService(` — mỗi lời gọi
xuất hiện đúng 1 lần với chuỗi ký tự sau, dùng để định vị chính xác):

**Lời gọi 1** (trong `loginPropagatesInvalidCredentialsForTheHttpErrorHandler`), đổi:
```java
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties, new InMemoryRateLimiter());
```
thành:
```java
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), Mockito.mock(LoginMfaService.class));
```

**Lời gọi 2** (trong `loginIsRateLimitedPerAccountAfterFiveFailuresRegardlessOfCaller`), đổi:
```java
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties, rateLimiter);
```
thành:
```java
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                rateLimiter, Mockito.mock(LoginMfaService.class));
```

**Lời gọi 3** (trong `loginDoesNotCountSuccessfulAttemptsTowardTheAccountRateLimit`), đổi:
```java
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter());
```
thành:
```java
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), Mockito.mock(LoginMfaService.class));
```

**Lời gọi 4** (trong `loginFailureIsLoggedAsSecurityEvent`), đổi:
```java
            AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                    new InMemoryRateLimiter());
```
thành:
```java
            AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                    new InMemoryRateLimiter(), Mockito.mock(LoginMfaService.class));
```

Thêm import `import org.mockito.Mockito;` ở đầu file nếu chưa có (file đã dùng `Mockito` gián tiếp qua
`@Mock`/`MockitoExtension`, nhưng gọi `Mockito.mock(...)` tường minh cần import class `org.mockito.Mockito`
— kiểm tra khối import hiện có trước khi thêm trùng).

Thêm 2 test case mới cuối class:

```java
    @Test
    void adminLoginReturnsMfaChallengeWithoutIssuingJwt() {
        User admin = User.register("admin", "admin@example.com", encoder.encode("correct-password"),
                "Admin", "0900000000");
        ReflectionTestUtils.setField(admin, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(admin, "role", UserRole.ADMIN);
        when(users.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        UserPrincipal principal = UserPrincipal.from(admin);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        LoginMfaService mfaService = Mockito.mock(LoginMfaService.class);
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), mfaService);

        LoginResponse response = service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "admin@example.com", "correct-password"));

        assertThat(response.mfaRequired()).isTrue();
        assertThat(response.accessToken()).isNull();
        verify(mfaService).requestOtp(admin);
    }

    @Test
    void brokerLoginReturnsJwtDirectlyWithoutMfaChallenge() {
        User broker = User.register("broker", "broker@example.com", encoder.encode("correct-password"),
                "Broker", "0900000000");
        ReflectionTestUtils.setField(broker, "id", UUID.randomUUID());
        when(users.findByEmail("broker@example.com")).thenReturn(Optional.of(broker));
        UserPrincipal principal = UserPrincipal.from(broker);
        when(authenticationManager.authenticate(any()))
                .thenReturn(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        LoginMfaService mfaService = Mockito.mock(LoginMfaService.class);
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                new InMemoryRateLimiter(), mfaService);

        LoginResponse response = service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "broker@example.com", "correct-password"));

        assertThat(response.mfaRequired()).isFalse();
        assertThat(response.accessToken()).isNotBlank();
        verifyNoInteractions(mfaService);
    }
```

Thêm import còn thiếu vào đầu file: `import static org.mockito.Mockito.verifyNoInteractions;` (nếu chưa
có), `import com.travinh.realty.modules.auth.dto.LoginResponse;`.

- [ ] **Step 2: Sửa `AuthServiceRehashIntegrationTest.java` — đổi kiểu khai báo**

Trong `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceRehashIntegrationTest.java`,
đổi import:
```java
import com.travinh.realty.modules.auth.dto.AuthResponse;
```
thành:
```java
import com.travinh.realty.modules.auth.dto.LoginResponse;
```
Và đổi dòng khai báo biến:
```java
        AuthResponse response = authService.login(new LoginRequest(email, PLAINTEXT_PASSWORD));
```
thành:
```java
        LoginResponse response = authService.login(new LoginRequest(email, PLAINTEXT_PASSWORD));
```

- [ ] **Step 3: Chạy test, xác nhận FAIL (lỗi biên dịch — `LoginResponse` chưa tồn tại, `AuthService`
      constructor chưa nhận tham số thứ 7)**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test-compile
```

Expected: FAIL — nhiều lỗi `cannot find symbol: class LoginResponse` và
`constructor AuthService cannot be applied to given types`.

- [ ] **Step 4: Tạo `LoginResponse`**

Tạo file `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/LoginResponse.java`:

```java
package com.travinh.realty.modules.auth.dto;

import com.travinh.realty.modules.user.model.UserRole;
import java.util.UUID;

public record LoginResponse(String accessToken, String tokenType, Long expiresIn,
                            UUID userId, String email, UserRole role, boolean mfaRequired) {
    public static LoginResponse authenticated(AuthResponse auth) {
        return new LoginResponse(auth.accessToken(), auth.tokenType(), auth.expiresIn(),
                auth.userId(), auth.email(), auth.role(), false);
    }

    public static LoginResponse mfaChallenge() {
        return new LoginResponse(null, null, null, null, null, null, true);
    }
}
```

- [ ] **Step 5: Sửa `AuthService.java`**

Thêm import (sau `import com.travinh.realty.modules.auth.dto.AuthResponse;` nếu có, hoặc đầu khối
import hiện có):
```java
import com.travinh.realty.modules.auth.dto.LoginResponse;
import com.travinh.realty.modules.user.model.UserRole;
```

Sửa field/constructor — thêm field `mfaService` và tham số thứ 7:
```java
    private final UserRepository users; private final PasswordEncoder encoder; private final AuthenticationManager auth;
    private final JwtService jwt; private final JwtProperties properties; private final RateLimiter rateLimiter;
    private final LoginMfaService mfaService;
    public AuthService(UserRepository users, PasswordEncoder encoder, AuthenticationManager auth, JwtService jwt,
                       JwtProperties properties, RateLimiter rateLimiter, LoginMfaService mfaService) {
        this.users = users; this.encoder = encoder; this.auth = auth; this.jwt = jwt; this.properties = properties;
        this.rateLimiter = rateLimiter; this.mfaService = mfaService;
    }
```

Sửa method `login()` — đổi kiểu trả về và thêm nhánh ADMIN:
```java
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        Authentication authentication;
        try {
            authentication = auth.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException exception) {
            log.warn("Login failed for email={}", email);
            if (!rateLimiter.tryAcquire("login-account:" + email, MAX_FAILED_LOGINS_PER_ACCOUNT, ACCOUNT_LOCKOUT_WINDOW)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
            }
            throw exception;
        }
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = users.findByEmail(principal.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));
        if (user.getRole() == UserRole.ADMIN) {
            mfaService.requestOtp(user);
            return LoginResponse.mfaChallenge();
        }
        return LoginResponse.authenticated(AuthResponse.of(jwt.generateToken(user), properties.expiration(), user));
    }
```

(method `logout()` không đổi.)

- [ ] **Step 6: Sửa `AuthController.java`**

Thêm import:
```java
import com.travinh.realty.modules.auth.dto.LoginResponse;
import com.travinh.realty.modules.auth.dto.VerifyLoginOtpRequest;
```

Thêm field + constructor param `LoginMfaService`:
```java
    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final LoginMfaService loginMfaService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService,
                          LoginMfaService loginMfaService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.loginMfaService = loginMfaService;
    }
```

Sửa method `login()` — đổi kiểu trả về:
```java
    @PostMapping("/login")
    @Operation(summary = "Authenticate and return a JWT, or an MFA challenge for ADMIN accounts")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) { return authService.login(request); }
```

Thêm endpoint mới (ngay sau `login()`):
```java
    @PostMapping("/login/verify-otp")
    @Operation(summary = "Verify the MFA OTP for an ADMIN login challenge and return a JWT")
    public AuthResponse verifyLoginOtp(@Valid @RequestBody VerifyLoginOtpRequest request) {
        return loginMfaService.verifyOtp(request);
    }
```

- [ ] **Step 7: Sửa `SecurityConfig.java:69` — permitAll cho endpoint mới**

Đổi dòng 69:
```java
                                "/auth/login", "/auth/forgot-password", "/auth/reset-password", "/error").permitAll()
```
thành:
```java
                                "/auth/login", "/auth/login/verify-otp", "/auth/forgot-password", "/auth/reset-password", "/error").permitAll()
```

- [ ] **Step 8: Sửa `AuthRateLimitFilter.java` — thêm nhóm rate-limit riêng cho endpoint mới**

Trong method `rateLimitGroup(String path)`, thêm nhánh mới (sau nhánh `/auth/login`):
```java
        if ("/auth/login/verify-otp".equals(path)) {
            return "/auth/login/verify-otp";
        }
```

Trong method `rateLimitedGroups()`, thêm dòng mới (sau dòng `/auth/login`):
```java
        groups.put("/auth/login/verify-otp", new RateLimitRule(HttpMethod.POST, DEFAULT_LIMIT));
```

- [ ] **Step 9: Sửa `SecurityHttpTest.java` — thêm mock bean + test mới cho endpoint verify-otp**

Thêm import và field mock (sau `@MockitoBean private JpaUserDetailsService userDetailsService;`):
```java
    @MockitoBean private LoginMfaService loginMfaService;
```
(thêm import `com.travinh.realty.modules.auth.LoginMfaService;` ở đầu file nếu package khác — file này
nằm ở `modules.auth.security`, nên cần import đầy đủ `com.travinh.realty.modules.auth.LoginMfaService`.)

Thêm import cho `AuthResponse` nếu chưa có: `import com.travinh.realty.modules.auth.dto.AuthResponse;`
và `import java.util.UUID;` (đã có sẵn), `import com.travinh.realty.modules.user.model.UserRole;`.

Thêm 2 test case mới (cuối class, trước `private User user(...)`):
```java
    @Test
    void verifyLoginOtpWithValidCodeReturnsJwt() throws Exception {
        when(loginMfaService.verifyOtp(any())).thenReturn(new AuthResponse(
                "signed-jwt-token", "Bearer", 86_400_000L, UUID.randomUUID(), "admin@example.com", UserRole.ADMIN));

        mockMvc.perform(post("/auth/login/verify-otp").contentType("application/json")
                        .content("{\"email\":\"admin@example.com\",\"otpCode\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("signed-jwt-token"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void verifyLoginOtpWithInvalidCodeReturnsUnauthorized() throws Exception {
        when(loginMfaService.verifyOtp(any())).thenThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.UNAUTHORIZED, "Mã OTP không hợp lệ hoặc đã hết hạn"));

        mockMvc.perform(post("/auth/login/verify-otp").contentType("application/json")
                        .content("{\"email\":\"admin@example.com\",\"otpCode\":\"000000\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Mã OTP không hợp lệ hoặc đã hết hạn"));
    }
```

(cần thêm `import static org.mockito.ArgumentMatchers.any;` nếu chưa có ở đầu file — file đã import
`any` cho các test khác, kiểm tra trước khi thêm trùng.)

- [ ] **Step 10: Thêm test rate-limit cho endpoint mới trong `AuthRateLimitFilterTest.java`**

Thêm test mới cuối class (trước dấu `}` đóng), mirror chính xác
`rateLimitsResetPasswordAfterTenRequestsPerMinutePerIp`:

```java
    @Test
    void rateLimitsLoginVerifyOtpAfterTenRequestsPerMinutePerIp() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(new ObjectMapper(), new InMemoryRateLimiter(),
                new ClientIpResolver(List.of()));
        FilterChain chain = (request, response) -> {};

        for (int i = 0; i < 10; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login/verify-otp");
            request.setRemoteAddr("203.0.113.14");
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilterInternal(request, response, chain);
            assertThat(response.getStatus()).isEqualTo(200);
        }

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/auth/login/verify-otp");
        request.setRemoteAddr("203.0.113.14");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
    }
```

- [ ] **Step 11: Chạy lại toàn bộ test, xác nhận PASS**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
```

Expected: tất cả test PASS, không có lỗi biên dịch, không có regression ở test cũ (đặc biệt
`repeatedAuthAttemptsAreRateLimited`, `rateLimitsForgotPasswordAfterTenRequestsPerMinutePerIp` trong 2
file vừa sửa vẫn phải xanh — chúng test path khác, không bị ảnh hưởng bởi nhóm rate-limit mới).

- [ ] **Step 12: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/LoginResponse.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java \
        backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceRehashIntegrationTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilterTest.java
git commit -m "feat(auth): require MFA OTP for admin login via /auth/login/verify-otp"
```

---

## Task 3: Frontend — `api.js` + `LoginPage.jsx` (form nhập OTP cho ADMIN)

**Files:**
- Modify: `frontend-react/src/services/api.js`
- Modify: `frontend-react/src/utils/validation.js`
- Modify: `frontend-react/src/pages/LoginPage.jsx`
- Modify: `frontend-react/src/pages/LoginPage.test.jsx`

**Interfaces:**
- Consumes: `POST /auth/login` (giờ có thể trả `{mfaRequired: true}` không kèm `accessToken`),
  `POST /auth/login/verify-otp` từ Task 2.
- Produces: `verifyLoginOtp(email, otpCode)` trong `api.js` (trả object shape giống `login()` khi thành
  công: `{accessToken, tokenType, expiresIn, userId, email, role}`).

- [ ] **Step 1: Viết test trước (RED) — thêm case mới vào `LoginPage.test.jsx`**

Sửa `frontend-react/src/pages/LoginPage.test.jsx` — thêm `verifyLoginOtp` vào mock hoisted và
`vi.mock('../services/api.js', ...)`:

```javascript
const { requestPasswordReset, confirmPasswordReset, login, verifyLoginOtp, fetchCurrentUser } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  login: vi.fn(),
  verifyLoginOtp: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

vi.mock('../services/api.js', () => ({
  login,
  fetchCurrentUser,
  requestPasswordReset,
  confirmPasswordReset,
  verifyLoginOtp,
}));
```

(đây thay thế toàn bộ khối `vi.hoisted`/`vi.mock` hiện có ở đầu file — trước đó `login`/`fetchCurrentUser`
là `vi.fn()` khai trực tiếp trong `vi.mock`, giờ chuyển vào `vi.hoisted` để test có thể gọi
`login.mockResolvedValue(...)` từ bên ngoài.)

Thêm test mới cuối file:

```javascript
test('admin login with mfaRequired shows the OTP step instead of logging in immediately', async () => {
  login.mockResolvedValue({ mfaRequired: true });
  render(<LoginPage onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(login).toHaveBeenCalledWith('admin@congtinland.vn', 'password123'));
  expect(await screen.findByLabelText(/Mã OTP/i)).toBeInTheDocument();
  expect(fetchCurrentUser).not.toHaveBeenCalled();
});

test('submitting a valid OTP after mfaRequired completes login and redirects to admin', async () => {
  const onLogin = vi.fn();
  login.mockResolvedValue({ mfaRequired: true });
  verifyLoginOtp.mockResolvedValue({
    accessToken: 'jwt-token', tokenType: 'Bearer', expiresIn: 86400,
    userId: 'u1', email: 'admin@congtinland.vn', role: 'ADMIN',
  });
  fetchCurrentUser.mockResolvedValue({ fullName: 'Admin User', role: 'ADMIN' });
  render(<LoginPage onLogin={onLogin} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByLabelText(/Mã OTP/i);

  fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

  await waitFor(() => expect(verifyLoginOtp).toHaveBeenCalledWith('admin@congtinland.vn', '123456'));
  await waitFor(() => expect(onLogin).toHaveBeenCalled());
});

test('submitting a wrong OTP shows the server error and stays on the mfa step', async () => {
  login.mockResolvedValue({ mfaRequired: true });
  verifyLoginOtp.mockRejectedValue(new Error('Mã OTP không hợp lệ hoặc đã hết hạn'));
  render(<LoginPage onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByLabelText(/Mã OTP/i);

  fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

  expect(await screen.findByText('Mã OTP không hợp lệ hoặc đã hết hạn')).toBeInTheDocument();
  expect(screen.getByLabelText(/Mã OTP/i)).toBeInTheDocument();
});

test('broker login without mfaRequired logs in immediately, unaffected by the mfa step', async () => {
  const onLogin = vi.fn();
  login.mockResolvedValue({
    accessToken: 'jwt-token', tokenType: 'Bearer', expiresIn: 86400,
    userId: 'u2', email: 'broker@congtinland.vn', role: 'BROKER',
  });
  fetchCurrentUser.mockResolvedValue({ fullName: 'Broker User', role: 'BROKER' });
  render(<LoginPage onLogin={onLogin} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'broker@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(onLogin).toHaveBeenCalled());
  expect(verifyLoginOtp).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

```bash
cd "d:/TraVinh Shelter/frontend-react"
npx vitest run src/pages/LoginPage.test.jsx
```

Expected: FAIL — `verifyLoginOtp` không tồn tại trong `api.js` (import error), hoặc các test mới fail
vì `LoginPage.jsx` chưa xử lý `mfaRequired`.

- [ ] **Step 3: Thêm `verifyLoginOtp` vào `api.js`, sửa `login()` để trả nguyên response**

Trong `frontend-react/src/services/api.js`, sửa `login()` (hiện tại dòng 9-18):

```javascript
export async function login(email, password) {
  if (USE_MOCK_API) {
    const role = email.includes('admin') ? 'ADMIN' : 'BROKER';
    if (role === 'ADMIN') {
      return delay({ mfaRequired: true }, 150);
    }
    return delay({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 3600, email, role, userId: role.toLowerCase(), mfaRequired: false });
  }
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function verifyLoginOtp(email, otpCode) {
  if (USE_MOCK_API) {
    if (otpCode !== '123456') {
      await delay(null, 150);
      throw new Error('Mã OTP không hợp lệ hoặc đã hết hạn');
    }
    const role = 'ADMIN';
    return delay({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 3600, email, role, userId: role.toLowerCase() });
  }
  return request('/auth/login/verify-otp', {
    method: 'POST',
    body: { email, otpCode },
  });
}
```

- [ ] **Step 4: Thêm validate cho mode `'mfa'` trong `validation.js`**

Trong `frontend-react/src/utils/validation.js`, sửa `validateLoginForm` — thêm nhánh `mode === 'mfa'`
(chèn sau nhánh `mode === 'forgot'`, trước nhánh `mode === 'reset'`):

```javascript
  if (mode === 'mfa') {
    if (!/^\d{6}$/.test(values.otpCode || '')) {
      errors.otpCode = 'Mã OTP phải gồm 6 chữ số.';
    }
    return errors;
  }
```

- [ ] **Step 5: Sửa `LoginPage.jsx` — thêm mode `'mfa'`**

Thêm import `verifyLoginOtp` (dòng 3):
```javascript
import { confirmPasswordReset, fetchCurrentUser, login, requestPasswordReset, verifyLoginOtp } from '../services/api.js';
```

Thêm entry `mfa` vào `MODE_COPY` (sau `login`, trước `forgot`):
```javascript
  mfa: {
    title: 'Xác minh 2 bước',
    subtitle: 'Nhập mã OTP đã gửi đến email của bạn để hoàn tất đăng nhập.',
    button: 'Xác nhận',
    loading: 'Đang xác minh',
  },
```

Thêm hàm dùng chung để hoàn tất session (đặt trước `handleSubmit`, bên trong component):
```javascript
  async function completeLogin(auth) {
    const profile = await fetchCurrentUser(auth.accessToken).catch(() => ({}));
    const nextSession = createSession(auth, profile);
    onLogin(nextSession);
    window.location.hash = nextSession.role === 'ADMIN' ? '#/admin' : nextSession.role === 'BROKER' ? '#/broker/dashboard' : '#/';
  }
```

Sửa `handleSubmit` — thêm nhánh `mode === 'mfa'` (chèn trước nhánh cuối cùng hiện có, sau khối
`if (mode === 'reset') { ... return; }`), và sửa nhánh login mặc định để check `mfaRequired`:

```javascript
    if (mode === 'mfa') {
      setSubmitting(true);
      try {
        const auth = await verifyLoginOtp(values.email, values.otpCode);
        await completeLogin(auth);
      } catch (exception) {
        setServerError(exception.message || 'Xác minh OTP thất bại.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const auth = await login(values.email, values.password);
      if (auth.mfaRequired) {
        setMode('mfa');
        return;
      }
      await completeLogin(auth);
    } catch (exception) {
      setServerError(exception.message || 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
```

(khối `try/catch/finally` login cũ — thay thế toàn bộ, xoá 5 dòng cũ
`const auth = await login(...); const profile = await fetchCurrentUser(...); const nextSession =
createSession(...); onLogin(nextSession); window.location.hash = ...;` bằng lời gọi `completeLogin(auth)`
ở trên.)

Sửa JSX — thêm điều kiện hiện field `otpCode` cho mode `'mfa'` (tìm khối `{isReset && (...)}` chứa field
`otpCode`, thêm điều kiện tương tự cho `mfa` NGAY TRƯỚC khối đó):

```jsx
          {mode === 'mfa' && (
            <Field error={errors.otpCode} id="otpCode" label="Mã OTP">
              <input
                className="input"
                id="otpCode"
                inputMode="numeric"
                maxLength={6}
                name="otpCode"
                placeholder="Nhập mã 6 số"
                value={values.otpCode}
                onChange={(event) => updateValue('otpCode', event.target.value)}
              />
            </Field>
          )}
```

Sửa điều kiện field email/password hiện có để KHÔNG hiện ở mode `'mfa'` (email không cần sửa vì mode
`'mfa'` không hiện lại field email — chỉ hiện OTP). Sửa điều kiện render field `password` (tìm
`{!isForgot && !isReset && (` bọc field Mật khẩu) thành:
```jsx
          {!isForgot && !isReset && mode !== 'mfa' && (
```
Tương tự sửa khối field `email` phía trên — email KHÔNG cần ẩn ở mode mfa (user vẫn thấy email họ vừa
nhập, chỉ readOnly hoá không bắt buộc theo scope task này) — **không đổi field email**, chỉ ẩn field
password và khối "Ghi nhớ đăng nhập / Quên mật khẩu?" ở mode mfa. Tìm khối:
```jsx
          {!isForgot && !isReset && (
            <div className="auth-row">
```
sửa thành:
```jsx
          {!isForgot && !isReset && mode !== 'mfa' && (
            <div className="auth-row">
```

- [ ] **Step 6: Chạy lại test, xác nhận PASS**

```bash
cd "d:/TraVinh Shelter/frontend-react"
npx vitest run src/pages/LoginPage.test.jsx
```

Expected: tất cả test trong `LoginPage.test.jsx` PASS (kể cả 3 test forgot/reset cũ — không được vỡ).

- [ ] **Step 7: Chạy toàn bộ suite frontend, xác nhận không có regression**

```bash
cd "d:/TraVinh Shelter/frontend-react"
npm test -- --run
```

Expected: tất cả test PASS, `npm run lint` clean (chạy thêm `npm run lint` để chắc chắn không còn biến
`AuthResponse`/import thừa nào — không áp dụng ở đây vì đây là JS không phải Java, nhưng vẫn nên chạy).

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/services/api.js frontend-react/src/utils/validation.js \
        frontend-react/src/pages/LoginPage.jsx frontend-react/src/pages/LoginPage.test.jsx
git commit -m "feat(auth): add admin MFA OTP step to LoginPage"
```

---

## Thứ tự thực hiện & commit

Task 1 → Task 2 → Task 3, **tuần tự bắt buộc** (Task 2 phụ thuộc `LoginMfaService` từ Task 1; Task 3
phụ thuộc endpoint `/auth/login/verify-otp` từ Task 2 để mock đúng shape response, dù thực chất frontend
mock mode không gọi backend thật — vẫn nên làm sau để tránh giả định sai response shape).

Mỗi task: RED (test fail vì thiếu class/method, hoặc assertion fail) → GREEN → verify bằng lệnh thật
trước khi commit — không tự tuyên bố xong khi chưa chạy lệnh verify.

## Verify tổng thể (trước khi báo hoàn thành)

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
cd "d:/TraVinh Shelter/frontend-react"
npm test -- --run
npm run lint
npm run build
```

Không cần verify qua docker-compose thật (gửi email SMTP thật) trong plan này — `SmtpEmailSender` đã
được verify thật ở Phase 2 (OTP notifications), tái sử dụng nguyên vẹn không đổi logic gửi email.

## Critical Files

- `backend-springboot/.../modules/auth/LoginMfaService.java` (Task 1, mới)
- `backend-springboot/.../modules/auth/dto/VerifyLoginOtpRequest.java`,
  `LoginResponse.java` (Task 1, 2, mới)
- `backend-springboot/.../modules/auth/AuthService.java`,
  `AuthController.java` (Task 2, sửa breaking)
- `backend-springboot/.../common/config/SecurityConfig.java`,
  `.../modules/auth/security/AuthRateLimitFilter.java` (Task 2, sửa)
- `backend-springboot/src/test/.../AuthServiceTest.java`,
  `AuthServiceRehashIntegrationTest.java`, `security/SecurityHttpTest.java`,
  `security/AuthRateLimitFilterTest.java` (Task 2, sửa breaking + test mới)
- `frontend-react/src/services/api.js`, `src/utils/validation.js`,
  `src/pages/LoginPage.jsx`, `src/pages/LoginPage.test.jsx` (Task 3)
