# Plan: Production Deployment — Growth Tier

**Ngày**: 2026-07-07
**Trạng thái**: Đã chốt hướng đi, chưa triển khai

## Mục tiêu

Deploy Công Tín Land lên production để giao cho khách hàng thật, ưu tiên **độ tin cậy/an toàn** hơn chi
phí thấp nhất, nhưng vẫn phù hợp ngân sách team nhỏ (2 dev).

## Quyết định đã chốt (qua nghiên cứu 2 vòng bằng researcher agent)

| Hạng mục | Lựa chọn | Lý do |
|---|---|---|
| VPS (app: backend + frontend + Redis + reverse proxy) | **Vietnix (Việt Nam)** | Né hoàn toàn rủi ro pháp lý Nghị định 13/2023/NĐ-CP (chuyển dữ liệu công dân VN ra nước ngoài phải lập hồ sơ đánh giá tác động + báo Bộ Công an trong 60 ngày); hỗ trợ tiếng Việt/thanh toán nội địa; latency tốt nhất cho người dùng Trà Vinh |
| Database | **PostgreSQL tách sang DigitalOcean Managed Database** (không tự host trong container) | Backup hàng ngày + point-in-time recovery miễn phí, failover tự động — cron `pg_dump` thủ công không đủ an toàn cho dữ liệu khách hàng thật. Đã cân nhắc Supabase/Neon nhưng cả hai có gotcha kỹ thuật với Spring Boot/Hibernate (pooler mode, cold-start) — DO Managed DB "cắm là chạy" đơn giản nhất |
| Cache/rate-limit | **Redis tự host** trong docker-compose trên VPS | Ít quan trọng bằng DB (mất là restart lại được, không mất dữ liệu vĩnh viễn), không đáng chi phí managed |
| Domain | **Mua mới** (chưa có) | Cần trước khi trỏ DNS |
| DNS/CDN/WAF | **Cloudflare (free tier)** | WAF + DDoS layer 3/4 cơ bản, đủ cho traffic quy mô tỉnh |
| TLS | **Caddy** làm reverse proxy trong docker-compose | Tự động Let's Encrypt, đơn giản hơn Nginx+certbot |
| CI/CD deploy | **GitHub Container Registry (ghcr.io) + SSH deploy** | Tận dụng Dockerfile multi-stage đã có, không vendor lock-in PaaS |
| Backup | DO Managed DB tự động (daily + PITR) | Không cần cron `pg_dump` riêng cho DB nữa; vẫn cần backup volume `backend_media` (xem rủi ro tồn đọng) |
| Monitoring | UptimeRobot (free) + Sentry (free tier FE+BE) + alert Telegram | Chi phí gần $0, phát hiện sự cố sớm |
| Bảo mật VPS | SSH key-only, đổi port mặc định, fail2ban | Bắt buộc bất kể phương án nào |

**Chi phí ước tính**: ~$40-50/tháng (VPS Vietnix ~$10-15 quy đổi + DO Managed DB $15 + domain ~$10-15/năm + Cloudflare/UptimeRobot/Sentry free).

## Việc người dùng (Long) cần tự làm

Đây là các bước cần tài khoản/thanh toán thật, tôi (Claude) không thể tự thực hiện:

1. Mua domain mới (Namecheap/Cloudflare Registrar cho `.com`, hoặc Mắt Bão/PA Việt Nam cho `.vn`).
2. Thuê VPS Vietnix — tối thiểu 2vCPU/4GB RAM.
3. Tạo tài khoản DigitalOcean → tạo Managed PostgreSQL cluster, region Singapore.
4. Tạo tài khoản Cloudflare, thêm domain, bật proxy (đám mây cam).
5. Trỏ DNS: domain → Cloudflare → IP VPS Vietnix.
6. Tạo tài khoản Sentry (free tier) cho FE + BE, lấy DSN.
7. Tạo tài khoản UptimeRobot, thêm monitor cho domain sau khi deploy xong.
8. Cung cấp cho tôi (qua biến môi trường/secret, KHÔNG dán trực tiếp vào chat):
   - IP VPS Vietnix + SSH key
   - Connection string DO Managed Postgres (host/port/db/user/password, `sslmode=require`)
   - Domain đã trỏ DNS
   - Sentry DSN (FE + BE)

## Việc tôi (Claude) sẽ làm trong repo — thứ tự thực hiện

### Task 1 — `docker-compose.yml`
- Xóa service `postgres` tự host (chuyển sang connection string external qua biến môi trường
  `DB_URL`/`DB_USERNAME`/`DB_PASSWORD` trỏ tới DO Managed DB).
- Giữ `redis` tự host như hiện tại.
- Thêm service **`caddy`** (image `caddy:2-alpine`), map port 80/443, mount `Caddyfile` + volume cho
  cert data.
- `backend` service: bỏ `depends_on: postgres` (không còn service này), thêm biến JDBC yêu cầu
  `sslmode=require` cho kết nối DO Managed DB.
- Cân nhắc bỏ/giữ `pgadmin` — nếu giữ, trỏ tới DO Managed DB thay vì container postgres nội bộ.

### Task 2 — `Caddyfile` (file mới, root hoặc `deploy/Caddyfile`)
```
your-domain.com {
    handle /api/* {
        reverse_proxy backend:8080
    }
    handle {
        reverse_proxy frontend:80
    }
}
```
(Chi tiết chính xác sẽ điều chỉnh khi có domain thật.)

