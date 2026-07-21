# Security Fixes: JWT Revocation, Attributes Cap, Video Signature Check — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 1 HIGH + 2 MEDIUM findings from the backend security audit: JWT sessions surviving a password
reset, unbounded `Property.attributes` JSONB payloads, and video uploads with no real content verification.

**Architecture:** Three independent backend-only fixes in `backend-springboot`. Task 1 adds a
`password_changed_at` watermark on `User`, checked against JWT `iat` on every authenticated request. Task 2
adds size bounds to `PropertyService.normalizeAttributes()`. Task 3 replaces the video upload signature check
from a blacklist model (reject only on detected mismatch) to a whitelist model (reject unless a real
ftyp/EBML signature is found).

**Tech Stack:** Spring Boot 4, Java 25, JUnit 5, Mockito, MockMvc, Testcontainers, Flyway.

## Global Constraints

- **JAVA_HOME must point to JDK 25** before running `mvn test` — this repo's classes are compiled with Java
  25 (`tools.jackson` / Jackson 3.x stack). If `JAVA_HOME` points at JDK 21 (a common default on this
  machine), Maven's forked test JVM fails with `class file version 69.0 ... only recognizes up to 65.0`. Set
  it per-command: `export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"` (bash) before
  every `mvn` invocation in this plan.
- Baseline before this plan: **184/184 backend tests passing** (confirmed via fresh `mvn test` run on branch
  `devlong` @ `8a3e540`, JAVA_HOME set to JDK 25 as above). Any task that changes this count outside what its
  own steps describe is a signal something broke — investigate before moving on.
