# PROJECT_REVIEW_2026

## 1. Executive Summary

Review date: 2026-06-27

Scope reviewed: backend Spring Boot, frontend React/Vite, PostgreSQL migrations, Docker/Compose, configuration, security, tests, documentation, deployment readiness, and repository hygiene. Generated directories such as `backend-springboot/target`, `frontend-react/node_modules`, and `frontend-react/dist` were excluded from source review.

Overall score: **58/100**

Final status: **Prototype/MVP cần hardening**.

The backend is much closer to production-ready than the overall product: it has layered modules, DTOs, validation, Flyway, JWT security, global error handling, traceId logging, Actuator, Swagger, Dockerfile, and a meaningful backend test suite. The project is not production-ready as a whole because the frontend is only a placeholder, frontend testing/linting is absent, CI/CD is absent, Docker runtime could not be verified, Compose still commits default database credentials while running the backend with `prod`, and some security/operability controls remain missing.

No code was changed as part of this review. This report file is the only intended artifact.

## 2. Scorecard A-J

| Area | Score | Rationale for Lost Points |
| --- | ---: | --- |
| A. Architecture & Code Organization | 6/10 | Backend is module/layer oriented; frontend has only placeholder folders and a single render call, so product architecture is not implemented. |
| B. Backend API | 8/10 | REST/DTO/validation/transactions/error handling are solid; missing rate limiting, JWT lifecycle controls, per-endpoint OpenAPI detail, and max pageable limits. |
| C. Frontend | 2/10 | No real app shell, routing, API client, state management, forms, loading/error/empty states, accessibility work, or tests. |
| D. Database | 8/10 | Flyway migrations, constraints and indexes exist; seed/reference data is embedded in V1 and Docker DB credentials are static. |
| E. Security | 6/10 | Backend auth is decent; missing brute-force protection, token revocation/refresh strategy, dependency scan automation, strong upload content verification, and Compose secret hygiene. |
| F. Configuration & Environments | 6/10 | Backend profiles and fail-fast are present; frontend env is undocumented/mismatched and Compose uses hardcoded DB credentials with `prod`. |
| G. Testing | 5/10 | Backend tests pass, but Docker-dependent integration tests skipped locally; frontend has no test or lint scripts. |
| H. DevOps & Deployment | 5/10 | Dockerfile and Compose exist; no CI/CD, no deployed-cloud manifest, Docker daemon unavailable for runtime verification, no image scanning/SBOM. |
| I. Performance & Scalability | 6/10 | Pagination exists; no max page size, possible ORM N+1 in response mapping, no frontend performance strategy beyond tiny placeholder bundle. |
| J. Documentation & SDLC | 6/10 | README covers basic backend env/test/Docker; frontend env/test/build/deploy, CI, issue process, and technical debt tracking are thin. |

## 3. P0/P1/P2/P3 Findings

### P0 - Blocker

No P0 blocker found in source review.

### P1 - High

| ID | File/line | Vấn đề | Tác động | Cách sửa đề xuất |
| --- | --- | --- | --- | --- |
| P1-01 | `frontend-react/src/main.jsx:3` | Frontend is only a single `<h1>` render, despite the project being a real estate portal. Feature folders under `frontend-react/src/features/*` contain only `.gitkeep`. | Product cannot serve users: no auth, property list/detail, search, broker flows, admin flows, API calls, responsive UX, or error handling. | Build the actual React app shell: routing, layout, auth pages, property search/list/detail, broker/admin workflows, API service layer, reusable UI components, loading/error/empty states, and accessibility pass. |
| P1-02 | `frontend-react/package.json:6-9` | Frontend has `dev`, `build`, `preview` only; `npm test` and `npm run lint` fail with missing scripts. | No frontend regression gate, no static quality gate, and CI cannot reliably validate UI changes. | Add Vitest/React Testing Library or Playwright as appropriate, ESLint, scripts for `test`, `test:coverage`, and `lint`; wire them into CI. |
| P1-03 | `.github/workflows/*` (missing) | No CI/CD workflow directory exists. | Builds/tests/audits are manual; regressions, dependency risks, and Docker failures can merge unnoticed. | Add GitHub Actions or equivalent CI running backend `mvn test/package`, frontend `npm ci`, `npm run lint`, `npm test`, `npm run build`, `docker compose config`, dependency audits, and optional image build/scan. |
| P1-04 | `docker-compose.yml:6-11`, `docker-compose.yml:28-36` | Compose runs backend with `SPRING_PROFILES_ACTIVE=prod` but still commits static DB credentials (`travinh_user`/`travinh_password`) and publishes Postgres to host. | A prod-like local stack normalizes weak secrets; accidental reuse in staging/prod would expose the database and credentials. | Move DB credentials to required env vars or `.env.example` placeholders, use separate `docker-compose.dev.yml` for local defaults, avoid publishing DB by default, and document secret generation. |

