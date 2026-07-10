# Nhóm 4 — Admin đen-tím theme — Design

**Ngày**: 2026-07-10
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Item 8 từ punch list gốc (bảng màu admin dark-mode). Item 9 (banner trang chủ) tách riêng,
chưa scope được — chờ user mô tả cụ thể hơn ở một phiên sau.

## Bối cảnh

`design.md` ghi rõ `/admin` phải dùng theme **đen-tím cố định** qua class `.admin-theme` (canvas `#141218`,
accent tím `#8b5cf6`, không đổi theo toggle sáng/tối của site chính). Đọc trực tiếp `styles.css:124-153`
xác nhận `.admin-theme` hiện tại **không khớp** — đang là workspace sáng (`--color-canvas: #ffffff`) với
sidebar xanh lá đậm (`--color-sidebar-bg: #101f19`), dùng luôn bảng màu xanh lá + vàng gold của toàn site
(`--color-primary: #1d5a44`), không phải tím.

Phát hiện thêm (ngoài phạm vi item 8, không xử lý ở đây): bảng màu tổng thể `design.md` mô tả (accent hồng
Rausch `#ff385c` kiểu Airbnb) cũng không khớp `styles.css`'s `:root` thật (xanh lá + vàng gold, ghi chú
"matching Công Tín Land design") — có vẻ site đã đổi brand sau khi `design.md` được viết, nhưng tài liệu
chưa cập nhật theo. Không sửa ở batch này — user chỉ yêu cầu làm đúng phần admin theo đúng spec đã ghi.

## Quyết định (đã chốt qua trao đổi + xem mockup)

- Làm đúng y hệt màu `design.md` ghi cho admin: canvas `#141218`, accent tím `#8b5cf6` — **không** cố giữ
  bảng xanh-vàng brand hiện tại cho vùng admin, dù nó khác brand chính của site.
- Sidebar admin đổi từ xanh lá đậm (`#101f19`) sang tông đen-tím thống nhất (`#1a1625`) — không giữ sidebar
  xanh lá cũ (đã xem 2 mockup cạnh nhau, chọn phương án đồng bộ).
- Chỉ làm item 8 (admin theme) trong batch này; item 9 (banner) hoãn sang phiên sau.

## Thay đổi

### 1. Thay toàn bộ token block của `.admin-theme`

`frontend-react/src/styles.css:124-153` — thay nguyên khối, giữ nguyên selector `.admin-theme {}`:

```css
.admin-theme {
  color-scheme: dark;
  --color-canvas: #141218;
  --color-surface-soft: #1c1a24;
  --color-surface-strong: #262331;
  --color-ink: #f2f0f6;
  --color-body: #d6d0e0;
  --color-muted: #a89fc2;
  --color-muted-soft: #7a7195;
  --color-primary: #8b5cf6;
  --color-primary-active: #7c3aed;
  --color-primary-disabled: #4c3a7a;
  --color-on-primary: #ffffff;
  --color-hairline: #2e2a3d;
  --color-hairline-soft: #211f2b;
  --color-border-strong: #453f5c;
  --color-success: #4ade80;
  --color-success-bg: #14532d;
  --color-warning: #fbbf24;
  --color-warning-bg: #78350f;
  --color-error: #f87171;
  --color-error-bg: #7f1d1d;
  --color-sidebar-bg: #1a1625;
  --shadow-card: rgba(255, 255, 255, 0.06) 0 0 0 1px,
                 rgba(0, 0, 0, 0.4) 0 2px 6px 0,
                 rgba(0, 0, 0, 0.5) 0 4px 8px 0;
  --chart-1: #8b5cf6;
  background: var(--color-canvas);
  color: var(--color-body);
}
```

Ghi chú từng thay đổi so với bản cũ:
- `color-scheme: light` → `dark`: bắt buộc để dropdown `<select>` gốc của trình duyệt render nền/chữ tối
  (không chỉ dựa vào `color-scheme` không — đã có bài học từ Pass 9: cần **cả** `color-scheme: dark` **và**
  nền solid dựa trên token, không phải `background: transparent`. `.input` — class mọi `<select>` admin
  đang dùng — đã set `background: var(--color-canvas)` sẵn từ trước, nên chỉ cần thêm `color-scheme: dark`
  là đủ, không cần sửa gì thêm ở `.input`).
