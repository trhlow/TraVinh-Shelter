# Nhóm D (phần 1) — Bỏ Zalo, thêm YouTube, dedup danh mục — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Zalo entirely (backend column + all frontend UI), add a YouTube icon to the footer, and fix the homepage's "Khám phá theo loại hình" category cards down to the 3 real categories.

**Architecture:** Four independent tasks, each producing a working, testable slice: (1) backend removes the `zalo_url` column and every field/DTO/test referencing it via a new Flyway migration; (2) frontend removes all Zalo UI (profile form field, broker card icon, property detail "Chat Zalo" button) plus the now-unused `--color-zalo` token; (3) frontend adds a `Youtube` icon to the footer's existing social-icon list; (4) frontend replaces `HomePage.jsx`'s hardcoded 5-entry `CATEGORY_CARDS` (3 duplicates, 1 mislabeled) with the 3 real categories from `data/locations.js`. Tasks 1 and 2 both remove Zalo but touch entirely separate codebases/toolchains (Java/Maven vs. JS/Vitest) with no shared files — safe to implement and review independently.

**Tech Stack:** Spring Boot 3.4.5 / Java 21 / PostgreSQL 18 / Flyway (backend), React 19 / Vitest + Testing Library (frontend).

## Global Constraints

- Flyway migrations are immutable once applied — never edit `V1` through `V17`. The new migration for this plan is `V18__drop_broker_zalo_url.sql`.
- Conventional commits, English commit messages, no `Co-Authored-By` trailer (per project's workflow rules).
- No hard-coded `#hex` colors in JSX, no `inline style` beyond the project's existing exceptions (not applicable to any change in this plan — no new colors or styles introduced).
- Backend tests: `cd backend-springboot && mvn test`. Record the exact pass count before Task 1's changes (do not assume a stale number from an earlier session) and confirm it holds (extra tests deleted are expected; no test should fail).
- Frontend tests: `cd frontend-react && npm test -- --run`. Baseline before this plan: 146/146 passing.

---

### Task 1: Backend — remove `zaloUrl` from entity, DTOs, service, and add drop-column migration

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateProfileRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UserProfileResponse.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CurrentUserProfileResponse.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/BrokerContactResponse.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java`
- Create: `backend-springboot/src/main/resources/db/migration/V18__drop_broker_zalo_url.sql`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileServiceTest.java`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileHttpTest.java`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponseTest.java`
- Modify: `backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminBrokerControllerHttpTest.java`

**Interfaces:**
- Produces: `User.updateProfile(String fullName, String phone, String facebookUrl, String tiktokUrl)` (was 5-arg with `zaloUrl` as 3rd param — now 4-arg). `UpdateProfileRequest(String fullName, String phone, String facebookUrl, String tiktokUrl)` (was 5-component record). `UserProfileResponse`, `CurrentUserProfileResponse`, `BrokerContactResponse`, `BrokerSummaryResponse` all lose their `zaloUrl` component — every other component keeps its exact name, type, and position.
- No later task (2, 3, 4) depends on these backend types — they are frontend-only and consume the API only through the mock layer, not these Java types directly.

- [ ] **Step 1: Record the current backend test baseline**

Run: `cd "d:/TraVinh Shelter/backend-springboot" && mvn test`
Record the printed `Tests run: X, Failures: 0, Errors: 0, Skipped: Y` totals — this is your baseline to compare against after this task's changes (some test count reduction is expected since `profileUpdateRejectsInvalidSocialLinkFormat`, a test solely about `zaloUrl`'s validation pattern, is deleted in Step 6; no other test should be removed or should fail).

- [ ] **Step 2: Update `User.java` — remove the `zaloUrl` field, getter, and constructor param**

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`, delete this field (lines 43-44):

```java
    @Column(name = "zalo_url", length = 2048)
    private String zaloUrl;
```

Change the `updateProfile` method (line 92-98) from:

```java
    public void updateProfile(String fullName, String phone, String zaloUrl, String facebookUrl, String tiktokUrl) {
        this.fullName = fullName;
        this.phone = phone;
        this.zaloUrl = zaloUrl;
        this.facebookUrl = facebookUrl;
        this.tiktokUrl = tiktokUrl;
    }
```

to:

```java
    public void updateProfile(String fullName, String phone, String facebookUrl, String tiktokUrl) {
        this.fullName = fullName;
        this.phone = phone;
        this.facebookUrl = facebookUrl;
        this.tiktokUrl = tiktokUrl;
    }
```

Delete this getter (line 118):

```java
    public String getZaloUrl() { return zaloUrl; }
```

- [ ] **Step 3: Update the 4 DTOs — remove `zaloUrl` from each record**

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateProfileRequest.java`, change:

```java
public record UpdateProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 30) String phone,
        @Pattern(regexp = "^$|^https?://.*", message = "zaloUrl must be a valid http(s) URL") @Size(max = 2048) String zaloUrl,
        @Pattern(regexp = "^$|^https?://.*", message = "facebookUrl must be a valid http(s) URL") @Size(max = 2048) String facebookUrl,
        @Pattern(regexp = "^$|^https?://.*", message = "tiktokUrl must be a valid http(s) URL") @Size(max = 2048) String tiktokUrl
) {
}
```

to:

