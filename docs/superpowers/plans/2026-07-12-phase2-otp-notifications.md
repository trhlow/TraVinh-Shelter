# Phase 2 — OTP qua Email + SMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OTP-based password recovery (email, for ADMIN/BROKER accounts) and OTP-based anti-spam
verification for public viewing-appointment bookings (SMS), backed by a new shared `OtpStore`
abstraction and a new `modules/notification/` domain module.

**Architecture:** A Redis-or-in-memory `OtpStore` (mirrors the existing `RateLimiter`/
`RevokedTokenStore` dual-implementation pattern, but fails *closed* on Redis errors instead of
open) issues and verifies single-use 6-digit codes. A new `modules/notification/` module wraps
`JavaMailSender` (Brevo SMTP) and eSMS.vn's REST API behind `EmailSender`/`SmsSender` interfaces.
`PasswordResetService` (new, in `modules/auth/`) uses `OtpStore` + `EmailSender` for
`POST /auth/forgot-password` / `POST /auth/reset-password`. `BookingService` (extended) uses
`OtpStore` + `SmsSender` for two new endpoints that replace the old direct-submit viewing endpoint.

**Tech Stack:** Spring Boot 4.0.5 / Java 25, `spring-boot-starter-mail` (new dependency),
Spring's built-in `RestClient` (no new dependency) for eSMS, Redis (`StringRedisTemplate`, already
a dependency) with in-memory fallback, JUnit 5 + Mockito + AssertJ + Testcontainers (existing test
stack).

## Global Constraints

- Backend only (`backend-springboot/`). Do not touch `frontend-react/` — the OTP flow change is a
  breaking change for the frontend, but updating it is devnguyen's work, out of scope here.
- OTP codes are 6 digits, generated with `SecureRandom`, single-use: a **correct** `verify()` call
  deletes the stored code; a **wrong** `verify()` call does **not** delete it (retries allowed
  until TTL expiry) — this is intentional per spec, paired with separate brute-force rate limits.
- `OtpStore` must fail **closed** on Redis errors: `verify()` returns `false`, `generate()` throws
  `503 SERVICE_UNAVAILABLE`. This is the opposite of `RateLimiter`/`RevokedTokenStore`, which fail
  *open* — do not copy their fail-open behavior for `OtpStore`.
- Rate limits (all via the existing `RateLimiter` interface, reused as-is):
  - `password-reset-request:`+email — 3 requests / 15 minutes
  - `password-reset-verify:`+email — 5 attempts / 10 minutes
  - `viewing-otp-request:`+phone — 3 requests / 15 minutes
  - `viewing-otp-verify:`+phone — 5 attempts / 5 minutes
- `POST /auth/forgot-password` always returns `200` regardless of whether the email exists, and
  regardless of whether the SMTP send succeeds — only logs `ERROR` on SMTP failure. Never let a
  500/other status leak "email exists but SMTP failed" vs. "email doesn't exist" (anti-enumeration,
  same principle as the Phase 1 403→404 fix).
- The old `POST /properties/{propertyId}/viewings` endpoint is **deleted**. `BookingService
  .create(propertyId, request)` is kept as-is and reused internally by the new
  `verifyOtpAndCreate(...)`; do not rewrite its logic or its existing tests.
- No template engine, no HTML email — plain Vietnamese text content only.
- Do not build JWT revocation-by-user-id on password reset — known limitation, explicitly
  deferred, do not add scope here.
- No automated test may call the real Brevo/eSMS servers — unit-test the sender classes with
  mocks (`MockRestServiceServer` for eSMS, mocked `JavaMailSender` for SMTP). Real-server
  verification is a manual smoke test after deploy, not part of `mvn test`.
- UI-facing strings (error messages, email/SMS body text) in Vietnamese; code, comments, commit
  messages in English (per `workflow.md`).
- TDD mandatory for all business logic: write the failing test first, watch it fail, then
  implement.
- Every `mvn` command must inline `JAVA_HOME` pointed at the JDK 25 Temurin install, e.g.
  `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test` — it does not
  persist across separate shell invocations.
- Commits: Conventional Commits, English, no `Co-Authored-By` trailer.

---

### Task 1: `OtpStore` interface + `InMemoryOtpStore`

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/OtpStore.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/InMemoryOtpStore.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/InMemoryOtpStoreTest.java`

**Interfaces:**
- Produces: `OtpStore.generate(String key, Duration ttl) -> String` (6-digit code),
  `OtpStore.verify(String key, String code) -> boolean`. Later tasks (2, 5, 6) depend on exactly
  these two method signatures.

- [ ] **Step 1: Write the failing test**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/InMemoryOtpStoreTest.java`:

```java
package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class InMemoryOtpStoreTest {

    @Test
    void generateReturnsASixDigitNumericCode() {
        OtpStore store = new InMemoryOtpStore();

        String code = store.generate("key-a", Duration.ofMinutes(10));

        assertThat(code).matches("\\d{6}");
    }

    @Test
    void verifyWithCorrectCodeSucceedsAndConsumesTheEntry() {
        OtpStore store = new InMemoryOtpStore();
        String code = store.generate("key-b", Duration.ofMinutes(10));

        assertThat(store.verify("key-b", code)).isTrue();
        // single-use: the same correct code cannot be verified twice
        assertThat(store.verify("key-b", code)).isFalse();
    }

    @Test
    void verifyWithWrongCodeFailsButDoesNotConsumeTheEntry() {
        OtpStore store = new InMemoryOtpStore();
        String code = store.generate("key-c", Duration.ofMinutes(10));

        assertThat(store.verify("key-c", "000000".equals(code) ? "111111" : "000000")).isFalse();
        // the correct code must still work after a wrong guess (retry allowed within TTL)
        assertThat(store.verify("key-c", code)).isTrue();
    }

    @Test
    void verifyOnUnknownKeyReturnsFalse() {
        OtpStore store = new InMemoryOtpStore();

        assertThat(store.verify("never-generated", "123456")).isFalse();
    }

    @Test
    void verifyAfterExpiryReturnsFalse() throws InterruptedException {
        OtpStore store = new InMemoryOtpStore();
        String code = store.generate("key-d", Duration.ofMillis(20));

        Thread.sleep(60);

        assertThat(store.verify("key-d", code)).isFalse();
    }
}
```

