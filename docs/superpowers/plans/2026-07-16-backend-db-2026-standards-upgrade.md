# Nâng cấp theo tiêu chuẩn backend/DB 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vá 7 gap còn lại được phát hiện khi đối chiếu code thật với các tiêu chuẩn 2026 mới nhất
(OWASP ASVS 5.0, CI/CD security baseline, CIS PostgreSQL 18 Benchmark, Luật Bảo vệ dữ liệu cá nhân
91/2025/QH15) — nâng điểm tuân thủ kỹ thuật từ ~85% ước tính lên gần tối đa cho quy mô dự án này.

**Architecture:** Không đổi kiến trúc — chỉ thêm: (a) 2 job CI mới + sửa job `deploy` trong
`.github/workflows/ci.yml`, (b) 2 migration Flyway mới (V22, V23) tiếp nối chuỗi migration hiện có,
(c) 1 dòng logging bảo mật vào 2 service Java đã tồn tại, (d) sửa docs.

**Tech Stack:** Spring Boot 4.0.5 / Java 25, PostgreSQL 18, Flyway, GitHub Actions, Testcontainers,
JUnit 5 + Mockito + AssertJ, Logback (đã có sẵn qua `spring-boot-starter-logging`, không cần thêm
dependency nào).

## Global Constraints

- Test command backend: `JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test`
  chạy từ `backend-springboot/` (máy dev này có 2 JDK, `JAVA_HOME` mặc định trỏ JDK 21 — luôn set
  tường minh JDK 25 trong mọi lệnh `mvn`).
- Không phá vỡ hành vi hiện có của `travinh_app_runtime`/migrator role (đã verify qua docker compose
  thật tuần trước — xem `V20__create_least_privilege_app_role.sql`).
- Commit message tiếng Anh, conventional commits, KHÔNG có dòng `Co-Authored-By`.
- Không tự ý mở rộng phạm vi ngoài 7 task liệt kê dưới đây.

---

## Task 1: Secret scanning trong CI (Gitleaks)

**Vấn đề:** Không có bước nào trong CI chặn commit chứa secret lộ (API key, password, token) — xác
nhận qua grep `.github/` không có `gitleaks|trufflehog|secret.scan` nào.

**Quyết định kỹ thuật quan trọng:** dùng trực tiếp Docker image chính thức
`ghcr.io/gitleaks/gitleaks:latest` (Apache-2.0/MIT, hoàn toàn miễn phí, không giới hạn theo loại
repo) thay vì GitHub Action wrapper `gitleaks/gitleaks-action` — action wrapper đó **yêu cầu license
trả phí cho repo thuộc GitHub Organization** (chỉ miễn phí cho personal account + public repo), nên
dùng binary/image gốc để tránh phụ thuộc vào giấy phép không rõ ràng.

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:** Không có — chỉ thêm 1 job CI độc lập, không phụ thuộc job khác.

- [ ] **Step 1: Thêm job `secret-scan` vào `.github/workflows/ci.yml`**

Thêm job mới (đặt sau job `frontend`, trước job `compose`):

```yaml
  secret-scan:
    name: Secret scanning (Gitleaks)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        run: |
          docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:latest detect \
            --source /repo --redact --exit-code 1 --verbose
```

`fetch-depth: 0` để Gitleaks quét được toàn bộ lịch sử commit (không chỉ commit mới nhất) — bắt được
secret lỡ commit rồi xoá ở commit sau. `--redact` để log CI không in secret thật ra output công khai.
`--exit-code 1` để job fail (chặn merge) nếu tìm thấy secret.

- [ ] **Step 2: Verify YAML hợp lệ**

Đọc lại toàn bộ `ci.yml` sau khi sửa, xác nhận indentation nhất quán (2-space, khớp style các job
khác trong cùng file) và job `secret-scan` không lồng nhầm vào job khác.

- [ ] **Step 3: Verify không có false positive chặn CI**

Chạy thử lệnh Gitleaks y hệt CI ngay trên máy dev (cần Docker daemon đang chạy — `docker info` để
xác nhận trước):

```bash
cd "d:/TraVinh Shelter"
docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:latest detect \
  --source /repo --redact --exit-code 1 --verbose
```

