# API Documentation

Backend base URL local:

```text
http://localhost:8080/api/v1
```

Swagger UI:

```text
http://localhost:8080/api/v1/swagger-ui.html
```

OpenAPI JSON:

```text
http://localhost:8080/api/v1/v3/api-docs
```

## Main API Groups

| Group | Prefix | Mục đích |
| --- | --- | --- |
| Auth | `/auth` | Đăng ký, đăng nhập, token. |
| Users | `/users` | Hồ sơ người dùng hiện tại. |
| Brokers | `/brokers` | Thông tin môi giới public. |
| Properties | `/properties` | Tìm kiếm, chi tiết, tạo/sửa tin. |
| Categories | `/categories` | Danh mục bất động sản. |
| Media | `/properties/{propertyId}/media` | Upload/list/delete media. |
| Admin | `/admin` | Quản trị broker, user, property. |

## Error Format

API trả lỗi theo format thống nhất:

```json
{
  "timestamp": "2026-06-27T00:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "fieldErrors": {
    "email": "must be a well-formed email address"
  },
  "traceId": "..."
}
```

## Postman Collection

Chưa có file Postman collection chính thức trong repo.

Khi cần tạo:

1. Export từ Swagger/OpenAPI.
2. Lưu vào `docs/postman/`.
3. Không lưu token hoặc password thật trong collection.