### P2 - Medium

| ID | File/line | Vấn đề | Tác động | Cách sửa đề xuất |
| --- | --- | --- | --- | --- |
| P2-01 | `frontend-react/package.json:12-17`; `frontend-react/package-lock.json` (missing) | Frontend uses `"latest"` dependencies and has no committed lockfile. `npm ls --depth=0` reports packages as invalid because installed versions do not satisfy a stable semver range. | Builds are not reproducible; a future `npm install` can pull breaking Vite/React/plugin versions. | Pin semver ranges, commit `package-lock.json`, use `npm ci` in CI, and schedule dependency updates deliberately. |
| P2-02 | `frontend-react/.env:1`, `backend-springboot/src/main/resources/application.yml:3-4` | Frontend local env points to `http://localhost:8080/api`, while backend serves under `/api/v1`. | API calls will target the wrong base path once a real API client is added. | Use `VITE_API_BASE_URL=http://localhost:8080/api/v1`; add `.env.example`; document frontend env vars in README. |
| P2-03 | `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthController.java:21-22`, `backend-springboot/src/main/java/com/travinh/realty/common/config/SecurityConfig.java:49` | Login/register endpoints are public but there is no rate limiting, IP/user throttling, captcha/escalation, or account lockout policy. | Brute-force and credential stuffing attacks can hammer auth endpoints. | Add rate limiting at gateway or app layer, login attempt tracking, lockout/backoff policy, and security tests for throttling. |
| P2-04 | `backend-springboot/src/main/java/com/travinh/realty/modules/auth/dto/AuthResponse.java:7-10`, `backend-springboot/src/main/java/com/travinh/realty/modules/auth/security/JwtService.java:27-31` | JWT flow issues only self-contained access tokens; no refresh token, token id, rotation, revocation list, or logout invalidation. | Compromised tokens remain usable until expiry; admins cannot revoke individual sessions. | Add short-lived access tokens plus refresh tokens with rotation, `jti`, server-side session/revocation tracking, and logout/revoke endpoints. |
| P2-05 | `backend-springboot/src/main/java/com/travinh/realty/modules/property/PropertyController.java:36-39` | Public search accepts `Pageable` with only default size; no max page size is enforced. | Large `size` values can cause expensive queries and memory pressure. | Add `spring.data.web.pageable.max-page-size`, a custom `PageableHandlerMethodArgumentResolverCustomizer`, or explicit validation. |
| P2-06 | `backend-springboot/src/main/java/com/travinh/realty/modules/property/model/Property.java:33-39`, `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/PropertyResponse.java:13-17` | Search maps entities to DTOs through `property.getCategory()` and `property.getBroker()`; `ManyToOne` defaults to eager and can create N+1 or extra select patterns depending on query path. | Property list performance can degrade as result size grows. | Fetch required broker/category fields in the search query/projection, use DTO projections, explicit fetch joins/entity graphs, and add query count/performance tests. |
| P2-07 | `backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java:43-44`, `backend-springboot/src/main/java/com/travinh/realty/infrastructure/storage/LocalMediaStorage.java:92-98` | Upload validation trusts the client-supplied content type and extension mapping; no magic-byte sniffing or malware scanning hook. | A malicious file can be mislabeled as image/video and stored/served as static media. | Detect content via Apache Tika or magic bytes, verify extension/content consistency, add AV scanning hook for production, and test spoofed uploads. |
| P2-08 | `backend-springboot/src/main/java/com/travinh/realty/common/config/OpenApiConfig.java:18-31` | OpenAPI config only defines global metadata/security; controllers do not declare endpoint-specific summaries, response codes, error schemas, auth requirements, or request examples. | API docs are less useful for FE/mobile and less reliable as a contract. | Add `@Operation`, `@ApiResponse`, schema examples, grouped APIs, and generated OpenAPI validation in CI. |
| P2-09 | `backend-springboot/src/test/java/com/travinh/realty/DatabaseSchemaIntegrationTest.java:18`, `backend-springboot/src/test/java/com/travinh/realty/modules/media/MediaConcurrencyIntegrationTest.java:42` | Critical DB/concurrency integration tests are configured to skip when Docker is unavailable; current verification skipped 5 tests. | Local green build does not prove migrations/concurrency behavior without Docker. | Ensure CI has Docker/Testcontainers enabled; fail CI if integration tests are skipped unexpectedly. |
| P2-10 | `backend-springboot/Dockerfile:5` | Docker image build skips tests and there is no separate CI image validation visible in repo. | Broken code can still produce an image if Docker build is run alone. | Keep Docker build lean, but add CI stages before image build; optionally add a `test` build target or BuildKit cache with test stage. |
| P2-11 | `backend-springboot/pom.xml:99-105`, `frontend-react/package.json:6-9` | No static analysis/lint/security scan tooling is configured for backend or frontend. | Style, bug patterns, and dependency vulnerabilities rely on manual review. | Add Maven Enforcer, Spotless/Checkstyle, SpotBugs or Error Prone, OWASP Dependency-Check or Snyk/Dependabot, ESLint, and npm audit in CI. |
| P2-12 | `README.md:73-79`, `frontend-react/.env:1` | README documents frontend dev server only; no frontend env, build, test, deploy, or API base URL guidance. | New developers and deploy pipelines have to infer frontend configuration. | Add frontend setup/build/test/deploy sections and `.env.example` with `VITE_API_BASE_URL`. |