- `--color-success/-warning/-error` (+ `-bg`): tái dùng nguyên giá trị từ `[data-theme="dark"]` block
  (`styles.css:86-121`) — không phải chọn màu mới, dùng lại bộ đã được kiểm chứng tương phản tốt trên nền tối.
- `--color-sidebar-bg`: `#101f19` (xanh lá) → `#1a1625` (đen-tím) theo quyết định ở trên.
- `--chart-1`: `#1d5a44` (xanh lá) → `#8b5cf6` (khớp accent tím mới).
- `--shadow-card`: đổi từ shadow đổ bóng đen (dành cho nền sáng) sang viền sáng mờ (dành cho nền tối) — tái
  dùng đúng pattern `[data-theme="dark"]` đã dùng.

### 2. Sửa 2 class hardcode hex sẽ vỡ dưới nền tối

`frontend-react/src/styles/dashboard.css:499` và `:501`:

```css
.kpi-chip-navy   { background: #eef3ee; color: var(--color-primary); }
.kpi-chip-green  { background: #eef3ee; color: var(--color-primary); }
```

đổi thành:

```css
.kpi-chip-navy   { background: color-mix(in srgb, var(--color-primary), transparent 84%); color: var(--color-primary); }
.kpi-chip-green  { background: color-mix(in srgb, var(--color-primary), transparent 84%); color: var(--color-primary); }
```

`#eef3ee` là nền xanh mint nhạt — cứng giá trị, không đổi theo scope. Dưới `.admin-theme` mới,
`--color-primary` sẽ là tím nhưng nền chip vẫn mint sáng cứng nhắc, tạo ô sáng chói giữa nền tối. Đổi sang
`color-mix()` (đã có tiền lệ dùng ở `dashboard.css:98`) để nền tự tính theo accent hiện hành của scope đang
áp dụng — admin ra tím nhạt, broker (vẫn theme sáng, không đổi) ra y hệt mint nhạt như cũ vì
`--color-primary` ở đó vẫn là xanh lá.

`StatCard` (nơi 2 class này áp dụng qua prop `tone="navy"/"green"`) dùng chung giữa admin và broker
dashboard — xác nhận qua code: broker giữ nguyên theme sáng (không đụng ở batch này), nên thay đổi này
chỉ đổi *cách tính* màu nền, không đổi *kết quả nhìn thấy* ở broker.

## Ngoài phạm vi

- Không sửa `design.md`'s mô tả accent hồng Rausch cho toàn site (khác biệt với brand xanh-vàng thật) —
  phát hiện nhưng không thuộc yêu cầu batch này.
- Không đụng banner trang chủ (item 9) — chờ mô tả cụ thể hơn từ user.
- Không có component/JSX nào cần sửa — grep xác nhận `pages/admin/*.jsx` không có hex hardcode nào, mọi nơi
  chỉ tham chiếu token semantic sẵn có.

## Testing

Đây là thay đổi CSS token thuần túy (đổi giá trị custom property + 1 hàm màu) — không có hành vi
JS/component nào để test bằng jsdom (custom property cascade từ stylesheet không được tính trong môi trường
test). Không có công cụ browser-automation trong môi trường này (đã xác nhận nhiều lần trong session) — xác
minh sẽ là thủ công: chạy `npm run dev`, đăng nhập admin (mock: email chứa "admin"), xem trực tiếp
`/admin` ở các trang Tổng quan/Môi giới/Tài khoản/BĐS/Lịch hẹn/Nhật ký, kiểm tra:
- Canvas tối, sidebar tím-đen thống nhất, accent tím trên nút/link chính.
- KPI chip không còn ô sáng chói.
- Dropdown lọc (phường/danh mục/trạng thái) mở ra nền tối, chữ đọc được.
- Trang broker dashboard (`/broker/*`) không đổi gì — vẫn sáng như cũ.

Không có test tự động mới — `npm test -- --run` chạy lại để xác nhận không có test hiện tại nào assert giá
trị hex cũ (`#eef3ee`, `#1d5a44`, `#101f19`, `#ffffff` cho admin canvas) làm test đỏ oan.
