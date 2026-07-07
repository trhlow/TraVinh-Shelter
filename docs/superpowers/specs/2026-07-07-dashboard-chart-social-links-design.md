# Design: Sửa biểu đồ hoạt động theo tháng + bổ sung link mạng xã hội (frontend-only)

**Date**: 2026-07-07
**Branch**: `devnguyen` (frontend workspace)
**Status**: Approved by user

## Context

4 việc frontend độc lập, gộp chung 1 spec vì đều nhỏ và không đụng backend:

1. Biểu đồ "Hoạt động tin đăng (30 ngày)" (broker dashboard) và "Hoạt động hệ thống ...
   (30 ngày)" (admin dashboard) đang dùng cửa sổ trượt 30 ngày kể từ hôm nay, và trục ngang
   chỉ hiện 2 nhãn đầu/cuối nên không biết điểm giữa ứng ngày nào.
2. Broker dashboard chưa cho broker tự nhập Zalo/Facebook/TikTok dù backend
   (`PATCH /users/me`) đã hỗ trợ sẵn 3 field này.
3. Property detail page: nút "Gọi ngay" và "Chat Zalo" đang là 2 nút riêng xếp chồng dọc,
   cần gộp thành 1 khung.
4. Footer đã bị gỡ icon Facebook/TikTok (commit `96c28f2`, lý do: href="#/" placeholder chết)
   — cần khôi phục lại 2 icon này (bỏ Youtube).

## 1. Biểu đồ hoạt động — tính theo tháng dương lịch + tooltip theo ngày

**File**: `frontend-react/src/components/Charts.jsx`

- **Giữ nguyên** `buildDailySeries(items, getDate, days)` — vẫn dùng cho các sparkline 7 ngày
  trong KPI stat card (`OverviewSection.jsx` dòng 41/45, `BrokerDashboard.jsx` dòng 167/171),
  không đụng vào.
- **Thêm hàm mới** `buildMonthlySeries(items, getDate, referenceDate = new Date())`, chỉ dùng
  riêng cho 2 biểu đồ "hoạt động ... 30 ngày":
  - Lấy `year`/`month` từ `referenceDate`, tính số ngày trong tháng
    (`new Date(year, month + 1, 0).getDate()`).
  - Tạo đúng số bucket đó, mỗi bucket = 1 ngày dương lịch từ ngày 1 đến ngày cuối tháng.
  - Đếm item theo `dayKey` khớp chính xác — ngày chưa tới (tương lai trong tháng) tự động
    = 0 vì không có item nào khớp, không cần logic đặc biệt để "cắt" đường biểu đồ.
- `TrendAreaChart`: thêm chấm tròn nhỏ tại mỗi điểm dữ liệu trên đường line, và tooltip khi
  hover: `onMouseMove` trên `<svg>` tính vị trí gần nhất bằng
  `getBoundingClientRect()` + tỉ lệ theo `series.length`, hiển thị div tooltip
  (`position: absolute`, style theo token `--color-canvas`/`--color-hairline`/`--radius-md`)
  với nội dung "07/07: 3 tin đăng". `onMouseLeave` ẩn tooltip.
- Tiêu đề đổi từ hard-code "(30 ngày)" sang động theo tháng hiện tại, ví dụ
  `Hoạt động tin đăng (tháng 7/2026)` — build bằng
  `new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' })` hoặc tương đương.
- Áp dụng hàm mới tại 2 nơi gọi (chỉ đổi các dòng gọi cho biểu đồ "30 ngày", không đụng
  sparkline 7 ngày):
  - `frontend-react/src/pages/admin/OverviewSection.jsx` (`activitySeries`)
  - `frontend-react/src/pages/BrokerDashboard.jsx` (`listingActivitySeries`)
- Biểu đồ này **giữ nguyên độc lập** với `DateRangeFilter` đã có trên trang (không đồng bộ
  theo bộ lọc) — chỉ sửa cách tính bucket ngày.

## 2. Broker Dashboard — thêm Zalo/Facebook/TikTok vào profile

**File chính**: `frontend-react/src/pages/BrokerDashboard.jsx`, `frontend-react/src/services/api.js`