Nếu lệnh fail vì tìm thấy secret thật trong lịch sử git (không phải placeholder dev rõ ràng như
`travinh_dev_password`), DỪNG lại và báo cho user — không tự ý thêm allowlist để né lỗi. Nếu chỉ là
false positive rõ ràng (placeholder dev, giá trị test), thêm file `.gitleaksignore` với đúng
fingerprint Gitleaks in ra (không dùng wildcard rộng).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add Gitleaks secret scanning job"
```

---

## Task 2: Container image scan trong CI (Trivy)

**Vấn đề:** Job `deploy` build & push image thẳng lên GHCR, không quét CVE trong image nào trước khi
push — xác nhận qua đọc `ci.yml:106-122`.

**CẢNH BÁO BẢO MẬT QUAN TRỌNG (phải đọc trước khi implement):** `aquasecurity/trivy-action` vừa bị
compromise chuỗi cung ứng thật vào 19/03/2026 (kẻ tấn công force-push mã độc đánh cắp credential vào
76/77 tag của action, và cả 3 phiên bản binary Trivy v0.69.4-v0.69.6) — xem
`https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23`. Vì vậy:
- **BẮT BUỘC pin action theo full commit SHA**, không dùng tag version thông thường (tag có thể bị
  force-push lại y như vụ này).
- SHA an toàn đã tự verify bằng `git ls-remote --tags` trực tiếp (không tin theo trang web tóm tắt —
  một lần thử fetch trang GitHub Releases trả về SHA SAI): tag `v0.36.0` (phát hành sau khi sự cố
  được khắc phục) = commit `ed142fd0673e97e23eac54620cfb913e5ce36c25`.
  **Đính chính (sau review Task 2):** giá trị `git ls-remote --tags` ban đầu lấy được
  (`a9c7b0f06e461e9d4b4d1711f154ee024b8d7ab8`) thực chất là SHA của **tag object** (annotated tag),
  không phải commit SHA thật — plan lúc đó nhầm lẫn hai giá trị này. SHA commit đúng là
  `ed142fd0673e97e23eac54620cfb913e5ce36c25`, đây là giá trị duy nhất còn hợp lệ (đã dùng trong
  `ci.yml` thực tế); giá trị cũ không còn được coi là đúng.
- Nếu implementer thấy tag mới hơn `v0.36.0` đã có tại thời điểm thực thi task này, **tự chạy lại**
  `git ls-remote --tags https://github.com/aquasecurity/trivy-action.git` để lấy SHA mới, không copy
  SHA từ bất kỳ nguồn nào khác ngoài `git ls-remote` trực tiếp.

**Files:**
- Modify: `.github/workflows/ci.yml` (job `deploy`)

**Interfaces:** Không có — chỉ chèn thêm step scan giữa build và push, không đổi output của job.

- [ ] **Step 1: Sửa job `deploy` — tách build/scan/push cho backend**

Thay 2 step "Build and push backend image" / "Build and push frontend image" hiện có (dòng
106-122 của `ci.yml`) bằng:

```yaml
      - name: Build backend image
        uses: docker/build-push-action@v6
        with:
          context: ./backend-springboot
          push: false
          load: true
          tags: ghcr.io/${{ github.repository_owner }}/travinh-shelter-backend:latest

      - name: Scan backend image for vulnerabilities
        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0
        with:
          image-ref: ghcr.io/${{ github.repository_owner }}/travinh-shelter-backend:latest
          severity: CRITICAL,HIGH
          exit-code: "1"
          ignore-unfixed: true

      - name: Push backend image
        run: docker push ghcr.io/${{ github.repository_owner }}/travinh-shelter-backend:latest

      - name: Build frontend image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend-react
          push: false
          load: true
          build-args: |
            VITE_API_BASE_URL=/api/v1
            VITE_USE_MOCK_API=false
            VITE_SENTRY_DSN=${{ secrets.VITE_SENTRY_DSN }}
          tags: ghcr.io/${{ github.repository_owner }}/travinh-shelter-frontend:latest

      - name: Scan frontend image for vulnerabilities
        uses: aquasecurity/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25 # v0.36.0
        with:
          image-ref: ghcr.io/${{ github.repository_owner }}/travinh-shelter-frontend:latest
          severity: CRITICAL,HIGH
          exit-code: "1"
          ignore-unfixed: true

      - name: Push frontend image
        run: docker push ghcr.io/${{ github.repository_owner }}/travinh-shelter-frontend:latest
```

`ignore-unfixed: true` — không fail CI vì CVE chưa có bản vá (không đáng để chặn deploy, không có gì
làm được ở tầng image); chỉ fail nếu có CVE CRITICAL/HIGH ĐÃ CÓ bản vá mà image đang dùng phiên bản
cũ. `push: false, load: true` build image vào Docker daemon của runner nhưng không đẩy lên GHCR ngay
— chỉ push sau khi scan pass, tránh đẩy image dính CVE nghiêm trọng lên registry công khai dù chỉ
tạm thời.

- [ ] **Step 2: Verify YAML hợp lệ**

Đọc lại toàn bộ job `deploy`, xác nhận thứ tự step đúng: build → scan → push cho backend, rồi build →
scan → push cho frontend, `docker/login-action@v3` vẫn ở step đầu job (không đổi).

- [ ] **Step 3: Verify SHA pin đúng cú pháp**

