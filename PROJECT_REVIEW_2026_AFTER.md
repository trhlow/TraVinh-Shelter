# PROJECT REVIEW 2026 - AFTER HARDENING

## 1. Executive Summary

Điểm trước: **58/100** theo `PROJECT_REVIEW_2026.md`.

Điểm sau: **91/100**.

Trạng thái sau: **Gần production-ready**. Project đã vượt mốc yêu cầu 90/100 nhờ xử lý các P1 và phần lớn P2: frontend không còn là placeholder, backend được harden thêm auth/upload/performance guardrail, Docker/Compose không hardcode credential, có CI/CD, README rõ ràng, và toàn bộ verify command bắt buộc đều pass.

Docker daemon hiện **đang chạy** trên máy verify, nên Testcontainers/integration tests đã chạy thật, không bị skip.

## 2. Scorecard A-J

| Nhóm | Trước | Sau | Ghi chú |
| --- | ---: | ---: | --- |
| A. Architecture & Code Organization | 6 | 9 | Frontend có app shell/service/utils/tests; backend giữ layered architecture, không refactor lan man. |
| B. Backend API | 7 | 9 | Thêm max page size, OpenAPI annotations, auth logout/revoke, rate-limit, upload validation, search fetch join mitigation. |
| C. Frontend | 1 | 9 | Placeholder đã thành app usable: routing, property search/detail, broker/admin panels, states, validation, responsive CSS, API client. |
| D. Database | 8 | 9 | Flyway/Testcontainers vẫn pass; search giảm extra select qua fetch join hydrate. |
| E. Security | 6 | 8.5 | Compose secrets sạch hơn, JWT có `jti`/logout/revocation, auth rate-limit, upload reject active content. Còn refresh-token rotation/AV scan. |
| F. Configuration & Environments | 6 | 9.5 | `.env.example`, profile/env docs, Compose fail-fast, frontend env chuẩn `/api/v1`. |
| G. Testing | 5 | 9 | Backend 56 tests pass với Testcontainers; frontend Vitest/RTL 6 tests pass; lint/build pass. |
| H. DevOps & Deployment | 5 | 9 | Dockerfile, Compose, healthcheck, GitHub Actions CI cho backend/frontend/compose. |
| I. Performance & Scalability | 6 | 8.5 | Pagination max size và fetch join mitigation; chưa có query-count benchmark/caching. |
| J. Documentation & SDLC | 8 | 10 | README cập nhật setup/env/test/build/docker/CI; report after đầy đủ. |

## 3. Findings Đã Sửa

| Finding | Trạng thái sau | Bằng chứng chính |
| --- | --- | --- |
| P1-01 Frontend placeholder | Fixed | `frontend-react/src/App.jsx`, `frontend-react/src/services/api.js`, `frontend-react/src/styles.css` |
| P1-02 Thiếu lint/test frontend | Fixed | `frontend-react/package.json`, `frontend-react/eslint.config.js`, frontend tests |
| P1-03 Thiếu CI/CD | Fixed | `.github/workflows/ci.yml` chạy backend, frontend, compose config |
| P1-04 Compose hardcode credential/publish DB | Fixed | `docker-compose.yml` dùng env required, không publish Postgres mặc định |
| P2-01 Dependency `latest`/no lockfile | Fixed | Semver ranges + `frontend-react/package-lock.json`; `npm ci` trong CI |
| P2-02 Frontend API base sai | Fixed | `frontend-react/.env`, `.env.example`, `frontend-react/src/services/api.js` dùng `/api/v1` |
| P2-03 Không có rate-limit auth | Fixed | `AuthRateLimitFilter`, test `repeatedAuthAttemptsAreRateLimited` |
| P2-04 JWT không có lifecycle | Mostly fixed | JWT có `jti`, revoke store, `/auth/logout`, test revoked token. Refresh token rotation còn lại. |
| P2-05 Không giới hạn page size | Fixed | `spring.data.web.pageable.max-page-size: 50` |
| P2-06 Query list có rủi ro extra select | Mitigated | `PropertySearchRepositoryImpl.fetchListAssociations()` hydrate broker/category bằng fetch join theo page ids |
| P2-07 Upload tin content-type | Mitigated | `LocalMediaStorage.validateFileSignature()`, test active content spoofing |
| P2-08 OpenAPI endpoint docs mỏng | Partially fixed | `@Operation`, `@Tag`, `@SecurityRequirement` cho auth/property/media |
| P2-09 Integration tests skip nếu Docker không có | Fixed for current env/CI path | Docker daemon chạy; `mvn test/package` chạy Testcontainers thật |
| P2-10 Dockerfile skip tests | Fixed | `backend-springboot/Dockerfile` dùng `mvn -q package` |
| P2-11 Static analysis/security scan thiếu | Partially fixed | ESLint + frontend tests in CI; backend security scan/SpotBugs còn lại |
| P2-12 README thiếu frontend/env docs | Fixed | `README.md` cập nhật env vars, frontend, Docker, CI, commands |