- `profileForm` state mở rộng: `{ fullName, phone, zaloUrl, facebookUrl, tiktokUrl }`.
- Form "Thông tin cá nhân": thêm 3 `FormField` mới (nhãn "Zalo", "Facebook", "TikTok",
  `type="url"`, placeholder `https://...`), gửi kèm trong `saveProfile` → `updateCurrentProfile`.
- `services/api.js` mock `fetchCurrentUser`: thêm 3 field này vào object trả về (mock mode),
  giá trị mặc định rỗng `''`.
- `ProfileSummary`/`ProfileLine`: hiển thị các link đã lưu (nếu có giá trị) dạng dòng thông
  tin giống `phone`/`email` hiện tại, mỗi dòng là link mở tab mới nếu có URL.
- Backend không cần sửa — `UpdateProfileRequest`/`CurrentUserProfileResponse` đã có sẵn
  `zaloUrl`/`facebookUrl`/`tiktokUrl`.

## 3. Property Detail — gộp khung điện thoại + Zalo

**File**: `frontend-react/src/pages/PropertyDetailPage.jsx`, `frontend-react/src/styles.css`

- Thay 2 `<a>` full-width (`btn btn-primary btn-md btn-full` cho gọi, `.contact-btn-zalo`
  cho Zalo) bằng 1 khung `.contact-phone-zalo` (flex row, bo góc `--radius-md`,
  `overflow: hidden`):
  - Phần trái (`flex: 1`): `<a href="tel:...">` icon Phone + số điện thoại, nền
    `--color-primary`, chữ trắng.
  - Phần phải (width cố định ~56px, `flex-shrink: 0`): `<a href="zalo.me/...">` chỉ icon
    Zalo (`MessageCircle`), nền `--color-zalo`, có viền phân cách nhẹ bên trái
    (`border-left: 1px solid rgba(255,255,255,.25)`).
- Nút Facebook (`.contact-btn-facebook`, hiển thị nếu `brokerFacebook` có giá trị) **giữ
  nguyên** vị trí — vẫn là nút full-width riêng bên dưới khung gộp, không đổi.
- Zalo link luôn hiện (như hiện tại, không có guard điều kiện) — giữ hành vi cũ.

## 4. Footer — khôi phục icon Facebook + TikTok

**File**: `frontend-react/src/layouts/MainLayout.jsx`, `frontend-react/src/styles.css`

- Khôi phục lại phần đã gỡ ở commit `96c28f2`, nhưng **chỉ Facebook + TikTok** (bỏ Youtube):
  - `TikTokIcon` — SVG vẽ tay (lucide-react không có icon TikTok), lấy lại nguyên
    implementation cũ (`currentColor`, `strokeWidth 1.75`, `strokeLinecap/strokeLinejoin round`
    để khớp phong cách lucide).
  - `Icon name="Facebook"` — dùng lucide-react có sẵn (đã import trong `Icon.jsx`).
  - JSX: `.footer-social-icons` chứa 2 `<a>` (`aria-label` tương ứng), `href="#/"` tạm thời.
  - CSS: khôi phục `.footer-social-icons`/`.footer-social-icon` (đã có sẵn trong git history,
    copy lại nguyên).
- `href="#/"` là placeholder tạm — để lại comment `// TODO: thay bằng URL Facebook/TikTok
  thật của Công Tín Land khi có` ngay cạnh mảng link, dễ tìm khi cập nhật sau.

## Testing

- `Charts.jsx`: nếu có test hiện tại cho `buildDailySeries`, cập nhật theo hàm/tên mới
  (`buildMonthlySeries`) — kiểm tra số bucket đúng theo tháng, ngày tương lai = 0.
- `PropertyDetailPage.test.jsx`: có test hiện tại kiểm tra href Facebook
  (`toHaveAttribute('href', ...)`) — đảm bảo vẫn pass sau khi đổi cấu trúc JSX vùng
  phone/zalo (test này không đụng tới phone/zalo nên nhiều khả năng không ảnh hưởng, verify
  lại khi chạy).
- `BrokerDashboard.*.test.jsx`: verify form submit vẫn hoạt động sau khi thêm field mới.
- Chạy toàn bộ `npm test -- --run` trước khi coi là xong.