```bash
git ls-remote --tags https://github.com/aquasecurity/trivy-action.git | grep v0.36.0
```

Xác nhận output đúng `ed142fd0673e97e23eac54620cfb913e5ce36c25	refs/tags/v0.36.0` — nếu khác, sửa
SHA trong `ci.yml` theo giá trị thật vừa lấy được, không giữ giá trị cũ trong plan.

**Lưu ý:** với annotated tag, `git ls-remote --tags` trả về SHA của tag object, không phải commit SHA
(đây chính là nguồn gốc nhầm lẫn đã đính chính ở Task 2 phía trên) — để lấy commit SHA thật, dùng
`git rev-list -n1 v0.36.0`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: scan Docker images with Trivy before pushing to GHCR"
```

---

## Task 3: Tách dependency-review-action thành job riêng, repo-wide

**Vấn đề:** Step "Review dependencies in PR" hiện nằm trong job `frontend` — về mặt kỹ thuật GitHub
Dependency Graph đọc `pom.xml` gốc repo bất kể job nào chạy action (action không bị giới hạn bởi
`working-directory` của job cha, chỉ `run:` step mới bị ảnh hưởng), nhưng đặt lẫn trong job `frontend`
gây hiểu nhầm phạm vi và dễ vỡ nếu sau này ai đó thêm `paths:` filter cho job `frontend` (PR chỉ đổi
backend sẽ vô tình bỏ qua luôn bước SCA).

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:** Không có — tách 1 step đã có sẵn thành job độc lập, hành vi không đổi.

- [ ] **Step 1: Xoá step "Review dependencies in PR" khỏi job `frontend`**

Xoá đoạn này khỏi job `frontend` (giữa step "Audit dependencies" và "Lint"):

```yaml
      - name: Review dependencies in PR
        if: github.event_name == 'pull_request'
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
```

- [ ] **Step 2: Thêm job `dependency-review` độc lập ở top-level**

Thêm job mới (đặt sau job `secret-scan` từ Task 1, trước job `compose`):

```yaml
  dependency-review:
    name: Dependency review (SCA, repo-wide)
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Review dependencies
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: high
```

- [ ] **Step 3: Verify YAML hợp lệ**

Đọc lại `ci.yml`, xác nhận job `frontend` không còn step dependency-review, job `dependency-review`
mới độc lập và không phụ thuộc `needs:` job nào khác (chạy song song với backend/frontend).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: move dependency review to its own repo-wide job"
```

---

## Task 4: CIS PostgreSQL — REVOKE quyền mặc định của PUBLIC trên schema public

**Vấn đề:** `V20__create_least_privilege_app_role.sql` đã tách role `travinh_app_runtime` đúng cách
nhưng chưa `REVOKE` quyền mặc định mà PostgreSQL tự cấp cho pseudo-role `PUBLIC` trên schema
`public` — xác nhận qua đọc trực tiếp file V20, không có dòng `REVOKE ... FROM PUBLIC` nào. CIS
PostgreSQL 18 Benchmark khuyến nghị mọi quyền truy cập phải qua grant tường minh, không qua quyền
ngầm định của PUBLIC.

**Files:**
- Create: `backend-springboot/src/main/resources/db/migration/V22__revoke_public_schema_privileges.sql`
- Test: `backend-springboot/src/test/java/com/travinh/realty/PublicSchemaPrivilegeIntegrationTest.java`

**Interfaces:** Không có — migration độc lập, không đổi API/service nào.

- [ ] **Step 1: Viết test tích hợp trước (RED)**

Tạo file `backend-springboot/src/test/java/com/travinh/realty/PublicSchemaPrivilegeIntegrationTest.java`:

```java
package com.travinh.realty;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Proves V22__revoke_public_schema_privileges.sql: the PUBLIC pseudo-role has no default
 * privilege left on the public schema after migration, matching CIS PostgreSQL Benchmark's
 * "no implicit PUBLIC access" recommendation.
 */
@SpringBootTest(properties = "app.jwt.secret=test-only-jwt-secret-that-is-at-least-thirty-two-bytes")
@Testcontainers(disabledWithoutDocker = true)
class PublicSchemaPrivilegeIntegrationTest {

    private static final String APP_RUNTIME_PASSWORD = "test-only-app-runtime-password";

    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_public_priv_test")
            .withUsername("postgres")
            .withPassword("postgres");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.placeholders.appRuntimePassword", () -> APP_RUNTIME_PASSWORD);
        registry.add("spring.flyway.placeholders.migratorUsername", POSTGRES::getUsername);
    }

    @Test
    void publicPseudoRoleHasNoDefaultSchemaPrivilege() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     "SELECT has_schema_privilege('public', 'public', 'USAGE')")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getBoolean(1)).isFalse();
        }
    }

    @Test
    void appRuntimeRoleStillHasUsageDespitePublicRevoke() throws SQLException {
        try (Connection connection = DriverManager.getConnection(
                     POSTGRES.getJdbcUrl(), "travinh_app_runtime", APP_RUNTIME_PASSWORD);
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT count(*) FROM categories")) {
            assertThat(resultSet.next()).isTrue();
        }
    }
}
```

