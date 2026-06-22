# Tra Vinh Shelter Backend

Backend Spring Boot cho cổng thông tin bất động sản Trà Vinh.

## Yêu cầu

- Java 21
- Maven 3.9+
- Docker Desktop (để chạy PostgreSQL 16)

## Chạy local

```powershell
docker compose up -d
mvn spring-boot:run
```

Ứng dụng chạy tại `http://localhost:8080/api/v1`. Flyway tự động tạo schema và seed
ba danh mục `Trọ`, `Nhà`, `Đất` khi khởi động.

Các biến môi trường tùy chọn: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`,
`MEDIA_STORAGE_PATH`. Giá trị mặc định chỉ dành cho môi trường local.

## Kiểm thử

```powershell
mvn test
```

Kiểm thử tích hợp sử dụng Testcontainers/PostgreSQL 16 và tự chạy khi Docker daemon sẵn sàng.
