# Cổng thông tin Bất động sản Trà Vinh

Monorepo gồm backend Java Spring Boot, frontend React + Vite và PostgreSQL 16.

## Yêu cầu

- Java 21+
- Maven 3.9+
- Node.js 20+
- Docker và Docker Compose

## Chạy database

```bash
docker compose up -d
```

PostgreSQL lắng nghe tại `localhost:5432`, database `travinh_realty`.

## Chạy backend

```bash
cd backend-springboot
mvn spring-boot:run
```

Backend chạy tại `http://localhost:8080`.

## Chạy frontend

```bash
cd frontend-react
npm install
npm run dev
```

Frontend chạy tại `http://localhost:5173`.

## Dừng database

```bash
docker compose down
```
