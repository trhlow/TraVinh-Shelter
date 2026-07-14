<div align="center">

# 🏠 Công Tín Land

**Nền tảng bất động sản kết nối người mua/bán với đội ngũ môi giới tại Trà Vinh.**

_Uy tín — Tận tâm — Hiệu quả_

[![Java](https://img.shields.io/badge/Java-25-orange.svg)](https://openjdk.org/projects/jdk/25/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.0-6DB33F.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D.svg?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

</div>

---

## Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ](#công-nghệ)
- [Kiến trúc](#kiến-trúc)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Phát triển](#phát-triển)
- [Kiểm thử](#kiểm-thử)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [API](#api)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Docker Compose](#docker-compose)
- [CI/CD](#cicd)
- [Ghi chú vận hành & bảo mật](#ghi-chú-vận-hành--bảo-mật)
- [Hạn chế đã biết](#hạn-chế-đã-biết)
- [Quy ước đóng góp](#quy-ước-đóng-góp)
- [Giấy phép](#giấy-phép)

---

## Giới thiệu

Công Tín Land là cổng thông tin bất động sản cho khu vực Trà Vinh, hỗ trợ ba loại hình:
**Trọ** (`tro`), **Nhà** (`nha`) và **Đất** (`dat`). Nền tảng kết nối khách hàng với đội ngũ
môi giới đã được xác minh, cho phép tìm kiếm, xem chi tiết và đặt lịch xem bất động sản.

Dự án là một **monorepo** gồm backend Spring Boot 4, frontend React + Vite, PostgreSQL 18 và
Redis, đóng gói chạy được toàn bộ bằng Docker Compose.

## Tính năng chính

**Khách (không cần đăng nhập)**
- Trang chủ với tìm kiếm đa tiêu chí (khu vực · loại hình · khoảng giá) và các hàng bất động sản theo loại
- Trang tìm kiếm với bộ lọc, trang chi tiết bất động sản kèm thư viện ảnh
- Đặt lịch xem (booking): xác thực số điện thoại VN, ngày xem/chuyển vào hợp lệ, và **bắt buộc
  xác minh mã OTP gửi qua SMS** trước khi lịch hẹn được tạo (chống spam)
- Danh sách dự án và hồ sơ môi giới (kèm liên kết Facebook/TikTok nếu môi giới đã cập nhật)

**Tài khoản (`ADMIN` / `BROKER`)**
- Đăng nhập, đổi mật khẩu, **quên mật khẩu qua mã OTP gửi email** (không có tự đăng ký `USER` —
  tài khoản môi giới chỉ do admin tạo)

**Môi giới (`BROKER`)**
- Bảng điều khiển: đăng/sửa tin, quản lý tin đăng của mình
- Quản lý lịch hẹn xem của tin mình phụ trách (xác nhận/hủy)
- Cập nhật hồ sơ (bao gồm liên kết mạng xã hội) và đổi mật khẩu

**Quản trị (`ADMIN`)**
- Tổng quan thống kê (tài khoản, bài đăng, cơ cấu theo loại/khu vực)
- Quản lý người dùng, tạo/quản lý môi giới và bài đăng
- Theo dõi lịch hẹn xem toàn hệ thống (chỉ đọc) và nhật ký kiểm toán (audit log)

## Công nghệ

| Lớp | Công nghệ |
| --- | --- |
| Frontend | React 19, Vite 8, CSS custom properties, `lucide-react`, font Be Vietnam Pro |
| Backend | Spring Boot 4.0, Java 25, Spring Security (JWT stateless), Spring Data JPA |
| Database | PostgreSQL 18, Flyway migration |
| Cache / rate-limit / OTP | Redis 7 (fallback in-memory khi không có Redis, ví dụ slice test) |
| Thông báo | Brevo SMTP (email OTP khôi phục mật khẩu), eSMS.vn REST API (SMS OTP đặt lịch) |
| API docs | springdoc-openapi (Swagger UI) |
| Testing (FE) | Vitest + Testing Library (jsdom) |
| Testing (BE) | JUnit 5, Testcontainers (Postgres + Redis) |
| Hạ tầng | Docker Compose, pgAdmin 4, GitHub Actions CI, Caddy (reverse proxy production) |

> **Quy ước UI:** chỉ dùng CSS custom properties (không hard-code hex, không inline style),
> icon chỉ từ `lucide-react`, không import thư viện UI ngoài (MUI/AntD/Chakra).
> Chi tiết design system xem [`.claude/rules/design.md`](.claude/rules/design.md).

## Kiến trúc

```
┌─────────────────┐      HTTP/JSON       ┌──────────────────┐      JDBC       ┌──────────────┐
│  React + Vite   │ ───────────────────► │  Spring Boot 4   │ ──────────────► │ PostgreSQL 18│
│  (hash router)  │   /api/v1 + JWT      │  (domain modules)│   Flyway        │  (JSONB attrs)│
└─────────────────┘                      └──────────────────┘                 └──────────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │      Redis       │  rate-limit · JWT revocation · OTP store
                                          └──────────────────┘
```

- **Frontend** dùng custom hash router (không React Router) và quản lý session qua
  `localStorage` (không Redux/Context). Có sẵn **mock API layer** để phát triển UI độc lập.
- **Backend** tổ chức theo **domain module** (`auth`, `property`, `user`, `booking`, `media`,
  `admin`, `notification`) thay vì theo layer. Các trường mềm của bất động sản lưu trong cột
  `attributes` JSONB.
- **JWT stateless** có `jti`; logout/revocation và rate-limit (`/auth/login`, đặt lịch xem) dùng
  chung một abstraction Redis-backed với fallback in-memory khi không có Redis.
- **Mật khẩu** hash bằng Argon2id (`DelegatingPasswordEncoder`), tự động nâng cấp hash BCrypt cũ
  khi user đăng nhập thành công lần đầu sau migration.
- **OTP** (6 số, TTL ngắn, dùng một lần) dùng chung cho khôi phục mật khẩu qua email và xác minh
  số điện thoại trước khi tạo lịch xem nhà — store riêng (`OtpStore`), fail-**closed** khi Redis
  lỗi (khác với rate-limiter/revocation store vốn fail-open, vì OTP là kiểm soát bảo mật).

## Yêu cầu hệ thống

- **Java** 25+
- **Maven** 3.9+
- **Node.js** 22 LTS (hoặc 20+)
- **Docker** và **Docker Compose**

## Bắt đầu nhanh

### Phương án 1 — Chỉ frontend với mock API (nhanh nhất để xem UI)

```powershell
cd frontend-react
Copy-Item .env.example .env
npm install
npm run dev
```

Mở `http://localhost:5173`. Mặc định `VITE_USE_MOCK_API=true` nên không cần backend.

### Phương án 2 — Toàn bộ stack bằng Docker Compose

```powershell
Copy-Item .env.example .env   # chỉnh secret trước khi chạy
docker compose up --build
```

| Dịch vụ | URL |
| --- | --- |
| Frontend | `http://localhost:3000` (Compose, biến `FRONTEND_PORT`) |
| Backend API | `http://localhost:8080/api/v1` |
| Swagger UI | `http://localhost:8080/api/v1/swagger-ui.html` |
| pgAdmin 4 | `http://localhost:5050` |
| Redis | `localhost:6379` (biến `REDIS_PORT`) |

> Frontend trong Compose build với `VITE_USE_MOCK_API=false` (gọi backend thật qua `/api/v1`).
> Khi chạy `npm run dev` ngoài Compose, frontend ở `http://localhost:5173` với mock API.
>
> Backend vẫn chạy được khi **không có Redis** (fallback in-memory cho rate-limit/OTP), nhưng
> chỉ phù hợp cho dev/test một instance — không chia sẻ trạng thái giữa nhiều instance.

## Cấu hình môi trường

Tạo `.env` từ mẫu trước khi chạy Docker Compose:

```powershell
Copy-Item .env.example .env
```

**Local / Docker Compose dev:**

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | Có | Kết nối PostgreSQL cho Compose. |
| `POSTGRES_PORT` | Không | Port PostgreSQL publish ra host, mặc định `5432`. |
| `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD` | Khi dùng pgAdmin | Đăng nhập pgAdmin 4 local. |
| `PGADMIN_PORT` | Không | Port pgAdmin 4, mặc định `5050`. |
| `REDIS_PORT` | Không | Port Redis publish ra host, mặc định `6379`. |
| `JWT_SECRET` | Có | Secret ký JWT, tối thiểu 32 bytes. |
| `JWT_EXPIRATION` | Không | Thời hạn access token (ms), mặc định `86400000`. |
| `CORS_ALLOWED_ORIGINS` | Có | Danh sách origin được phép, phân tách bằng dấu phẩy. |
| `SERVER_PORT` / `BACKEND_PORT` / `FRONTEND_PORT` | Không | Port nội bộ/publish, mặc định `8080`/`8080`/`3000`. |
| `MEDIA_STORAGE_PATH` / `MEDIA_PUBLIC_URL_PREFIX` | Không | Thư mục lưu và prefix URL public cho media. |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | Cho tính năng quên mật khẩu | Đăng nhập SMTP relay Brevo (`smtp-relay.brevo.com:587`). |
| `API_KEY_eSMS` / `ESMS_SECRET_KEY` | Cho tính năng OTP đặt lịch | Credentials REST API eSMS.vn. |
| `VITE_API_BASE_URL` | Frontend production | Base URL API, ví dụ `http://localhost:8080/api/v1`. |
| `VITE_USE_MOCK_API` | Không | `true` để dùng mock data frontend, `false` để gọi backend thật. |
| `VITE_GOOGLE_MAPS_EMBED_API_KEY` | Không | Khóa Maps Embed API, giới hạn theo HTTP referrer; để trống sẽ dùng iframe Google Maps tương thích. |

**Production (`docker-compose.prod.yml`, xem [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)):**

| Biến | Mô tả |
| --- | --- |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | Kết nối PostgreSQL managed (không dùng `POSTGRES_*` ở production). |
| `DOMAIN` | Domain trỏ qua Cloudflare, dùng cho TLS tự động của Caddy. |
| `SENTRY_DSN_BACKEND` / `VITE_SENTRY_DSN` | DSN Sentry (để trống để tắt). |
| `BACKEND_IMAGE` / `FRONTEND_IMAGE` | Image ghcr.io do CI build/push. |

Thiếu credentials SMTP/eSMS **không** làm sập backend — các endpoint liên quan trả lỗi rõ ràng
(`503`) khi được gọi, phần còn lại của hệ thống vẫn hoạt động bình thường.

**Profiles backend** (`backend-springboot/src/main/resources/application-*.yml`):

- `dev` — local development, CORS mặc định cho `http://localhost:5173`.
- `local` — chạy ngoài Docker, trỏ vào Postgres/Redis local.
- `test` — cấu hình test; Testcontainers chạy khi Docker daemon khả dụng.
- `staging` / `prod` — không dùng secret mặc định, fail-fast khi thiếu DB/JWT/CORS config.

## Phát triển

### Backend

```powershell
cd backend-springboot
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend chạy tại `http://localhost:8080`, API dưới prefix `/api/v1`.

Health/readiness/liveness:

```text
http://localhost:8080/api/v1/actuator/health
http://localhost:8080/api/v1/actuator/health/readiness
http://localhost:8080/api/v1/actuator/health/liveness
```

### Frontend

```powershell
cd frontend-react
Copy-Item .env.example .env
npm install
npm run dev          # http://localhost:5173
```

Đặt `VITE_USE_MOCK_API=false` trong `.env` để gọi backend thật thay vì mock data.

## Kiểm thử

```powershell
# Frontend — toàn bộ
cd frontend-react
npm run lint
npm test -- --run
npm run build

# Frontend — một file / một test theo tên
npx vitest run src/App.test.jsx
npx vitest run --reporter=verbose -t "renders the template home page"

# Backend — toàn bộ
cd backend-springboot
mvn test
mvn package

# Backend — một class / một method
mvn test -Dtest=AuthServiceTest
mvn test -Dtest=AuthServiceTest#login_success
```

## Cấu trúc thư mục

```
TraVinh Shelter/
├─ frontend-react/              # React 19 + Vite 8
│  └─ src/
│     ├─ App.jsx                # root: hash router + session state
│     ├─ routes/index.jsx       # bảng route + resolveRoute()
│     ├─ pages/                 # Home, Search, PropertyDetail, Login, Brokers, Projects,
│     │                         #   BrokerDashboard, pages/admin/ (AdminDashboard + sections)
│     ├─ components/            # ui/ · layout/ · property/ · dashboard/ · form/
│     ├─ services/              # api.js (+ mock branches), session.js, mockData.js
│     ├─ data/                  # template/seed data, locations.js (ward codes)
│     └─ styles/                # CSS custom properties + module CSS
│
├─ backend-springboot/          # Spring Boot 4.0 + Java 25
│  └─ src/main/
│     ├─ java/com/travinh/realty/
│     │  ├─ modules/            # auth · property · user · booking · media · admin · notification
│     │  ├─ common/             # config (Security/CORS/OpenAPI/JWT/RestClient), dto, exception, logging
│     │  └─ infrastructure/     # storage (LocalMediaStorage)
│     └─ resources/db/migration # Flyway: V1..V18
│
├─ docker-compose.yml           # postgres · redis · pgadmin · backend · frontend (dev)
├─ docker-compose.prod.yml      # redis · backend · frontend · caddy (production, xem docs/DEPLOYMENT.md)
├─ Caddyfile                    # reverse proxy + TLS tự động (production)
├─ .env.example                 # mẫu biến môi trường (dev + production)
└─ docs/                        # tài liệu kỹ thuật (DEPLOYMENT.md, superpowers/specs, superpowers/plans)
```

## API

- **Base URL:** `http://localhost:8080/api/v1`
- **Swagger UI:** `http://localhost:8080/api/v1/swagger-ui.html`

**Public endpoints (không cần JWT):**

```
GET  /properties/**                          GET  /categories/**
GET  /brokers/**                              GET  /media/**
POST /auth/login                              POST /auth/forgot-password
POST /auth/reset-password
POST /properties/{id}/viewings/request-otp    POST /properties/{id}/viewings/verify-otp
```

Không có `POST /auth/register` — tự đăng ký `USER` đã bị bỏ. Tài khoản môi giới chỉ được tạo bởi
admin.

Đặt lịch xem nhà là quy trình **2 bước**: gọi `request-otp` (gửi SMS) rồi `verify-otp` (kèm mã
OTP + toàn bộ thông tin lịch hẹn) mới thực sự tạo appointment. Endpoint tạo lịch trực tiếp cũ đã
bị xóa để tránh bị dùng làm đường vòng spam.

**Mock credentials (khi `VITE_USE_MOCK_API=true`):**
email chứa `admin` → vai trò `ADMIN`, chứa `broker` → `BROKER`.

## Cơ sở dữ liệu

- Schema quản lý bằng **Flyway** trong `backend-springboot/src/main/resources/db/migration`
  (hiện tại `V1` → `V18`). JPA chạy ở chế độ `validate` — **không** auto-create/update schema.
- **Entities chính:** `Property` (giá `BigDecimal` VND, `status` enum, `attributes` JSONB),
  `User` (`ADMIN`/`BROKER`/`USER`, có `facebookUrl`/`tiktokUrl`), `Category`, `Media`,
  `ViewingAppointment`, `AuditLog`.
- **Property status:** `AVAILABLE` · `RENTED` · `SOLD` · `HIDDEN`. (`PENDING` chỉ tồn tại ở mock
  data frontend — backend chưa hỗ trợ, không gửi giá trị này qua API.)
- Các trường mềm (`ward`, `houseType`, `area`, `bedrooms`, `direction`, `legal`, …) lưu trong
  cột `attributes` JSONB thay vì cột SQL riêng.

## Docker Compose

```powershell
docker compose config          # validate cấu hình dev
docker compose up --build      # chạy postgres + redis + pgAdmin + backend + frontend
docker compose down            # dừng stack
docker compose down -v         # dừng + xóa volume dữ liệu (reset DB)

docker compose -f docker-compose.prod.yml config   # validate cấu hình production
```

**Kết nối pgAdmin 4** (`http://localhost:5050`):

| Field | Giá trị |
| --- | --- |
| Host name/address | `postgres` |
| Port | `5432` |
| Maintenance database | giá trị `POSTGRES_DB` |
| Username | giá trị `POSTGRES_USER` |
| Password | giá trị `POSTGRES_PASSWORD` |

**Kết nối DBeaver từ host** (khuyến nghị cho quản lý hằng ngày):

| Field | Giá trị |
| --- | --- |
| Host | `localhost` |
| Port | giá trị `POSTGRES_PORT`, mặc định `5432` |
| Database | giá trị `POSTGRES_DB` |
| Username | giá trị `POSTGRES_USER` |
| Password | giá trị `POSTGRES_PASSWORD` |

**Production** dùng `docker-compose.prod.yml` (image từ ghcr.io, Redis, Caddy làm reverse proxy +
TLS tự động qua Let's Encrypt, PostgreSQL managed bên ngoài) — kiến trúc đầy đủ, checklist chuẩn
bị lần đầu và quy trình rollback xem [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## CI/CD

GitHub Actions workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml), chạy trên mọi PR:

- **Backend build and test** — `mvn test`, `mvn package`
- **Frontend lint, test, and build** — `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`
- **Docker Compose config** — validate cả `docker-compose.yml` lẫn `docker-compose.prod.yml`
- **Build, push, and deploy** — chỉ chạy khi push vào `main`: build + push image backend/frontend
  lên GHCR, sau đó SSH vào VPS chạy `docker compose -f docker-compose.prod.yml pull && up -d`
  (cần secret `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY` đã cấu hình ở repo settings)

## Ghi chú vận hành & bảo mật

- Production **không** dùng `ddl-auto=update`; JPA đang dùng `validate`.
- Log backend gắn `traceId` qua MDC; response lỗi không expose stacktrace.
- Mật khẩu hash bằng **Argon2id** (tự nâng cấp hash BCrypt cũ khi login thành công); rate-limit
  đăng nhập theo cả IP lẫn theo account.
- Ownership-mismatch trả **404** (không phải 403) để tránh resource enumeration (ví dụ: sửa/xóa
  tin đăng của môi giới khác) — 404 dùng chung message với case "không tồn tại" thật.
- `POST /auth/forgot-password` luôn trả `200` bất kể email có tồn tại hay gửi email thất bại, để
  không lộ thông tin tài khoản qua sự khác biệt status code.
- JWT stateless (có `jti`); logout/revocation và rate-limit (`RateLimiter`/`RevokedTokenStore`)
  dùng chung Redis khi có cấu hình, tự **fail-open** (cho qua) khi Redis lỗi — vì đây chỉ là lớp
  phòng thủ bổ sung, không phải cơ chế xác thực chính. Ngược lại, `OtpStore` (mã khôi phục mật
  khẩu / xác minh SMS) **fail-closed** khi Redis lỗi, vì sai ở đây đồng nghĩa "chấp nhận mã bất
  kỳ" — rủi ro cao hơn nhiều so với việc từ chối một request hợp lệ.
- Dependabot đã bật cho cả `backend-springboot` (Maven) và `frontend-react` (npm), quét hàng tuần.
- Tài liệu kỹ thuật nằm trong `docs/`.

## Hạn chế đã biết

- **Frontend chưa cập nhật theo luồng đặt lịch xem 2 bước mới.** `services/api.js` hiện vẫn gọi
  thẳng endpoint tạo lịch cũ (`POST /properties/{id}/viewings`) — endpoint này đã bị xóa khỏi
  backend. Đặt lịch xem qua UI hiện tại sẽ lỗi cho tới khi frontend được cập nhật gọi
  `request-otp` → `verify-otp`.
- **Tính năng OTP (email + SMS) đã hoàn thiện về code nhưng chưa gửi được thật ở production** —
  cả Brevo (email) và các nhà mạng VN (SMS) đều yêu cầu domain/sender đã xác thực trước khi gửi
  thật, và dự án hiện chưa có domain. Kiến trúc/credentials đã sẵn sàng trong `.env` — chỉ cần bổ
  sung khi có domain.
- Thu hồi JWT theo `userId` (ví dụ khi đổi mật khẩu, muốn đăng xuất mọi thiết bị khác) chưa được
  xây — cơ chế hiện tại chỉ thu hồi theo từng token riêng lẻ.

## Quy ước đóng góp

- **Ngôn ngữ:** UI tiếng Việt; code/biến/hàm/comment tiếng Anh; commit message tiếng Anh.
- **Branch:** tách từ `main`, đặt tên `feat/<slug>`, `fix/<slug>`, `chore/<slug>`. Không push
  trực tiếp lên `main`.
- **Conventional commits:** `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore`.
- **TDD bắt buộc** cho logic nghiệp vụ (RED → GREEN → REFACTOR).
- Mỗi PR nhỏ, một tính năng hoặc một fix.

## Giấy phép

Dự án nội bộ của **Công Tín Land** — chưa phát hành theo giấy phép mã nguồn mở.