```java
public record UpdateProfileRequest(
        @NotBlank @Size(max = 150) String fullName,
        @Size(max = 30) String phone,
        @Pattern(regexp = "^$|^https?://.*", message = "facebookUrl must be a valid http(s) URL") @Size(max = 2048) String facebookUrl,
        @Pattern(regexp = "^$|^https?://.*", message = "tiktokUrl must be a valid http(s) URL") @Size(max = 2048) String tiktokUrl
) {
}
```

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UserProfileResponse.java`, change:

```java
public record UserProfileResponse(UUID id, String username, String fullName, String phone, String avatarUrl, String email,
                                  String zaloUrl, String facebookUrl, String tiktokUrl,
                                  UserRole role, UserStatus status, Instant createdAt) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getFullName(), user.getPhone(),
                user.getAvatarUrl(), user.getEmail(), user.getZaloUrl(), user.getFacebookUrl(), user.getTiktokUrl(),
                user.getRole(), user.getStatus(), user.getCreatedAt());
    }
}
```

to:

```java
public record UserProfileResponse(UUID id, String username, String fullName, String phone, String avatarUrl, String email,
                                  String facebookUrl, String tiktokUrl,
                                  UserRole role, UserStatus status, Instant createdAt) {
    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user.getId(), user.getUsername(), user.getFullName(), user.getPhone(),
                user.getAvatarUrl(), user.getEmail(), user.getFacebookUrl(), user.getTiktokUrl(),
                user.getRole(), user.getStatus(), user.getCreatedAt());
    }
}
```

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CurrentUserProfileResponse.java`, change:

```java
public record CurrentUserProfileResponse(UUID id, String username, String fullName, String phone, String avatarUrl,
                                         String email, String zaloUrl, String facebookUrl, String tiktokUrl,
                                         UserRole role, UserStatus status, Instant createdAt) {
    public static CurrentUserProfileResponse from(User user) {
        return new CurrentUserProfileResponse(user.getId(), user.getUsername(), user.getFullName(), user.getPhone(),
                user.getAvatarUrl(), user.getEmail(), user.getZaloUrl(), user.getFacebookUrl(), user.getTiktokUrl(),
                user.getRole(), user.getStatus(), user.getCreatedAt());
    }
}
```

to:

```java
public record CurrentUserProfileResponse(UUID id, String username, String fullName, String phone, String avatarUrl,
                                         String email, String facebookUrl, String tiktokUrl,
                                         UserRole role, UserStatus status, Instant createdAt) {
    public static CurrentUserProfileResponse from(User user) {
        return new CurrentUserProfileResponse(user.getId(), user.getUsername(), user.getFullName(), user.getPhone(),
                user.getAvatarUrl(), user.getEmail(), user.getFacebookUrl(), user.getTiktokUrl(),
                user.getRole(), user.getStatus(), user.getCreatedAt());
    }
}
```

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/BrokerContactResponse.java`, change:

```java
public record BrokerContactResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String zaloUrl, String facebookUrl, String tiktokUrl) {
    public static BrokerContactResponse from(User user) {
        return new BrokerContactResponse(user.getId(), user.getFullName(), user.getPhone(), user.getAvatarUrl(),
                user.getEmail(), user.getZaloUrl(), user.getFacebookUrl(), user.getTiktokUrl());
    }
}
```

to:

```java
public record BrokerContactResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String facebookUrl, String tiktokUrl) {
    public static BrokerContactResponse from(User user) {
        return new BrokerContactResponse(user.getId(), user.getFullName(), user.getPhone(), user.getAvatarUrl(),
                user.getEmail(), user.getFacebookUrl(), user.getTiktokUrl());
    }
}
```

In `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java`, change:

```java
public record BrokerSummaryResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String zaloUrl, String facebookUrl, String tiktokUrl) {
    public static BrokerSummaryResponse from(User broker) {
        return new BrokerSummaryResponse(broker.getId(), broker.getFullName(), broker.getPhone(),
                broker.getAvatarUrl(), broker.getEmail(), broker.getZaloUrl(), broker.getFacebookUrl(),
                broker.getTiktokUrl());
    }
}
```

to:

```java
public record BrokerSummaryResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String facebookUrl, String tiktokUrl) {
    public static BrokerSummaryResponse from(User broker) {
        return new BrokerSummaryResponse(broker.getId(), broker.getFullName(), broker.getPhone(),
                broker.getAvatarUrl(), broker.getEmail(), broker.getFacebookUrl(),
                broker.getTiktokUrl());
    }
}
```

- [ ] **Step 4: Update `UserProfileService.java`**

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java`, change `updateCurrentProfile` (lines 50-72) from:

```java
    @Transactional
    public CurrentUserProfileResponse updateCurrentProfile(UserPrincipal principal, UpdateProfileRequest request) {
        User user = findUser(principal.id());
        String phone = normalizeOptional(request.phone());
        if (user.getRole() == UserRole.BROKER && phone == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Broker profile requires a phone number");
        }
        if (phone != null && users.existsByNormalizedPhoneAndIdNot(normalizePhoneForLookup(phone), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered");
        }
        String zaloUrl = normalizeOptional(request.zaloUrl());
        String facebookUrl = normalizeOptional(request.facebookUrl());
        String tiktokUrl = normalizeOptional(request.tiktokUrl());
        try {
            user.updateProfile(request.fullName().trim(), phone, zaloUrl, facebookUrl, tiktokUrl);
            users.flush();
            return CurrentUserProfileResponse.from(user);
        } catch (DataIntegrityViolationException exception) {
            if (UserIdentityConstraints.isDuplicatePhone(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered", exception);
            }
            throw exception;
        }
    }
```

to:

```java
    @Transactional
    public CurrentUserProfileResponse updateCurrentProfile(UserPrincipal principal, UpdateProfileRequest request) {
        User user = findUser(principal.id());
        String phone = normalizeOptional(request.phone());
        if (user.getRole() == UserRole.BROKER && phone == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Broker profile requires a phone number");
        }
        if (phone != null && users.existsByNormalizedPhoneAndIdNot(normalizePhoneForLookup(phone), user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered");
        }
        String facebookUrl = normalizeOptional(request.facebookUrl());
        String tiktokUrl = normalizeOptional(request.tiktokUrl());
        try {
            user.updateProfile(request.fullName().trim(), phone, facebookUrl, tiktokUrl);
            users.flush();
            return CurrentUserProfileResponse.from(user);
        } catch (DataIntegrityViolationException exception) {
            if (UserIdentityConstraints.isDuplicatePhone(exception)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already registered", exception);
            }
            throw exception;
        }
    }
```