Test thứ 2 xác nhận REVOKE FROM PUBLIC không vô tình phá quyền tường minh của
`travinh_app_runtime` (2 chuyện độc lập trong PostgreSQL ACL, nhưng verify thật thay vì giả định).

- [ ] **Step 2: Chạy test, xác nhận FAIL**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PublicSchemaPrivilegeIntegrationTest
```

Expected: `publicPseudoRoleHasNoDefaultSchemaPrivilege` FAIL (`has_schema_privilege` trả `true` vì
chưa có V22). Test thứ 2 PASS ngay từ đầu (không liên quan gì tới V22) — bình thường, không phải lỗi.

- [ ] **Step 3: Viết migration**

Tạo file `backend-springboot/src/main/resources/db/migration/V22__revoke_public_schema_privileges.sql`:

```sql
-- CIS PostgreSQL 18 Benchmark: the PUBLIC pseudo-role should not retain any default privilege on
-- the public schema. Every real access path already has its own explicit grant — the Flyway
-- migrator owns the schema, and travinh_app_runtime was explicitly granted USAGE + CRUD in V20 —
-- so this only removes the *implicit* privilege PostgreSQL grants to PUBLIC by default; it does
-- not change what the app or the migrator can do.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

- [ ] **Step 4: Chạy lại test, xác nhận PASS**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PublicSchemaPrivilegeIntegrationTest
```

Expected: cả 2 test PASS.

- [ ] **Step 5: Chạy toàn bộ suite backend, xác nhận không có regression**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
```

Expected: tất cả test cũ vẫn pass (đặc biệt `AppRuntimeRoleIntegrationTest` — V22 chạy sau V20/V21,
không được phá vỡ role đã tạo trước đó).

- [ ] **Step 6: Commit**

```bash
git add backend-springboot/src/main/resources/db/migration/V22__revoke_public_schema_privileges.sql \
        backend-springboot/src/test/java/com/travinh/realty/PublicSchemaPrivilegeIntegrationTest.java
git commit -m "feat(security): revoke PUBLIC's default privileges on schema public"
```

---

## Task 5: Bật `pg_stat_statements` + connection logging (dev), ghi chú cho prod

**Vấn đề:** Không có monitoring nào cho slow query (`pg_stat_statements`) hay log kết nối
(`log_connections`/`log_disconnections`) — cả 2 đều KHÔNG TÌM THẤY trong repo (baseline vận hành
production PostgreSQL được khuyến nghị rộng rãi, không riêng CIS).

**Quyết định kỹ thuật:** chỉ cấu hình cứng cho **dev** (`docker-compose.yml`, ta toàn quyền kiểm
soát) qua `command:` override của image Postgres. **Không** viết migration ép buộc `CREATE EXTENSION
pg_stat_statements` fail cứng cho prod, vì DO Managed Postgres (chưa go-live, chưa xác nhận được có
preload extension này hay không) — dùng khối `DO $$ ... EXCEPTION WHEN OTHERS` để bỏ qua an toàn nếu
extension chưa preload, thay vì làm sập cả migration/deploy.

**Files:**
- Modify: `docker-compose.yml`
- Create: `backend-springboot/src/main/resources/db/migration/V23__enable_pg_stat_statements.sql`
- Test: `backend-springboot/src/test/java/com/travinh/realty/PgStatStatementsIntegrationTest.java`
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:** Không có — thuần config + migration, không đổi API/service nào.

- [ ] **Step 1: Viết test tích hợp trước (RED)**

Tạo file `backend-springboot/src/test/java/com/travinh/realty/PgStatStatementsIntegrationTest.java`:

```java
package com.travinh.realty;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Proves V23__enable_pg_stat_statements.sql actually creates the extension when the server has
 * it preloaded (mirrors docker-compose.yml's dev command override), and proves the migration
 * doesn't fail deployment when it isn't preloaded (mirrors an unconfigured managed-Postgres prod).
 */
@Testcontainers(disabledWithoutDocker = true)
class PgStatStatementsIntegrationTest {

    @Container
    static final PostgreSQLContainer PRELOADED_POSTGRES = new PostgreSQLContainer("postgres:18.4-alpine")
            .withDatabaseName("tv_realty_pgss_test")
            .withUsername("postgres")
            .withPassword("postgres")
            .withCommand("postgres", "-c", "shared_preload_libraries=pg_stat_statements");

    @Test
    void extensionIsCreatedWhenPreloaded() throws SQLException {
        migrate(PRELOADED_POSTGRES);

        try (Connection connection = DriverManager.getConnection(
                     PRELOADED_POSTGRES.getJdbcUrl(), PRELOADED_POSTGRES.getUsername(), PRELOADED_POSTGRES.getPassword());
             Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(
                     "SELECT count(*) FROM pg_extension WHERE extname = 'pg_stat_statements'")) {
            assertThat(resultSet.next()).isTrue();
            assertThat(resultSet.getInt(1)).isEqualTo(1);
        }
    }

    private void migrate(PostgreSQLContainer container) {
        org.flywaydb.core.Flyway.configure()
                .dataSource(container.getJdbcUrl(), container.getUsername(), container.getPassword())
                .placeholders(java.util.Map.of(
                        "appRuntimePassword", "test-only-app-runtime-password",
                        "migratorUsername", container.getUsername()))
                .load()
                .migrate();
    }
}
```

Dùng Flyway API trực tiếp (không qua `@SpringBootTest`) vì cần 1 container Postgres riêng có
`shared_preload_libraries` từ lúc khởi động — tách khỏi Spring context để test nhẹ và nhanh hơn.

- [ ] **Step 2: Chạy test, xác nhận FAIL**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PgStatStatementsIntegrationTest
```

Expected: FAIL — `pg_extension` chưa có `pg_stat_statements` vì migration V23 chưa tồn tại.

- [ ] **Step 3: Viết migration**

Tạo file `backend-springboot/src/main/resources/db/migration/V23__enable_pg_stat_statements.sql`:

```sql
-- CIS PostgreSQL Benchmark / production monitoring baseline: pg_stat_statements tracks execution
-- statistics for slow-query monitoring. It requires shared_preload_libraries=pg_stat_statements at
-- the server level (set via docker-compose.yml's `command:` for local/dev Postgres); a managed
-- provider (e.g. DigitalOcean) may or may not preload it depending on plan/config, so this is
-- wrapped to skip safely instead of failing the whole migration (and blocking deploy) when the
-- extension isn't preloaded there — confirm manually via the provider's dashboard/CLI before
-- relying on this for production monitoring (see docs/DEPLOYMENT.md).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_stat_statements unavailable (likely missing from shared_preload_libraries) - skipped safely.';
END $$;
```

- [ ] **Step 4: Chạy lại test, xác nhận PASS**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=PgStatStatementsIntegrationTest
```

Expected: PASS.

- [ ] **Step 5: Sửa `docker-compose.yml` — bật preload cho dev + connection logging**

Trong `docker-compose.yml`, service `postgres`, thêm dòng `command:` ngay sau `container_name`:

```yaml
  postgres:
    image: postgres:18.4-alpine
    container_name: travinh-realty-postgres
    restart: unless-stopped
    command:
      - postgres
      - -c
      - shared_preload_libraries=pg_stat_statements
      - -c
      - log_connections=on
      - -c
      - log_disconnections=on
    environment:
```

(giữ nguyên toàn bộ phần `environment:` và phía sau, chỉ chèn thêm khối `command:` vào giữa
`restart: unless-stopped` và `environment:`).

- [ ] **Step 6: Verify docker compose config hợp lệ**

```bash
cd "d:/TraVinh Shelter"
docker compose config --quiet
```

Expected: không có lỗi (exit code 0). Nếu Docker Desktop chưa chạy, khởi động trước
(`powershell -Command "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'"`, đợi
`docker info` thành công).

- [ ] **Step 7: Ghi chú vào `docs/DEPLOYMENT.md` cho prod**

Tìm đoạn nói về least-privilege DB role trong `docs/DEPLOYMENT.md` (gần dòng có "Migration V20"),
thêm ngay sau đoạn đó:

```markdown
**Migration V23 (pg_stat_statements)**: chạy an toàn dù DO Managed Postgres có preload extension
này hay không (tự bỏ qua nếu thiếu `shared_preload_libraries`, không chặn deploy). Để tận dụng
monitoring slow-query thật ở prod, vào DO control panel → database cluster → xác nhận
`pg_stat_statements` nằm trong danh sách extension được hỗ trợ/bật sẵn trước khi coi đây là nguồn
giám sát chính thức.
```

- [ ] **Step 8: Chạy toàn bộ suite backend, xác nhận không có regression**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
```

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml docs/DEPLOYMENT.md \
        backend-springboot/src/main/resources/db/migration/V23__enable_pg_stat_statements.sql \
        backend-springboot/src/test/java/com/travinh/realty/PgStatStatementsIntegrationTest.java
git commit -m "feat(db): enable pg_stat_statements and connection logging for dev"
```

---

## Task 6: Audit log cho sự kiện bảo mật (đăng nhập thất bại + tự đổi mật khẩu)

**Vấn đề:** ASVS 5.0 V8 yêu cầu ghi log các sự kiện bảo mật (login fail, đổi mật khẩu). Hiện tại
`AuditService`/`audit_logs` chỉ ghi hành động ADMIN (khoá tài khoản, tạo broker...), không ghi gì khi
user thường đăng nhập sai hoặc tự đổi mật khẩu — xác nhận qua đọc `AuthService.java`/
`UserProfileService.java`, không có `log.*` nào ở 2 chỗ này.

**Quyết định kỹ thuật:** dùng SLF4J log (`log.warn`/`log.info`) thay vì bảng `audit_logs` — sự kiện
này tần suất cao (mọi lần đăng nhập sai), không cần lưu vĩnh viễn trong DB như audit hành động admin;
log tập trung (đã có sẵn qua `logback-spring.xml` ghi ra stdout, phù hợp 12-Factor) là đủ cho mục
đích phát hiện brute-force/điều tra sự cố.

**Files:**
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`
- Test: `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileServiceTest.java`

**Interfaces:** Không đổi signature nào — chỉ thêm side-effect logging bên trong method đã có.

- [ ] **Step 1: Viết test cho login-fail logging trước (RED)**

Thêm vào cuối `backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java`
(trước dấu `}` đóng class), và thêm import ở đầu file:

```java
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;
```

Test mới:

```java
    @Test
    void loginFailureIsLoggedAsSecurityEvent() {
        Logger logger = (Logger) LoggerFactory.getLogger(AuthService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("bad credentials"));
            AuthService service = new AuthService(users, encoder, authenticationManager, jwt, properties,
                    new InMemoryRateLimiter());

            assertThatThrownBy(() -> service.login(new com.travinh.realty.modules.auth.dto.LoginRequest(
                    "audit-test@example.com", "wrong-password")))
                    .isInstanceOf(BadCredentialsException.class);

            assertThat(appender.list)
                    .anyMatch(event -> event.getLevel() == Level.WARN
                            && event.getFormattedMessage().contains("audit-test@example.com"));
        } finally {
            logger.detachAppender(appender);
        }
    }
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=AuthServiceTest#loginFailureIsLoggedAsSecurityEvent
```

Expected: FAIL — `appender.list` rỗng, chưa có log nào được ghi.

- [ ] **Step 3: Thêm logging vào `AuthService.java`**

Thêm 2 import vào đầu file (sau `import java.time.Duration;`):

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
```