- [ ] **Step 2: Run test to verify it fails to compile (OtpStore / InMemoryOtpStore don't exist yet)**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=InMemoryOtpStoreTest -pl . -f backend-springboot/pom.xml`
Expected: COMPILATION ERROR — `cannot find symbol: class OtpStore` / `class InMemoryOtpStore`

- [ ] **Step 3: Create the `OtpStore` interface**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/OtpStore.java`:

```java
package com.travinh.realty.modules.auth.security;

import java.time.Duration;

public interface OtpStore {
    /**
     * Generates a 6-digit code, stores it under {@code key} for {@code ttl}, and returns it.
     */
    String generate(String key, Duration ttl);

    /**
     * @return true if {@code code} matches the code currently stored under {@code key} (and the
     * entry is not expired) — in which case the entry is deleted (single-use). A wrong code
     * returns false without deleting the entry, allowing retries within the TTL window.
     */
    boolean verify(String key, String code);
}
```

- [ ] **Step 4: Implement `InMemoryOtpStore`**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/InMemoryOtpStore.java`:

```java
package com.travinh.realty.modules.auth.security;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single-instance fallback used when no Redis connection is configured (e.g. slice tests).
 * Does not share OTP state across backend instances — see {@link RedisOtpStore}.
 */
public class InMemoryOtpStore implements OtpStore {
    private static final SecureRandom RANDOM = new SecureRandom();

    private final Map<String, OtpEntry> codes = new ConcurrentHashMap<>();

    @Override
    public String generate(String key, Duration ttl) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        codes.put(key, new OtpEntry(code, Instant.now().plus(ttl)));
        return code;
    }

    @Override
    public boolean verify(String key, String code) {
        OtpEntry entry = codes.get(key);
        if (entry == null || entry.expiresAt().isBefore(Instant.now()) || !entry.code().equals(code)) {
            return false;
        }
        codes.remove(key, entry);
        return true;
    }

    private record OtpEntry(String code, Instant expiresAt) {
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=InMemoryOtpStoreTest -f backend-springboot/pom.xml`
Expected: `Tests run: 5, Failures: 0, Errors: 0`

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/OtpStore.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/InMemoryOtpStore.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/InMemoryOtpStoreTest.java
git commit -m "feat(auth): add OtpStore abstraction with in-memory implementation"
```

---

### Task 2: `RedisOtpStore` + `SecurityConfig` wiring

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/RedisOtpStore.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/RedisOtpStoreIntegrationTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/RedisOtpStoreResilienceTest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`

**Interfaces:**
- Consumes: `OtpStore` (Task 1), `InMemoryOtpStore` (Task 1).
- Produces: `OtpStore otpStore` Spring bean (name `otpStore`), injectable into any `@Service`
  (used by Tasks 5 and 6).

- [ ] **Step 1: Write the failing integration test**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/RedisOtpStoreIntegrationTest.java`:

```java
package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

@Testcontainers(disabledWithoutDocker = true)
class RedisOtpStoreIntegrationTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    private StringRedisTemplate newTemplate() {
        LettuceConnectionFactory factory = new LettuceConnectionFactory(
                new RedisStandaloneConfiguration(REDIS.getHost(), REDIS.getMappedPort(6379)));
        factory.afterPropertiesSet();
        StringRedisTemplate template = new StringRedisTemplate(factory);
        template.afterPropertiesSet();
        return template;
    }

    @Test
    void generateReturnsASixDigitCode() {
        OtpStore store = new RedisOtpStore(newTemplate());

        String code = store.generate("key:" + System.nanoTime(), Duration.ofMinutes(10));

        assertThat(code).matches("\\d{6}");
    }

    @Test
    void verifyWithCorrectCodeSucceedsAndConsumesTheEntry() {
        OtpStore store = new RedisOtpStore(newTemplate());
        String key = "key:" + System.nanoTime();
        String code = store.generate(key, Duration.ofMinutes(10));

        assertThat(store.verify(key, code)).isTrue();
        assertThat(store.verify(key, code)).isFalse();
    }

    @Test
    void verifyWithWrongCodeFailsButDoesNotConsumeTheEntry() {
        OtpStore store = new RedisOtpStore(newTemplate());
        String key = "key:" + System.nanoTime();
        String code = store.generate(key, Duration.ofMinutes(10));
        String wrongCode = "000000".equals(code) ? "111111" : "000000";

        assertThat(store.verify(key, wrongCode)).isFalse();
        assertThat(store.verify(key, code)).isTrue();
    }

    @Test
    void verifyOnUnknownKeyReturnsFalse() {
        OtpStore store = new RedisOtpStore(newTemplate());

        assertThat(store.verify("never-generated:" + System.nanoTime(), "123456")).isFalse();
    }

    @Test
    void otpIsVisibleAcrossSeparateInstancesSharingTheSameRedis() {
        OtpStore instanceA = new RedisOtpStore(newTemplate());
        OtpStore instanceB = new RedisOtpStore(newTemplate());
        String key = "shared:" + System.nanoTime();

        String code = instanceA.generate(key, Duration.ofMinutes(10));

        assertThat(instanceB.verify(key, code)).isTrue();
    }
}
```

Create `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/RedisOtpStoreResilienceTest.java`:

```java
package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * Unlike RateLimiter/RevokedTokenStore, OTP correctness is security-critical: failing open on a
 * Redis outage would mean "treat any submitted code as correct." verify() must fail closed
 * (reject) and generate() must surface a 503 rather than silently issue an unstorable code.
 */
class RedisOtpStoreResilienceTest {

    private StringRedisTemplate unreachableTemplate() {
        // Port 1 is reserved/unlikely to be listening; connection attempts fail fast.
        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                .commandTimeout(Duration.ofMillis(200))
                .build();
        LettuceConnectionFactory factory = new LettuceConnectionFactory(
                new RedisStandaloneConfiguration("127.0.0.1", 1), clientConfig);
        factory.afterPropertiesSet();
        StringRedisTemplate template = new StringRedisTemplate(factory);
        template.afterPropertiesSet();
        return template;
    }

    @Test
    void verifyFailsClosedWhenRedisIsUnreachable() {
        OtpStore store = new RedisOtpStore(unreachableTemplate());

        assertThat(store.verify("some-key", "123456")).isFalse();
    }