- [ ] **Step 5: Create the drop-column migration**

Create `backend-springboot/src/main/resources/db/migration/V18__drop_broker_zalo_url.sql`:

```sql
ALTER TABLE users DROP COLUMN zalo_url;
```

- [ ] **Step 6: Update `UserProfileServiceTest.java`**

In `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileServiceTest.java`:

Change `updatesOwnUserProfile` (line 39-49), the `new UpdateProfileRequest(...)` call on line 45, from:

```java
        CurrentUserProfileResponse response = service.updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("New name", "0900000000", null, null, null));
```

to:

```java
        CurrentUserProfileResponse response = service.updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("New name", "0900000000", null, null));
```

Change `updatesOwnUserProfileIncludingSocialLinks` (line 51-63) from:

```java
    @Test
    void updatesOwnUserProfileIncludingSocialLinks() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "Old name", null);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        CurrentUserProfileResponse response = service().updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("Old name", "0900000000", "https://zalo.me/0900000000",
                        "https://facebook.com/user", "https://tiktok.com/@user"));

        assertThat(response.zaloUrl()).isEqualTo("https://zalo.me/0900000000");
        assertThat(response.facebookUrl()).isEqualTo("https://facebook.com/user");
        assertThat(response.tiktokUrl()).isEqualTo("https://tiktok.com/@user");
    }
```

to:

```java
    @Test
    void updatesOwnUserProfileIncludingSocialLinks() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "Old name", null);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        CurrentUserProfileResponse response = service().updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("Old name", "0900000000",
                        "https://facebook.com/user", "https://tiktok.com/@user"));

        assertThat(response.facebookUrl()).isEqualTo("https://facebook.com/user");
        assertThat(response.tiktokUrl()).isEqualTo("https://tiktok.com/@user");
    }
```

Change `clearingSocialLinksWithBlankOrNullStoresNull` (line 65-84) from:

```java
    @Test
    void clearingSocialLinksWithBlankOrNullStoresNull() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "User", null);
        ReflectionTestUtils.setField(user, "zaloUrl", "https://zalo.me/existing");
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        for (String blank : new String[]{null, "", "   "}) {
            CurrentUserProfileResponse response = service().updateCurrentProfile(UserPrincipal.from(user),
                    new UpdateProfileRequest("User", "0900000000", blank, blank, blank));

            assertThat(response.zaloUrl()).isNull();
            assertThat(response.facebookUrl()).isNull();
            assertThat(response.tiktokUrl()).isNull();
            assertThat(user.getZaloUrl()).isNull();
            assertThat(user.getFacebookUrl()).isNull();
            assertThat(user.getTiktokUrl()).isNull();
        }
    }
```

to:

```java
    @Test
    void clearingSocialLinksWithBlankOrNullStoresNull() {
        User user = user(UserRole.USER, UserStatus.ACTIVE, "User", null);
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        for (String blank : new String[]{null, "", "   "}) {
            CurrentUserProfileResponse response = service().updateCurrentProfile(UserPrincipal.from(user),
                    new UpdateProfileRequest("User", "0900000000", blank, blank));

            assertThat(response.facebookUrl()).isNull();
            assertThat(response.tiktokUrl()).isNull();
            assertThat(user.getFacebookUrl()).isNull();
            assertThat(user.getTiktokUrl()).isNull();
        }
    }
```

Change `brokerCannotRemoveRequiredPhoneNumber` (line 86-96), the call on line 91-92, from:

```java
        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(broker),
                new UpdateProfileRequest("Broker", "  ", null, null, null)))
```

to:

```java
        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(broker),
                new UpdateProfileRequest("Broker", "  ", null, null)))
```

Change `profileUpdateRejectsDuplicatePhone` (line 98-109), the call on line 104-105, from:

```java
        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("User", "0911 111 111", null, null, null)))
```

to:

```java
        assertThatThrownBy(() -> service().updateCurrentProfile(UserPrincipal.from(user),
                new UpdateProfileRequest("User", "0911 111 111", null, null)))
```

- [ ] **Step 7: Update `UserProfileHttpTest.java`**

In `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileHttpTest.java`:

Change `profileUpdateAcceptsAndReturnsSocialLinks` (line 138-152) from:

```java
    @Test
    void profileUpdateAcceptsAndReturnsSocialLinks() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"0900000000","zaloUrl":"https://zalo.me/0900000000","facebookUrl":"https://facebook.com/user","tiktokUrl":"https://tiktok.com/@user"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.zaloUrl").value("https://zalo.me/0900000000"))
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/user"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@user"));
    }
```

to:

```java
    @Test
    void profileUpdateAcceptsAndReturnsSocialLinks() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"0900000000","facebookUrl":"https://facebook.com/user","tiktokUrl":"https://tiktok.com/@user"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/user"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@user"));
    }
```

Delete `profileUpdateRejectsInvalidSocialLinkFormat` entirely (line 154-167) — it tests `zaloUrl`'s `@Pattern` validation exclusively, which no longer exists:

```java
    @Test
    void profileUpdateRejectsInvalidSocialLinkFormat() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                        {"fullName":"User","phone":"0900000000","zaloUrl":"not-a-url"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.fieldErrors.zaloUrl").exists());
    }
```

Change `regularUserCanClearSocialLinksThroughEveryNullablePayloadForm` (line 169-195) from:

```java
    @Test
    void regularUserCanClearSocialLinksThroughEveryNullablePayloadForm() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        ReflectionTestUtils.setField(user, "zaloUrl", "https://zalo.me/existing");
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        for (String payload : new String[]{
                "{\"fullName\":\"User\",\"phone\":\"0900000000\",\"zaloUrl\":null,\"facebookUrl\":null,\"tiktokUrl\":null}",
                "{\"fullName\":\"User\",\"phone\":\"0900000000\",\"zaloUrl\":\"\",\"facebookUrl\":\"\",\"tiktokUrl\":\"\"}",
                "{\"fullName\":\"User\",\"phone\":\"0900000000\"}"}) {
            mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                            .contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.zaloUrl").doesNotExist())
                    .andExpect(jsonPath("$.facebookUrl").doesNotExist())
                    .andExpect(jsonPath("$.tiktokUrl").doesNotExist());
            org.assertj.core.api.Assertions.assertThat(user.getZaloUrl()).isNull();
            org.assertj.core.api.Assertions.assertThat(user.getFacebookUrl()).isNull();
            org.assertj.core.api.Assertions.assertThat(user.getTiktokUrl()).isNull();
            ReflectionTestUtils.setField(user, "zaloUrl", "https://zalo.me/existing");
            ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
            ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        }
    }
```

to:

```java
    @Test
    void regularUserCanClearSocialLinksThroughEveryNullablePayloadForm() throws Exception {
        User user = user("user@example.com", UserRole.USER, UserStatus.ACTIVE, "User", "0900000000");
        ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
        ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        authenticate(user);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        for (String payload : new String[]{
                "{\"fullName\":\"User\",\"phone\":\"0900000000\",\"facebookUrl\":null,\"tiktokUrl\":null}",
                "{\"fullName\":\"User\",\"phone\":\"0900000000\",\"facebookUrl\":\"\",\"tiktokUrl\":\"\"}",
                "{\"fullName\":\"User\",\"phone\":\"0900000000\"}"}) {
            mockMvc.perform(patch("/users/me").header("Authorization", bearer(user))
                            .contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.facebookUrl").doesNotExist())
                    .andExpect(jsonPath("$.tiktokUrl").doesNotExist());
            org.assertj.core.api.Assertions.assertThat(user.getFacebookUrl()).isNull();
            org.assertj.core.api.Assertions.assertThat(user.getTiktokUrl()).isNull();
            ReflectionTestUtils.setField(user, "facebookUrl", "https://facebook.com/existing");
            ReflectionTestUtils.setField(user, "tiktokUrl", "https://tiktok.com/@existing");
        }
    }
```

Change `publicBrokerContactOnlyExposesActiveBrokers` (line 197+), the `zaloUrl` setup and assertion lines (200 and 207), from:

```java
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        ReflectionTestUtils.setField(broker, "zaloUrl", "https://zalo.me/broker");
        ReflectionTestUtils.setField(broker, "facebookUrl", "https://facebook.com/broker");
        ReflectionTestUtils.setField(broker, "tiktokUrl", "https://tiktok.com/@broker");
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        mockMvc.perform(get("/brokers/{id}", broker.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0900000000"))
                .andExpect(jsonPath("$.zaloUrl").value("https://zalo.me/broker"))
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/broker"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@broker"))
```

to:

```java
        User broker = user("broker@example.com", UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
        ReflectionTestUtils.setField(broker, "facebookUrl", "https://facebook.com/broker");
        ReflectionTestUtils.setField(broker, "tiktokUrl", "https://tiktok.com/@broker");
        when(users.findById(broker.getId())).thenReturn(Optional.of(broker));
        mockMvc.perform(get("/brokers/{id}", broker.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0900000000"))
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/broker"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@broker"))
```

- [ ] **Step 8: Update `BrokerSummaryResponseTest.java`**

In `backend-springboot/src/test/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponseTest.java`, change `fromMapsSocialLinksIncludingTiktokUrl` from:

```java
    void fromMapsSocialLinksIncludingTiktokUrl() {
        User broker = User.createBroker("linh", "linh@example.com", "hash", "Trần Mỹ Linh", "0900000111");
        broker.updateProfile("Trần Mỹ Linh", "0900000111", "https://zalo.me/linh",
                "https://facebook.com/linh", "https://tiktok.com/@linh");

        BrokerSummaryResponse response = BrokerSummaryResponse.from(broker);

        assertThat(response.zaloUrl()).isEqualTo("https://zalo.me/linh");
        assertThat(response.facebookUrl()).isEqualTo("https://facebook.com/linh");
        assertThat(response.tiktokUrl()).isEqualTo("https://tiktok.com/@linh");
```

to:

```java
    void fromMapsSocialLinksIncludingTiktokUrl() {
        User broker = User.createBroker("linh", "linh@example.com", "hash", "Trần Mỹ Linh", "0900000111");
        broker.updateProfile("Trần Mỹ Linh", "0900000111",
                "https://facebook.com/linh", "https://tiktok.com/@linh");

        BrokerSummaryResponse response = BrokerSummaryResponse.from(broker);

        assertThat(response.facebookUrl()).isEqualTo("https://facebook.com/linh");
        assertThat(response.tiktokUrl()).isEqualTo("https://tiktok.com/@linh");
```

(Leave the rest of the test method — everything after this excerpt — unchanged; only these lines reference `zaloUrl`.)

- [ ] **Step 9: Update `AdminBrokerControllerHttpTest.java`**

In `backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminBrokerControllerHttpTest.java`, change `createBrokerRecordsAuditEntry` (line 96-119) from:

```java
    @Test
    void createBrokerRecordsAuditEntry() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        UUID brokerId = UUID.randomUUID();
        UserProfileResponse response = new UserProfileResponse(brokerId, "lan", "Trần Mỹ Linh", "0900000111",
                null, "lan@example.com", "https://zalo.me/lan", "https://facebook.com/lan",
                "https://tiktok.com/@lan", UserRole.BROKER, UserStatus.ACTIVE, Instant.now());
        when(profiles.createBroker(any())).thenReturn(response);
        CreateBrokerRequest request = new CreateBrokerRequest("lan", "lan@example.com", "password123",
                "Trần Mỹ Linh", "0900000111");

        mockMvc.perform(post("/admin/brokers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.zaloUrl").value("https://zalo.me/lan"))
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/lan"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@lan"));

        verify(audit).record(eq(admin.getId()), eq(AuditAction.CREATE_BROKER), eq("User"), eq(brokerId),
                eq("Trần Mỹ Linh"), any());
    }
```