Thêm field logger ngay sau khai báo `MAX_FAILED_LOGINS_PER_ACCOUNT`/`ACCOUNT_LOCKOUT_WINDOW`:

```java
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
```

Sửa method `login()` — thêm `log.warn(...)` ngay đầu khối `catch`:

```java
        } catch (AuthenticationException exception) {
            log.warn("Login failed for email={}", email);
            if (!rateLimiter.tryAcquire("login-account:" + email, MAX_FAILED_LOGINS_PER_ACCOUNT, ACCOUNT_LOCKOUT_WINDOW)) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
            }
            throw exception;
        }
```

- [ ] **Step 4: Chạy lại test, xác nhận PASS**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=AuthServiceTest
```

Expected: tất cả test trong `AuthServiceTest` PASS (kể cả 3 test cũ).

- [ ] **Step 5: Viết test cho change-password logging trước (RED)**

Thêm vào đầu `backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileServiceTest.java`:

```java
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;
```

Thêm test mới (cạnh `changePasswordSucceedsAndUpdatesStoredHash`):

```java
    @Test
    void changePasswordIsLoggedAsSecurityEvent() {
        Logger logger = (Logger) LoggerFactory.getLogger(UserProfileService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
            User user = user(UserRole.BROKER, UserStatus.ACTIVE, "Broker", "0900000000");
            ReflectionTestUtils.setField(user, "passwordHash", encoder.encode("old-password"));
            when(users.findById(user.getId())).thenReturn(Optional.of(user));

            service().changePassword(UserPrincipal.from(user),
                    new ChangePasswordRequest("old-password", "new-password-secure"), "current-jwt-token");

            assertThat(appender.list)
                    .anyMatch(event -> event.getLevel() == Level.INFO
                            && event.getFormattedMessage().contains(user.getId().toString()));
        } finally {
            logger.detachAppender(appender);
        }
    }
```

- [ ] **Step 6: Chạy test, xác nhận FAIL**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=UserProfileServiceTest#changePasswordIsLoggedAsSecurityEvent
```

Expected: FAIL — chưa có log nào.

- [ ] **Step 7: Thêm logging vào `UserProfileService.java`**