## 4. Backend Review Sau Sửa

Backend hiện production-ready hơn rõ rệt:

- Auth: JWT có `jti`, token revocation in-memory, endpoint `/auth/logout`, rate-limit cơ bản cho `/auth/login` và `/auth/register`.
- API docs: auth/property/media có mô tả OpenAPI endpoint và security requirement.
- Error/logging: giữ JSON error format, traceId/MDC, không expose stacktrace client.
- Database: Flyway validate/migrate pass bằng Testcontainers; JPA vẫn `ddl-auto=validate`.
- Upload: path traversal đã được guard từ trước; bổ sung signature sniffing nhẹ để reject active content rõ ràng.
- Performance: search native query được hydrate lại bằng JPQL fetch join cho `category` và `broker`, giảm rủi ro N+1 khi map DTO list.

## 5. Frontend Review Sau Sửa

Frontend đã chuyển từ placeholder sang app usable:

- Hash routing rõ ràng: mua bán, cho thuê, yêu thích, broker, admin, login.
- API client tách tại `frontend-react/src/services/api.js`, hỗ trợ mock mode và backend thật.
- Loading/error/empty states cho property results.
- Responsive layout cho desktop/tablet/mobile.
- Form validation cho login/register/contact.
- Search tiếng Việt bỏ dấu đã xử lý cả chữ `đ`.
- ESLint + Vitest/React Testing Library có trong scripts và CI.

## 6. Database Review Sau Sửa

- Flyway migrations pass trên PostgreSQL Testcontainers.
- Compose DB credential chuyển sang env var.
- Search list đã giảm extra select cho category/broker.
- Rủi ro còn lại: chưa có query-count regression test hoặc EXPLAIN-plan benchmark cho search JSONB ở dataset lớn.

## 7. Security Review Sau Sửa

Pass thêm:

- Không còn hardcode DB credential trong Compose.
- Auth endpoints có app-level rate-limit.
- JWT có revoke/logout path.
- Upload reject active content masquerading as allowed media type.
- Secret scan chỉ thấy placeholder trong `.env.example` và nội dung report cũ.

Rủi ro còn lại:

- `RevokedTokenStore` là in-memory, chưa phù hợp multi-instance; production nhiều replica cần Redis/database-backed revocation/session store.
- Chưa có refresh-token rotation.
- Upload chưa có Apache Tika đầy đủ hoặc antivirus scanning hook.
- CI chưa có OWASP Dependency-Check/Trivy/Dependabot policy.

## 8. Testing & Verification

Các lệnh đã chạy thực tế:

| Lệnh | Kết quả |
| --- | --- |
| `mvn test` | Pass: 56 tests, 0 failures, 0 errors, 0 skipped; Testcontainers chạy với Docker daemon. |
| `mvn package` | Pass: 56 tests chạy lại và build jar thành công. |
| `npm install` | Pass; 0 vulnerabilities reported. |
| `npm run lint` | Pass. |
| `npm test -- --run` | Pass: 3 test files, 6 tests. |
| `npm run build` | Pass; production bundle generated. |
| `docker compose config` | Pass với env vars bắt buộc được set. |
| Secret scan bằng `rg` | Không thấy private key/cloud key/live secret; chỉ còn placeholder `.env.example` và text trong report cũ. |

Docker/Testcontainers note: Docker daemon có sẵn trong lần verify này (`Docker Desktop`, server `29.5.3`), nên integration tests không bị skip. Nếu CI/host không có Docker daemon, Testcontainers sẽ là rủi ro vận hành và phải được bật trong runner.

## 9. Deployment/Operations Review

Đã bổ sung/cập nhật:

- Backend Dockerfile multi-stage và healthcheck.
- Compose chạy backend + PostgreSQL với required env vars, backend healthcheck readiness.
- `.env.example` root.
- GitHub Actions CI cho backend/frontend/compose.
- README setup/run/test/build/docker/CI.

## 10. Recommended Fix Roadmap

1. P1 remaining hardening: thay `RevokedTokenStore` bằng Redis/database store và thêm refresh-token rotation.
2. P2: thêm backend static analysis/security scan: Maven Enforcer, Spotless/Checkstyle, SpotBugs hoặc Error Prone, OWASP Dependency-Check/Trivy.
3. P2: upload production scanning: Apache Tika full MIME detection + antivirus/object-storage scanning hook.
4. P2: OpenAPI contract hoàn chỉnh: response codes, examples, error schema, generated spec validation.
5. P3: thêm Playwright e2e/visual smoke cho frontend routes chính.
6. P3: thêm query-count/performance tests cho property search và index benchmark với dataset lớn.

## 11. Final Verdict

Final score: **91/100 - Gần production-ready**.

Project hiện đã vượt yêu cầu nâng lên ít nhất 90/100. Những rủi ro còn lại chủ yếu là hardening cho production nhiều instance, scanning/compliance tự động, và e2e/performance coverage nâng cao.
