# Backend Review Template

> Dung de review backend Spring Boot theo chuan layered architecture, RESTful API, security, database, testing va operations.

## 1. Thong Tin Review

- Du an:
- Repository/Branch:
- Ngay review:
- Nguoi review:
- Pham vi review:
- Cach kiem tra da thuc hien:
  - Doc source code:
  - Chay test:
  - Chay app local:
  - Kiem tra API/Swagger:
  - Kiem tra Docker/CI:

## 2. Tom Tat Ket Qua

- Diem tong quan: `__/100`
- Muc san sang production:
  - [ ] Chua san sang
  - [ ] Can sua cac loi P1 truoc khi release
  - [ ] Co the release co dieu kien
  - [ ] San sang release
- Ket luan ngan:

## 3. Findings

### P0 - Blocker

> Loi gay mat du lieu, lo thong tin nhay cam, khong khoi dong duoc app, hoac loi bao mat nghiem trong.

- Khong co finding.

### P1 - High

> Can sua truoc khi release production.

| ID | Hang muc | Van de | Bang chung | Anh huong | De xuat |
| --- | --- | --- | --- | --- | --- |
| P1-01 |  |  | `file:line` |  |  |

### P2 - Medium

> Nen sua som de tang maintainability, observability, security hoac do on dinh.

| ID | Hang muc | Van de | Bang chung | Anh huong | De xuat |
| --- | --- | --- | --- | --- | --- |
| P2-01 |  |  | `file:line` |  |  |

### P3 - Low

> Cai thien nho, cleanup, convention, documentation.

| ID | Hang muc | Van de | Bang chung | Anh huong | De xuat |
| --- | --- | --- | --- | --- | --- |
| P3-01 |  |  | `file:line` |  |  |

## 4. Checklist Chi Tiet

### 4.1 Kien Truc & Phan Lop

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Package chia ro theo module/layer | [ ] Pass [ ] Partial [ ] Fail |  |
| Controller chi nhan request, goi service, tra response | [ ] Pass [ ] Partial [ ] Fail |  |
| Service chua business logic | [ ] Pass [ ] Partial [ ] Fail |  |
| Repository chi giao tiep database | [ ] Pass [ ] Partial [ ] Fail |  |
| Entity va DTO tach biet | [ ] Pass [ ] Partial [ ] Fail |  |
| Co mapper ro rang: MapStruct/ModelMapper/manual mapper co convention | [ ] Pass [ ] Partial [ ] Fail |  |
| Service khong phu thuoc truc tiep HTTP object neu khong can thiet | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.2 Cau Hinh & Moi Truong

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Co profile `dev`, `test`, `staging`, `prod` | [ ] Pass [ ] Partial [ ] Fail |  |
| Sensitive config doc tu environment variables | [ ] Pass [ ] Partial [ ] Fail |  |
| Khong hardcode DB password, JWT secret, API key | [ ] Pass [ ] Partial [ ] Fail |  |
| Cau hinh production khong dung default secret/password | [ ] Pass [ ] Partial [ ] Fail |  |
| Config co validate/fail-fast khi thieu secret quan trong | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.3 RESTful API & Documentation

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Endpoint dung danh tu so nhieu | [ ] Pass [ ] Partial [ ] Fail |  |
| HTTP method dung semantics | [ ] Pass [ ] Partial [ ] Fail |  |
| HTTP status code dung: 200/201/204/400/401/403/404/409/422/500 | [ ] Pass [ ] Partial [ ] Fail |  |
| Response format nhat quan | [ ] Pass [ ] Partial [ ] Fail |  |
| Co Swagger/OpenAPI | [ ] Pass [ ] Partial [ ] Fail |  |
| API docs co mo ta auth, request, response, error | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.4 Exception Handling & Logging

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Co `@RestControllerAdvice` | [ ] Pass [ ] Partial [ ] Fail |  |
| Error response JSON co format chuan | [ ] Pass [ ] Partial [ ] Fail |  |
| Validation error tra field errors ro rang | [ ] Pass [ ] Partial [ ] Fail |  |
| Exception 500 duoc log stacktrace | [ ] Pass [ ] Partial [ ] Fail |  |
| Dung SLF4J + Logback | [ ] Pass [ ] Partial [ ] Fail |  |
| Co trace id/correlation id trong log | [ ] Pass [ ] Partial [ ] Fail |  |
| Log level tach ro INFO/DEBUG/WARN/ERROR | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.5 Database & Transaction

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Co Flyway/Liquibase migration | [ ] Pass [ ] Partial [ ] Fail |  |
| Production khong dung `ddl-auto=update` | [ ] Pass [ ] Partial [ ] Fail |  |
| Index/constraint phu hop voi query va business rule | [ ] Pass [ ] Partial [ ] Fail |  |
| Service mutation co `@Transactional` | [ ] Pass [ ] Partial [ ] Fail |  |
| Query co `@Transactional(readOnly = true)` khi phu hop | [ ] Pass [ ] Partial [ ] Fail |  |
| Xu ly concurrency/race condition o rule quan trong | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.6 Security

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Co Spring Security | [ ] Pass [ ] Partial [ ] Fail |  |
| Auth stateless JWT/OAuth2 phu hop | [ ] Pass [ ] Partial [ ] Fail |  |
| Password hash bang BCrypt/Argon2 | [ ] Pass [ ] Partial [ ] Fail |  |
| Authorization theo role/permission ro rang | [ ] Pass [ ] Partial [ ] Fail |  |
| Input validation bang `@Valid`, `@NotNull`, `@Size`, ... | [ ] Pass [ ] Partial [ ] Fail |  |
| CORS allowlist chat che | [ ] Pass [ ] Partial [ ] Fail |  |
| Khong expose stacktrace/secret ra client | [ ] Pass [ ] Partial [ ] Fail |  |
| Upload file co validate content type, size, path traversal | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.7 Testing

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Unit test cho service logic quan trong | [ ] Pass [ ] Partial [ ] Fail |  |
| Controller/API test cho status code va validation | [ ] Pass [ ] Partial [ ] Fail |  |
| Security test cho auth/authz | [ ] Pass [ ] Partial [ ] Fail |  |
| Integration test voi DB that/Testcontainers | [ ] Pass [ ] Partial [ ] Fail |  |
| Test migration/schema | [ ] Pass [ ] Partial [ ] Fail |  |
| Test suite chay thanh cong trong moi truong review | [ ] Pass [ ] Partial [ ] Fail |  |