- English code and comments, Vietnamese only where the codebase already uses it (error messages shown to
  Vietnamese users, e.g. `ResponseStatusException` reasons already in Vietnamese in some services — for this
  plan, all new `ResponseStatusException` messages are in English, matching `PropertyService`'s and
  `LocalMediaStorage`'s existing English-message convention in the exact files this plan touches).
- Conventional commits (`feat:`, `fix:`, `test:`). No `Co-Authored-By` trailer.
- Do not touch `2026-07-11-security-hardening-phase1-design.md`'s scope (IDOR audit, 403→404, account
  rate-limit, BCrypt→Argon2 migration) — that work is happening in parallel on the same branch, in different
  files/methods than this plan touches (only overlap: `JpaUserDetailsService.java`, touched by both — this
  plan only changes the `updatePassword` method body's one line, see Task 1 Step 5).

---

### Task 1: JWT sessions are invalidated when a password actually changes

**Files:**
- Create: `backend-springboot/src/main/resources/db/migration/V19__add_user_password_changed_at.sql`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/UserPrincipal.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JwtService.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/JwtServiceTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java`

**Interfaces:**
- Produces: `User.getPasswordChangedAt(): Instant`, `User.upgradePasswordHash(String): void` (hash-only,
  no timestamp bump — used exclusively by the Argon2 auto-upgrade path), `User.updatePasswordHash(String): void`
  (now also bumps `passwordChangedAt` — used by real password-change call sites, unchanged signature).
  `UserPrincipal` record gains a `passwordChangedAt` component (5th field, before `authorities`).
  `JwtService.isTokenValid(String, UserPrincipal): boolean` — same signature, stricter behavior.
- Consumes: nothing from other tasks (this task is fully self-contained).

This task touches 5 production files that all change together (a field addition cascades through the record
and its consumers) — it runs as one sequential unit, not split across separate tasks, per the spec's guidance.

- [ ] **Step 1: Write the failing tests**

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/JwtServiceTest.java`, add
`import java.time.Instant;` to the imports, then add two new test methods after the existing
`revokedTokenIsRejected` test:

```java
    @Test
    void tokenIssuedBeforePasswordChangedAtIsRejected() {
        User user = User.register("minh.nguyen", "minh@example.com", "hash", "Minh Nguyen", null);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        String token = jwtService.generateToken(user);

        ReflectionTestUtils.setField(user, "passwordChangedAt", Instant.now().plusSeconds(5));

        assertThat(jwtService.isTokenValid(token, UserPrincipal.from(user))).isFalse();
    }

    @Test
    void tokenIssuedAfterPasswordChangedAtIsValid() {
        User user = User.register("minh.nguyen", "minh@example.com", "hash", "Minh Nguyen", null);
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(user, "passwordChangedAt", Instant.now().minusSeconds(5));
        String token = jwtService.generateToken(user);

        assertThat(jwtService.isTokenValid(token, UserPrincipal.from(user))).isTrue();
    }
```

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java`, replace
the existing `resetPasswordWithCorrectOtpUpdatesPasswordHash` test (currently lines 113-125):

```java
    @Test
    void resetPasswordWithCorrectOtpUpdatesPasswordHash() {
        User user = User.register("broker", "broker@congtinland.vn", "old-hash", "Broker", "0900000000");
        ReflectionTestUtils.setField(user, "passwordChangedAt", Instant.now().minus(Duration.ofDays(1)));
        when(users.findByEmail("broker@congtinland.vn")).thenReturn(Optional.of(user));
        String code = otpStore.generate("password-reset:broker@congtinland.vn", Duration.ofMinutes(10));

        MessageResponse response = service.resetPassword(
                new ResetPasswordRequest("broker@congtinland.vn", code, "NewPassword123"));

        assertThat(response.message()).isEqualTo("Mật khẩu đã được đặt lại.");
        assertThat(user.getPasswordHash()).isNotEqualTo("old-hash");
        assertThat(passwordEncoder.matches("NewPassword123", user.getPasswordHash())).isTrue();
        assertThat(user.getPasswordChangedAt()).isAfter(Instant.now().minusSeconds(10));
    }
```

Add these two imports to `PasswordResetServiceTest.java` (it already imports `java.time.Duration` and
`org.springframework.test.util.ReflectionTestUtils` is NOT currently imported there — add both):

```java
import java.time.Instant;
import org.springframework.test.util.ReflectionTestUtils;
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=JwtServiceTest,PasswordResetServiceTest
```

Expected: **compile failure** — `ReflectionTestUtils.setField(user, "passwordChangedAt", ...)` fails because
`User` has no such field yet, and `user.getPasswordChangedAt()` doesn't exist. This is the RED signal for
this task: the test files describe an API that doesn't exist until Step 3 lands.

- [ ] **Step 3: Add `password_changed_at` to the database schema**

Create `backend-springboot/src/main/resources/db/migration/V19__add_user_password_changed_at.sql`:

```sql
ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

- [ ] **Step 4: Add the field to `User` and split hash-update methods**

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`:

Add the field after `createdAt` (currently line 64, right before the closing of the field block at line 65):

```java
    @Column(name = "password_changed_at", nullable = false)
    private Instant passwordChangedAt;
```

In `register()` (currently lines 69-80), add one line before `return user;`:

```java
    public static User register(String username, String email, String passwordHash,
                                String fullName, String phone) {
        User user = new User();
        user.username = username;
        user.email = email;
        user.passwordHash = passwordHash;
        user.fullName = fullName;
        user.phone = phone;
        user.role = UserRole.USER;
        user.status = UserStatus.ACTIVE;
        user.passwordChangedAt = Instant.now();
        return user;
    }
```

(`createBroker()` calls `register()` internally, so it inherits this automatically — no change needed there.)

Replace `updatePasswordHash()` (currently lines 96-98) and add a new sibling method right after it:

```java
    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
        this.passwordChangedAt = Instant.now();
    }

    public void upgradePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
```

Add a getter after `getCreatedAt()` (currently line 119):

```java
    public Instant getPasswordChangedAt() { return passwordChangedAt; }
```

- [ ] **Step 5: Point the Argon2 auto-upgrade path at the non-bumping method**

In `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java`,
change line 26 inside `updatePassword()`:

```java
    // before:
    entity.updatePasswordHash(newPassword);
    // after:
    entity.upgradePasswordHash(newPassword);