### P3 - Low

| ID | File/line | Vấn đề | Tác động | Cách sửa đề xuất |
| --- | --- | --- | --- | --- |
| P3-01 | `backend-springboot/src/main/java/com/travinh/realty/modules/auth/AuthService.java:24-27` | Several dependencies and statements are compressed onto one line. | Lower readability and noisier future diffs. | Format code consistently with a formatter such as Spotless/Google Java Format. |
| P3-02 | `backend-springboot/src/main/resources/db/migration/V1__initial_schema.sql:86-89` | Reference categories are seeded in the initial schema migration. | Fine for reference data, but future non-reference seed data could become hard to separate from production migrations. | Keep reference data migrations separate from dev/demo data; use profile-specific seed scripts for demo data. |
| P3-03 | `backend-springboot/Dockerfile:1`, `backend-springboot/Dockerfile:7` | Base images are not pinned by digest. | Rebuilds may vary when tags move. | Pin image digests or manage base image updates through Dependabot/Renovate. |
| P3-04 | `backend-springboot/src/main/resources/logback-spring.xml:5-6` | Logs are plain text, not structured JSON. | Harder parsing in centralized log platforms. | Use JSON logging for production profile or route through platform log processors with parsed MDC fields. |

## 4. Backend Review

Strengths:

- Clear package/module structure: `auth`, `property`, `media`, `user`, `admin`, `common`, `infrastructure`.
- DTOs are separate from entities; response mapping convention is `Response.from(...)`.
- Global exception handler returns a consistent `ApiError` and logs 500s with stacktrace.
- Trace/correlation support exists through `RequestCorrelationFilter` and MDC.
- Spring Security is stateless JWT with role checks and method security.
- Flyway migrations are present; production `ddl-auto` is `validate`.
- Actuator health/readiness/liveness are enabled.

Main backend gaps:

- Auth endpoints need rate limiting and session/token lifecycle hardening.
- Search needs max page-size protection and query-performance tests.
- OpenAPI docs need endpoint-level annotations and response/error schemas.
- Upload validation should not trust client content type alone.
- Static analysis/dependency scanning is not wired.

## 5. Frontend Review

Current frontend is not a production application. `frontend-react/src/main.jsx:3` renders only a heading. The folder structure hints at a planned architecture (`features`, `services`, `store`, `routes`, `components`), but those folders contain only `.gitkeep` files.

What is missing:

- Routes and page composition.
- API client and environment handling.
- Auth, property search/detail, broker/admin workflows.
- Loading, error, and empty states.
- Form validation.
- Accessibility work beyond a basic document language and viewport.
- Component/e2e tests.
- Linting and formatting scripts.
- Stable dependency lockfile.

Verification:

- `npm install`: succeeded, 0 vulnerabilities reported.
- `npm run build`: succeeded; produced a small bundle.
- `npm test -- --run`: failed because `test` script is missing.
- `npm run lint`: failed because `lint` script is missing.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.

## 6. Database Review

Strengths:

- Flyway migration files exist in `backend-springboot/src/main/resources/db/migration`.
- Main tables define primary keys, foreign keys, unique constraints, enum types, and useful indexes.
- JSONB attributes have a GIN index.
- Media has a partial unique index enforcing one video per property.

