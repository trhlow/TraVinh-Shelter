# Security Hardening Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Critical/High/Medium security gaps identified for the production go-live: stop leaking resource existence through 403 responses, add account-scoped login rate limiting, and migrate password hashing from BCrypt to Argon2id without breaking existing accounts.

**Architecture:** Three independent, additive changes to `backend-springboot`: (1) three call sites that throw `403 FORBIDDEN` on ownership mismatch now throw `404 NOT_FOUND` instead, matching the "doesn't exist" case so a client can't distinguish "not yours" from "doesn't exist"; (2) `AuthService.login()` gains a second rate-limit check keyed by email (in addition to the existing per-IP filter) using the `RateLimiter` interface already wired for Redis/in-memory; (3) `SecurityConfig.passwordEncoder()` becomes a `DelegatingPasswordEncoder` that encodes new passwords with Argon2id but still verifies legacy un-prefixed BCrypt hashes, with `JpaUserDetailsService` implementing `UserDetailsPasswordService` so Spring Security silently re-hashes a user's password to Argon2id the next time they log in successfully.

**Tech Stack:** Spring Boot 4.0.5, Java 25, Spring Security, JUnit 5 + Mockito + AssertJ, MockMvc slice tests.

## Global Constraints

- No `Co-Authored-By` in commit messages (project convention).
- Conventional commit messages in English (`fix:`, `feat:`, `chore:`).
- TDD mandatory: write the failing test before the production code, for every behavior change.
- Do not touch Cloudflare/JWT-refresh-token work — out of scope for this plan (deferred, see spec).
- Do not add ownership checks to `PropertyController.GET /properties/{propertyId}` or
  `UserProfileController.GET /brokers/{brokerId}` — those are intentionally public, not IDOR gaps.

---