Thêm 2 import vào đầu file (sau `import java.util.Objects;`):

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
```

Thêm field logger ngay sau khai báo các field hiện có (`users`/`passwordEncoder`/`storage`/`jwt`):

```java
    private static final Logger log = LoggerFactory.getLogger(UserProfileService.class);
```

Sửa method `changePassword()` — thêm `log.info(...)` sau dòng `jwt.revoke(currentToken);`:

```java
    @Transactional
    public void changePassword(UserPrincipal principal, ChangePasswordRequest request, String currentToken) {
        User user = findUser(principal.id());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }
        user.updatePasswordHash(passwordEncoder.encode(request.newPassword()));
        jwt.revoke(currentToken);
        log.info("Password changed for userId={}", user.getId());
    }
```

- [ ] **Step 8: Chạy lại test, xác nhận PASS**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test -Dtest=UserProfileServiceTest
```

Expected: tất cả test trong `UserProfileServiceTest` PASS.

- [ ] **Step 9: Chạy toàn bộ suite backend, xác nhận không có regression**

```bash
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
```

- [ ] **Step 10: Commit**

```bash
git add backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java \
        backend-springboot/src/main/java/com/travinh/realty/modules/user/UserProfileService.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/auth/AuthServiceTest.java \
        backend-springboot/src/test/java/com/travinh/realty/modules/user/UserProfileServiceTest.java
git commit -m "feat(security): log login failures and self password changes as security events"
```

---

## Task 7: Cập nhật docs — Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 thay Nghị định 13/2023

**Vấn đề:** `docs/DEPLOYMENT.md` vẫn ghi "Nghị định 13/2023/NĐ-CP" cho phần rủi ro pháp lý cross-border
+ quyền xoá dữ liệu — đã xác nhận (nghiên cứu tuần này) văn bản này đã bị thay thế bởi **Luật Bảo vệ
dữ liệu cá nhân số 91/2025/QH15**, hiệu lực từ 01/01/2026.

**Files:**
- Modify: `docs/DEPLOYMENT.md`

**Interfaces:** Không có — thuần cập nhật văn bản docs.

- [ ] **Step 1: Sửa đoạn ghi chú cross-border transfer**

Tìm đoạn (gần dòng có "2 nhà cung cấp khác nhau"):

```markdown
- **2 nhà cung cấp khác nhau** (Vietnix VPS Việt Nam, DigitalOcean DB Singapore) — có cross-region
  latency giữa app và DB, nên đo thử sau khi go-live. Nghị định 13/2023/NĐ-CP: dữ liệu lưu trữ ở DO
  Singapore về bản chất là "chuyển dữ liệu ra nước ngoài" dù chỉ là tầng lưu trữ — cần xác nhận với
  chuyên gia pháp lý/tuân thủ trước khi go-live chính thức với khách hàng thật, đây là quyết định
  pháp lý ngoài phạm vi kỹ thuật.
```

Sửa thành:

```markdown
- **2 nhà cung cấp khác nhau** (Vietnix VPS Việt Nam, DigitalOcean DB Singapore) — có cross-region
  latency giữa app và DB, nên đo thử sau khi go-live. **Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15**
  (hiệu lực từ 01/01/2026, thay thế Nghị định 13/2023/NĐ-CP): dữ liệu lưu trữ ở DO Singapore về bản
  chất là "chuyển dữ liệu ra nước ngoài" dù chỉ là tầng lưu trữ — cần xác nhận với chuyên gia pháp
  lý/tuân thủ trước khi go-live chính thức với khách hàng thật, đây là quyết định pháp lý ngoài phạm
  vi kỹ thuật. Luật mới còn có nghĩa vụ thông báo vi phạm dữ liệu trong 72 giờ và có thể yêu cầu đánh
  giá tác động (DPIA)/chỉ định DPO nếu xử lý dữ liệu cá nhân nhạy cảm — cần rà soát riêng, không phải
  việc kỹ thuật thuần tuý.
```

- [ ] **Step 2: Sửa đoạn ghi chú về `DELETE /users/me`**

Tìm đoạn ngay sau đó (gần dòng có "DELETE /users/me"):

```markdown
- **`DELETE /users/me` (xoá tài khoản) chỉ là baseline kỹ thuật, KHÔNG phải xác nhận tuân thủ pháp
  lý đầy đủ** — endpoint ẩn danh hoá các trường định danh cá nhân trên bản ghi `User`
  (`fullName`/`phone`/`avatarUrl`/`facebookUrl`/`tiktokUrl`/`email`/`username`) và bump
  `passwordChangedAt` để vô hiệu JWT hiện có, nhưng KHÔNG cascade-xoá property/booking liên quan
  (giữ lại vì đó là dữ liệu giao dịch/audit) và không tự động xoá media đã upload hay audit log đã
  ghi tên. Cùng loại rủi ro pháp lý "cross-border transfer" ở trên — cần xác nhận với chuyên gia
  pháp lý/tuân thủ về phạm vi "quyền xoá dữ liệu" theo Nghị định 13/2023/NĐ-CP (hay văn bản thay
  thế) trước khi go-live chính thức với khách hàng thật.
```