```

This is the only line this plan changes in this file — it's the boundary with the parallel Argon2-migration
work, and this is deliberately a hash-only update so a silent format upgrade on login never logs a user out
of their other devices.

- [ ] **Step 6: Expose the timestamp through `UserPrincipal`**

Replace `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/UserPrincipal.java` in full:

```java
package com.travinh.realty.modules.auth.security;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.model.UserStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record UserPrincipal(UUID id, String email, String passwordHash, UserStatus status,
                            Instant passwordChangedAt, Collection<? extends GrantedAuthority> authorities)
        implements UserDetails {
    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getId(), user.getEmail(), user.getPasswordHash(), user.getStatus(),
                user.getPasswordChangedAt(), List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return passwordHash; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public boolean isEnabled() { return status == UserStatus.ACTIVE; }
}
```

- [ ] **Step 7: Reject tokens issued before the watermark**

In `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JwtService.java`, replace
`isTokenValid()` (currently lines 44-49):

```java
    public boolean isTokenValid(String token, UserPrincipal principal) {
        Claims claims = parseClaims(token);
        return claims.getSubject().equals(principal.getUsername())
                && claims.getExpiration().after(new Date())
                && !revokedTokens.isRevoked(claims.getId())
                && !claims.getIssuedAt().toInstant().isBefore(principal.passwordChangedAt());
    }
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=JwtServiceTest,PasswordResetServiceTest,JwtAuthenticationFilterTest,UserProfileServiceTest,AuthServiceTest,AuthServiceRehashIntegrationTest
```

Expected: all PASS. This set covers every test file that constructs a `User`/`UserPrincipal` or exercises
password-change/login flows — confirms the new required field doesn't break anything upstream.

- [ ] **Step 9: Run the full backend suite**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test
```

Expected: `Tests run: 186, Failures: 0, Errors: 0, Skipped: 0` (184 baseline + 2 new `JwtServiceTest` cases;
`PasswordResetServiceTest`'s modified test doesn't change the total count).

- [ ] **Step 10: Commit**

```bash
git add backend-springboot/src/main/resources/db/migration/V19__add_user_password_changed_at.sql \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/UserPrincipal.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JwtService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/JwtServiceTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java
git commit -m "fix(auth): invalidate JWT sessions issued before a password change"
```

---