    @Test
    void generateThrows503WhenRedisIsUnreachable() {
        OtpStore store = new RedisOtpStore(unreachableTemplate());

        assertThatThrownBy(() -> store.generate("some-key", Duration.ofMinutes(10)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail to compile**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=RedisOtpStoreIntegrationTest,RedisOtpStoreResilienceTest -f backend-springboot/pom.xml`
Expected: COMPILATION ERROR — `cannot find symbol: class RedisOtpStore`

- [ ] **Step 3: Implement `RedisOtpStore`**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/RedisOtpStore.java`:

```java
package com.travinh.realty.modules.auth.security;

import java.security.SecureRandom;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Shares OTP state across all backend instances via Redis. Unlike {@link RedisRateLimiter} and
 * {@link RedisRevokedTokenStore}, this store fails <em>closed</em> on a Redis outage: OTP
 * correctness is security-critical, so "Redis is down" must mean "reject the code" and "cannot
 * issue a code" (503), never "treat anything as valid."
 */
public class RedisOtpStore implements OtpStore {
    private static final Logger log = LoggerFactory.getLogger(RedisOtpStore.class);
    private static final String KEY_PREFIX = "otp:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    public RedisOtpStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public String generate(String key, Duration ttl) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + key, code, ttl);
        } catch (DataAccessException exception) {
            log.error("Redis unavailable, cannot generate OTP for key {}", key, exception);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi mã xác minh lúc này, vui lòng thử lại sau.");
        }
        return code;
    }

    @Override
    public boolean verify(String key, String code) {
        try {
            String stored = redisTemplate.opsForValue().get(KEY_PREFIX + key);
            if (stored == null || !stored.equals(code)) {
                return false;
            }
            redisTemplate.delete(KEY_PREFIX + key);
            return true;
        } catch (DataAccessException exception) {
            log.error("Redis unavailable, failing closed on OTP verification for key {}", key, exception);
            return false;
        }
    }
}
```

- [ ] **Step 4: Wire the `otpStore` bean in `SecurityConfig`**

In `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`, add
two imports next to the existing `RevokedTokenStore`-related imports (after line 13):

```java
import com.travinh.realty.modules.auth.security.InMemoryOtpStore;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RedisOtpStore;
```

Then add a new bean method right after `revokedTokenStore(...)` (after line 114, before
`corsConfigurationSource(...)`):

```java
    /**
     * OtpStore fails closed on Redis errors (see RedisOtpStore) — unlike RateLimiter/
     * RevokedTokenStore above, which fail open. Same Redis-or-in-memory selection pattern.
     */
    @Bean
    OtpStore otpStore(ObjectProvider<StringRedisTemplate> redisTemplate) {
        StringRedisTemplate template = redisTemplate.getIfAvailable();
        return template != null ? new RedisOtpStore(template) : new InMemoryOtpStore();
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=RedisOtpStoreIntegrationTest,RedisOtpStoreResilienceTest -f backend-springboot/pom.xml`
Expected: both classes green (requires Docker running for the integration test; the resilience
test does not need Docker).

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/RedisOtpStore.java \
        backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/RedisOtpStoreIntegrationTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/RedisOtpStoreResilienceTest.java
git commit -m "feat(auth): add Redis-backed OtpStore and wire it in SecurityConfig"
```

---

### Task 3: `modules/notification/` — `EmailSender` + `SmtpEmailSender` + mail config

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/notification/EmailSender.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/notification/SmtpEmailSender.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/notification/SmtpEmailSenderTest.java`
- Modify: `backend-springboot/pom.xml` (add `spring-boot-starter-mail`)
- Modify: `backend-springboot/src/main/resources/application.yml` (add `spring.mail.*`)
- Modify: `.env.example` (add 4 new vars with placeholders)
- Modify: `docker-compose.yml` (pass the 4 new vars through to the `backend` container)

**Interfaces:**
- Produces: `EmailSender.send(String to, String subject, String body)` — consumed by Task 5's
  `PasswordResetService`.

- [ ] **Step 1: Add the `spring-boot-starter-mail` dependency**

In `backend-springboot/pom.xml`, add this dependency right after the
`spring-boot-starter-actuator` block (after line 54):

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
```

- [ ] **Step 2: Write the failing test**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/notification/SmtpEmailSenderTest.java`:

```java
package com.travinh.realty.modules.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

class SmtpEmailSenderTest {

    @Test
    void sendBuildsAndSendsASimpleMailMessageWithGivenFields() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        SmtpEmailSender sender = new SmtpEmailSender(mailSender);

        sender.send("broker@congtinland.vn", "Mã OTP khôi phục mật khẩu", "Mã của bạn là 123456");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertThat(sent.getTo()).containsExactly("broker@congtinland.vn");
        assertThat(sent.getSubject()).isEqualTo("Mã OTP khôi phục mật khẩu");
        assertThat(sent.getText()).isEqualTo("Mã của bạn là 123456");
    }

    @Test
    void sendPropagatesMailExceptionsToTheCaller() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        // JavaMailSender#send returns void; stubbing a void method to throw uses doThrow, not when(...).
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));
        SmtpEmailSender sender = new SmtpEmailSender(mailSender);

        assertThatThrownBy(() -> sender.send("broker@congtinland.vn", "Subject", "Body"))
                .isInstanceOf(MailSendException.class);
    }
}
```

- [ ] **Step 3: Run test to verify it fails to compile**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=SmtpEmailSenderTest -f backend-springboot/pom.xml`
Expected: COMPILATION ERROR — `cannot find symbol: class SmtpEmailSender` / `class EmailSender`

- [ ] **Step 4: Create `EmailSender` and implement `SmtpEmailSender`**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/notification/EmailSender.java`:

```java
package com.travinh.realty.modules.notification;

public interface EmailSender {
    void send(String to, String subject, String body);
}
```

Create `backend-springboot/src/main/java/com/travinh/realty/modules/notification/SmtpEmailSender.java`:

```java
package com.travinh.realty.modules.notification;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailSender implements EmailSender {
    private final JavaMailSender mailSender;

    public SmtpEmailSender(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=SmtpEmailSenderTest -f backend-springboot/pom.xml`
Expected: `Tests run: 2, Failures: 0, Errors: 0`

- [ ] **Step 6: Add `spring.mail.*` config to `application.yml`**

In `backend-springboot/src/main/resources/application.yml`, insert a new `mail:` block as a
**top-level property directly under `spring:`** — a sibling of `data:`, `jackson:`, `flyway:`,
NOT nested inside `data:` (do not indent it to the same level as `redis:`, which lives inside
`data:` — that would silently produce `spring.data.mail.host` instead of `spring.mail.host`,
and Spring's mail autoconfiguration would never activate). Insert it right after the `data:`
block closes (after line 46, before line 47's blank line / `management:` section). The
placeholders use `:` empty-string defaults (matching the `SENTRY_DSN:` style already used lower
in this file) so `@SpringBootTest` contexts that don't set these env vars (e.g.
`ViewingFilterIntegrationTest`, `AuthServiceRehashIntegrationTest`) still start up cleanly
instead of failing on an unresolved placeholder:

```yaml
  data:
    web:
      pageable:
        max-page-size: 50
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      timeout: 1s
  mail:
    host: smtp-relay.brevo.com
    port: 587
    username: ${SMTP_USERNAME:}
    password: ${SMTP_PASSWORD:}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true
```

(`mail:` is at 2-space indent — the same level as `data:` itself, not the 4-space level of
`redis:`, which is nested one level deeper inside `data:`.)

- [ ] **Step 7: Add the 4 new env vars to `.env.example`**

In `.env.example`, add a new section at the end of the file (after line 48's
`CADDY_CONFIG_VOLUME_NAME=...`):

```
# === Phase 2 — OTP notifications (password reset email + booking SMS anti-spam) ===
API_KEY_eSMS=your-esms-api-key
ESMS_SECRET_KEY=your-esms-secret-key
SMTP_USERNAME=your-brevo-smtp-login
SMTP_PASSWORD=your-brevo-smtp-key
```

- [ ] **Step 8: Pass the 4 new env vars through to the `backend` container in `docker-compose.yml`**

In `docker-compose.yml`, the `backend` service's `environment:` block only forwards vars it
explicitly lists (see `DB_URL`, `JWT_SECRET`, etc. at lines 60-71) — without this step, setting
the vars in `.env` would have no effect once deployed via `docker compose up`. Add these 4 lines
to that block, right after `MEDIA_PUBLIC_URL_PREFIX` (after line 71):

```yaml
      MEDIA_PUBLIC_URL_PREFIX: ${MEDIA_PUBLIC_URL_PREFIX:-/api/v1/media}
      API_KEY_eSMS: ${API_KEY_eSMS:-}
      ESMS_SECRET_KEY: ${ESMS_SECRET_KEY:-}
      SMTP_USERNAME: ${SMTP_USERNAME:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
```

- [ ] **Step 9: Run the full test suite to confirm nothing broke**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -f backend-springboot/pom.xml`
Expected: all tests green (adding the mail starter + config must not break any existing
`@SpringBootTest`/`@WebMvcTest` context).

- [ ] **Step 10: Commit**

```bash
git add backend-springboot/pom.xml backend-springboot/src/main/resources/application.yml \
        backend-springboot/src/main/java/com/travinh/realty/modules/notification/EmailSender.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/notification/SmtpEmailSender.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/notification/SmtpEmailSenderTest.java \
        .env.example docker-compose.yml
git commit -m "feat(notification): add SmtpEmailSender backed by Brevo SMTP relay"
```

---

### Task 4: `modules/notification/` — `SmsSender` + `EsmsSmsSender` + eSMS config

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/notification/SmsSender.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/notification/EsmsProperties.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/notification/EsmsSmsSender.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/notification/EsmsSmsSenderTest.java`
- Modify: `backend-springboot/src/main/resources/application.yml` (add `esms.*`)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/ApplicationPropertiesConfig.java`

**Interfaces:**
- Produces: `SmsSender.send(String phone, String message)` — consumed by Task 6's
  `BookingService`.

**Note on eSMS field names:** verified against eSMS's live developer docs
(`https://developers.esms.vn/esms-api/ham-gui-tin/tin-nhan-sms-otp-cskh`) rather than assumed from
memory, per the design spec's explicit caution. Confirmed request fields: `ApiKey`, `SecretKey`,
`Phone`, `Content`, `SmsType`, `IsUnicode`, optional `Brandname`. Response: `{"CodeResult": "100",
...}` on success (any other `CodeResult` is a failure). `Brandname` requires a separate paid
registration with eSMS that may not be set up yet, so it's read from an optional config value and
omitted from the request body when blank — `SmsType`/`Brandname` correctness for this specific
eSMS account must be confirmed via the manual smoke test after deploy (already called out in the
spec's Testing section as out of scope for `mvn test`).

- [ ] **Step 1: Write the failing test**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/notification/EsmsSmsSenderTest.java`:

```java
package com.travinh.realty.modules.notification;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

class EsmsSmsSenderTest {
    private static final String API_URL = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";
    private static final EsmsProperties PROPERTIES =
            new EsmsProperties("test-api-key", "test-secret-key", API_URL, "", "2");

    @Test
    void sendPostsExpectedFieldsAndSucceedsOnCodeResult100() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.ApiKey").value("test-api-key"))
                .andExpect(jsonPath("$.SecretKey").value("test-secret-key"))
                .andExpect(jsonPath("$.Phone").value("0912345678"))
                .andExpect(jsonPath("$.Content").value("Ma OTP la 123456"))
                .andExpect(jsonPath("$.SmsType").value("2"))
                .andRespond(withSuccess("""
                        {"CodeResult":"100","CountRegenerate":0,"SMSID":"abc"}
                        """, MediaType.APPLICATION_JSON));
        EsmsSmsSender sender = new EsmsSmsSender(builder, PROPERTIES);

        sender.send("0912345678", "Ma OTP la 123456");

        server.verify();
    }

    @Test
    void sendThrows503WhenEsmsReturnsNonSuccessCode() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL))
                .andRespond(withSuccess("""
                        {"CodeResult":"101","CountRegenerate":0}
                        """, MediaType.APPLICATION_JSON));
        EsmsSmsSender sender = new EsmsSmsSender(builder, PROPERTIES);

        assertThatThrownBy(() -> sender.send("0912345678", "Ma OTP la 123456"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }

    @Test
    void sendThrows503WhenTheHttpCallFails() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(API_URL)).andRespond(withServerError());
        EsmsSmsSender sender = new EsmsSmsSender(builder, PROPERTIES);

        assertThatThrownBy(() -> sender.send("0912345678", "Ma OTP la 123456"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("503");
    }
}
```

- [ ] **Step 2: Run test to verify it fails to compile**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=EsmsSmsSenderTest -f backend-springboot/pom.xml`
Expected: COMPILATION ERROR — `cannot find symbol: class EsmsSmsSender` / `class EsmsProperties`

- [ ] **Step 3: Create `SmsSender`, `EsmsProperties`, and implement `EsmsSmsSender`**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/notification/SmsSender.java`:

```java
package com.travinh.realty.modules.notification;

public interface SmsSender {
    void send(String phone, String message);
}
```

Create `backend-springboot/src/main/java/com/travinh/realty/modules/notification/EsmsProperties.java`:

```java
package com.travinh.realty.modules.notification;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "esms")
public record EsmsProperties(String apiKey, String secretKey, String apiUrl, String brandname, String smsType) {
}
```

Create `backend-springboot/src/main/java/com/travinh/realty/modules/notification/EsmsSmsSender.java`:

```java
package com.travinh.realty.modules.notification;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Component
public class EsmsSmsSender implements SmsSender {
    private static final Logger log = LoggerFactory.getLogger(EsmsSmsSender.class);
    private static final String SUCCESS_CODE = "100";

    private final RestClient restClient;
    private final EsmsProperties properties;

    public EsmsSmsSender(RestClient.Builder builder, EsmsProperties properties) {
        this.restClient = builder.build();
        this.properties = properties;
    }

    @Override
    public void send(String phone, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ApiKey", properties.apiKey());
        body.put("SecretKey", properties.secretKey());
        body.put("Phone", phone);
        body.put("Content", message);
        body.put("SmsType", properties.smsType());
        body.put("IsUnicode", "1");
        if (properties.brandname() != null && !properties.brandname().isBlank()) {
            body.put("Brandname", properties.brandname());
        }

        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri(properties.apiUrl())
                    .body(body)
                    .retrieve()
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {
                    });
        } catch (RuntimeException exception) {
            log.error("eSMS request failed for phone {}", phone, exception);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi SMS lúc này, vui lòng thử lại sau.", exception);
        }

        String codeResult = response == null ? null : String.valueOf(response.get("CodeResult"));
        if (!SUCCESS_CODE.equals(codeResult)) {
            log.error("eSMS rejected message for phone {}: CodeResult={}", phone, codeResult);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi SMS lúc này, vui lòng thử lại sau.");
        }
    }
}
```

- [ ] **Step 4: Register `EsmsProperties` and add `esms.*` config to `application.yml`**

In `backend-springboot/src/main/java/com/travinh/realty/common/config/ApplicationPropertiesConfig.java`,
add the import and register the class:

```java
package com.travinh.realty.common.config;

import com.travinh.realty.infrastructure.storage.StorageProperties;
import com.travinh.realty.modules.notification.EsmsProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({StorageProperties.class, JwtProperties.class, CorsProperties.class, EsmsProperties.class})
public class ApplicationPropertiesConfig {
}
```

In `backend-springboot/src/main/resources/application.yml`, add a new top-level `esms:` block
after the `app:` block (after line 69, before the `springdoc:` block at line 71). Same `:` empty
defaults rationale as Task 3 Step 6:

```yaml
esms:
  api-key: ${API_KEY_eSMS:}
  secret-key: ${ESMS_SECRET_KEY:}
  api-url: https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/
  brandname: ${ESMS_BRANDNAME:}
  sms-type: ${ESMS_SMS_TYPE:2}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=EsmsSmsSenderTest -f backend-springboot/pom.xml`
Expected: `Tests run: 3, Failures: 0, Errors: 0`

- [ ] **Step 6: Run the full test suite to confirm nothing broke**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -f backend-springboot/pom.xml`
Expected: all tests green.

- [ ] **Step 7: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/notification/SmsSender.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/notification/EsmsProperties.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/notification/EsmsSmsSender.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/notification/EsmsSmsSenderTest.java \
        backend-springboot/src/main/resources/application.yml \
        backend-springboot/src/main/java/com/travinh/realty/common/config/ApplicationPropertiesConfig.java
git commit -m "feat(notification): add EsmsSmsSender backed by eSMS.vn REST API"
```

---

### Task 5: `PasswordResetService` + `/auth/forgot-password` + `/auth/reset-password`

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/common/dto/MessageResponse.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ForgotPasswordRequest.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ResetPasswordRequest.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`
  (permitAll the 2 new paths)
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java`

**Interfaces:**
- Consumes: `OtpStore` (Task 1/2), `EmailSender` (Task 3), `RateLimiter` (existing), `PasswordEncoder`
  (existing bean), `UserRepository` (existing).
- Produces: `PasswordResetService.forgotPassword(ForgotPasswordRequest) -> MessageResponse`,
  `PasswordResetService.resetPassword(ResetPasswordRequest) -> MessageResponse`.

- [ ] **Step 1: Write the failing unit test**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java`:

```java
package com.travinh.realty.modules.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.dto.ForgotPasswordRequest;
import com.travinh.realty.modules.auth.dto.ResetPasswordRequest;
import com.travinh.realty.modules.auth.security.InMemoryOtpStore;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class PasswordResetServiceTest {

    private UserRepository users;
    private OtpStore otpStore;
    private RateLimiter rateLimiter;
    private EmailSender emailSender;
    private PasswordEncoder passwordEncoder;
    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        users = Mockito.mock(UserRepository.class);
        otpStore = new InMemoryOtpStore();
        rateLimiter = new InMemoryRateLimiter();
        emailSender = Mockito.mock(EmailSender.class);
        passwordEncoder = new BCryptPasswordEncoder(4);
        service = new PasswordResetService(users, otpStore, rateLimiter, emailSender, passwordEncoder);
    }

    @Test
    void forgotPasswordForExistingEmailSendsOtpAndReturnsGenericMessage() {
        User user = User.register("broker", "broker@congtinland.vn", "hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("broker@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
        verify(emailSender).send(eq("broker@congtinland.vn"), anyString(), anyString());
    }

    @Test
    void forgotPasswordForUnknownEmailReturnsSameMessageWithoutSendingEmail() {
        when(users.findByEmail("nobody@congtinland.vn")).thenReturn(Optional.empty());

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("nobody@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
        verifyNoInteractions(emailSender);
    }

    @Test
    void forgotPasswordWhenEmailSendFailsStillReturnsSuccessMessage() {
        User user = User.register("broker", "broker@congtinland.vn", "hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("smtp down")).when(emailSender).send(anyString(), anyString(), anyString());

        MessageResponse response = service.forgotPassword(new ForgotPasswordRequest("broker@congtinland.vn"));

        assertThat(response.message()).isEqualTo("Nếu email tồn tại, mã OTP đã được gửi.");
    }

    @Test
    void forgotPasswordIsRateLimitedAfterThreeRequests() {
        when(users.findByEmail(anyString())).thenReturn(Optional.empty());
        ForgotPasswordRequest request = new ForgotPasswordRequest("limited@congtinland.vn");
        for (int attempt = 0; attempt < 3; attempt++) {
            service.forgotPassword(request);
        }

        assertThatThrownBy(() -> service.forgotPassword(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void resetPasswordWithCorrectOtpUpdatesPasswordHash() {
        User user = User.register("broker", "broker@congtinland.vn", "old-hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        String code = otpStore.generate("password-reset:broker@congtinland.vn", Duration.ofMinutes(10));

        MessageResponse response = service.resetPassword(
                new ResetPasswordRequest("broker@congtinland.vn", code, "NewPassword123"));

        assertThat(response.message()).isEqualTo("Mật khẩu đã được đặt lại.");
        assertThat(user.getPasswordHash()).isNotEqualTo("old-hash");
        assertThat(passwordEncoder.matches("NewPassword123", user.getPasswordHash())).isTrue();
    }

    @Test
    void resetPasswordWithWrongOtpReturnsBadRequestAndDoesNotChangePassword() {
        User user = User.register("broker", "broker@congtinland.vn", "old-hash", "Broker", "0900000000");
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        otpStore.generate("password-reset:broker@congtinland.vn", Duration.ofMinutes(10));

        assertThatThrownBy(() -> service.resetPassword(
                new ResetPasswordRequest("broker@congtinland.vn", "000000", "NewPassword123")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
        assertThat(user.getPasswordHash()).isEqualTo("old-hash");
    }

    @Test
    void resetPasswordIsRateLimitedAfterFiveAttempts() {
        ResetPasswordRequest request = new ResetPasswordRequest("limited@congtinland.vn", "000000", "NewPassword123");
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.resetPassword(request)).isInstanceOf(ResponseStatusException.class);
        }

        assertThatThrownBy(() -> service.resetPassword(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
        verify(users, never()).findByEmail(anyString());
    }
}
```

- [ ] **Step 2: Run test to verify it fails to compile**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PasswordResetServiceTest -f backend-springboot/pom.xml`
Expected: COMPILATION ERROR — missing `MessageResponse`, `ForgotPasswordRequest`,
`ResetPasswordRequest`, `PasswordResetService`.

- [ ] **Step 3: Create the DTOs**

Create `backend-springboot/src/main/java/com/travinh/realty/common/dto/MessageResponse.java`:

```java
package com.travinh.realty.common.dto;

public record MessageResponse(String message) {
}
```

Create `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ForgotPasswordRequest.java`:

```java
package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(@NotBlank @Email String email) {
}
```

Create `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ResetPasswordRequest.java`:

```java
package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Email String email,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode,
        @NotBlank @Size(min = 8) String newPassword
) {
}
```

- [ ] **Step 4: Implement `PasswordResetService`**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java`:

```java
package com.travinh.realty.modules.auth;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.dto.ForgotPasswordRequest;
import com.travinh.realty.modules.auth.dto.ResetPasswordRequest;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.notification.EmailSender;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordResetService {
    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final int REQUEST_LIMIT = 3;
    private static final Duration REQUEST_WINDOW = Duration.ofMinutes(15);
    private static final int VERIFY_LIMIT = 5;
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(10);
    private static final String GENERIC_SUCCESS_MESSAGE = "Nếu email tồn tại, mã OTP đã được gửi.";
    private static final String INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private final UserRepository users;
    private final OtpStore otpStore;
    private final RateLimiter rateLimiter;
    private final EmailSender emailSender;
    private final PasswordEncoder passwordEncoder;

    public PasswordResetService(UserRepository users, OtpStore otpStore, RateLimiter rateLimiter,
                                EmailSender emailSender, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.otpStore = otpStore;
        this.rateLimiter = rateLimiter;
        this.emailSender = emailSender;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public MessageResponse forgotPassword(ForgotPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("password-reset-request:" + email, REQUEST_LIMIT, REQUEST_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        Optional<User> user = users.findByEmail(email);
        if (user.isPresent()) {
            String code = otpStore.generate("password-reset:" + email, OTP_TTL);
            try {
                emailSender.send(email, "Mã OTP khôi phục mật khẩu - Công Tín Land",
                        "Mã OTP khôi phục mật khẩu của bạn là: " + code
                                + ". Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, vui lòng bỏ qua email này.");
            } catch (RuntimeException exception) {
                log.error("Failed to send password reset email to {}", email, exception);
            }
        }
        return new MessageResponse(GENERIC_SUCCESS_MESSAGE);
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("password-reset-verify:" + email, VERIFY_LIMIT, VERIFY_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        if (!otpStore.verify("password-reset:" + email, request.otpCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_OTP_MESSAGE);
        }
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_OTP_MESSAGE));
        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
        return new MessageResponse("Mật khẩu đã được đặt lại.");
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PasswordResetServiceTest -f backend-springboot/pom.xml`
Expected: `Tests run: 7, Failures: 0, Errors: 0`

