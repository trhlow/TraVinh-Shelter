# Setup & Deployment Guide

## Local Setup

Yêu cầu:

- Java 21+
- Maven 3.9+
- Node.js 20+ hoặc 22 LTS
- Docker Desktop
- DBeaver Community hoặc pgAdmin 4

## Environment

Tạo `.env` từ mẫu:

```powershell
Copy-Item .env.example .env
```

Các secret cần đổi trước khi chạy môi trường dùng chung:

- `POSTGRES_PASSWORD`
- `PGADMIN_DEFAULT_PASSWORD`
- `JWT_SECRET`

## Run Full Stack

```powershell
docker compose up --build
```

Services:

| Service | URL/Port |
| --- | --- |
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8080/api/v1` |
| Swagger UI | `http://localhost:8080/api/v1/swagger-ui.html` |
| PostgreSQL | `localhost:5432` |
| pgAdmin 4 | `http://localhost:5050` |

## Database Tools

- DBeaver: dùng để quản lý database từ máy host qua `localhost:${POSTGRES_PORT}`.
- pgAdmin 4: dùng khi cần giao diện quản trị chạy cùng Docker stack.

Chi tiết xem `docs/database.md`.

## Health Checks

```text
http://localhost:8080/api/v1/actuator/health
http://localhost:8080/api/v1/actuator/health/readiness
http://localhost:8080/api/v1/actuator/health/liveness
```

## Verification Commands

Backend:

```powershell
cd backend-springboot
mvn test
mvn package
```

Frontend:

```powershell
cd frontend-react
npm install
npm run lint
npm test -- --run
npm run build
```

Docker:

```powershell
docker compose config
docker compose up --build
```

## Deployment Checklist

- `.env` production dùng secret thật, không dùng giá trị mẫu.
- `SPRING_PROFILES_ACTIVE=prod`.
- Database backup policy đã có.
- Flyway migration đã chạy pass.
- Health/readiness endpoint được monitoring ping.
- CORS allowlist chỉ chứa domain thật.
- Log có traceId và được ship về hệ thống logging.
