# Translate Backend User-Facing Messages to Vietnamese Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every `message` field an API error response can carry — `ResponseStatusException` reasons and Bean
Validation messages — is Vietnamese, matching this project's `workflow.md` rule ("UI text: Tiếng Việt"),
since these strings pass straight through to the frontend UI unmodified.

**Architecture:** Pure string-literal translation across ~10 backend Java files (services, filters, config,
DTOs) plus one frontend fallback string. No new abstractions, no new shared constants class — duplicated
English strings (e.g. "Too many requests. Please retry later." appearing in 4 files) become duplicated
Vietnamese strings using identical wording, matching the existing codebase's tolerance for that exact
duplication. No behavior changes — same HTTP status codes, same field names, same enum values, same `error`
field (HTTP reason phrase) — only the human-readable `message` text and validation `message=` attributes
change value.

**Tech Stack:** Spring Boot 4 / Java 25, Jakarta Bean Validation, JUnit 5 + MockMvc.

## Global Constraints

- **Scope boundary (confirmed with user):** only translate the `ApiError.message` field's content and Bean
  Validation `message=` text. Do **NOT** touch the `error` field (`HttpStatus.getReasonPhrase()` calls in
  `GlobalExceptionHandler.java` and `SecurityConfig.writeApiError()`) — it stays English, the frontend never
  reads it. Do **NOT** touch any enum value sent to the client (`PropertyStatus`, `UserStatus`,
  `AppointmentStatus`, `MediaType`, `AuditAction`, etc.) — those are API contract values the frontend already
  maps to Vietnamese labels itself.
- **JAVA_HOME must point at JDK 25** before any `mvn` command: `export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"`.
- Baseline before this plan: **210/210 backend tests passing, 0 skipped** (Docker running), on `main` at
  `9c1492e`.
- Conventional commits, no `Co-Authored-By` trailer. English code/comments (unchanged by this plan — only
  string *literals* change, not identifiers).
- **Glossary — use this exact Vietnamese wording everywhere the phrase appears, across every task.**
  Consistency here matters more than any single task's internal quality — a reviewer's first check on every
  task is "does this match the glossary."

  | English | Vietnamese |
  |---|---|
  | Property not found | Không tìm thấy bất động sản |
  | Category not found | Không tìm thấy danh mục |
  | Broker not found | Không tìm thấy môi giới |
  | Media not found | Không tìm thấy tệp media |
  | Appointment not found | Không tìm thấy lịch hẹn |
  | User not found | Không tìm thấy người dùng |
  | Resource not found | Không tìm thấy tài nguyên |
  | Authentication is required | Yêu cầu đăng nhập |
  | Too many requests. Please retry later. | Quá nhiều yêu cầu. Vui lòng thử lại sau. |
  | Email is already registered | Email đã được đăng ký |
  | Username is already registered | Tên đăng nhập đã được đăng ký |
  | Phone number is already registered | Số điện thoại đã được đăng ký |
  | Email or username is already registered | Email hoặc tên đăng nhập đã được đăng ký |
  | Broker role is required | Yêu cầu vai trò môi giới |
  | Broker profile requires a phone number | Hồ sơ môi giới yêu cầu số điện thoại |
  | Invalid email or password | Email hoặc mật khẩu không đúng |
  | Access is denied | Truy cập bị từ chối |
  | Current password is incorrect | Mật khẩu hiện tại không đúng |
  | Cannot lock an admin account | Không thể khoá tài khoản quản trị viên |
  | A property can have at most 7 images | Mỗi bất động sản chỉ được tối đa 7 ảnh |
  | A property can have at most one video | Mỗi bất động sản chỉ được tối đa 1 video |
  | Media file is required | Yêu cầu tệp media |
  | Media content does not match the declared content type | Nội dung tệp không khớp với loại đã khai báo |
  | Media content does not match allowed upload types | Nội dung tệp không thuộc loại được phép tải lên |
  | Only image uploads are allowed | Chỉ chấp nhận tải ảnh lên |
  | Only video uploads are allowed | Chỉ chấp nhận tải video lên |
  | Could not store media file | Không thể lưu tệp media |
  | Could not delete media file | Không thể xoá tệp media |
  | Could not read media file | Không thể đọc tệp media |
  | Invalid storage path | Đường dẫn lưu trữ không hợp lệ |
  | Invalid media filename | Tên tệp media không hợp lệ |
  | Video link must be an absolute HTTP(S) URL | Liên kết video phải là URL HTTP(S) đầy đủ |
  | Video link must be a valid URL | Liên kết video không hợp lệ |
  | Attribute 'ward' is required | Vui lòng chọn phường/xã |
  | Too many attribute entries (max N) | Quá nhiều thuộc tính (tối đa N) |
  | Attribute value too long for key: X | Giá trị thuộc tính quá dài cho khoá: X |
  | Attribute value must be a string, number, or boolean for key: X | Giá trị thuộc tính phải là chuỗi, số hoặc boolean cho khoá: X |
  | lat must be between -90 and 90 | lat phải nằm trong khoảng -90 đến 90 |
  | lng must be between -180 and 180 | lng phải nằm trong khoảng -180 đến 180 |
  | Invalid attribute filter key | Khoá lọc thuộc tính không hợp lệ |
  | Invalid property status | Trạng thái bất động sản không hợp lệ |
  | Invalid decimal value for X | Giá trị số không hợp lệ cho X |
  | Attribute filter value is required | Giá trị lọc thuộc tính là bắt buộc |
  | Search parameter value is required | Giá trị tham số tìm kiếm là bắt buộc |
  | Unsupported search parameter: X | Tham số tìm kiếm không được hỗ trợ: X |
  | categoryId or categorySlug is required | Cần cung cấp categoryId hoặc categorySlug |
  | Malformed request body | Nội dung yêu cầu không hợp lệ |
  | An unexpected error occurred | Đã xảy ra lỗi không mong muốn |
  | Validation failed | Dữ liệu không hợp lệ |
  | Invalid value | Giá trị không hợp lệ |