- [ ] **Step 6: Wire the endpoints into `AuthController`**

Replace the full contents of `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java`:

```java
package com.travinh.realty.modules.auth;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.ForgotPasswordRequest;
import com.travinh.realty.modules.auth.dto.LoginRequest;
import com.travinh.realty.modules.auth.dto.ResetPasswordRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "Login and JWT session lifecycle")
public class AuthController {
    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthService authService, PasswordResetService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate and return a JWT")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) { return authService.login(request); }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Revoke the current JWT", security = @SecurityRequirement(name = "bearerAuth"))
    public void logout(@RequestHeader("Authorization") String authorizationHeader) {
        authService.logout(authorizationHeader);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Request a password reset OTP by email")
    public MessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return passwordResetService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using an emailed OTP")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return passwordResetService.resetPassword(request);
    }
}
```

- [ ] **Step 7: Permit the 2 new paths in `SecurityConfig`**

In `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`,
change line 65 from:

```java
                .authorizeHttpRequests(authorize -> authorize.requestMatchers("/auth/login", "/error").permitAll()
```

to:

```java
                .authorizeHttpRequests(authorize -> authorize.requestMatchers(
                                "/auth/login", "/auth/forgot-password", "/auth/reset-password", "/error").permitAll()
```

- [ ] **Step 8: Update `SecurityHttpTest` to mock the new controller dependency and add HTTP tests**

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java`:

Add an import (after line 14, `import com.travinh.realty.modules.auth.AuthService;`):

```java
import com.travinh.realty.modules.auth.PasswordResetService;
import com.travinh.realty.common.dto.MessageResponse;
```

Add a new mocked bean field (after line 43, `@MockitoBean private AuthService authService;`):

```java
    @MockitoBean private PasswordResetService passwordResetService;
