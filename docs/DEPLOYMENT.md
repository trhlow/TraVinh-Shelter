# Deployment Guide — Công Tín Land

Kiến trúc production, quy trình deploy, rollback, và bảo trì. Xem quyết định kiến trúc đầy đủ ở
`docs/superpowers/plans/2026-07-07-production-deployment-growth-tier.md`.

## Kiến trúc

```
Internet
  │
  ▼
Cloudflare (DNS proxy, WAF, DDoS L3/4) — free tier
  │
  ▼
VPS Vietnix (Việt Nam)
  ├── Caddy (reverse proxy, TLS tự động qua Let's Encrypt) — port 80/443
  │     ├── /api/*  → backend:8080
  │     └── /*      → frontend:80
  ├── backend  (Spring Boot, image từ ghcr.io)
  ├── frontend (Nginx + static build, image từ ghcr.io)
  └── redis    (cache + rate-limit, tự host, không cần managed)
        │
        ▼ (sslmode=require)
DigitalOcean Managed PostgreSQL (Singapore) — backup hàng ngày + PITR tự động
```

`backend_media` (ảnh property) lưu trên volume Docker local của VPS — **KHÔNG** được DO Managed DB
backup (xem mục "Rủi ro tồn đọng").

## Chuẩn bị lần đầu (một lần duy nhất)

Các bước cần tài khoản/thanh toán thật — xem checklist đầy đủ trong file plan ở trên. Tóm tắt:

1. Domain đã mua, DNS đã trỏ qua Cloudflare (proxy bật, đám mây cam) → IP VPS Vietnix.
2. VPS Vietnix đã cài Docker + Docker Compose plugin.
3. DigitalOcean Managed PostgreSQL cluster đã tạo (region Singapore), có connection string.
4. Sentry project (FE + BE) đã tạo, có DSN.
5. UptimeRobot monitor đã thêm cho domain.

### Bảo mật VPS (làm trước khi mở port ra ngoài)