to:

```java
    @Test
    void createBrokerRecordsAuditEntry() throws Exception {
        User admin = user("admin@example.com", UserRole.ADMIN);
        authenticate(admin);
        UUID brokerId = UUID.randomUUID();
        UserProfileResponse response = new UserProfileResponse(brokerId, "lan", "Trần Mỹ Linh", "0900000111",
                null, "lan@example.com", "https://facebook.com/lan",
                "https://tiktok.com/@lan", UserRole.BROKER, UserStatus.ACTIVE, Instant.now());
        when(profiles.createBroker(any())).thenReturn(response);
        CreateBrokerRequest request = new CreateBrokerRequest("lan", "lan@example.com", "password123",
                "Trần Mỹ Linh", "0900000111");

        mockMvc.perform(post("/admin/brokers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("Authorization", bearer(admin)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.facebookUrl").value("https://facebook.com/lan"))
                .andExpect(jsonPath("$.tiktokUrl").value("https://tiktok.com/@lan"));

        verify(audit).record(eq(admin.getId()), eq(AuditAction.CREATE_BROKER), eq("User"), eq(brokerId),
                eq("Trần Mỹ Linh"), any());
    }
```

- [ ] **Step 10: Run backend tests to verify everything compiles and passes**

Run: `cd "d:/TraVinh Shelter/backend-springboot" && mvn test`
Expected: PASS — same count as Step 1's baseline minus 1 (the deleted `profileUpdateRejectsInvalidSocialLinkFormat` test), zero failures, zero errors.

- [ ] **Step 11: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateProfileRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UserProfileResponse.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CurrentUserProfileResponse.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/BrokerContactResponse.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java \
        backend-springboot/src/main/resources/db/migration/V18__drop_broker_zalo_url.sql \
        backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileServiceTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponseTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminBrokerControllerHttpTest.java
git commit -m "feat(backend): remove zaloUrl field and drop zalo_url column"
```

---

### Task 2: Frontend — remove all Zalo UI, mock data, and CSS

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/BrokersPage.jsx`
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx`
- Modify: `frontend-react/src/services/api.js`
- Modify: `frontend-react/src/services/mockData.js`
- Modify: `frontend-react/src/styles.css`
- Modify: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`
- Modify: `frontend-react/src/pages/BrokersPage.test.jsx`
- Modify: `frontend-react/src/pages/PropertyDetailPage.test.jsx`

**Interfaces:**
- No new interfaces produced or consumed by other tasks — this task only deletes UI and data that referenced the now-removed `zaloUrl` field. Independent of Task 1 (frontend mock-mode data has no compile-time coupling to backend Java types) and independent of Tasks 3-4 (different files).

- [ ] **Step 1: `BrokerDashboard.jsx` — remove the `zaloUrl` field from state, form, and display**

In `frontend-react/src/pages/BrokerDashboard.jsx`, change line 63 from:

```javascript
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', zaloUrl: '', facebookUrl: '', tiktokUrl: '' });
```

to:

```javascript
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', facebookUrl: '', tiktokUrl: '' });
```

Change lines 106-112 from:

```javascript
        setProfileForm({
          fullName: profileData.fullName || '',
          phone: profileData.phone || '',
          zaloUrl: profileData.zaloUrl || '',
          facebookUrl: profileData.facebookUrl || '',
          tiktokUrl: profileData.tiktokUrl || '',
        });
```

to:

```javascript
        setProfileForm({
          fullName: profileData.fullName || '',
          phone: profileData.phone || '',
          facebookUrl: profileData.facebookUrl || '',
          tiktokUrl: profileData.tiktokUrl || '',
        });
```

Delete this `FormField` block (lines 570-572):

```javascript
                <FormField label="Zalo">
                  <input className="input" type="url" aria-label="Zalo" placeholder="https://zalo.me/..." value={profileForm.zaloUrl} onChange={(event) => setProfileForm((current) => ({ ...current, zaloUrl: event.target.value }))} />
                </FormField>
```

Delete this display block (lines 890-892):

```javascript
        {(profile?.zaloUrl || profileForm.zaloUrl) && (
          <ProfileSocialLine label="Zalo" url={profile?.zaloUrl || profileForm.zaloUrl} />
        )}
```

- [ ] **Step 2: `BrokersPage.jsx` — remove the Zalo icon and normalize field**

In `frontend-react/src/pages/BrokersPage.jsx`, delete this block (lines 138-142):

```javascript
                  {broker.zalo && (
                    <a className="broker-card-social-icon" href={broker.zalo} target="_blank" rel="noopener noreferrer" aria-label="Zalo">
                      <Icon name="MessageCircle" size={16} />
                    </a>
                  )}
```

Delete this line (line 190) from the broker-normalize object:

```javascript
      zalo: broker.zalo || '',
```

- [ ] **Step 3: `PropertyDetailPage.jsx` — remove the "Chat Zalo" button**

In `frontend-react/src/pages/PropertyDetailPage.jsx`, change lines 328-343 from:

```javascript
              <div className="contact-buttons">
                <div className="contact-phone-zalo">
                  <a href={`tel:${brokerPhone.replace(/\s+/g, '')}`} className="contact-phone-zalo-call">
                    <Icon name="Phone" size={18} />
                    Gọi ngay: {brokerPhone}
                  </a>
                  <a
                    href={`https://zalo.me/${brokerPhone.replace(/\D/g, '').replace(/^0/, '84')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-phone-zalo-zalo"
                    aria-label="Chat Zalo"
                  >
                    <Icon name="MessageCircle" size={18} />
                  </a>
                </div>