```

Add 3 new test methods (after the `authenticatedUserCanLogoutCurrentToken` test, before the
private `user(...)` helper method):

```java
    @Test
    void forgotPasswordAlwaysReturnsOkWithGenericMessage() throws Exception {
        when(passwordResetService.forgotPassword(any()))
                .thenReturn(new MessageResponse("Nếu email tồn tại, mã OTP đã được gửi."));

        mockMvc.perform(post("/auth/forgot-password").contentType("application/json")
                        .content("{\"email\":\"someone@congtinland.vn\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Nếu email tồn tại, mã OTP đã được gửi."));
    }

    @Test
    void resetPasswordWithValidOtpReturnsOk() throws Exception {
        when(passwordResetService.resetPassword(any()))
                .thenReturn(new MessageResponse("Mật khẩu đã được đặt lại."));

        mockMvc.perform(post("/auth/reset-password").contentType("application/json")
                        .content("{\"email\":\"someone@congtinland.vn\",\"otpCode\":\"123456\",\"newPassword\":\"NewPassword123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Mật khẩu đã được đặt lại."));
    }

    @Test
    void resetPasswordWithInvalidOtpReturnsBadRequest() throws Exception {
        when(passwordResetService.resetPassword(any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "Mã OTP không hợp lệ hoặc đã hết hạn"));

        mockMvc.perform(post("/auth/reset-password").contentType("application/json")
                        .content("{\"email\":\"someone@congtinland.vn\",\"otpCode\":\"000000\",\"newPassword\":\"NewPassword123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mã OTP không hợp lệ hoặc đã hết hạn"));
    }
```

- [ ] **Step 9: Run tests to verify everything passes**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PasswordResetServiceTest,SecurityHttpTest -f backend-springboot/pom.xml`
Expected: all green.

Run full suite: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -f backend-springboot/pom.xml`
Expected: all green, no regressions.

- [ ] **Step 10: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/common/dto/MessageResponse.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ForgotPasswordRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ResetPasswordRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java \
        backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java
git commit -m "feat(auth): add OTP-based password reset via email"
```

---

### Task 6: Booking anti-spam OTP flow — replace direct viewing submission

**Files:**
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/RequestViewingOtpRequest.java`
- Create: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/VerifyViewingOtpRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingController.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`
  (permitAll swap)
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingServiceTest.java`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java`

**Interfaces:**
- Consumes: `OtpStore` (Task 1/2), `RateLimiter` (existing), `SmsSender` (Task 4),
  `BookingService.create(UUID, CreateViewingRequest) -> ViewingResponse` (existing, unchanged).
- Produces: `BookingService.requestOtp(UUID, RequestViewingOtpRequest) -> MessageResponse`,
  `BookingService.verifyOtpAndCreate(UUID, VerifyViewingOtpRequest) -> ViewingResponse`.

- [ ] **Step 1: Write the failing tests in `BookingServiceTest`**

In `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingServiceTest.java`,
add these imports (after the existing `import` block, before the `class BookingServiceTest {`
line):

```java
import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.security.InMemoryOtpStore;
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.booking.dto.RequestViewingOtpRequest;
import com.travinh.realty.modules.booking.dto.VerifyViewingOtpRequest;
import com.travinh.realty.modules.notification.SmsSender;
import java.time.Duration;
```

Add 3 new fields to the class (after the existing `private BookingService service;` field):

```java
    private OtpStore otpStore;
    private RateLimiter rateLimiter;
    private SmsSender smsSender;
```

Replace the `setUp()` method body:

```java
    @BeforeEach
    void setUp() {
        appointments = Mockito.mock(ViewingAppointmentRepository.class);
        properties = Mockito.mock(PropertyRepository.class);
        otpStore = new InMemoryOtpStore();
        rateLimiter = new InMemoryRateLimiter();
        smsSender = Mockito.mock(SmsSender.class);
        service = new BookingService(appointments, properties, otpStore, rateLimiter, smsSender);
    }
```

Add these new test methods (anywhere inside the class, e.g. right after
`updateStatusForBrokerOwner_nonOwnerGetsNotFound`, before the private helper methods):

