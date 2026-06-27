# Cổng thông tin Bất động sản Trà Vinh

Monorepo gồm backend Spring Boot 3, frontend React + Vite và PostgreSQL 16.

## Yêu cầu

- Java 21+
- Maven 3.9+
- Node.js 22 LTS hoặc 20+
- Docker và Docker Compose

## Cấu hình môi trường

Tạo file `.env` từ mẫu trước khi chạy Docker Compose:

```powershell
Copy-Item .env.example .env
```

Các biến chính:

| Biến | Bắt buộc ở staging/prod | Mô tả |
| --- | --- | --- |
| `POSTGRES_DB` | Có | Tên database dùng cho Compose. |
| `POSTGRES_USER` | Có | User PostgreSQL dùng cho Compose/backend. |
| `POSTGRES_PASSWORD` | Có | Password PostgreSQL. Không dùng giá trị mẫu ở staging/prod. |
| `POSTGRES_PORT` | Không | Port PostgreSQL publish ra host để dùng DBeaver/psql, mặc định `5432`. |
| `PGADMIN_DEFAULT_EMAIL` | Có khi dùng pgAdmin | Email đăng nhập pgAdmin 4 local. |
| `PGADMIN_DEFAULT_PASSWORD` | Có khi dùng pgAdmin | Password đăng nhập pgAdmin 4 local. Không dùng giá trị mẫu ở staging/prod. |
| `PGADMIN_PORT` | Không | Port pgAdmin 4 publish ra host, mặc định `5050`. |
| `DB_URL` | Có khi chạy backend ngoài Compose | JDBC URL PostgreSQL. |
| `DB_USERNAME` | Có khi chạy backend ngoài Compose | Database username. |
| `DB_PASSWORD` | Có khi chạy backend ngoài Compose | Database password. |
| `JWT_SECRET` | Có | Secret ký JWT, tối thiểu 32 bytes. |
| `JWT_EXPIRATION` | Không | Thời hạn access token theo milliseconds, mặc định `86400000`. |
| `CORS_ALLOWED_ORIGINS` | Có | Danh sách origin được phép, phân tách bằng dấu phẩy. |
| `SERVER_PORT` | Không | Port nội bộ backend, mặc định `8080`. |
| `BACKEND_PORT` | Không | Port publish ra host khi chạy Compose, mặc định `8080`. |
| `MEDIA_STORAGE_PATH` | Không | Thư mục lưu media local. |
| `MEDIA_PUBLIC_URL_PREFIX` | Không | Prefix URL public cho media. |
| `VITE_API_BASE_URL` | Frontend production | Base URL API, ví dụ `http://localhost:8080/api/v1`. |
| `VITE_USE_MOCK_API` | Không | `true` để dùng mock data frontend, `false` để gọi backend thật. |

Profiles backend:

- `dev`: local development, CORS mặc định cho `http://localhost:5173`.
- `test`: cấu hình test; Testcontainers chạy khi Docker daemon khả dụng.
- `staging` / `prod`: không dùng secret mặc định và fail-fast khi thiếu DB/JWT/CORS config quan trọng.

## Backend

Chạy backend local:

```powershell
cd backend-springboot
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Backend chạy tại `http://localhost:8080`, API dưới prefix `http://localhost:8080/api/v1`.

Swagger UI:

```text
http://localhost:8080/api/v1/swagger-ui.html
```

Health/readiness/liveness:

```text
http://localhost:8080/api/v1/actuator/health
http://localhost:8080/api/v1/actuator/health/readiness
http://localhost:8080/api/v1/actuator/health/liveness
```

Kiểm thử và đóng gói backend:

```powershell
cd backend-springboot
mvn test
mvn package
```

## Frontend

Frontend có `.env.example` riêng:

```powershell
cd frontend-react
Copy-Item .env.example .env
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

Kiểm tra production frontend:

```powershell
cd frontend-react
npm run lint
npm test -- --run
npm run build
```

Mặc định frontend dùng mock API để dev UI độc lập. Đặt `VITE_USE_MOCK_API=false` để gọi backend thật.

## Docker Compose

Validate cấu hình:

```powershell
docker compose config
```

Chạy backend + PostgreSQL:

```powershell
docker compose up --build
```

Compose chạy PostgreSQL, pgAdmin 4, backend và frontend. Backend chạy profile `prod` và lắng nghe tại `http://localhost:8080/api/v1`.

pgAdmin 4:

```text
http://localhost:5050
```

Kết nối server trong pgAdmin:

| Field | Giá trị |
| --- | --- |
| Host name/address | `postgres` |
| Port | `5432` |
| Maintenance database | giá trị `POSTGRES_DB` |
| Username | giá trị `POSTGRES_USER` |
| Password | giá trị `POSTGRES_PASSWORD` |

DBeaver nên dùng để quản lý database hằng ngày từ máy host:

| Field | Giá trị |
| --- | --- |
| Host | `localhost` |
| Port | giá trị `POSTGRES_PORT`, mặc định `5432` |
| Database | giá trị `POSTGRES_DB` |
| Username | giá trị `POSTGRES_USER` |
| Password | giá trị `POSTGRES_PASSWORD` |

Dừng stack:

```powershell
docker compose down
```

Xóa volume dữ liệu local khi thật sự cần reset DB:

```powershell
docker compose down -v
```

## CI/CD

GitHub Actions workflow `.github/workflows/ci.yml` chạy:

- Backend: `mvn test`, `mvn package`
- Frontend: `npm ci`, `npm run lint`, `npm test -- --run`, `npm run build`
- Docker: `docker compose config`

## Ghi chú vận hành

- Migration database dùng Flyway trong `backend-springboot/src/main/resources/db/migration`.
- Production không dùng `ddl-auto=update`; JPA đang dùng `validate`.
- Log backend có `traceId` qua MDC và response lỗi không expose stacktrace.
- Auth dùng JWT stateless, có `jti`, logout/revocation nội bộ tiến trình và rate-limit cơ bản cho login/register.
- Nếu chạy nhiều instance backend, cần thay `RevokedTokenStore` in-memory bằng Redis/database-backed store để revoke token đồng bộ giữa instance.
- Tài liệu kỹ thuật nằm trong `docs/`; kế hoạch sản phẩm/dự án nằm trong `plans/`.