### 4.8 Operations, Deployment & SDLC

| Tieu chi | Trang thai | Ghi chu/Bang chung |
| --- | --- | --- |
| Co Dockerfile cho backend | [ ] Pass [ ] Partial [ ] Fail |  |
| Co docker-compose/local stack day du | [ ] Pass [ ] Partial [ ] Fail |  |
| Co health check bang Spring Boot Actuator | [ ] Pass [ ] Partial [ ] Fail |  |
| Co readiness/liveness endpoint neu deploy Kubernetes/cloud | [ ] Pass [ ] Partial [ ] Fail |  |
| Co CI chay build/test/lint | [ ] Pass [ ] Partial [ ] Fail |  |
| Co quy trinh backlog/Jira hoac tuong duong cho bug/tech debt | [ ] Pass [ ] Partial [ ] Fail |  |
| Co README huong dan setup, env vars, run test, deploy | [ ] Pass [ ] Partial [ ] Fail |  |

## 5. Diem Manh

- 
- 
- 

## 6. Rui Ro Con Lai

- 
- 
- 

## 7. De Xuat Uu Tien Sua

| Thu tu | Viec can lam | Muc do | Ly do |
| --- | --- | --- | --- |
| 1 |  | P1 |  |
| 2 |  | P1/P2 |  |
| 3 |  | P2 |  |

## 8. Ket Qua Kiem Thu

Lenh da chay:

```bash

```

Ket qua:

- Tests run:
- Failures:
- Errors:
- Skipped:
- Ghi chu:

## 9. Mau Ket Luan Nhanh

Backend hien dat khoang `__/100`. Core business va cau truc hien tai `on/chua on` o cac diem: `...`.

Truoc khi release production, can uu tien sua: `...`.

Da verify bang: `...`. Rui ro con lai: `...`.