---

### Task 1: `GlobalExceptionHandler`, `SecurityConfig`, `AuthRateLimitFilter`

Foundational, shared, small — every request can hit one of these paths.

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/exception/GlobalExceptionHandler.java:28,31,38,45,53,66,73`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java:65,67`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java:57`
- Test: `backend-springboot/src/test/java/com/travinh/realty/common/exception/GlobalExceptionHandlerTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilterTest.java`

**Interfaces:** None — pure string literal changes, no signature changes. This task doesn't depend on or
produce anything for other tasks.

- [ ] **Step 1: Grep for the old strings across `src/main` and `src/test` first**

```bash
cd "backend-springboot"
grep -rn "Invalid value\|Validation failed\|Malformed request body\|Resource not found\|An unexpected error occurred\|Invalid email or password\|Access is denied\|Authentication is required\|Too many requests. Please retry later." src/main src/test
```

Confirm this matches the full inventory in this task plus later tasks (some of these phrases — "Access is
denied", "Authentication is required", "Too many requests..." — also appear in files touched by other
tasks; only change the 3 files listed above in this task, leave the rest for their own tasks).

- [ ] **Step 2: Write the failing tests**

In `backend-springboot/src/test/java/com/travinh/realty/common/exception/GlobalExceptionHandlerTest.java`,
update the existing assertions (find `handler.handleValidation` isn't directly tested by name/message today
— check the file's current tests first). Add these 2 new test cases after the existing ones:

```java
    @Test
    void unauthenticatedRequestReturnsVietnameseMessage() {
        var response = handler.handleAuthentication(new org.springframework.security.authentication.BadCredentialsException("bad"));

        assertThat(response.getBody().message()).isEqualTo("Email hoặc mật khẩu không đúng");
    }

    @Test
    void accessDeniedReturnsVietnameseMessage() {
        var response = handler.handleAccessDenied(new org.springframework.security.access.AccessDeniedException("denied"));

        assertThat(response.getBody().message()).isEqualTo("Truy cập bị từ chối");
    }
```

Also update `malformedRequestBodyReturnsBadRequestInsteadOfServerError` (already exists) to additionally
assert the Vietnamese text:

```java
        assertThat(response.getBody().message()).isEqualTo("Nội dung yêu cầu không hợp lệ");
```

(append this line to the existing test method, right after the `assertThat(response.getStatusCode())` line.)

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java`, find
every `jsonPath("$.message")` assertion (NOT `$.error` — those stay English, do not touch) and update the
expected value to the Vietnamese equivalent from the glossary. Grep first to find them:

```bash
grep -n 'jsonPath("\$.message")' src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java
```

Update each to its glossary Vietnamese text (likely "Authentication is required" → "Yêu cầu đăng nhập",
"Access is denied" → "Truy cập bị từ chối", "An unexpected error occurred" → "Đã xảy ra lỗi không mong
muốn" — read the actual current assertions and match against the glossary table above).

In `backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilterTest.java`,
find any assertion on the 429 response message and update it to `"Quá nhiều yêu cầu. Vui lòng thử lại sau."`.

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=GlobalExceptionHandlerTest,SecurityHttpTest,AuthRateLimitFilterTest
```

Expected: FAIL — assertions expect Vietnamese text, production code still returns English.

- [ ] **Step 4: Translate the production code**

In `GlobalExceptionHandler.java`, replace each English literal with its glossary Vietnamese text (keep every
other part of each line — `HttpStatus.X.getReasonPhrase()`, field names, structure — exactly as-is):

```java
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        error -> error.getField(),
                        error -> error.getDefaultMessage() == null ? "Giá trị không hợp lệ" : error.getDefaultMessage(),
                        (first, ignored) -> first));
        ApiError body = new ApiError(Instant.now(), HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(), "Dữ liệu không hợp lệ", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleMalformedRequestBody(HttpMessageNotReadableException exception) {
        ApiError body = new ApiError(Instant.now(), HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(), "Nội dung yêu cầu không hợp lệ", Map.of());
        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ApiError> handleNoResourceFound(NoResourceFoundException exception) {
        ApiError body = new ApiError(Instant.now(), HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(), "Không tìm thấy tài nguyên", Map.of());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        log.error("Unhandled backend exception", exception);
        ApiError body = new ApiError(Instant.now(), HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(), "Đã xảy ra lỗi không mong muốn", Map.of());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.valueOf(exception.getStatusCode().value());
        ApiError body = new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), exception.getReason(), Map.of());
        return ResponseEntity.status(status).body(body);
    }

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<ApiError> handleAuthentication(AuthenticationException exception) {
        ApiError body = new ApiError(Instant.now(), HttpStatus.UNAUTHORIZED.value(), HttpStatus.UNAUTHORIZED.getReasonPhrase(), "Email hoặc mật khẩu không đúng", Map.of());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(body);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException exception) {
        ApiError body = new ApiError(Instant.now(), HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(), "Truy cập bị từ chối", Map.of());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }
```

(Note: `handleResponseStatus` at L57-62 does NOT need a code change — it forwards `exception.getReason()`
verbatim, which will automatically be Vietnamese once Tasks 2-6 translate every `ResponseStatusException`
call site. Leave this method untouched.)

In `SecurityConfig.java`, lines 64-67:

```java
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) ->
                                writeApiError(response, objectMapper, HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                writeApiError(response, objectMapper, HttpStatus.FORBIDDEN, "Truy cập bị từ chối")))
```

In `AuthRateLimitFilter.java`, line 57:

```java
                "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=GlobalExceptionHandlerTest,SecurityHttpTest,AuthRateLimitFilterTest
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/common/exception/GlobalExceptionHandler.java \
        backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilter.java \
        backend-springboot/src/test/java/com/travinh/realty/common/exception/GlobalExceptionHandlerTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/SecurityHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/security/AuthRateLimitFilterTest.java
git commit -m "i18n: translate shared error-handling messages to Vietnamese"
```

---

### Task 2: `LocalMediaStorage`

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java:50,58,64,74,90,104,107,117,120,126,132,136`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java`

**Interfaces:** None. Independent of every other task.

- [ ] **Step 1: Grep for old strings**

```bash
cd "backend-springboot"
grep -n "Media file is required\|Invalid storage path\|Invalid media filename\|Could not store media file\|Could not delete media file\|Only image uploads are allowed\|Only video uploads are allowed\|Could not read media file\|Media content does not match" src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java src/test/java/com/travinh/realty/modules/media/*.java
```

- [ ] **Step 2: Write the failing tests**

In `MediaHttpTest.java`, find every `jsonPath("$.message")` assertion whose expected value is one of the
strings above and update to the glossary Vietnamese text. Example (exact test names may differ slightly —
grep for the string first):

```bash
grep -n '"Media content does not match\|"Media file is required"\|"Only image uploads are allowed"' src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java
```

Replace each matched `.andExpect(jsonPath("$.message").value("<English>"))` with the Vietnamese equivalent,
e.g.:

```java
                .andExpect(jsonPath("$.message").value("Yêu cầu tệp media"));
```

```java
                .andExpect(jsonPath("$.message").value("Nội dung tệp không khớp với loại đã khai báo"));
```

```java
                .andExpect(jsonPath("$.message").value("Nội dung tệp không thuộc loại được phép tải lên"));
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=MediaHttpTest
```

Expected: FAIL on the updated assertions.

- [ ] **Step 4: Translate the production code**

In `LocalMediaStorage.java`, replace each string (line numbers refer to the file's current state — verify
with the grep from Step 1 before editing, since editing top-to-bottom shifts nothing here since every change
is same-line replacement):

```java
    // line 50
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu tệp media");
```
```java
    // line 58
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Đường dẫn lưu trữ không hợp lệ");
```
```java
    // line 64
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên tệp media không hợp lệ");
```
```java
    // line 74
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể lưu tệp media", exception);
```
```java
    // line 90
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể xoá tệp media", exception);
```
```java
    // line 104
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Chỉ chấp nhận tải ảnh lên");
```
```java
    // line 107
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Chỉ chấp nhận tải video lên");
```
```java
    // line 117
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể đọc tệp media", exception);
```
```java
    // line 120
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu tệp media");
```
```java
    // lines 126-127 and 132-133 (both identical, "detected mismatch" branches)
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Nội dung tệp không khớp với loại đã khai báo");
```
```java
    // lines 136-137
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Nội dung tệp không thuộc loại được phép tải lên");
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=MediaHttpTest,MediaConcurrencyIntegrationTest
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java
git commit -m "i18n: translate LocalMediaStorage error messages to Vietnamese"
```

---

### Task 3: `UserProfileService`

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java:54,57,67,87,97,108,111,114,124,127,137,166`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileHttpTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminBrokerControllerHttpTest.java`

**Interfaces:** None. Independent of every other task.

- [ ] **Step 1: Grep for old strings**

```bash
cd "backend-springboot"
grep -n "Broker profile requires a phone number\|Phone number is already registered\|Current password is incorrect\|Broker not found\|Email is already registered\|Username is already registered\|Email or username is already registered\|Cannot lock an admin account\|User not found" src/main/java/com/travinh/realty/modules/user/UserProfileService.java src/test/java/com/travinh/realty/modules/user/UserProfileHttpTest.java src/test/java/com/travinh/realty/modules/admin/AdminBrokerControllerHttpTest.java
```

- [ ] **Step 2: Write the failing tests**

Update every matched `.andExpect(jsonPath("$.message").value("<English>"))` in `UserProfileHttpTest.java` and
`AdminBrokerControllerHttpTest.java` to the glossary Vietnamese text, e.g.:

```java
                .andExpect(jsonPath("$.message").value("Hồ sơ môi giới yêu cầu số điện thoại"));
```
```java
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được đăng ký"));
```
```java
                .andExpect(jsonPath("$.message").value("Mật khẩu hiện tại không đúng"));
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=UserProfileHttpTest,AdminBrokerControllerHttpTest
```

Expected: FAIL on the updated assertions.

- [ ] **Step 4: Translate the production code**

In `UserProfileService.java`:

```java
    // line 54
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Hồ sơ môi giới yêu cầu số điện thoại");
```
```java
    // line 57
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được đăng ký");
```
```java
    // line 67
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được đăng ký", exception);
```
```java
    // line 87
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
```
```java
    // line 97
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy môi giới");
```
```java
    // line 108
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được đăng ký");
```
```java
    // line 111
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tên đăng nhập đã được đăng ký");
```
```java
    // line 114
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được đăng ký");
```
```java
    // line 124
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email hoặc tên đăng nhập đã được đăng ký", exception);
```
```java
    // line 127
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được đăng ký", exception);
```
```java
    // line 137
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Không thể khoá tài khoản quản trị viên");
```
```java
    // line 166
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=UserProfileHttpTest,AdminBrokerControllerHttpTest,UserProfileServiceTest
```

Expected: all PASS (`UserProfileServiceTest` uses Mockito + direct status-code assertions, not message
strings, per the earlier inventory — should be unaffected, included here as a regression check).

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminBrokerControllerHttpTest.java
git commit -m "i18n: translate UserProfileService error messages to Vietnamese"
```

---

### Task 4: `MediaService`

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/media/MediaService.java:59,85,92,106,108,111,114,118,120,127,129,141,145,168-169`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaConcurrencyIntegrationTest.java`

**Interfaces:** None. Independent of every other task (Task 2 also touches `MediaHttpTest.java` but for
different string literals — no conflict, both tasks add/change different assertion lines).

- [ ] **Step 1: Grep for old strings**

```bash
cd "backend-springboot"
grep -n "A property can have at most\|Media not found\|Authentication is required\|Broker role is required\|Broker profile requires a phone number\|Property not found\|Video link must be" src/main/java/com/travinh/realty/modules/media/MediaService.java src/test/java/com/travinh/realty/modules/media/*.java
```

- [ ] **Step 2: Write the failing tests**

Update every matched `.andExpect(jsonPath("$.message").value("<English>"))` (or `.getReason()`/exception
message assertion in `MediaConcurrencyIntegrationTest.java`) to the glossary Vietnamese text:

```java
                .andExpect(jsonPath("$.message").value("Mỗi bất động sản chỉ được tối đa 7 ảnh"));
```
```java
                .andExpect(jsonPath("$.message").value("Mỗi bất động sản chỉ được tối đa 1 video"));
```
```java
                .andExpect(jsonPath("$.message").value("Không tìm thấy bất động sản"));
```

In `MediaConcurrencyIntegrationTest.java`, if any assertion checks `exception.getReason()` for
`"A property can have at most one video"` (used to prove the DB unique-constraint fallback path, see
`isSingleVideoConstraint`/`translateMediaIntegrityException` in `MediaService.java`), update it to
`"Mỗi bất động sản chỉ được tối đa 1 video"`.

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=MediaHttpTest,MediaConcurrencyIntegrationTest
```

Expected: FAIL on the updated assertions.

- [ ] **Step 4: Translate the production code**

In `MediaService.java`:

```java
    // line 59
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Mỗi bất động sản chỉ được tối đa 7 ảnh");
```
```java
    // line 85
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tệp media"));
```
```java
    // line 92
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Mỗi bất động sản chỉ được tối đa 1 video");
```
```java
    // line 106
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập"));
```
```java
    // line 108
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập");
```
```java
    // line 111
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Yêu cầu vai trò môi giới");
```
```java
    // line 114
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Hồ sơ môi giới yêu cầu số điện thoại");
```
```java
    // line 118
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản"));
```
```java
    // line 120
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
```
```java
    // line 127
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản"));
```
```java
    // line 129
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
```
```java
    // line 141
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết video phải là URL HTTP(S) đầy đủ");
```
```java
    // line 145
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Liên kết video không hợp lệ", exception);
```
```java
    // lines 168-169
            return new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT,
                    "Mỗi bất động sản chỉ được tối đa 1 video", exception);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=MediaHttpTest,MediaConcurrencyIntegrationTest
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/media/MediaService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaConcurrencyIntegrationTest.java
git commit -m "i18n: translate MediaService error messages to Vietnamese"
```

---

### Task 5: `PropertyService`

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java:70,89,134,158,160,163,166,174,181,186,190,193,201-202,209-210,213-214,218,222,231,244,257,264,278`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertySearchRepositoryIntegrationTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminPropertyControllerHttpTest.java`

**Interfaces:** None. Independent of every other task.

- [ ] **Step 1: Grep for old strings**

```bash
cd "backend-springboot"
grep -n "Property not found\|Attribute 'ward'\|Unsupported search parameter\|Authentication is required\|Broker role is required\|Broker profile requires a phone number\|categoryId or categorySlug\|Category not found\|Too many attribute entries\|Attribute value too long\|Attribute value must be\|lat must be between\|lng must be between\|Invalid attribute filter key\|Invalid property status\|Invalid decimal value\|Attribute filter value is required\|Search parameter value is required" src/main/java/com/travinh/realty/modules/property/PropertyService.java src/test/java/com/travinh/realty/modules/property/*.java src/test/java/com/travinh/realty/modules/admin/AdminPropertyControllerHttpTest.java
```

- [ ] **Step 2: Write the failing tests**

Update every matched `.andExpect(jsonPath("$.message").value("<English>"))` to the glossary Vietnamese text.
Cases with an interpolated value (e.g. `"Too many attribute entries (max 20)"`,
`"Attribute value too long for key: description"`, `"Unsupported search parameter: foo"`) keep the exact
same interpolated suffix, only the fixed prefix/template text translates:

```java
                .andExpect(jsonPath("$.message").value("Không tìm thấy bất động sản"));
```
```java
                .andExpect(jsonPath("$.message").value("Vui lòng chọn phường/xã"));
```
```java
                .andExpect(jsonPath("$.message").value("Quá nhiều thuộc tính (tối đa 20)"));
```
```java
                .andExpect(jsonPath("$.message").value("Giá trị thuộc tính quá dài cho khoá: description"));
```
```java
                .andExpect(jsonPath("$.message").value("Giá trị thuộc tính phải là chuỗi, số hoặc boolean cho khoá: description"));
```
```java
                .andExpect(jsonPath("$.message").value("Khoá lọc thuộc tính không hợp lệ"));
```
```java
                .andExpect(jsonPath("$.message").value("lat phải nằm trong khoảng -90 đến 90"));
```

(These are illustrative — read the actual current test file to find every real matched assertion and update
each to its glossary counterpart; the exact set of assertions present may not include every message this
service can produce.)

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=PropertyHttpTest,AdminPropertyControllerHttpTest
```

Expected: FAIL on the updated assertions.

- [ ] **Step 4: Translate the production code**

In `PropertyService.java`:

```java
    // line 70
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
```
```java
    // line 89
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn phường/xã");
```
```java
    // line 134
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tham số tìm kiếm không được hỗ trợ: " + key);
```
```java
    // line 158
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập"));
```
```java
    // line 160
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập");
```
```java
    // line 163
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Yêu cầu vai trò môi giới");
```
```java
    // line 166
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT, "Hồ sơ môi giới yêu cầu số điện thoại");
```
```java
    // line 174
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
```
```java
    // line 181
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản"));
```
```java
    // line 186
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cần cung cấp categoryId hoặc categorySlug");
```
```java
    // line 190
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
```
```java
    // line 193
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy danh mục"));
```
```java
    // lines 201-202
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Quá nhiều thuộc tính (tối đa " + MAX_ATTRIBUTE_ENTRIES + ")");
```
```java
    // lines 209-210
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Giá trị thuộc tính quá dài cho khoá: " + key);
```
```java
    // lines 213-214
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Giá trị thuộc tính phải là chuỗi, số hoặc boolean cho khoá: " + key);
```
```java
    // line 218
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lat phải nằm trong khoảng -90 đến 90");
```
```java
    // line 222
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lng phải nằm trong khoảng -180 đến 180");
```
```java
    // line 231
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Khoá lọc thuộc tính không hợp lệ");
```
```java
    // line 244
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái bất động sản không hợp lệ", exception);
```
```java
    // line 257
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị số không hợp lệ cho " + name, exception);
```
```java
    // line 264
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị lọc thuộc tính là bắt buộc");
```
```java
    // line 278
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Giá trị tham số tìm kiếm là bắt buộc");
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=PropertyHttpTest,AdminPropertyControllerHttpTest,PropertySearchRepositoryIntegrationTest
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/property/PropertyHttpTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/admin/AdminPropertyControllerHttpTest.java
git commit -m "i18n: translate PropertyService error messages to Vietnamese"
```

---

### Task 6: `BookingService`, `AuthService`, `PasswordResetService` rate-limit alignment

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java:68,70,80,82,89,103,163,180`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java:42,47,53` (verify
  exact current line numbers — this file was edited in a prior session's plan, "don't count successful
  logins toward the rate limit", re-read the file before editing)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java:51,71`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java`

**Interfaces:** None. Independent of every other task. This task's ONLY overlap with Task 1 is that both
touch the identical string `"Too many requests. Please retry later."` → `"Quá nhiều yêu cầu. Vui lòng thử
lại sau."` — but in entirely different files (Task 1: `AuthRateLimitFilter.java`; this task:
`BookingService.java` ×2, `AuthService.java` ×1, `PasswordResetService.java` ×2), so there is no file
conflict. Use the exact same Vietnamese wording (glossary) so the two tasks produce identical text.

- [ ] **Step 1: Grep for old strings**

```bash
cd "backend-springboot"
grep -n "Property not found\|Too many requests. Please retry later.\|Appointment not found\|Invalid email or password\|Authentication is required" src/main/java/com/travinh/realty/modules/booking/BookingService.java src/main/java/com/travinh/realty/modules/auth/AuthService.java src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java src/test/java/com/travinh/realty/modules/auth/PasswordResetServiceTest.java
```

- [ ] **Step 2: Write the failing tests**

Update every matched `.andExpect(jsonPath("$.message").value("<English>"))` / `hasMessageContaining` /
similar assertion in `BookingHttpTest.java` to the glossary Vietnamese text:

```java
                .andExpect(jsonPath("$.message").value("Không tìm thấy bất động sản"));
```
```java
                .andExpect(jsonPath("$.message").value("Không tìm thấy lịch hẹn"));
```

`AuthServiceTest.java` and `PasswordResetServiceTest.java` currently only assert `hasMessageContaining("429")`
on the rate-limit tests (status code, not message text) — verify this via the grep above; if any assertion
DOES check message text for these strings, update it too, otherwise no test change is needed for the
rate-limit path in these 2 files (the production-code translation still happens in Step 4 regardless).

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=BookingHttpTest,AuthServiceTest,PasswordResetServiceTest
```

Expected: FAIL on any updated `BookingHttpTest` assertions (the other 2 files may show 0 failures if they
never asserted message text — that's fine, translation still happens in Step 4).

- [ ] **Step 4: Translate the production code**

In `BookingService.java`:

```java
    // line 68
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản"));
```
```java
    // line 70
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
```
```java
    // line 80
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản"));
```
```java
    // line 82
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bất động sản");
```
```java
    // line 89
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
```
```java
    // line 103
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
```
```java
    // line 163
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch hẹn"));
```
```java
    // line 180
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch hẹn");
```

In `AuthService.java` — re-read the file first (it was modified by an earlier plan this same day, "don't
count successful logins toward the rate limit"; the current structure wraps `auth.authenticate(...)` in a
try/catch). Translate all 3 English literals it still contains in place, keeping the surrounding
try/catch/if structure exactly as-is:

```java
            // "Too many requests. Please retry later." site (inside the catch block)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
```
```java
            // "Invalid email or password" site
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));
```
```java
            // "Authentication is required" site (in logout(), unauthenticated header check)
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Yêu cầu đăng nhập");
```

In `PasswordResetService.java`, lines 51 and 71 (both identical):

```java
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=BookingHttpTest,AuthServiceTest,PasswordResetServiceTest,BookingServiceTest
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/booking/BookingService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/PasswordResetService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/booking/BookingHttpTest.java
git commit -m "i18n: translate BookingService/AuthService/PasswordResetService messages to Vietnamese"
```

---

### Task 7: All Bean Validation `message=` attributes

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateProfileRequest.java` (all 4 fields)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CreateBrokerRequest.java` (all 5 fields)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/LoginRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ForgotPasswordRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ResetPasswordRequest.java` (email + newPassword — the `otpCode` `@Pattern` already has a Vietnamese message, leave it)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/ChangePasswordRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateUserStatusRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/UpdateViewingStatusRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/RequestViewingOtpRequest.java` (only the `@NotBlank` — `@Pattern` already Vietnamese)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/CreateViewingRequest.java` (roomLabel, visitorName, visitorPhone `@NotBlank`, note, expectedMoveIn — `visitorPhone`'s `@Pattern` already Vietnamese)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/VerifyViewingOtpRequest.java` (only the `@NotNull` on `booking` — `otpCode`'s `@Pattern` already Vietnamese)
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/media/dto/CreateVideoLinkRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/UpdatePropertyStatusRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/CreatePropertyRequest.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/UpdatePropertyRequest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/user/CreateBrokerRequestValidationTest.java`
- Test: any other test asserting on Jakarta's default English validation messages (grep in Step 1)

**Interfaces:** None. Independent of every other task (no other task touches these DTO files).

- [ ] **Step 1: Grep for tests asserting default Jakarta validation message text**

```bash
cd "backend-springboot"
grep -rn "must not be blank\|must not be null\|must be a well-formed email address\|size must be between" src/test
```

Any hit needs its expected string updated in Step 2 alongside the explicit-glossary ones below.

- [ ] **Step 2: Write the failing tests**

In `CreateBrokerRequestValidationTest.java`, find assertions on the field validation messages (username
format, phone format, etc.) and update expected values to match Step 4's new Vietnamese text below. Also add
this new test if no existing test covers the bare `@Pattern` on `username` (previously had no message,
defaulting to echoing the raw regex):

```java
    @Test
    void usernameWithInvalidCharactersReturnsVietnameseMessage() {
        var violations = validator.validate(new CreateBrokerRequest(
                "bad username!", "broker@example.com", "password123", "Tên Môi Giới", "0900000000"));

        assertThat(violations)
                .extracting(v -> v.getPropertyPath().toString())
                .contains("username");
        assertThat(violations.stream()
                .filter(v -> v.getPropertyPath().toString().equals("username"))
                .findFirst().orElseThrow().getMessage())
                .isEqualTo("Tên đăng nhập chỉ được chứa chữ, số và các ký tự _.-");
    }
```

(Check the existing test file's setup — it likely already has a `Validator validator` field and imports;
match that file's existing pattern rather than reintroducing a new validator instance if one exists.)

- [ ] **Step 3: Run tests to verify they fail**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=CreateBrokerRequestValidationTest
```

Expected: FAIL — the new test's field has no explicit message yet (echoes the raw regex), and any updated
assertions expect Vietnamese text not yet present.

- [ ] **Step 4: Add Vietnamese `message=` to every DTO field**

`UpdateProfileRequest.java` — full replacement:

```java
package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự") String fullName,
        @Pattern(regexp = "^\\s*$|^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$",
                message = "Số điện thoại không hợp lệ") @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự") String phone,
        @Pattern(regexp = "^$|^https?://.*", message = "Đường dẫn Facebook không hợp lệ") @Size(max = 2048, message = "Đường dẫn Facebook không được vượt quá 2048 ký tự") String facebookUrl,
        @Pattern(regexp = "^$|^https?://.*", message = "Đường dẫn TikTok không hợp lệ") @Size(max = 2048, message = "Đường dẫn TikTok không được vượt quá 2048 ký tự") String tiktokUrl
) {
}
```

`CreateBrokerRequest.java` — full replacement:

```java
package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateBrokerRequest(
        @NotBlank(message = "Vui lòng nhập tên đăng nhập") @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
        @Pattern(regexp = "^[A-Za-z0-9_.-]+$", message = "Tên đăng nhập chỉ được chứa chữ, số và các ký tự _.-") String username,
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") @Size(max = 254, message = "Email không được vượt quá 254 ký tự") String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu") @Size(min = 8, max = 72, message = "Mật khẩu phải từ 8 đến 72 ký tự") String password,
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự") String fullName,
        @NotBlank(message = "Vui lòng nhập số điện thoại") @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự")
        @Pattern(regexp = "^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$",
                message = "Số điện thoại không hợp lệ") String phone
) {
}
```

`LoginRequest.java` — full replacement:

```java
package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
        @NotBlank(message = "Vui lòng nhập mật khẩu") String password
) {
}
```

`ForgotPasswordRequest.java` — full replacement:

```java
package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email
) {
}
```

`ResetPasswordRequest.java` — full replacement (`otpCode`'s message is already Vietnamese, unchanged):

```java
package com.travinh.realty.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự") String newPassword
) {
}
```

`ChangePasswordRequest.java` — full replacement:

```java
package com.travinh.realty.modules.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String currentPassword,
        @NotBlank(message = "Vui lòng nhập mật khẩu mới") @Size(min = 8, message = "Mật khẩu mới phải có ít nhất 8 ký tự") String newPassword
) {
}
```

`UpdateUserStatusRequest.java` — full replacement:

```java
package com.travinh.realty.modules.user.dto;

import com.travinh.realty.modules.user.model.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái tài khoản") UserStatus status) {
}
```

`UpdateViewingStatusRequest.java` — full replacement:

```java
package com.travinh.realty.modules.booking.dto;

import com.travinh.realty.modules.booking.model.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateViewingStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái lịch hẹn") AppointmentStatus status) {
}
```

`RequestViewingOtpRequest.java` — full replacement (`@Pattern` message already Vietnamese, unchanged):

```java
package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RequestViewingOtpRequest(
        @NotBlank(message = "Vui lòng nhập số điện thoại")
        @Pattern(regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
                message = "Số điện thoại di động không hợp lệ") String visitorPhone
) {
}
```

`CreateViewingRequest.java` — full replacement (`visitorPhone`'s `@Pattern` message already Vietnamese,
unchanged):

```java
package com.travinh.realty.modules.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record CreateViewingRequest(
        @Size(max = 100, message = "Tên phòng không được vượt quá 100 ký tự") String roomLabel,
        @NotBlank(message = "Vui lòng nhập họ tên") @Size(max = 150, message = "Họ tên không được vượt quá 150 ký tự") String visitorName,
        @NotBlank(message = "Vui lòng nhập số điện thoại") @Size(max = 30, message = "Số điện thoại không được vượt quá 30 ký tự")
        @Pattern(regexp = "^(0|\\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\\d{7}$",
                message = "Số điện thoại di động không hợp lệ") String visitorPhone,
        @Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự") String note,
        @Size(max = 50, message = "Ngày dự kiến vào ở không được vượt quá 50 ký tự") String expectedMoveIn,
        Integer occupants,
        Integer vehicles,
        Boolean pets,
        Instant requestedAt
) {
}
```

`VerifyViewingOtpRequest.java` — full replacement (`otpCode`'s `@Pattern` message already Vietnamese,
unchanged):

```java
package com.travinh.realty.modules.booking.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record VerifyViewingOtpRequest(
        @Valid @NotNull(message = "Vui lòng nhập thông tin đặt lịch") CreateViewingRequest booking,
        @NotBlank @Pattern(regexp = "^\\d{6}$", message = "Mã OTP phải gồm 6 chữ số") String otpCode
) {
}
```

`CreateVideoLinkRequest.java` — full replacement:

```java
package com.travinh.realty.modules.media.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateVideoLinkRequest(
        @NotBlank(message = "Vui lòng nhập liên kết video") @Size(max = 2048, message = "Liên kết video không được vượt quá 2048 ký tự") String url
) {
}
```

`UpdatePropertyStatusRequest.java` — full replacement:

```java
package com.travinh.realty.modules.property.dto;

import com.travinh.realty.modules.property.model.PropertyStatus;
import jakarta.validation.constraints.NotNull;

public record UpdatePropertyStatusRequest(@NotNull(message = "Vui lòng chọn trạng thái bất động sản") PropertyStatus status) {
}
```

`CreatePropertyRequest.java` — full replacement:

```java
package com.travinh.realty.modules.property.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record CreatePropertyRequest(
        Long categoryId,
        @Size(max = 100, message = "categorySlug không được vượt quá 100 ký tự") String categorySlug,
        @NotBlank(message = "Vui lòng nhập tiêu đề") @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự") String title,
        @NotBlank(message = "Vui lòng nhập địa chỉ") @Size(max = 500, message = "Địa chỉ không được vượt quá 500 ký tự") String address,
        @NotNull(message = "Vui lòng nhập giá") @DecimalMin(value = "0.00", message = "Giá không được nhỏ hơn 0") BigDecimal price,
        Map<String, Object> attributes
) {
}
```

`UpdatePropertyRequest.java` — full replacement (identical field shape to `CreatePropertyRequest`):

```java
package com.travinh.realty.modules.property.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Map;

public record UpdatePropertyRequest(
        Long categoryId,
        @Size(max = 100, message = "categorySlug không được vượt quá 100 ký tự") String categorySlug,
        @NotBlank(message = "Vui lòng nhập tiêu đề") @Size(max = 255, message = "Tiêu đề không được vượt quá 255 ký tự") String title,
        @NotBlank(message = "Vui lòng nhập địa chỉ") @Size(max = 500, message = "Địa chỉ không được vượt quá 500 ký tự") String address,
        @NotNull(message = "Vui lòng nhập giá") @DecimalMin(value = "0.00", message = "Giá không được nhỏ hơn 0") BigDecimal price,
        Map<String, Object> attributes
) {
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test -Dtest=CreateBrokerRequestValidationTest,PropertyHttpTest,UserProfileHttpTest,BookingHttpTest
```

Expected: all PASS. This also re-runs a few test files from earlier tasks as a cross-check that DTO changes
didn't break any HTTP-layer test that constructs these request bodies.

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateProfileRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CreateBrokerRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/LoginRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ForgotPasswordRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/ResetPasswordRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/ChangePasswordRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/UpdateUserStatusRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/UpdateViewingStatusRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/RequestViewingOtpRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/CreateViewingRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/booking/dto/VerifyViewingOtpRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/media/dto/CreateVideoLinkRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/UpdatePropertyStatusRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/CreatePropertyRequest.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/UpdatePropertyRequest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/user/CreateBrokerRequestValidationTest.java
git commit -m "i18n: add Vietnamese Bean Validation messages to every request DTO"
```

---

### Task 8: Frontend fallback string + final full-tree sweep + full suite

**Files:**
- Modify: `frontend-react/src/services/api.js` (the `` `Request failed with ${response.status}` `` fallback,
  inside the shared `request()` helper — grep for it, don't assume the line number)
- Test: `frontend-react/src/services/api.test.js` (if it exists — check via glob; if not, no frontend test
  needs updating since no test currently exercises the no-message fallback path per the earlier inventory)

**Interfaces:** Consumes: the Vietnamese message text now returned by every backend error path (Tasks 1-7).
Produces: nothing further — this is the last task.

- [ ] **Step 1: Find and fix the frontend fallback string**

```bash
cd "frontend-react"
grep -n "Request failed with" src/services/api.js
```

Read the surrounding function, then replace:

```js
const error = new Error(body.message || `Request failed with ${response.status}`);
```

with:

```js
const error = new Error(body.message || `Yêu cầu thất bại với mã lỗi ${response.status}`);
```

(Keep everything else in that line/function identical — only the fallback string's text changes.)

- [ ] **Step 2: Check for a frontend test on this exact fallback path**

```bash
grep -rn "Request failed with" src/
```

If any test file matches, update its expected string to `"Yêu cầu thất bại với mã lỗi ..."` accordingly. If
no test matches (expected, per the earlier inventory — no frontend test exercises the no-`message` fallback
branch), skip to Step 3.

- [ ] **Step 3: Run the frontend suite**

```bash
npm test -- --run
```

Expected: same pass count as before this task (no regressions — this fallback string has no existing test
coverage per the inventory, so the count should be unchanged).

- [ ] **Step 4: Full-tree sweep for anything the inventory missed**

```bash
cd "../backend-springboot"
grep -rn 'ResponseStatusException([^)]*"[A-Za-z][^"]*"' src/main --include=*.java | grep -v '"[À-ỹ]'
```

This regex looks for `ResponseStatusException` calls whose message string starts with an ASCII letter
(likely still English) rather than a Vietnamese character. Read every match. Two categories are expected and
fine to leave: (a) matches inside files this plan intentionally left untouched because they were already
Vietnamese-only before this plan (none currently known — Tasks 1-6 covered every file the original inventory
found), (b) false positives where the regex catches a Vietnamese sentence that happens to start with an
ASCII-range character by coincidence (unlikely given Vietnamese diacritics, but check each match). If a
genuine still-English message turns up that Tasks 1-6 missed, translate it now following the same
glossary/style, write a quick regression test for it in the owning file's test class, and note it in the
final report — don't silently skip it.

Also sweep Bean Validation:

```bash
grep -rln 'jakarta.validation.constraints' src/main/java --include=*.java | xargs grep -L 'message = "' 
```

This lists DTO files that use Bean Validation annotations but contain zero `message = "` anywhere in the
file — cross-check this list against Task 7's file list above. Any file appearing here that Task 7 didn't
cover needs the same treatment (add Vietnamese `message=` to every constraint).

- [ ] **Step 5: Run the full backend and frontend suites**

```bash
cd "backend-springboot"
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot"
mvn test
```

Expected: `Tests run: 210 (or more, if Step 4 added a regression test), Failures: 0, Errors: 0`.

```bash
cd "../frontend-react"
npm test -- --run
```

Expected: same pass count as the pre-existing baseline (check `npm test -- --run` output before this task
for the exact number, e.g. run it once before Step 1 to record the baseline).

- [ ] **Step 6: Commit**

```bash
cd "d:/TraVinh Shelter"
git add frontend-react/src/services/api.js
git commit -m "i18n: translate the frontend's generic request-failure fallback message"
```

If Step 4 found and fixed anything beyond the frontend fallback, commit that separately with its own
descriptive message before this final commit, following the same `i18n: translate X to Vietnamese` pattern
as Tasks 1-7.
