# docs/

Thư mục này trả lời câu hỏi: hệ thống được thiết kế và vận hành như thế nào?

Đối tượng chính:

- Developer
- Tester
- DevOps
- Người mới được bàn giao source code

## Nội dung

| File | Mục đích |
| --- | --- |
| `database.md` | Schema, quan hệ dữ liệu, JSONB attributes và cách quản lý DB. |
| `api.md` | API specification, Swagger/OpenAPI và Postman collection placeholder. |
| `setup-deployment.md` | Hướng dẫn setup local, Docker Compose và deployment checklist. |
| `flows.md` | Luồng nghiệp vụ chính: đăng tin, upload media, kiểm duyệt. |

## Quy ước cập nhật

- Thay đổi schema phải cập nhật `database.md` cùng migration Flyway.
- Thay đổi endpoint phải cập nhật `api.md` hoặc export lại OpenAPI/Postman.
- Thay đổi Docker/env var phải cập nhật `setup-deployment.md` và `.env.example`.