```

to:

```javascript
              <div className="contact-buttons">
                <div className="contact-phone-zalo">
                  <a href={`tel:${brokerPhone.replace(/\s+/g, '')}`} className="contact-phone-zalo-call">
                    <Icon name="Phone" size={18} />
                    Gọi ngay: {brokerPhone}
                  </a>
                </div>
```

(The `.contact-phone-zalo`/`.contact-phone-zalo-call` wrapper and call button stay exactly as-is — only the Zalo `<a>` inside is removed. `.contact-phone-zalo-call` already has `flex: 1`, so it fills the wrapper correctly with just one child.)

- [ ] **Step 4: `services/api.js` — remove `zaloUrl`/`zalo` from normalize functions**

In `frontend-react/src/services/api.js`, delete line 35 from the mock `fetchCurrentUser` object:

```javascript
      zaloUrl: '',
```

Delete line 403 from the property-normalize broker object:

```javascript
      zalo: item.broker?.zaloUrl || '',
```

- [ ] **Step 5: `services/mockData.js` — remove `zalo` from all 8 broker mock entries**

In `frontend-react/src/services/mockData.js`, remove the `zalo: '...'` key from each of the 8 broker objects at lines 21, 48, 72, 99, 126, 147, 166, 212. For example, line 21 changes from:

```javascript
    broker: { name: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'toan@congtinland.vn', zalo: 'https://zalo.me/84912345678', facebook: 'https://facebook.com/toan.congtinland', rating: '4.9 (128 đánh giá)', responseTime: '5 phút' },
```

to:

```javascript
    broker: { name: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'toan@congtinland.vn', facebook: 'https://facebook.com/toan.congtinland', rating: '4.9 (128 đánh giá)', responseTime: '5 phút' },
```

Apply the identical `zalo: '...', ` removal (keeping everything else on the line unchanged) to the broker objects at lines 48, 72, 99, 126, 147, 166, and 212.

- [ ] **Step 6: `styles.css` — remove the `--color-zalo` token and `.contact-phone-zalo-zalo` rules**

In `frontend-react/src/styles.css`, delete this line (line 36):

```css
  --color-zalo:             #0068ff;
```

Delete these two rule blocks (lines 2639-2653):

```css
.contact-phone-zalo-zalo {
  width: 56px;
  flex-shrink: 0;
  background: var(--color-zalo);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgb(255 255 255 / 0.25);
  transition: opacity 160ms ease;
}

.contact-phone-zalo-zalo:hover {
  opacity: 0.9;
}
```

(Leave `.contact-phone-zalo` and `.contact-phone-zalo-call` — the wrapper and call-button rules directly above and below this block — untouched.)

- [ ] **Step 7: Update `BrokerDashboard.filter.test.jsx`**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, change `profile form has Zalo, Facebook, and TikTok fields and submits them` (line 80-99) from:

```javascript
test('profile form has Zalo, Facebook, and TikTok fields and submits them', async () => {
  const { updateCurrentProfile } = await import('../services/api.js');
  render(<BrokerDashboard session={session} section="profile" currentPath="/broker/profile" />);

  const zaloInput = await screen.findByLabelText('Zalo');
  const facebookInput = screen.getByLabelText('Facebook');
  const tiktokInput = screen.getByLabelText('TikTok');
  expect(zaloInput).toBeInTheDocument();
  expect(tiktokInput).toBeInTheDocument();

  fireEvent.change(facebookInput, { target: { value: 'https://facebook.com/broker.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

  await vi.waitFor(() => {
    expect(updateCurrentProfile).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ facebookUrl: 'https://facebook.com/broker.test' }),
    );
  });
});
```

to:

```javascript
test('profile form has Facebook and TikTok fields and submits them', async () => {
  const { updateCurrentProfile } = await import('../services/api.js');
  render(<BrokerDashboard session={session} section="profile" currentPath="/broker/profile" />);

  const facebookInput = await screen.findByLabelText('Facebook');
  const tiktokInput = screen.getByLabelText('TikTok');
  expect(screen.queryByLabelText('Zalo')).not.toBeInTheDocument();
  expect(tiktokInput).toBeInTheDocument();

  fireEvent.change(facebookInput, { target: { value: 'https://facebook.com/broker.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

  await vi.waitFor(() => {
    expect(updateCurrentProfile).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ facebookUrl: 'https://facebook.com/broker.test' }),
    );
  });
});
```

- [ ] **Step 8: Update `BrokersPage.test.jsx`**

In `frontend-react/src/pages/BrokersPage.test.jsx`, change the mock broker object (lines 10-14) from:

```javascript
      broker: {
        name: 'Nguyễn Văn Toàn', email: 'toan@congtinland.vn', avatarUrl: '',
        zalo: 'https://zalo.me/84912345678', facebook: 'https://facebook.com/toan.congtinland',
        tiktok: 'https://tiktok.com/@toan.congtinland',
      },
```

to:

```javascript
      broker: {
        name: 'Nguyễn Văn Toàn', email: 'toan@congtinland.vn', avatarUrl: '',
        facebook: 'https://facebook.com/toan.congtinland',
        tiktok: 'https://tiktok.com/@toan.congtinland',
      },