```java
    @Test
    void requestOtpSendsSmsToVisitorPhoneAndReturnsMessage() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));

        MessageResponse response = service.requestOtp(property.getId(), new RequestViewingOtpRequest("0900000000"));

        assertThat(response.message()).isEqualTo("Mã OTP đã được gửi qua SMS.");
        Mockito.verify(smsSender).send(Mockito.eq("0900000000"), Mockito.anyString());
    }

    @Test
    void requestOtpOnMissingPropertyReturnsNotFoundAndDoesNotSendSms() {
        UUID missing = UUID.randomUUID();
        when(properties.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requestOtp(missing, new RequestViewingOtpRequest("0900000000")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
        Mockito.verifyNoInteractions(smsSender);
    }

    @Test
    void requestOtpOnUnavailablePropertyReturnsNotFoundAndDoesNotSendSms() {
        Property hidden = property(broker(), PropertyStatus.HIDDEN);
        when(properties.findById(hidden.getId())).thenReturn(Optional.of(hidden));

        assertThatThrownBy(() -> service.requestOtp(hidden.getId(), new RequestViewingOtpRequest("0900000000")))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
        Mockito.verifyNoInteractions(smsSender);
    }

    @Test
    void requestOtpIsRateLimitedAfterThreeRequests() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));
        RequestViewingOtpRequest request = new RequestViewingOtpRequest("0911111111");
        for (int attempt = 0; attempt < 3; attempt++) {
            service.requestOtp(property.getId(), request);
        }

        assertThatThrownBy(() -> service.requestOtp(property.getId(), request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }

    @Test
    void verifyOtpAndCreateWithCorrectOtpCreatesAppointment() {
        Property property = property(broker(), PropertyStatus.AVAILABLE);
        when(properties.findById(property.getId())).thenReturn(Optional.of(property));
        when(appointments.save(any(ViewingAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        String code = otpStore.generate("viewing-otp:0900000000", Duration.ofMinutes(10));

        VerifyViewingOtpRequest request = new VerifyViewingOtpRequest(request(), code);
        ViewingResponse response = service.verifyOtpAndCreate(property.getId(), request);

        assertThat(response.status()).isEqualTo(AppointmentStatus.PENDING);
        Mockito.verify(appointments).save(any(ViewingAppointment.class));
    }

    @Test
    void verifyOtpAndCreateWithWrongOtpDoesNotCreateAppointment() {
        otpStore.generate("viewing-otp:0900000000", Duration.ofMinutes(10));
        VerifyViewingOtpRequest request = new VerifyViewingOtpRequest(request(), "000000");

        assertThatThrownBy(() -> service.verifyOtpAndCreate(UUID.randomUUID(), request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("400");
        Mockito.verify(appointments, Mockito.never()).save(any());
    }

    @Test
    void verifyOtpAndCreateIsRateLimitedAfterFiveAttempts() {
        VerifyViewingOtpRequest request = new VerifyViewingOtpRequest(request(), "000000");
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.verifyOtpAndCreate(UUID.randomUUID(), request))
                    .isInstanceOf(ResponseStatusException.class);
        }

        assertThatThrownBy(() -> service.verifyOtpAndCreate(UUID.randomUUID(), request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
        Mockito.verify(appointments, Mockito.never()).save(any());
    }
```

- [ ] **Step 2: Run tests to verify they fail to compile**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=BookingServiceTest -f backend-springboot/pom.xml`
Expected: COMPILATION ERROR — missing `RequestViewingOtpRequest`, `VerifyViewingOtpRequest`,
new `BookingService` constructor overload, `requestOtp`/`verifyOtpAndCreate` methods.

- [ ] **Step 3: Create the DTOs**

Create `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/RequestViewingOtpRequest.java`:

```java
package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RequestViewingOtpRequest(
        @NotBlank
        @Pattern(regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
                message = "Số điện thoại di động không hợp lệ") String visitorPhone
) {
}
```

Create `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/VerifyViewingOtpRequest.java`:

```java
package com.travinh.realty.modules.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record VerifyViewingOtpRequest(
        @Valid @NotNull CreateViewingRequest booking,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode
) {
}
```

- [ ] **Step 4: Extend `BookingService`**

In `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java`,
add these imports (after the existing `import` block, before `@Service`):

```java
import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.security.OtpStore;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.booking.dto.RequestViewingOtpRequest;
import com.travinh.realty.modules.booking.dto.VerifyViewingOtpRequest;
import com.travinh.realty.modules.notification.SmsSender;
import java.time.Duration;
```

Replace the class fields and constructor:

```java
@Service
public class BookingService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Duration OTP_TTL = Duration.ofMinutes(10);
    private static final int REQUEST_LIMIT = 3;
    private static final Duration REQUEST_WINDOW = Duration.ofMinutes(15);
    private static final int VERIFY_LIMIT = 5;
    private static final Duration VERIFY_WINDOW = Duration.ofMinutes(5);
    private static final String INVALID_OTP_MESSAGE = "Mã OTP không hợp lệ hoặc đã hết hạn";

    private final ViewingAppointmentRepository appointments;
    private final PropertyRepository properties;
    private final OtpStore otpStore;
    private final RateLimiter rateLimiter;
    private final SmsSender smsSender;

    public BookingService(ViewingAppointmentRepository appointments, PropertyRepository properties,
                          OtpStore otpStore, RateLimiter rateLimiter, SmsSender smsSender) {
        this.appointments = appointments;
        this.properties = properties;
        this.otpStore = otpStore;
        this.rateLimiter = rateLimiter;
        this.smsSender = smsSender;
    }