### Task 2: Cap the size of `Property.attributes`

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java`

**Interfaces:**
- Consumes: nothing from Task 1 or 3.
- Produces: nothing consumed by other tasks — `normalizeAttributes()` stays `private`.

- [ ] **Step 1: Write the failing tests**

In `backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java`, add 3 new
test methods after `brokerCreatesAvailablePropertyAndUserCannotCreate` (currently ends at line 165). These
reuse the exact broker-setup pattern that test already uses:

```java
    @Test
    void creatingPropertyWithTooManyAttributeEntriesIsRejected() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Category category = category(1L, "Trọ", "tro");
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(categories.findBySlug("tro")).thenReturn(Optional.of(category));

        StringBuilder attributes = new StringBuilder();
        for (int i = 0; i < 21; i++) {
            if (i > 0) attributes.append(",");
            attributes.append("\"key").append(i).append("\":\"value\"");
        }
        String payload = """
                {"categorySlug":"tro","title":"Phòng trọ","address":"Trà Vinh","price":1500000,"attributes":{%s}}
                """.formatted(attributes);

        mockMvc.perform(post("/properties").header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Too many attribute entries (max 20)"));
    }

    @Test
    void creatingPropertyWithOversizedAttributeValueIsRejected() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Category category = category(1L, "Trọ", "tro");
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(categories.findBySlug("tro")).thenReturn(Optional.of(category));

        String hugeValue = "a".repeat(10_001);
        String payload = """
                {"categorySlug":"tro","title":"Phòng trọ","address":"Trà Vinh","price":1500000,
                 "attributes":{"description":"%s"}}
                """.formatted(hugeValue);

        mockMvc.perform(post("/properties").header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Attribute value too long for key: description"));
    }

    @Test
    void creatingPropertyWithMalformedAttributeKeyIsRejected() throws Exception {
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Category category = category(1L, "Trọ", "tro");
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(categories.findBySlug("tro")).thenReturn(Optional.of(category));

        String payload = """
                {"categorySlug":"tro","title":"Phòng trọ","address":"Trà Vinh","price":1500000,
                 "attributes":{"bad key":"value"}}
                """;

        mockMvc.perform(post("/properties").header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid attribute filter key"));
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=PropertyHttpTest
```

Expected: FAIL — all 3 new tests get `201 Created` instead of `400 Bad Request` (today's `normalizeAttributes()`
accepts anything).

- [ ] **Step 3: Bound `normalizeAttributes()`**

In `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java`, add 2
constants after the existing `ATTRIBUTE_KEY_PATTERN` constant (currently line 36):

```java
    private static final int MAX_ATTRIBUTE_ENTRIES = 20;
    private static final int MAX_ATTRIBUTE_VALUE_LENGTH = 10_000;
```

Replace `normalizeAttributes()` (currently lines 185-190):

```java
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=PropertyHttpTest,PropertySearchRepositoryIntegrationTest
```

Expected: all PASS, including the pre-existing `brokerCreatesAvailablePropertyAndUserCannotCreate` test
(regression check — its `attributes":{"area":30,"rooms":1,"has_ac":true}` payload has 3 entries, well under
the cap, and keys match `^[A-Za-z0-9_.-]+$`) and `invalidAttributeFilterKeyIsRejectedBeforeRepositorySearch`
(search-path key validation, untouched by this change).

- [ ] **Step 5: Run the full backend suite**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test
```

Expected: `Tests run: 189, Failures: 0, Errors: 0, Skipped: 0` (186 after Task 1 + 3 new tests here). If
running this task before Task 1, expect 187 instead (184 + 3).

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java
git commit -m "fix(property): bound attributes entry count and value length"
```

---

### Task 3: Video uploads must match a real container signature

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaConcurrencyIntegrationTest.java`

**Interfaces:**
- Consumes: nothing from Task 1 or 2.
- Produces: nothing consumed by other tasks.

**Important — which existing fixtures actually need real bytes:** `MediaService.uploadVideoFile()` calls
`requireOwnedPropertyForUpdate()` then `ensureNoVideo()` *before* `storage.store()` (confirmed by reading
`MediaService.java:65-93`). So of the 4 places in the test suite that currently upload fake
`"video".getBytes()` declared as `video/mp4`:
- `MediaHttpTest.java:231` (`videoLinkAndVideoFileAllowOnlyOneVideo`) — `existsByPropertyIdAndMediaTypeIn`
  mocked `true`, so `ensureNoVideo()` throws before `storage.store()` is ever reached. **Does not need
  updating.**
- `MediaHttpTest.java:276` (`missingPropertyReturns404ForMediaOperations`) — `findByIdForUpdate` returns
  empty, so `requireOwnedPropertyForUpdate()` throws 404 before storage. **Does not need updating.**
- `MediaHttpTest.java:252` (`brokerUploadsVideoFileAndThenVideoLinkIsRejected`) — first call, no existing
  video, actually reaches `storage.store()` and expects `201 Created`. **Needs real ftyp bytes.**
- `MediaConcurrencyIntegrationTest.java:99` (`concurrentVideoFileAndVideoLinkCannotCreateMoreThanOneVideo`) —
  races against `addVideoLink`; the video-file branch can win the race and must actually succeed when it
  does. **Needs real ftyp bytes.**

- [ ] **Step 1: Write the failing tests**

In `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java`, add 3 new test
methods after `brokerUploadsVideoFileAndThenVideoLinkIsRejected` (currently ends at line 265):

```java
    @Test
    void videoFileWithUnrecognizedContentIsRejected() throws Exception {
        User broker = user("broker-bad-video@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.existsByPropertyIdAndMediaTypeIn(any(), any())).thenReturn(false);

        MockMultipartFile fake = new MockMultipartFile("file", "tour.mp4", "video/mp4", "not-a-video".getBytes());
        mockMvc.perform(multipart("/properties/{propertyId}/media/video-file", property.getId()).file(fake)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.message").value("Media content does not match the declared content type"));
    }

    @Test
    void videoFileDeclaredAsMp4ButActuallyPngIsRejected() throws Exception {
        User broker = user("broker-mismatched-video@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.existsByPropertyIdAndMediaTypeIn(any(), any())).thenReturn(false);

        byte[] pngHeader = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0};
        MockMultipartFile disguised = new MockMultipartFile("file", "tour.mp4", "video/mp4", pngHeader);
        mockMvc.perform(multipart("/properties/{propertyId}/media/video-file", property.getId()).file(disguised)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.message").value("Media content does not match the declared content type"));
    }

    @Test
    void brokerUploadsWebmVideoWithRealSignature() throws Exception {
        User broker = user("broker-webm@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        Property property = property(broker, PropertyStatus.AVAILABLE);
        authenticate(broker);
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        when(media.existsByPropertyIdAndMediaTypeIn(any(), any())).thenReturn(false);
        when(media.saveAndFlush(any(Media.class))).thenAnswer(invocation -> {
            Media saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", UUID.randomUUID());
            return saved;
        });

        byte[] webmHeader = {0x1a, 0x45, (byte) 0xdf, (byte) 0xa3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
        MockMultipartFile video = new MockMultipartFile("file", "tour.webm", "video/webm", webmHeader);
        mockMvc.perform(multipart("/properties/{propertyId}/media/video-file", property.getId()).file(video)
                        .header("Authorization", bearer(broker)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mediaType").value("VIDEO_FILE"));
    }
```

Then update the 2 fixtures identified above to use real ftyp-box bytes instead of `"video".getBytes()`.

In `MediaHttpTest.java`, line 252 (inside `brokerUploadsVideoFileAndThenVideoLinkIsRejected`), replace:

```java
        MockMultipartFile video = new MockMultipartFile("file", "tour.mp4", "video/mp4", "video".getBytes());
```

with:

```java
        byte[] mp4Header = {0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0};
        MockMultipartFile video = new MockMultipartFile("file", "tour.mp4", "video/mp4", mp4Header);
```

In `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaConcurrencyIntegrationTest.java`,
line 99, replace:

```java
                        service.uploadVideoFile(fixture.principal().id(), fixture.property().getId(),
                                new MockMultipartFile("file", "tour.mp4", "video/mp4", "video".getBytes()));
```

with:

```java
                        service.uploadVideoFile(fixture.principal().id(), fixture.property().getId(),
                                new MockMultipartFile("file", "tour.mp4", "video/mp4",
                                        new byte[]{0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 2, 0}));
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=MediaHttpTest,MediaConcurrencyIntegrationTest
```

Expected: the 3 new tests FAIL (today's code lets `"not-a-video"` and the fake PNG-declared-as-mp4 through
with `201 Created` since no video signature detection exists yet). The 2 updated fixtures should still PASS
at this point — real ftyp bytes are also unrecognized by today's code, which falls through to "no known
signature, allow it," same as the fake bytes did.

- [ ] **Step 3: Add video signature detection**

In `backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java`, add
2 new branches to `detectKnownContentType()` (currently lines 134-152), after the existing WEBP check and
before `return null;`:

```java
        if (read >= 8 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70) {
            return "video/mp4";
        }
        if (read >= 4 && header[0] == 0x1a && header[1] == 0x45
                && header[2] == (byte) 0xdf && header[3] == (byte) 0xa3) {
            return "video/webm";
        }
```

(The full method now returns one of the 4 image types, `"video/mp4"`, `"video/webm"`, or `null`.)

- [ ] **Step 4: Enforce a video whitelist in `validateFileSignature()`**

In the same file, replace `validateFileSignature()` (currently lines 111-132):

```java
    private void validateFileSignature(MultipartFile file, String contentType) {
        byte[] header = new byte[16];
        int read;
        try (InputStream input = file.getInputStream()) {
            read = input.read(header);
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Could not read media file", exception);
        }
        if (read <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Media file is required");
        }

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
        return "video/mp4".equals(declaredContentType) || "video/quicktime".equals(declaredContentType);
    }
```

This leaves `detectKnownContentType()` and `looksLikeActiveContent()` otherwise unchanged, and leaves the
image path's behavior (blacklist model: unrecognized bytes still pass, only a detected mismatch is rejected)
exactly as it was.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=MediaHttpTest,MediaConcurrencyIntegrationTest
```

Expected: all PASS, including every pre-existing image test in `MediaHttpTest` (e.g.
`brokerUploadsImageToLocalStorageAndPersistsUrl`'s `"fake-png".getBytes()` fixture at line 111 — confirms the
image path's blacklist behavior is untouched) and `videoLinkAndVideoFileAllowOnlyOneVideo` /
`missingPropertyReturns404ForMediaOperations` (confirms the 2 fixtures left as fake bytes still pass, because
they never reach signature validation).

- [ ] **Step 6: Run the full backend suite**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test
```

Expected: `Tests run: 192, Failures: 0, Errors: 0, Skipped: 0` if run after Tasks 1 and 2 (189 + 3 new video
tests here). If this task runs first or in a different order, adjust the expected baseline accordingly (each
task adds a fixed number of tests: Task 1 adds 2, Task 2 adds 3, Task 3 adds 3 — total after all 3 is
184 + 2 + 3 + 3 = 192, regardless of order).

- [ ] **Step 7: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaConcurrencyIntegrationTest.java
git commit -m "fix(media): require a real container signature for video uploads"
```