### Task 1: Ownership-mismatch returns 404 instead of 403 (Property, Booking, Media)

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java:163`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java:120`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/media/MediaService.java:120`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java:194-197`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java:156-169`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingServiceTest.java:235-248`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java:172-177`

**Interfaces:**
- Consumes: nothing new — reuses existing `ResponseStatusException` (already imported in all three service files).
- Produces: nothing new — behavior-only change, no new public method.

- [ ] **Step 1: Update `BookingServiceTest` to expect 404 (RED)**

In `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingServiceTest.java`, replace the test at lines 235-248:

```java
    @Test
    void updateStatusForBrokerOwner_nonOwnerGetsNotFound() {
        UUID propertyId = UUID.randomUUID();
        UUID otherBrokerId = UUID.randomUUID();
        ViewingAppointment appointment = appointment(propertyId, AppointmentStatus.PENDING);

        when(appointments.findById(appointment.getId())).thenReturn(Optional.of(appointment));
        // otherBroker owns no properties containing this appointment's property
        when(properties.findIdsByBrokerId(otherBrokerId)).thenReturn(List.of(UUID.randomUUID()));

        assertThatThrownBy(() -> service.updateStatusForBrokerOwner(appointment.getId(), AppointmentStatus.CONFIRMED, otherBrokerId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
```

- [ ] **Step 2: Run test, verify it fails**

Run: `cd backend-springboot && mvn test -Dtest=BookingServiceTest#updateStatusForBrokerOwner_nonOwnerGetsNotFound`
Expected: FAIL — actual exception message contains "403", not "404".

- [ ] **Step 3: Fix `BookingService.java:120` (GREEN)**

Change:
```java
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your appointment");
```
to:
```java
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found");
```

- [ ] **Step 4: Run test, verify it passes**

Run: `cd backend-springboot && mvn test -Dtest=BookingServiceTest#updateStatusForBrokerOwner_nonOwnerGetsNotFound`
Expected: PASS

- [ ] **Step 5: Update `BookingHttpTest` to expect 404 (RED)**

In `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java`, replace lines 156-169:

```java
    @Test
    void brokerWhoDoesNotOwnViewingGets404() throws Exception {
        UUID appointmentId = UUID.randomUUID();
        User broker = user("broker@example.com", UserRole.BROKER);
        authenticate(broker);
        when(bookingService.updateStatusForBrokerOwner(eq(appointmentId), any(), any()))
                .thenThrow(new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Appointment not found"));

        mockMvc.perform(patch("/viewings/mine/{id}/status", appointmentId)
                        .header("Authorization", bearer(broker))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isNotFound());
    }
```

- [ ] **Step 6: Run test, verify it passes immediately**

Run: `cd backend-springboot && mvn test -Dtest=BookingHttpTest#brokerWhoDoesNotOwnViewingGets404`
Expected: PASS (production code already fixed in Step 3 — this test just documents the HTTP-layer behavior).

- [ ] **Step 7: Update `PropertyHttpTest` to expect 404 (RED)**

In `backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java`, replace lines 194-197 (inside `brokerNeedsPhoneAndCannotOperateOnAnotherBrokerProperty`):

```java
        mockMvc.perform(patch("/properties/{id}/status", property.getId()).header("Authorization", bearer(other))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RENTED\"}"))
                .andExpect(status().isNotFound());
    }
```

- [ ] **Step 8: Run test, verify it fails**

Run: `cd backend-springboot && mvn test -Dtest=PropertyHttpTest#brokerNeedsPhoneAndCannotOperateOnAnotherBrokerProperty`
Expected: FAIL — actual status is 403.

- [ ] **Step 9: Fix `PropertyService.java:163` (GREEN)**

Change:
```java
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Property belongs to another broker");
```
to:
```java
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
```

- [ ] **Step 10: Run test, verify it passes**

Run: `cd backend-springboot && mvn test -Dtest=PropertyHttpTest#brokerNeedsPhoneAndCannotOperateOnAnotherBrokerProperty`
Expected: PASS

- [ ] **Step 11: Update `MediaHttpTest` to expect 404 (RED)**

In `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java`, replace lines 172-177 (inside `uploadImageEnforcesRoleOwnershipPhoneLimitAndContentType`):

```java
        authenticate(otherBroker);
        when(users.findById(otherBroker.getId())).thenReturn(Optional.of(otherBroker));
        when(properties.findByIdForUpdate(property.getId())).thenReturn(Optional.of(property));
        mockMvc.perform(multipart("/properties/{propertyId}/media/images", property.getId()).file(file)
                        .header("Authorization", bearer(otherBroker)))
                .andExpect(status().isNotFound());
```

- [ ] **Step 12: Run test, verify it fails**

Run: `cd backend-springboot && mvn test -Dtest=MediaHttpTest#uploadImageEnforcesRoleOwnershipPhoneLimitAndContentType`
Expected: FAIL — actual status is 403.

- [ ] **Step 13: Fix `MediaService.java:120` (GREEN)**

Change:
```java
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Property belongs to another broker");
```
to:
```java
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found");
```

- [ ] **Step 14: Run test, verify it passes**

Run: `cd backend-springboot && mvn test -Dtest=MediaHttpTest#uploadImageEnforcesRoleOwnershipPhoneLimitAndContentType`
Expected: PASS

- [ ] **Step 15: Run the full affected test classes together**

Run: `cd backend-springboot && mvn test -Dtest=PropertyHttpTest,BookingHttpTest,BookingServiceTest,MediaHttpTest`
Expected: PASS, no regressions in the surrounding tests in these files (role-check 403 cases like `MediaHttpTest` lines 151-159 must still assert `isForbidden()` — do not touch those).

- [ ] **Step 16: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java
git add backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java
git add backend-springboot/src/main/java/com/travinh/realty/modules/media/MediaService.java
git add backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java
git add backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java
git add backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingServiceTest.java
git add backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java
git commit -m "fix(security): return 404 instead of 403 on ownership mismatch to avoid resource enumeration"
```

---

### Task 2: Rate-limit login attempts by account (in addition to IP)

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`

**Interfaces:**
- Consumes: `com.travinh.realty.modules.auth.security.RateLimiter` (existing interface, method
  `boolean tryAcquire(String key, int limit, Duration window)`); `com.travinh.realty.modules.auth.security.InMemoryRateLimiter`
  (existing no-arg constructible implementation, used directly in tests).
- Produces: `AuthService` constructor gains a 6th parameter `RateLimiter rateLimiter` — Spring will
  autowire the existing `RateLimiter` bean from `SecurityConfig.rateLimiter(...)` automatically, no
  wiring change needed outside the class itself.

- [ ] **Step 1: Write the failing test (RED)**

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`, add the
import and a new test:

```java
import com.travinh.realty.modules.auth.security.InMemoryRateLimiter;
import com.travinh.realty.modules.auth.security.RateLimiter;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.assertThat;
```

```java
    @Test
    void loginIsRateLimitedPerAccountAfterFiveFailuresRegardlessOfCaller() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
        RateLimiter rateLimiter = new InMemoryRateLimiter();
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties, rateLimiter);
        com.travinh.realty.modules.auth.dto.LoginRequest request =
                new com.travinh.realty.modules.auth.dto.LoginRequest("locked-out@example.com", "wrong-password");

        for (int attempt = 0; attempt < 5; attempt++) {
            assertThatThrownBy(() -> service.login(request)).isInstanceOf(BadCredentialsException.class);
        }

        assertThatThrownBy(() -> service.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("429");
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend-springboot && mvn test -Dtest=AuthServiceTest#loginIsRateLimitedPerAccountAfterFiveFailuresRegardlessOfCaller`
Expected: FAIL — compile error (constructor doesn't accept a 6th argument yet).

- [ ] **Step 3: Add account rate limiting to `AuthService` (GREEN)**

In `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java`, replace the
whole file with:

```java
package com.travinh.realty.modules.auth;

import com.travinh.realty.common.config.JwtProperties;
import com.travinh.realty.modules.auth.dto.AuthResponse;
import com.travinh.realty.modules.auth.dto.LoginRequest;
import com.travinh.realty.modules.auth.security.JwtService;
import com.travinh.realty.modules.auth.security.RateLimiter;
import com.travinh.realty.modules.auth.security.UserPrincipal;
import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final int MAX_FAILED_LOGINS_PER_ACCOUNT = 5;
    private static final Duration ACCOUNT_LOCKOUT_WINDOW = Duration.ofMinutes(15);

    private final UserRepository users; private final PasswordEncoder encoder; private final AuthenticationManager auth;
    private final JwtService jwt; private final JwtProperties properties; private final RateLimiter rateLimiter;
    public AuthService(UserRepository users, PasswordEncoder encoder, AuthenticationManager auth, JwtService jwt,
                       JwtProperties properties, RateLimiter rateLimiter) {
        this.users = users; this.encoder = encoder; this.auth = auth; this.jwt = jwt; this.properties = properties;
        this.rateLimiter = rateLimiter;
    }
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();
        if (!rateLimiter.tryAcquire("login-account:" + email, MAX_FAILED_LOGINS_PER_ACCOUNT, ACCOUNT_LOCKOUT_WINDOW)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many requests. Please retry later.");
        }
        Authentication authentication = auth.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        User user = users.findByEmail(principal.getUsername()).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return AuthResponse.of(jwt.generateToken(user), properties.expiration(), user);
    }

    public void logout(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        jwt.revoke(authorizationHeader.substring(7));
    }
}
```

Note: `tryAcquire` counts every call (success or failure) toward the limit, same as the existing
`AuthRateLimitFilter` semantics — this is intentional (simplicity over precision; a legitimate user who
mistypes their password 5 times in 15 minutes is rare, and the IP-based filter already covers the common
case).

- [ ] **Step 4: Update existing test constructor call**

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`, the existing
test `loginPropagatesInvalidCredentialsForTheHttpErrorHandler` also constructs `AuthService` — update its
call to pass a 6th argument:

```java
    @Test
    void loginPropagatesInvalidCredentialsForTheHttpErrorHandler() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
        AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties, new InMemoryRateLimiter());

        assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                "minh@example.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);
    }
```

- [ ] **Step 5: Run both tests, verify they pass**

Run: `cd backend-springboot && mvn test -Dtest=AuthServiceTest`
Expected: PASS (both tests)

- [ ] **Step 6: Run the full test suite to catch any other `new AuthService(` call site**

Run: `cd backend-springboot && mvn test`
Expected: PASS — this is the only file in the whole repo that constructs `AuthService` directly (confirmed
by repo-wide search before writing this plan); Spring's own autowiring of the `@Service` bean needs no
change since it resolves constructor parameters by type, and `RateLimiter` is already a bean.

- [ ] **Step 7: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java
git add backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java
git commit -m "feat(security): rate-limit login attempts per account, independent of caller IP"
```

---

### Task 3: Migrate password hashing from BCrypt to Argon2id

**Files:**
- Modify: `backend-springboot/pom.xml`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java`
- Test: Create `backend-springboot/src/test/java/com/travinh/realty/common/config/SecurityConfigPasswordEncoderTest.java`
- Test: Create `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/JpaUserDetailsServiceTest.java`

**Interfaces:**
- Consumes: `com.travinh.realty.modules.user.model.User.updatePasswordHash(String)` (existing method,
  `User.java:96-98`); `com.travinh.realty.modules.user.repository.UserRepository.findByEmail(String)` /
  `.save(User)` (existing, `JpaRepository` inherited).
- Produces: `JpaUserDetailsService` now also implements `org.springframework.security.core.userdetails.UserDetailsPasswordService`
  — no new public method signatures beyond what that interface requires
  (`UserDetails updatePassword(UserDetails user, String newPassword)`).

- [ ] **Step 1: Add Bouncy Castle dependency**

In `backend-springboot/pom.xml`, add this dependency right after the `spring-boot-starter-security` block
(no `<version>` needed — managed by the `spring-boot-starter-parent` 4.0.5 BOM):

```xml
        <dependency>
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk18on</artifactId>
        </dependency>
```

- [ ] **Step 2: Write the failing test for the encoder (RED)**

Create `backend-springboot/src/test/java/com/travinh/realty/common/config/SecurityConfigPasswordEncoderTest.java`:

```java
package com.travinh.realty.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class SecurityConfigPasswordEncoderTest {

    private final PasswordEncoder encoder = new SecurityConfig().passwordEncoder();

    @Test
    void encodesNewPasswordsWithArgon2Prefix() {
        String encoded = encoder.encode("correct horse battery staple");

        assertThat(encoded).startsWith("{argon2}");
    }

    @Test
    void stillVerifiesLegacyBcryptHashesWithoutAPrefix() {
        String legacyHash = new BCryptPasswordEncoder().encode("correct horse battery staple");

        assertThat(encoder.matches("correct horse battery staple", legacyHash)).isTrue();
        assertThat(encoder.matches("wrong password", legacyHash)).isFalse();
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend-springboot && mvn test -Dtest=SecurityConfigPasswordEncoderTest`
Expected: FAIL — `encoder.encode(...)` currently returns a raw BCrypt hash with no `{argon2}` prefix.

- [ ] **Step 4: Implement the `DelegatingPasswordEncoder` (GREEN)**

In `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`, add imports:

```java
import java.util.HashMap;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
```

Replace line 130:
```java
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
```
with:
```java
    @Bean
    PasswordEncoder passwordEncoder() {
        String defaultEncoderId = "argon2";
        Map<String, PasswordEncoder> encoders = new HashMap<>();
        encoders.put(defaultEncoderId, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());
        encoders.put("bcrypt", new BCryptPasswordEncoder());
        DelegatingPasswordEncoder delegatingPasswordEncoder = new DelegatingPasswordEncoder(defaultEncoderId, encoders);
        delegatingPasswordEncoder.setDefaultPasswordEncoderForMatches(new BCryptPasswordEncoder());
        return delegatingPasswordEncoder;
    }
```

(`Map` is already imported at the top of this file from the existing CORS configuration code — reuse it.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend-springboot && mvn test -Dtest=SecurityConfigPasswordEncoderTest`
Expected: PASS

- [ ] **Step 6: Write the failing test for auto re-hash on login (RED)**

Create `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/JpaUserDetailsServiceTest.java`:

```java
package com.travinh.realty.modules.auth.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.travinh.realty.modules.user.model.User;
import com.travinh.realty.modules.user.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JpaUserDetailsServiceTest {

    @Mock private UserRepository userRepository;

    @Test
    void updatePasswordSavesTheNewHashOnTheMatchingUser() {
        User user = User.register("minh", "minh@example.com", "{bcrypt}old-hash", "Minh", "0900000000");
        when(userRepository.findByEmail("minh@example.com")).thenReturn(Optional.of(user));
        JpaUserDetailsService service = new JpaUserDetailsService(userRepository);
        UserPrincipal principal = UserPrincipal.from(user);

        service.updatePassword(principal, "{argon2}new-hash");

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(savedUser.capture());
        assertThat(savedUser.getValue().getPasswordHash()).isEqualTo("{argon2}new-hash");
    }
}
```

- [ ] **Step 7: Run test to verify it fails**

Run: `cd backend-springboot && mvn test -Dtest=JpaUserDetailsServiceTest`
Expected: FAIL — compile error, `JpaUserDetailsService` has no `updatePassword` method yet.

- [ ] **Step 8: Implement `UserDetailsPasswordService` (GREEN)**

Replace the full contents of
`backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java`:

```java
package com.travinh.realty.modules.auth.security;

import com.travinh.realty.modules.user.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class JpaUserDetailsService implements UserDetailsService, UserDetailsPasswordService {
    private final UserRepository userRepository;
    public JpaUserDetailsService(UserRepository userRepository) { this.userRepository = userRepository; }
    @Override
    public UserDetails loadUserByUsername(String email) {
        return userRepository.findByEmail(email).map(UserPrincipal::from)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
    }
    @Override
    public UserDetails updatePassword(UserDetails user, String newPassword) {
        com.travinh.realty.modules.user.model.User entity = userRepository.findByEmail(user.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("Invalid email or password"));
        entity.updatePasswordHash(newPassword);
        userRepository.save(entity);
        return UserPrincipal.from(entity);
    }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend-springboot && mvn test -Dtest=JpaUserDetailsServiceTest`
Expected: PASS

- [ ] **Step 10: Wire `setUserDetailsPasswordService` into the `AuthenticationProvider` bean**

In `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java`, change the
`authenticationProvider` bean (around line 132):

```java
    @Bean
    AuthenticationProvider authenticationProvider(JpaUserDetailsService users, PasswordEncoder encoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        provider.setUserDetailsPasswordService(users);
        return provider;
    }
```

(`users` is already typed as `JpaUserDetailsService`, which now implements `UserDetailsPasswordService` —
no signature change needed on this method, just the one new line.)

- [ ] **Step 11: Run the full test suite**

Run: `cd backend-springboot && mvn test`
Expected: PASS — this confirms existing login flows (`AuthServiceTest`, any `*HttpTest` that logs in via
`authenticate(...)` test helpers) still work with the new encoder wiring.

- [ ] **Step 12: Commit**

```bash
git add backend-springboot/pom.xml
git add backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JpaUserDetailsService.java
git add backend-springboot/src/test/java/com/travinh/realty/common/config/SecurityConfigPasswordEncoderTest.java
git add backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/JpaUserDetailsServiceTest.java
git commit -m "feat(security): migrate password hashing to Argon2id with transparent re-hash on login"
```

---

### Task 4: Enable Dependabot for both ecosystems

**Files:**
- Create: `.github/dependabot.yml`

**Interfaces:**
- Consumes: nothing (GitHub-native config file, no code dependency).
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Create the Dependabot config**

Create `.github/dependabot.yml`:

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

- [ ] **Step 2: Validate YAML syntax**

Run: `cd "d:\TraVinh Shelter" && docker run --rm -v "${PWD}:/repo" mikefarah/yq e '.' /repo/.github/dependabot.yml`

(If Docker/yq is not convenient, a simpler check: open the file and confirm indentation is consistent
2-space YAML, no tabs — this file has no executable test, so there is no `mvn`/`npm` command to run
against it.)

Expected: prints the parsed YAML back with no error.

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "chore(ci): enable Dependabot for maven and npm ecosystems"
```

---

## Verification (after all 4 tasks)

Run: `cd backend-springboot && mvn test`
Expected: full suite PASS, no regressions.

Manual smoke test (per `verification-before-completion` skill):
1. Start backend (`mvn spring-boot:run -Dspring-boot.run.profiles=dev`), log in as an existing seeded
   broker — confirm login still works (BCrypt legacy hash still verifies via `DelegatingPasswordEncoder`
   fallback).
2. Log in again with the same account — confirm (via a DB query or log) the stored `password_hash` now
   starts with `{argon2}` (auto re-hash happened on the first successful login after Step 10 of Task 3
   deployed).
3. As a broker, attempt to PATCH another broker's property status — confirm response is `404`, not `403`.
4. Attempt 6 rapid login attempts with wrong password on the same account from `curl` (any IP) — confirm
   the 6th attempt returns `429`, not `401`.
