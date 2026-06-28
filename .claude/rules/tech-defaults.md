---
description: Tech stack, lệnh chạy/test, API conventions, kiến trúc frontend/backend cho Công Tín Land
---

# Tech Defaults — Công Tín Land

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, CSS custom properties |
| Backend | Spring Boot 3, Java 21, PostgreSQL 16, JWT stateless |
| Icons | lucide-react |
| Testing (FE) | Vitest + Testing Library (jsdom) |
| Testing (BE) | JUnit 5, Testcontainers |
| Infra | Docker Compose, Flyway migration, GitHub Actions CI |

## Lệnh chạy

```powershell
# Frontend — mock API mặc định
cd frontend-react && npm run dev          # http://localhost:5173

# Backend
cd backend-springboot
mvn spring-boot:run -Dspring-boot.run.profiles=dev   # http://localhost:8080

# Toàn stack
docker compose up --build
```

## Lệnh test

```powershell
# Frontend — toàn bộ
cd frontend-react && npm test -- --run

# Frontend — một file cụ thể
cd frontend-react && npx vitest run src/App.test.jsx

# Frontend — một test theo tên
cd frontend-react && npx vitest run --reporter=verbose -t "renders the template home page"

# Backend — toàn bộ
cd backend-springboot && mvn test

# Backend — một class cụ thể
cd backend-springboot && mvn test -Dtest=AuthServiceTest

# Backend — một method cụ thể
cd backend-springboot && mvn test -Dtest=AuthServiceTest#login_success
```

## API

- Base URL: `http://localhost:8080/api/v1`
- Swagger: `http://localhost:8080/api/v1/swagger-ui.html`
- Mock mode: `VITE_USE_MOCK_API=true` (mặc định dev)

### Public endpoints (không cần JWT)

```
GET  /properties/**
GET  /categories/**
GET  /brokers/**
GET  /media/**
POST /auth/register
POST /auth/login
```

### Mock credentials (khi VITE_USE_MOCK_API=true)

Email chứa `admin` → role ADMIN, chứa `broker` → role BROKER, còn lại → USER.

## Kiến trúc Frontend

### Custom hash router (không dùng React Router)

`App.jsx` lắng nghe `hashchange` event. `resolveRoute(path)` trong `routes/index.jsx` map hash → component.  
Navigation: `window.location.hash = '#/path'`.  
URL pattern: `/#/search`, `/#/property/:id`, `/#/broker/dashboard`.

### Session management (không có global state)

Session (`{ token, userId, email, role, fullName, avatarUrl }`) lưu trong `localStorage` key `travinh-realty-session`, load lúc khởi động và truyền xuống qua props từ `App.jsx`. Không có Redux/Zustand/Context.

`services/session.js`: `loadStoredSession`, `saveStoredSession`, `clearStoredSession`, `createSession`.

### Mock API layer

Mỗi function trong `services/api.js` kiểm tra `USE_MOCK_API` flag trước khi gọi backend thật. Mock data nằm ở `services/mockData.js` và `data/templateData.js`.

`normalizeProperty()` trong `api.js` map backend response sang frontend shape — giá lưu bằng VND nguyên, hiển thị bằng tỷ/triệu.

## Kiến trúc Backend

### Module structure (theo domain, không theo layer)

```
modules/
  auth/           ← login, register, logout, JWT filter, rate-limit
  property/       ← CRUD BĐS, search, categories
  user/           ← profile, saved properties, broker management
  media/          ← upload ảnh/video, serve media
  admin/          ← admin-only: quản lý users, brokers, properties, audit log
common/
  config/         ← Security, CORS, OpenAPI, JWT properties
  exception/      ← GlobalExceptionHandler, ApiError
  logging/        ← RequestCorrelationFilter (traceId qua MDC)
infrastructure/
  storage/        ← LocalMediaStorage
```

### Property.attributes (JSONB)

Các trường mềm của BĐS lưu trong cột `attributes jsonb`: `ward`, `houseType`, `area`, `bedrooms`, `bathrooms`, `direction`, `legal`, `image`, `description`, `transaction`. Không thêm cột SQL riêng cho từng attribute — dùng key trong JSON.

### Entities chính

| Entity | Mô tả |
|---|---|
| `Property` | BĐS: category, title, address, price (BigDecimal VND), status (enum), attributes (jsonb) |
| `User` | Tài khoản: ADMIN / BROKER / USER, có avatar, phone, status |
| `Category` | Loại BĐS: Trọ (`tro`), Nhà (`nha`), Đất (`dat`) |
| `Media` | Ảnh/video đính kèm property |
| `AuditLog` | Log hành động admin |
| `SavedProperty` | BĐS đã lưu của user (composite key) |

Property status: `AVAILABLE` | `PENDING` | `SOLD` | `RENTED`

### Auth flow

1. `AuthRateLimitFilter` → kiểm tra rate limit trước khi vào `/auth/**`
2. `JwtAuthenticationFilter` → validate JWT, set `SecurityContext`
3. JWT stateless, có `jti`, logout gọi `RevokedTokenStore` (in-memory)
4. `@EnableMethodSecurity` bật — dùng `@PreAuthorize` ở controller level

### Flyway migration

DB schema: `backend-springboot/src/main/resources/db/migration/`.  
JPA dùng `validate` — không auto-create/update schema.

## Cấu trúc frontend

```
frontend-react/src/
  App.jsx           ← root: hash router + session state
  routes/index.jsx  ← route table + resolveRoute()
  pages/            ← route-level components
  components/
    ui/             ← Button, Card, Badge, Input, Modal (primitives)
    layout/         ← Navbar, Footer, PageWrapper
    property/       ← PropertyCard, PropertyGallery
    broker/         ← BrokerCard, BrokerProfile
    home/           ← HeroSection, StatsSection, FeaturesSection, TestimonialsSection
  services/
    api.js          ← tất cả API calls + mock branches + normalizeProperty()
    session.js      ← localStorage session helpers
    mockData.js     ← mock data cho VITE_USE_MOCK_API=true
  data/             ← static template/seed data
  hooks/            ← useTheme, shared custom hooks
  utils/            ← pure helpers
```

## Đặt tên

- `PascalCase.jsx` — component
- `camelCase.js` — utility, hook
- Props tên rõ nghĩa — không dùng `data`, `info`, `stuff`
