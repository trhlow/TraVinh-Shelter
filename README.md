<div align="center">

# 🏠 Công Tín Land

**Nền tảng bất động sản kết nối người mua/bán với đội ngũ môi giới tại Trà Vinh.**

_Uy tín — Tận tâm — Hiệu quả_

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F.svg?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF.svg?logo=vite&logoColor=white)](https://vite.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
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
- [Quy ước đóng góp](#quy-ước-đóng-góp)
- [Giấy phép](#giấy-phép)

---

## Giới thiệu

Công Tín Land là cổng thông tin bất động sản cho khu vực Trà Vinh, hỗ trợ ba loại hình:
**Trọ** (`tro`), **Nhà** (`nha`) và **Đất** (`dat`). Nền tảng kết nối khách hàng với đội ngũ
môi giới đã được xác minh, cho phép tìm kiếm, xem chi tiết và đặt lịch xem bất động sản.

Dự án là một **monorepo** gồm backend Spring Boot 3, frontend React + Vite và PostgreSQL 16,
đóng gói chạy được toàn bộ bằng Docker Compose.

## Tính năng chính

**Khách (không cần đăng nhập)**
- Trang chủ với tìm kiếm đa tiêu chí (khu vực · loại hình · khoảng giá) và các hàng bất động sản theo loại
- Trang tìm kiếm với bộ lọc, trang chi tiết bất động sản kèm thư viện ảnh
- Đặt lịch xem (booking) với xác thực số điện thoại VN và ngày xem/chuyển vào hợp lệ
- Danh sách dự án và hồ sơ môi giới

**Môi giới (`BROKER`)**
- Bảng điều khiển: đăng/sửa tin, quản lý tin đăng của mình
- Quản lý lịch hẹn xem của tin mình phụ trách (xác nhận/hủy)
- Cập nhật hồ sơ và đổi mật khẩu

**Quản trị (`ADMIN`)**
- Tổng quan thống kê (tài khoản, bài đăng, cơ cấu theo loại/khu vực)
- Quản lý người dùng, môi giới và bài đăng
- Theo dõi lịch hẹn xem toàn hệ thống (chỉ đọc) và nhật ký kiểm toán (audit log)

## Công nghệ

| Lớp | Công nghệ |
| --- | --- |
| Frontend | React 19, Vite 8, CSS custom properties, `lucide-react`, font Be Vietnam Pro |
| Backend | Spring Boot 3.3, Java 21, Spring Security (JWT stateless), Spring Data JPA |
| Database | PostgreSQL 16, Flyway migration |
| API docs | springdoc-openapi (Swagger UI) |
| Testing (FE) | Vitest + Testing Library (jsdom) |
| Testing (BE) | JUnit 5, Testcontainers |
| Hạ tầng | Docker Compose, pgAdmin 4, GitHub Actions CI |

> **Quy ước UI:** chỉ dùng CSS custom properties (không hard-code hex, không inline style),
> icon chỉ từ `lucide-react`, không import thư viện UI ngoài (MUI/AntD/Chakra).
> Chi tiết design system xem [`.claude/rules/design.md`](.claude/rules/design.md).

## Kiến trúc

```
┌─────────────────┐      HTTP/JSON       ┌──────────────────┐      JDBC       ┌──────────────┐
│  React + Vite   │ ───────────────────► │  Spring Boot 3   │ ──────────────► │ PostgreSQL16 │
│  (hash router)  │   /api/v1 + JWT      │  (domain modules)│   Flyway        │  (JSONB attrs)│
└─────────────────┘                      └──────────────────┘                 └──────────────┘
```

- **Frontend** dùng custom hash router (không React Router) và quản lý session qua
  `localStorage` (không Redux/Context). Có sẵn **mock API layer** để phát triển UI độc lập.
- **Backend** tổ chức theo **domain module** (`auth`, `property`, `user`, `booking`, `media`,
  `admin`) thay vì theo layer. Các trường mềm của bất động sản lưu trong cột `attributes` JSONB.
- **JWT stateless** có `jti`, hỗ trợ logout/revocation in-memory và rate-limit cho `/auth/**`.

## Yêu cầu hệ thống

- **Java** 21+
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

> Frontend trong Compose build với `VITE_USE_MOCK_API=false` (gọi backend thật qua `/api/v1`).
> Khi chạy `npm run dev` ngoài Compose, frontend ở `http://localhost:5173` với mock API.

## Cấu hình môi trường

Tạo `.env` từ mẫu trước khi chạy Docker Compose:

```powershell
Copy-Item .env.example .env
```

| Biến | Bắt buộc ở staging/prod | Mô tả |
| --- | --- | --- |
| `POSTGRES_DB` | Có | Tên database dùng cho Compose. |
| `POSTGRES_USER` | Có | User PostgreSQL dùng cho Compose/backend. |
| `POSTGRES_PASSWORD` | Có | Password PostgreSQL. Không dùng giá trị mẫu ở staging/prod. |
| `POSTGRES_PORT` | Không | Port PostgreSQL publish ra host, mặc định `5432`. |
| `PGADMIN_DEFAULT_EMAIL` | Khi dùng pgAdmin | Email đăng nhập pgAdmin 4 local. |
| `PGADMIN_DEFAULT_PASSWORD` | Khi dùng pgAdmin | Password đăng nhập pgAdmin 4. Không dùng giá trị mẫu ở staging/prod. |
| `PGADMIN_PORT` | Không | Port pgAdmin 4 publish ra host, mặc định `5050`. |
| `DB_URL` | Khi chạy backend ngoài Compose | JDBC URL PostgreSQL. |
| `DB_USERNAME` | Khi chạy backend ngoài Compose | Database username. |
| `DB_PASSWORD` | Khi chạy backend ngoài Compose | Database password. |
| `JWT_SECRET` | Có | Secret ký JWT, tối thiểu 32 bytes. |
| `JWT_EXPIRATION` | Không | Thời hạn access token (ms), mặc định `86400000`. |
| `CORS_ALLOWED_ORIGINS` | Có | Danh sách origin được phép, phân tách bằng dấu phẩy. |
| `SERVER_PORT` | Không | Port nội bộ backend, mặc định `8080`. |
| `BACKEND_PORT` | Không | Port backend publish ra host khi chạy Compose, mặc định `8080`. |
| `FRONTEND_PORT` | Không | Port frontend publish ra host khi chạy Compose, mặc định `3000`. |
| `MEDIA_STORAGE_PATH` | Không | Thư mục lưu media local. |
| `MEDIA_PUBLIC_URL_PREFIX` | Không | Prefix URL public cho media. |
| `VITE_API_BASE_URL` | Frontend production | Base URL API, ví dụ `http://localhost:8080/api/v1`. |
| `VITE_USE_MOCK_API` | Không | `true` để dùng mock data frontend, `false` để gọi backend thật. |

**Profiles backend:**

- `dev` — local development, CORS mặc định cho `http://localhost:5173`.
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
│     │                         #   BrokerDashboard, AdminDashboard
│     ├─ components/            # ui/ · layout/ · property/ · broker/ · home/
│     ├─ services/              # api.js (+ mock branches), session.js, mockData.js
│     ├─ data/                  # template/seed data, locations.js (ward codes)
│     └─ styles/                # CSS custom properties + module CSS
│
├─ backend-springboot/          # Spring Boot 3.3 + Java 21
│  └─ src/main/
│     ├─ java/com/travinh/realty/
│     │  ├─ modules/            # auth · property · user · booking · media · admin
│     │  ├─ common/             # config (Security/CORS/OpenAPI/JWT), exception, logging
│     │  └─ infrastructure/     # storage (LocalMediaStorage)
│     └─ resources/db/migration # Flyway: V1..V13
│
├─ docker-compose.yml           # postgres · pgadmin · backend · frontend
├─ .env.example                 # mẫu biến môi trường
└─ docs/                        # tài liệu kỹ thuật
```

## API

- **Base URL:** `http://localhost:8080/api/v1`
- **Swagger UI:** `http://localhost:8080/api/v1/swagger-ui.html`

**Public endpoints (không cần JWT):**

```
GET  /properties/**      GET  /categories/**     GET  /brokers/**
GET  /media/**           POST /auth/register     POST /auth/login
```

**Mock credentials (khi `VITE_USE_MOCK_API=true`):**
email chứa `admin` → vai trò `ADMIN`, chứa `broker` → `BROKER`.

## Cơ sở dữ liệu

- Schema quản lý bằng **Flyway** trong `backend-springboot/src/main/resources/db/migration`
  (hiện tại `V1` → `V13`). JPA chạy ở chế độ `validate` — **không** auto-create/update schema.
- **Entities chính:** `Property` (giá `BigDecimal` VND, `status` enum, `attributes` JSONB),
  `User` (`ADMIN`/`BROKER`/`USER`), `Category`, `Media`, `ViewingAppointment`, `AuditLog`.
- **Property status:** `AVAILABLE` · `PENDING` · `SOLD` · `RENTED`.
- Các trường mềm (`ward`, `houseType`, `area`, `bedrooms`, `direction`, `legal`, …) lưu trong
  cột `attributes` JSONB thay vì cột SQL riêng.

## Docker Compose

```powershell
docker compose config          # validate cấu hình
docker compose up --build      # chạy postgres + pgAdmin + backend + frontend
docker compose down            # dừng stack
docker compose down -v         # dừng + xóa volume dữ liệu (reset DB)
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

## CI/CD

GitHub Actions workflow `.github/workflows/ci.yml`:

- **Backend:** `mvn test`, `mvn package`
- **Frontend:** `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`
- **Docker:** `docker compose config`

## Ghi chú vận hành & bảo mật

- Production **không** dùng `ddl-auto=update`; JPA đang dùng `validate`.
- Log backend gắn `traceId` qua MDC; response lỗi không expose stacktrace.
- Auth dùng JWT stateless (có `jti`), logout/revocation in-memory và rate-limit cho login/register.
- Nếu chạy **nhiều instance** backend, cần thay `RevokedTokenStore` in-memory bằng store
  Redis/database-backed để revoke token đồng bộ giữa các instance.
- Tài liệu kỹ thuật nằm trong `docs/`.

## Quy ước đóng góp

- **Ngôn ngữ:** UI tiếng Việt; code/biến/hàm/comment tiếng Anh; commit message tiếng Anh.
- **Branch:** tách từ `main`, đặt tên `feat/<slug>`, `fix/<slug>`, `chore/<slug>`. Không push
  trực tiếp lên `main`.
- **Conventional commits:** `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore`.
- **TDD bắt buộc** cho logic nghiệp vụ (RED → GREEN → REFACTOR).
- Mỗi PR nhỏ, một tính năng hoặc một fix.

## Giấy phép

Dự án nội bộ của **Công Tín Land** — chưa phát hành theo giấy phép mã nguồn mở.