```

Change the test at line 29-36 from:

```javascript
test('renders Zalo, Facebook, and TikTok links next to "Xem tất cả"', async () => {
  render(<BrokersPage />);
  const viewAll = await screen.findByText('Xem tất cả');
  const footer = viewAll.closest('.broker-card-footer');
  expect(within(footer).getByLabelText('Zalo')).toHaveAttribute('href', 'https://zalo.me/84912345678');
  expect(within(footer).getByLabelText('Facebook')).toHaveAttribute('href', 'https://facebook.com/toan.congtinland');
  expect(within(footer).getByLabelText('TikTok')).toHaveAttribute('href', 'https://tiktok.com/@toan.congtinland');
});
```

to:

```javascript
test('renders Facebook and TikTok links next to "Xem tất cả", and no Zalo link', async () => {
  render(<BrokersPage />);
  const viewAll = await screen.findByText('Xem tất cả');
  const footer = viewAll.closest('.broker-card-footer');
  expect(within(footer).getByLabelText('Facebook')).toHaveAttribute('href', 'https://facebook.com/toan.congtinland');
  expect(within(footer).getByLabelText('TikTok')).toHaveAttribute('href', 'https://tiktok.com/@toan.congtinland');
  expect(within(footer).queryByLabelText('Zalo')).not.toBeInTheDocument();
});
```

- [ ] **Step 9: Update `PropertyDetailPage.test.jsx`**

In `frontend-react/src/pages/PropertyDetailPage.test.jsx`, rename the test at line 23 (body unchanged — it never asserted on Zalo, only its title mentioned it) from:

```javascript
test('renders a Facebook link below phone and Zalo when broker.facebook is set', async () => {
```

to:

```javascript
test('renders a Facebook link below phone when broker.facebook is set', async () => {
```

Delete the test `phone and Zalo live inside one merged contact box` entirely (lines 65-76) — it specifically asserted a Zalo link exists inside `.contact-phone-zalo`, which is no longer true after Step 3 removed the Zalo button:

```javascript
test('phone and Zalo live inside one merged contact box', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);

  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  const phoneLink = within(contactCard).getByRole('link', { name: /Gọi ngay/i });
  const zaloLink = within(contactCard).getByRole('link', { name: /Chat Zalo|Zalo/i });
  expect(phoneLink.closest('.contact-phone-zalo')).toBe(zaloLink.closest('.contact-phone-zalo'));
  expect(phoneLink.closest('.contact-phone-zalo')).not.toBeNull();
});
```

Add this replacement test in its place, verifying the call button still renders and no Zalo link exists:

```javascript
test('renders the phone call button and no Zalo link', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);

  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  const phoneLink = within(contactCard).getByRole('link', { name: /Gọi ngay/i });
  expect(phoneLink.closest('.contact-phone-zalo')).not.toBeNull();
  expect(within(contactCard).queryByRole('link', { name: /Chat Zalo|Zalo/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 10: Run the affected test files**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx src/pages/BrokersPage.test.jsx src/pages/PropertyDetailPage.test.jsx`
Expected: PASS — all tests, including the rewritten ones.

- [ ] **Step 11: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 146/146 (same as baseline: Steps 7 and 8 only rename/edit existing tests, and Step 9 deletes 1 test and adds 1 replacement — net 0 test-count change across this whole task).

- [ ] **Step 12: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx \
        frontend-react/src/pages/BrokersPage.jsx \
        frontend-react/src/pages/PropertyDetailPage.jsx \
        frontend-react/src/services/api.js \
        frontend-react/src/services/mockData.js \
        frontend-react/src/styles.css \
        frontend-react/src/pages/BrokerDashboard.filter.test.jsx \
        frontend-react/src/pages/BrokersPage.test.jsx \
        frontend-react/src/pages/PropertyDetailPage.test.jsx
git commit -m "feat(frontend): remove Zalo UI, mock data, and --color-zalo token"
```

---

### Task 3: Frontend — add YouTube icon to the footer

**Files:**
- Modify: `frontend-react/src/layouts/MainLayout.jsx`
- Modify: `frontend-react/src/layouts/MainLayout.test.jsx`

**Interfaces:**
- No interfaces produced or consumed by other tasks — independent of Tasks 1, 2, and 4.

- [ ] **Step 1: Update the test first (TDD)**

In `frontend-react/src/layouts/MainLayout.test.jsx`, change the entire test from:

```javascript
test('footer renders Facebook and TikTok links but not Youtube', () => {
  render(<Footer />);
  expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
  expect(screen.getByLabelText('TikTok')).toBeInTheDocument();
  expect(screen.queryByLabelText('Youtube')).not.toBeInTheDocument();
});
```

to:

```javascript
test('footer renders Facebook, TikTok, and YouTube links', () => {
  render(<Footer />);
  expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
  expect(screen.getByLabelText('TikTok')).toBeInTheDocument();
  expect(screen.getByLabelText('YouTube')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/layouts/MainLayout.test.jsx`
Expected: FAIL — `getByLabelText('YouTube')` finds nothing, since `FOOTER_SOCIALS` doesn't include it yet.

- [ ] **Step 3: Add the YouTube entry to `FOOTER_SOCIALS`**

In `frontend-react/src/layouts/MainLayout.jsx`, change lines 4-8 from:

```javascript
// TODO: thay href="#/" bằng URL Facebook/TikTok thật của Công Tín Land khi có.
const FOOTER_SOCIALS = [
  { label: 'Facebook', icon: 'Facebook' },
  { label: 'TikTok', icon: 'TikTok' },
];
```

to:

```javascript
// TODO: thay href="#/" bằng URL Facebook/TikTok/YouTube thật của Công Tín Land khi có.
const FOOTER_SOCIALS = [
  { label: 'Facebook', icon: 'Facebook' },
  { label: 'TikTok', icon: 'TikTok' },
  { label: 'YouTube', icon: 'Youtube' },
];
```

(`Youtube` is already imported from `lucide-react` and mapped in `ICON_MAP` inside `components/ui/Icon.jsx` — no import changes needed anywhere. The rendering loop at line 186 (`{FOOTER_SOCIALS.map(({ label, icon }) => (...))}`) already handles any number of entries with the same `href="#/"` placeholder pattern, so no other JSX changes are needed.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/layouts/MainLayout.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/layouts/MainLayout.jsx frontend-react/src/layouts/MainLayout.test.jsx
git commit -m "feat(footer): add YouTube icon alongside Facebook and TikTok"
```

---

### Task 4: Frontend — dedup homepage category cards to the 3 real categories

**Files:**
- Modify: `frontend-react/src/pages/HomePage.jsx`
- Create: `frontend-react/src/pages/HomePage.test.jsx`

**Interfaces:**
- Consumes: `CATEGORIES` from `frontend-react/src/data/locations.js` — `[{slug: 'tro', label: 'Trọ'}, {slug: 'nha', label: 'Nhà'}, {slug: 'dat', label: 'Đất'}]` (already exported, already imported in `HomePage.jsx` line 8 for the hero search select — reuse the same import, don't add a duplicate).
- No interfaces produced — independent of Tasks 1, 2, and 3.

- [ ] **Step 1: Write the failing test first**

Create `frontend-react/src/pages/HomePage.test.jsx`:

```javascript
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchProperties: vi.fn().mockResolvedValue([]),
}));

import HomePage from './HomePage.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('"Khám phá theo loại hình" renders exactly 3 category cards with unique category links', async () => {
  render(<HomePage />);
  const heading = await screen.findByText('Khám phá theo loại hình');
  const section = heading.closest('.section');
  const cards = section.querySelectorAll('.category-card');

  expect(cards).toHaveLength(3);
  const hrefs = Array.from(cards).map((card) => card.getAttribute('href'));
  expect(new Set(hrefs).size).toBe(3);
  expect(hrefs).toEqual(expect.arrayContaining([
    '#/search?category=tro',
    '#/search?category=nha',
    '#/search?category=dat',
  ]));
});

test('"Khám phá theo loại hình" shows the 3 real category labels', async () => {
  render(<HomePage />);
  await screen.findByText('Khám phá theo loại hình');
  expect(screen.getByText('Trọ')).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/HomePage.test.jsx`
Expected: FAIL — the current `CATEGORY_CARDS` has 5 cards (3 sharing `slug: 'nha'`), so `cards` has length 5, not 3, and labels are "Nhà phố"/"Đất nền"/"Căn hộ"/"Biệt thự"/"Cho thuê", not "Trọ"/"Nhà"/"Đất".

- [ ] **Step 3: Replace `CATEGORY_CARDS` with the 3 real categories**

In `frontend-react/src/pages/HomePage.jsx`, delete the `CATEGORY_CARDS` array (lines 41-47):

```javascript
const CATEGORY_CARDS = [
  { icon: 'Home', label: 'Nhà phố', slug: 'nha', count: '320 tin đăng' },
  { icon: 'Layers', label: 'Đất nền', slug: 'dat', count: '210 tin đăng' },
  { icon: 'Building', label: 'Căn hộ', slug: 'nha', count: '85 tin đăng' },
  { icon: 'Castle', label: 'Biệt thự', slug: 'nha', count: '42 tin đăng' },
  { icon: 'Key', label: 'Cho thuê', slug: 'tro', count: '160 tin đăng' },
];
```

Replace it with `CATEGORY_ICONS`, a small lookup mapping each real category slug to the icon and count text already used by its closest predecessor card above (`tro` reuses the old "Cho thuê" card's `Key` icon/count; `nha` reuses the old "Nhà phố" card's `Home` icon/count; `dat` reuses the old "Đất nền" card's `Layers` icon/count — `CATEGORIES` itself has no `icon`/`count` fields, only `slug`/`label`):

```javascript
const CATEGORY_ICONS = {
  tro: { icon: 'Key', count: '160 tin đăng' },
  nha: { icon: 'Home', count: '320 tin đăng' },
  dat: { icon: 'Layers', count: '210 tin đăng' },
};
```

In the same file, change the rendering block (lines 227-239) from:

```javascript
          <div className="category-grid">
            {CATEGORY_CARDS.map(cat => (
              <a key={cat.label} href={`#/search?category=${cat.slug}`} className="category-card">
                <span className="category-card-icon">
                  <Icon name={cat.icon} size={24} />
                </span>
                <span>
                  <span className="category-card-label">{cat.label}</span>
                  <span className="category-card-count">{cat.count}</span>
                </span>
              </a>
            ))}
          </div>
```

to:

```javascript
          <div className="category-grid">
            {CATEGORIES.map(cat => (
              <a key={cat.slug} href={`#/search?category=${cat.slug}`} className="category-card">
                <span className="category-card-icon">
                  <Icon name={CATEGORY_ICONS[cat.slug].icon} size={24} />
                </span>
                <span>
                  <span className="category-card-label">{cat.label}</span>
                  <span className="category-card-count">{CATEGORY_ICONS[cat.slug].count}</span>
                </span>
              </a>
            ))}
          </div>
```

(`CATEGORIES` is already imported at line 8 — `import { WARDS, CATEGORIES } from '../data/locations.js';` — no import changes needed.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/HomePage.test.jsx`
Expected: PASS — 2/2 new tests.

- [ ] **Step 5: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — previous total + 2 new `HomePage.test.jsx` tests.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/HomePage.jsx frontend-react/src/pages/HomePage.test.jsx
git commit -m "fix(homepage): dedup category cards to the 3 real categories"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/backend-springboot" && mvn test
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: both suites green. Backend: Task 1's baseline minus 1 (one deleted test, zero others changed in count). Frontend: 146 baseline (Tasks 2-3 net 0 change) + 2 new (Task 4's `HomePage.test.jsx`) = 148/148.

Manual check (once committed): run `docker compose up --build` or `npm run dev` + `mvn spring-boot:run`, and confirm: broker profile form has no Zalo field, broker cards show no Zalo icon, property detail page's contact box shows only the phone call button (full-width, no split), footer shows Facebook/TikTok/YouTube icons, and the homepage "Khám phá theo loại hình" section shows exactly 3 cards (Trọ/Nhà/Đất) with no duplicate destinations.