### Task 3 — `.env.example`
- Thêm biến DO Managed Postgres (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD` dạng external connection string).
- Thêm `DOMAIN` cho Caddy.
- Xóa các biến `POSTGRES_*` không còn cần (container postgres tự host bị loại bỏ) — giữ lại nếu vẫn dùng
  cho môi trường dev/local (docker-compose dev riêng, KHÔNG dùng chung file compose production).

**Quyết định cần làm rõ khi thực hiện**: có nên tách `docker-compose.yml` (dev, có postgres container) và
`docker-compose.prod.yml` (production, không có postgres container, có Caddy) thành 2 file riêng, hay dùng
1 file + override? → Đề xuất: **tách riêng** để tránh nhầm lẫn dev/prod, giữ `docker-compose.yml` cho dev
local như hiện tại, thêm `docker-compose.prod.yml` mới.

### Task 4 — `.github/workflows/ci.yml`
- Thêm job `deploy` (chạy sau khi `backend`+`frontend`+`compose` pass, chỉ trigger khi push vào `main`):
  - Build + push image backend/frontend lên `ghcr.io`.
  - SSH vào VPS Vietnix (dùng `appleboy/ssh-action`), chạy `docker compose -f docker-compose.prod.yml pull && up -d`.
- Cần GitHub Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` (GHCR dùng `GITHUB_TOKEN` mặc định).

### Task 5 — Monitoring
- Thêm Sentry SDK vào backend (Spring Boot) và frontend (React) — cần DSN thật từ user trước khi code
  (đặt qua biến môi trường, không hard-code).
- Không cần code cho UptimeRobot (chỉ cấu hình qua dashboard UptimeRobot sau khi có domain).

### Task 6 — Bảo mật VPS (tài liệu hướng dẫn, không phải code trong repo)
- Viết `docs/DEPLOYMENT.md`: hướng dẫn SSH hardening (key-only, đổi port, fail2ban) — đây là việc user tự
  làm trên VPS, tôi chỉ viết hướng dẫn cụ thể từng lệnh.

### Task 7 — `docs/DEPLOYMENT.md` (tài liệu vận hành)
Tổng hợp: kiến trúc, cách deploy lần đầu, cách deploy update sau này (tự động qua CI, hoặc thủ công), cách
rollback, cách xem log, cách backup thủ công `backend_media` (DO Managed DB đã tự backup, nhưng volume
media trên VPS thì chưa — cần cron riêng hoặc chuyển sang object storage sau này).

## Rủi ro tồn đọng cần lưu ý

- **`backend_media` (ảnh property) vẫn lưu local disk trên VPS, KHÔNG được DO Managed DB backup.** Cần
  cron backup riêng (rsync/tar lên nơi khác) hoặc chuyển sang S3-compatible (Cloudflare R2) — ghi nhận
  technical debt, có thể làm ở giai đoạn sau nếu ngân sách/thời gian chưa cho phép ngay.
- Vietnix không có managed Postgres riêng (đã xác nhận qua nghiên cứu) — nên vẫn cần DO cho phần DB, tức
  là **2 nhà cung cấp khác nhau** (Vietnix cho VPS, DO cho DB) — cần lưu ý cross-region latency giữa VPS
  Việt Nam và DO Managed DB Singapore (thường vẫn thấp, nhưng nên đo thử sau khi có cả 2).
- Nghị định 13: dữ liệu App (users, properties) chạy trên VPS Việt Nam — ổn. Nhưng DB nằm ở DO Singapore
  — về bản chất VẪN LÀ "chuyển dữ liệu ra nước ngoài" dù chỉ là phần lưu trữ. Nên tham vấn thêm (ngoài
  phạm vi kỹ thuật của tôi) xem việc này có cần hồ sơ đánh giá tác động hay không trước khi go-live chính
  thức với khách hàng — đây là quyết định pháp lý, không phải kỹ thuật, user cần tự xác nhận hoặc hỏi luật
  sư/chuyên gia tuân thủ.

## Thứ tự thực hiện tổng thể

1. User hoàn thành các bước "tự làm" ở trên (có thể làm song song với Task 1-7, vì phần lớn code dùng
   biến môi trường placeholder, chưa cần giá trị thật ngay).
2. Tôi thực hiện Task 1-7 trong repo (có thể bắt đầu ngay, không cần chờ user).
3. Khi user có đủ VPS + domain + DO DB + secrets → điền giá trị thật vào GitHub Secrets + `.env` trên VPS.
4. Chạy thử deploy lần đầu (thủ công qua SSH trước, xác nhận chạy đúng), rồi mới bật CI/CD tự động.
5. Verify: truy cập domain thật qua HTTPS, kiểm tra toàn bộ luồng chính (login, property CRUD, upload
   ảnh, admin) chạy đúng trên production, kiểm tra Sentry nhận được event test, UptimeRobot lên xanh.
6. Go-live chính thức cho khách hàng SAU KHI xác nhận điểm pháp lý Nghị định 13 ở trên (nếu cần).

## Critical Files (sẽ tạo/sửa)

- `docker-compose.yml` (sửa — bỏ postgres container cho production path, hoặc giữ cho dev)
- `docker-compose.prod.yml` (mới)
- `Caddyfile` hoặc `deploy/Caddyfile` (mới)
- `.env.example` (sửa)
- `.github/workflows/ci.yml` (sửa — thêm job deploy)
- `docs/DEPLOYMENT.md` (mới)
- `backend-springboot/src/main/resources/application-prod.yml` (sửa nếu cần sslmode/Sentry config)