```bash
# 1. Tạo user không phải root, thêm SSH key (không dùng password)
adduser deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# 2. Tắt đăng nhập root + password auth trong /etc/ssh/sshd_config
#    PermitRootLogin no
#    PasswordAuthentication no
#    (tùy chọn) Port <port khác 22>
systemctl restart sshd

# 3. Cài fail2ban
apt update && apt install -y fail2ban
systemctl enable --now fail2ban

# 4. Firewall — chỉ mở SSH port, 80, 443
ufw allow <ssh-port>/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### Clone repo lên VPS

```bash
git clone https://github.com/trhlow/TraVinh-Shelter.git ~/travinh-shelter
cd ~/travinh-shelter
cp .env.example .env
# Điền giá trị thật vào .env: DB_URL, DB_USERNAME, DB_PASSWORD, DB_APP_USERNAME, DB_APP_PASSWORD,
# DOMAIN, JWT_SECRET, CORS_ALLOWED_ORIGINS, SENTRY_DSN_BACKEND, BACKEND_IMAGE, FRONTEND_IMAGE
```

### Least-privilege DB role (DB_APP_USERNAME / DB_APP_PASSWORD)

Migration `V20__create_least_privilege_app_role.sql` tách user Flyway (DDL, full-privilege —
`DB_USERNAME`/`DB_PASSWORD`) khỏi user JPA/Hikari runtime (`DB_APP_USERNAME`/`DB_APP_PASSWORD`,
chỉ SELECT/INSERT/UPDATE/DELETE, không DDL). App bị compromise (SQLi sót, RCE...) thì kẻ tấn công
không thể DROP/ALTER schema qua kết nối runtime.

**Quan trọng — kiểm tra quyền TRƯỚC khi deploy thật, không phải sau**: migration V20 dùng
`CREATE ROLE` và `ALTER DEFAULT PRIVILEGES`, cả hai đều cần quyền tương đối cao. Flyway chạy V20
như một phần bình thường của quá trình migrate mỗi lần backend khởi động — nếu V20 lỗi, Flyway
báo lỗi và Spring Boot **từ chối khởi động xong** (context không lên), bất kể `DB_APP_USERNAME`/
`DB_APP_PASSWORD` trong `.env` được set hay bỏ trống thế nào. Nói cách khác: **bỏ trống
`DB_APP_USERNAME`/`DB_APP_PASSWORD` không phải là fallback hợp lệ nếu V20 lỗi** — app chưa bao giờ
chạy tới đoạn đọc `DB_APP_USERNAME`/`DB_APP_PASSWORD` cho datasource runtime, vì Flyway đã chặn ở
bước migrate trước đó.

Vì vậy, xác nhận quyền của admin user **trước khi deploy lần đầu**, không đợi tới khi thấy lỗi:

1. Trên DigitalOcean dashboard → Databases → cluster → **Users & Databases**, kiểm tra role mặc
   định (`doadmin` hoặc user bạn tạo, ví dụ `travinh_app`). DO Managed PostgreSQL thường cấp cho
   user quản trị mặc định gần như toàn bộ quyền superuser (trừ một vài thao tác cấp instance như
   `pg_hba.conf`), nên `CREATE ROLE`/`ALTER DEFAULT PRIVILEGES` **thường có sẵn** — đây là đường
   đi mặc định, kỳ vọng.
2. Để chắc chắn trước khi deploy thật, kết nối thử bằng `psql` (hoặc `docker compose ... exec`)
   bằng chính user sẽ dùng làm `DB_USERNAME` và chạy:
   ```sql
   SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user;
   -- Kỳ vọng: t (true)
   ```
   Nếu `t` → deploy bình thường như hướng dẫn dưới, V20 sẽ chạy thành công.

**Nếu admin user KHÔNG có `CREATE ROLE` (trường hợp hiếm)** — remediation thật sự, không phải
"bỏ trống biến env":

- **Cách A (khuyến nghị) — bootstrap thủ công bằng một kết nối có đủ quyền, sau đó để Flyway ghi
  nhận migration đã áp dụng**:
  1. Xin DO support cấp `CREATE ROLE` cho admin user, HOẶC dùng một connection string khác (vd.
     `doadmin` gốc của cluster) mà bạn xác nhận CÓ quyền superuser để chạy tay đúng nội dung SQL
     trong `V20__create_least_privilege_app_role.sql` (thay `${appRuntimePassword}` và
     `${migratorUsername}` bằng giá trị thật).
  2. Sau khi chạy tay xong, đánh dấu migration này là "đã áp dụng" trong lịch sử Flyway để lần
     khởi động backend tiếp theo không chạy lại nó: dùng Flyway CLI với `flyway repair` (thêm
     baseline) hoặc — nếu không có Flyway CLI sẵn trên VPS — insert thủ công một dòng vào
     `flyway_schema_history` khớp checksum của file V20 (lấy checksum bằng
     `flyway info` hoặc tính bằng công cụ Flyway CLI cùng phiên bản với backend; không tự bịa
     checksum). Đây là thao tác nhạy cảm — sai checksum sẽ khiến Flyway coi migration bị "sửa đổi"
     và từ chối khởi động ở lần chạy kế tiếp; nếu không chắc, ưu tiên xin cấp quyền (bước 1) thay
     vì tự chạy tay.
  3. Khởi động lại backend — Flyway thấy V20 đã trong lịch sử, bỏ qua, các migration sau chạy
     bình thường bằng admin user hiện tại.
- **Cách B — hạ cấp về single-role tạm thời**: nếu không thể chạy V20 dưới bất kỳ hình thức nào
  (kể cả thủ công), xóa hẳn file migration `V20__create_least_privilege_app_role.sql` khỏi
  `db/migration/` trên nhánh deploy tạm thời (không chỉ bỏ trống env var) và bỏ luôn
  `DB_APP_USERNAME`/`DB_APP_PASSWORD` khỏi `.env` — lúc này Flyway không còn migration nào đòi hỏi
  `CREATE ROLE`, app chạy hoàn toàn bằng `DB_USERNAME`/`DB_PASSWORD` (hành vi cũ, full-privilege
  runtime). Đây là phương án tạm, chấp nhận đánh đổi mất tính năng least-privilege cho tới khi xin
  được quyền từ DO — cần khôi phục migration khi có quyền.

### GitHub Secrets (cho CI/CD tự động)

Vào repo → Settings → Secrets and variables → Actions, thêm:

| Secret | Giá trị |
|---|---|
| `SSH_HOST` | IP VPS Vietnix |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | Private key tương ứng với public key đã thêm ở bước trên |
| `VITE_SENTRY_DSN` | Sentry DSN cho frontend (build-time, bake vào bundle) |

`GITHUB_TOKEN` (đăng nhập ghcr.io) đã có sẵn mặc định, không cần tạo.

## Deploy lần đầu (thủ công, xác nhận trước khi bật CI/CD)

```bash
cd ~/travinh-shelter
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f backend   # theo dõi khởi động + Flyway migrate
```

Xác nhận:
- `curl https://your-domain.com/api/v1/actuator/health/readiness` → `{"status":"UP"}`
- Truy cập domain qua trình duyệt, kiểm tra HTTPS (khóa xanh, cert Let's Encrypt do Caddy tự cấp).
- Test luồng chính: đăng nhập, xem property, đặt lịch xem, admin dashboard.
- Sentry nhận được event test (trigger lỗi thử, hoặc dùng nút test DSN trên dashboard Sentry).
- UptimeRobot chuyển xanh sau vài phút.
- Migration V20 (least-privilege DB role) chạy thành công — xem log `Successfully applied N
  migrations`, không có lỗi `permission denied for CREATE ROLE`. Quyền `CREATE ROLE` của admin
  user cần được xác nhận **trước** bước này (xem mục "Least-privilege DB role" ở trên) — nếu chưa
  xác nhận và V20 lỗi ở đây, backend sẽ không khởi động được; xử lý theo Cách A/B ở mục trên rồi
  thử lại `docker compose -f docker-compose.prod.yml up -d`.

Chỉ bật CI/CD tự động (job `deploy` trong `.github/workflows/ci.yml`, trigger khi push `main`) **sau khi**
xác nhận deploy thủ công chạy đúng.

## Deploy update sau này

**Tự động (khuyến nghị)**: push/merge vào `main` → CI build image mới → push `ghcr.io` → SSH vào VPS →
`docker compose -f docker-compose.prod.yml pull && up -d`. Không cần thao tác gì thêm.

**Thủ công (khi cần deploy ngay, không đợi CI)**:

```bash
ssh deploy@<vps-ip>
cd ~/travinh-shelter
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## Rollback

Image cũ vẫn còn trên ghcr.io theo tag/digest. Cách nhanh nhất — trỏ lại digest image trước đó:

```bash
# Xem lịch sử image đã push
# (trên GitHub: repo → Packages → travinh-shelter-backend/frontend → chọn version cũ)

ssh deploy@<vps-ip>
cd ~/travinh-shelter
BACKEND_IMAGE=ghcr.io/trhlow/travinh-shelter-backend@sha256:<digest-cu> \
FRONTEND_IMAGE=ghcr.io/trhlow/travinh-shelter-frontend@sha256:<digest-cu> \
docker compose -f docker-compose.prod.yml up -d
```

Nếu migration Flyway (V-số mới) gây lỗi không tương thích ngược, cần đánh giá từng trường hợp — Flyway
không tự rollback migration đã chạy.

## Xem log

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f redis
```

## Backup thủ công `backend_media`

DO Managed DB tự backup (daily + PITR) — không cần làm gì thêm cho phần dữ liệu DB. Nhưng volume
`backend_media` (ảnh property) chỉ nằm trên VPS, chưa có backup tự động. Cho tới khi chuyển sang
object storage (Cloudflare R2 — xem "Rủi ro tồn đọng"), backup thủ công định kỳ:

```bash
docker run --rm \
  -v travinh_realty_backend_media:/data:ro \
  -v ~/backups:/backup \
  alpine tar czf /backup/backend_media_$(date +%Y%m%d).tar.gz -C /data .
```

Khuyến nghị đặt cron hàng ngày trên VPS và đẩy file backup ra nơi khác (rsync sang máy khác, hoặc
upload lên object storage) — lưu trên cùng VPS không bảo vệ khỏi mất VPS.

## Rủi ro tồn đọng

- **`backend_media` chưa có backup tự động** — xem mục trên. Cân nhắc chuyển sang Cloudflare R2
  (S3-compatible) khi ngân sách/thời gian cho phép — sẽ cần đổi `infrastructure/storage/` sang
  implementation mới thay vì `LocalMediaStorage`.
- **2 nhà cung cấp khác nhau** (Vietnix VPS Việt Nam, DigitalOcean DB Singapore) — có cross-region
  latency giữa app và DB, nên đo thử sau khi go-live. Nghị định 13/2023/NĐ-CP: dữ liệu lưu trữ ở DO
  Singapore về bản chất là "chuyển dữ liệu ra nước ngoài" dù chỉ là tầng lưu trữ — cần xác nhận với
  chuyên gia pháp lý/tuân thủ trước khi go-live chính thức với khách hàng thật, đây là quyết định
  pháp lý ngoài phạm vi kỹ thuật.