```

Add two new methods right after `create(...)` (after the existing method, before
`validateSchedule(...)`):

```java
    @Transactional(readOnly = true)
    public MessageResponse requestOtp(UUID propertyId, RequestViewingOtpRequest request) {
        Property property = properties.findById(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
        if (property.getStatus() != PropertyStatus.AVAILABLE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
        }
        String phone = request.visitorPhone().trim();
        if (!rateLimiter.tryAcquire("viewing-otp-request:" + phone, REQUEST_LIMIT, REQUEST_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        String code = otpStore.generate("viewing-otp:" + phone, OTP_TTL);
        smsSender.send(phone, "Ma OTP xac minh dat lich xem nha cua ban la: " + code + ". Ma co hieu luc 10 phut.");
        return new MessageResponse("Mã OTP đã được gửi qua SMS.");
    }

    @Transactional
    public ViewingResponse verifyOtpAndCreate(UUID propertyId, VerifyViewingOtpRequest request) {
        String phone = request.booking().visitorPhone().trim();
        if (!rateLimiter.tryAcquire("viewing-otp-verify:" + phone, VERIFY_LIMIT, VERIFY_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        if (!otpStore.verify("viewing-otp:" + phone, request.otpCode())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_OTP_MESSAGE);
        }
        return create(propertyId, request.booking());
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=BookingServiceTest -f backend-springboot/pom.xml`
Expected: all green (existing `create(...)`-related tests unaffected, new OTP tests green).

- [ ] **Step 6: Replace the public submit endpoint in `BookingController`**

Replace the full contents of `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingController.java`:

```java
package com.travinh.realty.modules.booking;

import com.travinh.realty.common.dto.MessageResponse;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.booking.dto.RequestViewingOtpRequest;
import com.travinh.realty.modules.booking.dto.UpdateViewingStatusRequest;
import com.travinh.realty.modules.booking.dto.VerifyViewingOtpRequest;
import com.travinh.realty.modules.booking.dto.ViewingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Viewings", description = "Submit and review property viewing appointments")
public class BookingController {
    private final BookingService bookings;

    public BookingController(BookingService bookings) {
        this.bookings = bookings;
    }

    @PostMapping("/properties/{propertyId}/viewings/request-otp")
    @Operation(summary = "Request an SMS OTP before submitting a viewing appointment")
    public MessageResponse requestViewingOtp(@PathVariable UUID propertyId,
                                             @Valid @RequestBody RequestViewingOtpRequest request) {
        return bookings.requestOtp(propertyId, request);
    }

    @PostMapping("/properties/{propertyId}/viewings/verify-otp")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Verify the SMS OTP and submit the viewing appointment")
    public ViewingResponse verifyViewingOtp(@PathVariable UUID propertyId,
                                            @Valid @RequestBody VerifyViewingOtpRequest request) {
        return bookings.verifyOtpAndCreate(propertyId, request);
    }

    @GetMapping("/viewings/mine")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "List viewing appointments for the current broker's properties",
            security = @SecurityRequirement(name = "bearerAuth"))
    public List<ViewingResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return bookings.listForBroker(principal.id());
    }

    @PatchMapping("/viewings/mine/{appointmentId}/status")
    @PreAuthorize("hasRole('BROKER')")
    @Operation(summary = "Update status of a viewing appointment owned by the current broker",
            security = @SecurityRequirement(name = "bearerAuth"))
    public ViewingResponse updateMyViewingStatus(@PathVariable UUID appointmentId,
                                                 @Valid @RequestBody UpdateViewingStatusRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return bookings.updateStatusForBrokerOwner(appointmentId, request.status(), principal.id());
    }
}
```

- [ ] **Step 7: Update `AuthRateLimitFilter`'s IP-based rate-limit groups**

In `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java`,
replace the `VIEWING_SUBMIT_PATH` constant (line 22):

```java
    private static final Pattern VIEWING_REQUEST_OTP_PATH = Pattern.compile("^/properties/[^/]+/viewings/request-otp$");
    private static final Pattern VIEWING_VERIFY_OTP_PATH = Pattern.compile("^/properties/[^/]+/viewings/verify-otp$");
```

Replace the `rateLimitGroup(...)` method:

```java
    private String rateLimitGroup(String path) {
        if ("/auth/login".equals(path)) {
            return "/auth/login";
        }
        if (VIEWING_REQUEST_OTP_PATH.matcher(path).matches()) {
            return "/properties/*/viewings/request-otp";
        }
        if (VIEWING_VERIFY_OTP_PATH.matcher(path).matches()) {
            return "/properties/*/viewings/verify-otp";
        }
        return null;
    }
```

Replace the `rateLimitedGroups()` method:

```java
    private static Map<String, Integer> rateLimitedGroups() {
        Map<String, Integer> groups = new LinkedHashMap<>();
        groups.put("/auth/login", DEFAULT_LIMIT);
        groups.put("/properties/*/viewings/request-otp", DEFAULT_LIMIT);
        groups.put("/properties/*/viewings/verify-otp", DEFAULT_LIMIT);
        return groups;
    }
```

- [ ] **Step 8: Swap the permitAll matcher in `SecurityConfig`**

In `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`,
change (originally line 69):

```java
                        .requestMatchers(HttpMethod.POST, "/properties/*/viewings").permitAll()
```

to:

```java
                        .requestMatchers(HttpMethod.POST,
                                "/properties/*/viewings/request-otp", "/properties/*/viewings/verify-otp").permitAll()
```

- [ ] **Step 9: Update `BookingHttpTest`**

In `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java`,
add an import (after the existing `import` block):

```java
import com.travinh.realty.common.dto.MessageResponse;
```

Replace the 3 tests that reference the deleted endpoint —
`publicCanSubmitViewingWithoutToken`, `submitWithInvalidPhoneReturnsBadRequest`, and
`repeatedViewingSubmissionsAreRateLimited` — with:

```java
    @Test
    void publicCanRequestViewingOtpWithoutToken() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.requestOtp(eq(propertyId), any()))
                .thenReturn(new MessageResponse("Mã OTP đã được gửi qua SMS."));

        mockMvc.perform(post("/properties/{id}/viewings/request-otp", propertyId)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"visitorPhone\":\"0900000000\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Mã OTP đã được gửi qua SMS."));
    }

    @Test
    void requestOtpWithInvalidPhoneReturnsBadRequest() throws Exception {
        UUID propertyId = UUID.randomUUID();
        mockMvc.perform(post("/properties/{id}/viewings/request-otp", propertyId)
                        .header("X-Forwarded-For", "198.51.100.9")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"visitorPhone\":\"0123456789\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void publicCanVerifyOtpAndSubmitViewingWithoutToken() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.verifyOtpAndCreate(eq(propertyId), any())).thenReturn(response(propertyId));

        mockMvc.perform(post("/properties/{id}/viewings/verify-otp", propertyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"booking":{"roomLabel":"Phòng A","visitorName":"Nguyễn Văn A","visitorPhone":"0900000000",
                                 "note":"Muốn xem","occupants":2},"otpCode":"123456"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.visitorName").value("Nguyễn Văn A"));
    }

    @Test
    void verifyOtpWithInvalidOtpReturnsBadRequest() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.verifyOtpAndCreate(eq(propertyId), any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.BAD_REQUEST, "Mã OTP không hợp lệ hoặc đã hết hạn"));

        mockMvc.perform(post("/properties/{id}/viewings/verify-otp", propertyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"booking":{"visitorName":"Nguyễn Văn A","visitorPhone":"0900000000"},"otpCode":"000000"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mã OTP không hợp lệ hoặc đã hết hạn"));
    }

    @Test
    void repeatedViewingOtpRequestsAreRateLimited() throws Exception {
        UUID propertyId = UUID.randomUUID();
        when(bookingService.requestOtp(any(), any())).thenReturn(new MessageResponse("Mã OTP đã được gửi qua SMS."));
        for (int attempt = 0; attempt < 10; attempt++) {
            mockMvc.perform(post("/properties/{id}/viewings/request-otp", propertyId)
                            .header("X-Forwarded-For", "203.0.113.77")
                            .contentType(MediaType.APPLICATION_JSON).content("{\"visitorPhone\":\"0900000000\"}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/properties/{id}/viewings/request-otp", propertyId)
                        .header("X-Forwarded-For", "203.0.113.77")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"visitorPhone\":\"0900000000\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }
```

- [ ] **Step 10: Run tests to verify everything passes**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=BookingServiceTest,BookingHttpTest -f backend-springboot/pom.xml`
Expected: all green.

- [ ] **Step 11: Run the full backend suite**

Run: `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -f backend-springboot/pom.xml`
Expected: `BUILD SUCCESS`, all tests green (includes `ViewingFilterIntegrationTest` and
`AuthServiceRehashIntegrationTest`, which load the full context and exercise the real
`BookingService`/`SecurityConfig` wiring end to end — requires Docker running).

- [ ] **Step 12: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/RequestViewingOtpRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/VerifyViewingOtpRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingController.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java \
        backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingServiceTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java
git commit -m "feat(booking): require SMS OTP verification before creating a viewing appointment

BREAKING CHANGE: POST /properties/{id}/viewings is removed. Frontend must call
POST /properties/{id}/viewings/request-otp then POST .../verify-otp instead."
```

---

## Post-plan follow-up (not part of this plan's tasks)

- Hand off the new 2-step booking contract (`request-otp` → `verify-otp`) to devnguyen — the
  frontend's `services/api.js` booking call will break until updated.
- Manual smoke test after deploy: trigger a real `/auth/forgot-password` and a real
  `/properties/{id}/viewings/request-otp` against the live Brevo/eSMS credentials, confirm the
  email/SMS actually arrives, and confirm the `SmsType`/`Brandname` combination eSMS actually
  accepts for this account (see Task 4's note).