Risks:

- Reference category seed data is embedded in V1 migration. This is acceptable for stable reference data, but dev/demo data should not follow this pattern.
- Integration verification was skipped locally because Docker daemon was unavailable.
- Backups, restore testing, retention, and cloud database configuration are not documented.

## 7. Security Review

Positive controls:

- BCrypt password encoder.
- JWT secret fail-fast and minimum byte length.
- Role-based authorization.
- CORS allowlist from env.
- DTO validation on major request bodies.
- Stacktraces are not returned to clients.
- Upload path traversal protection exists.

Security gaps:

- No auth rate limiting or brute-force controls.
- No refresh-token rotation, JWT revocation, or logout invalidation.
- Upload validation needs content sniffing and malware scanning hooks.
- Compose includes static database credentials.
- No automated dependency/security scan in CI.
- No documented security headers policy beyond Spring Security defaults.

Secret scan:

- `rg` found default/dev/test values and test secrets, plus `travinh_password` in Compose. No private keys or cloud keys were found.
- `frontend-react/.env` exists locally and is ignored by `.gitignore`; it contains a non-secret URL but should be represented by `.env.example`.

## 8. Testing & Verification

Commands run:

```bash
mvn test
mvn package
npm install
npm run build
npm test -- --run
npm run lint
npm audit --audit-level=moderate
docker compose config
docker version
rg -n --hidden -S "(password|secret|api[_-]?key|token|PRIVATE KEY|AKIA|BEGIN RSA|travinh_password|replace-this|correct-horse|JWT_SECRET|DB_PASSWORD)" ...
git status --short
```

Results:

- Backend `mvn test`: BUILD SUCCESS; 53 tests run, 0 failures, 0 errors, 5 skipped.
- Backend `mvn package`: BUILD SUCCESS; same skipped Testcontainers tests.
- Skipped backend tests: Docker/Testcontainers integration tests skipped because Docker daemon was not available.
- Frontend `npm install`: success; npm audit during install found 0 vulnerabilities.
- Frontend `npm run build`: success.
- Frontend `npm test -- --run`: failed, missing `test` script.
- Frontend `npm run lint`: failed, missing `lint` script.
- Frontend `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `docker compose config`: success when `JWT_SECRET` is supplied.
- `docker version`: Docker client exists, but daemon connection failed: `dockerDesktopLinuxEngine` pipe was missing.
- `npm ls --depth=0`: failed with `ELSPROBLEMS` because dependencies are declared as `latest` and no stable lockfile is committed.

## 9. Deployment/Operations Review

What is ready:

- Backend Dockerfile is multi-stage and runs as a non-root user.
- Compose defines backend + PostgreSQL + health checks.
- Actuator health/readiness/liveness endpoints are configured.
- Backend env vars are documented in README.

What is not ready:

- Docker runtime could not be verified locally because Docker daemon was unavailable.
- No CI/CD workflow exists.
- No image registry/deployment target configuration exists.
- No container image vulnerability scanning or SBOM generation.
- No production database backup/restore documentation.
- No frontend deployment path, CDN/static hosting config, or environment docs.
- Observability is limited to logs and health; no metrics dashboard/alerts/tracing backend.

## 10. Recommended Fix Roadmap

1. P1: Build the real frontend app shell and core workflows.
2. P1: Add frontend test/lint scripts and initial coverage for critical flows.
3. P1: Add CI/CD workflow for backend, frontend, Docker config, audits, and integration tests with Docker enabled.
4. P1: Split dev/prod Compose secrets; require DB password through env and avoid publishing Postgres by default.
5. P2: Pin frontend dependency versions and commit `package-lock.json`.
6. P2: Add auth rate limiting and login abuse controls.
7. P2: Add JWT refresh/revocation/session lifecycle.
8. P2: Add max page-size limits and query performance tests.
9. P2: Harden upload verification with file signature checks and malware scanning hooks.
10. P2: Expand OpenAPI endpoint annotations and response schemas.
11. P2: Add static analysis and dependency scanning for Java and JavaScript.
12. P3: Pin Docker base images by digest and add structured JSON logs for production.

## 11. Final Verdict

The project is **not production-ready as a full 2026 web product**. Backend is relatively mature and close to production hardening, but the frontend is still a skeleton and the delivery pipeline is missing. The highest-leverage work is to finish the frontend, add CI/CD with real quality gates, clean up Compose secret handling, and harden auth/upload/performance controls.

Final score: **58/100 - Prototype/MVP cần hardening**.