Sửa thành:

```markdown
- **`DELETE /users/me` (xoá tài khoản) chỉ là baseline kỹ thuật, KHÔNG phải xác nhận tuân thủ pháp
  lý đầy đủ** — endpoint ẩn danh hoá các trường định danh cá nhân trên bản ghi `User`
  (`fullName`/`phone`/`avatarUrl`/`facebookUrl`/`tiktokUrl`/`email`/`username`) và bump
  `passwordChangedAt` để vô hiệu JWT hiện có, nhưng KHÔNG cascade-xoá property/booking liên quan
  (giữ lại vì đó là dữ liệu giao dịch/audit) và không tự động xoá media đã upload hay audit log đã
  ghi tên. Cùng loại rủi ro pháp lý "cross-border transfer" ở trên — cần xác nhận với chuyên gia
  pháp lý/tuân thủ về phạm vi "quyền xoá dữ liệu" theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15
  (hiệu lực từ 01/01/2026, thay thế Nghị định 13/2023/NĐ-CP) trước khi go-live chính thức với khách
  hàng thật.
```

- [ ] **Step 3: Verify**

Đọc lại toàn bộ đoạn đã sửa trong `docs/DEPLOYMENT.md`, xác nhận không còn chỗ nào ghi "Nghị định
13/2023" mà không kèm chú thích "đã thay thế bởi Luật 91/2025/QH15":

```bash
cd "d:/TraVinh Shelter"
grep -n "Nghị định 13" docs/DEPLOYMENT.md
```

Expected: chỉ còn xuất hiện trong ngữ cảnh "(hay văn bản thay thế)" / "(thay thế Nghị định
13/2023/NĐ-CP)" — không còn đứng một mình như văn bản hiện hành.

- [ ] **Step 4: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: update legal references to Luật 91/2025/QH15 replacing Nghị định 13/2023"
```

---

## Thứ tự thực hiện & commit

**Task 1, 2, 3 đụng chung 1 file** (`.github/workflows/ci.yml`) — PHẢI làm tuần tự (không chạy song
song qua nhiều subagent cùng lúc), theo đúng thứ tự 1 → 2 → 3, mỗi task tự pull/rebase state file mới
nhất trước khi sửa tiếp.

**Task 4, 5 đụng chung** thư mục migration (`V22`, `V23` phải theo đúng thứ tự số) — làm tuần tự
4 → 5.

**Task 6, 7 độc lập hoàn toàn** với các task khác — có thể chạy song song với nhóm Task 1-3 hoặc
4-5 nếu dùng subagent-driven-development với isolation phù hợp, nhưng đơn giản nhất vẫn là làm tuần
tự 1 → 2 → 3 → 4 → 5 → 6 → 7 để tránh mọi rủi ro conflict.

Mỗi task: RED (test fail, hoặc verify YAML/docs đúng cho task không có test) → GREEN → verify bằng
lệnh thật trước khi commit — không tự tuyên bố xong khi chưa chạy lệnh verify.

## Verify tổng thể (trước khi báo hoàn thành)

```bash
cd "d:/TraVinh Shelter/backend-springboot"
JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-25.0.3.9-hotspot" mvn test
cd "d:/TraVinh Shelter"
docker compose config --quiet
grep -n "Nghị định 13" docs/DEPLOYMENT.md
```

Sau khi push nhánh lên GitHub và mở PR thật (hoặc push thẳng lên `devlong` nếu user đồng ý theo quy
ước dự án), kiểm tra tab Actions: job `secret-scan`, `dependency-review`, `deploy` (2 step Trivy scan)
chạy thành công — đây là lần verify THẬT duy nhất cho Task 1-3 vì không thể giả lập GitHub Actions
runner 100% ở local.

## Critical Files

- `.github/workflows/ci.yml` (Task 1, 2, 3)
- `backend-springboot/src/main/resources/db/migration/V22__*.sql`, `V23__*.sql` (Task 4, 5, mới)
- `backend-springboot/src/test/java/com/travinh/realty/PublicSchemaPrivilegeIntegrationTest.java`,
  `PgStatStatementsIntegrationTest.java` (Task 4, 5, mới)
- `docker-compose.yml` (Task 5)
- `backend-springboot/.../modules/auth/AuthService.java`,
  `backend-springboot/.../modules/user/UserProfileService.java` (Task 6)
- `backend-springboot/src/test/java/.../AuthServiceTest.java`,
  `.../UserProfileServiceTest.java` (Task 6)
- `docs/DEPLOYMENT.md` (Task 5, 7)
