# Design: Broker + admin dashboard — theme unification & admin IA redesign

**Ngày**: 2026-07-18
**Branch**: `redesign/ui-rebuild`
**Yêu cầu gốc**: (1) chấm tròn trên `TrendBarLineChart` quá to, mất thẩm mỹ — **đã sửa và commit riêng
trước spec này** (xem "Đã xong trước spec" bên dưới). (2) Admin dashboard nên dùng theme sáng thay vì
đen-tím, và "nhìn tổng thể dashboard cũng không có gì đẹp hết" — yêu cầu tận dụng skill (`dataviz`,
`web-design-guidelines`) để chỉnh sửa lại toàn bộ dashboard của cả broker và admin.

**Quyết định phạm vi** (chốt qua 2 câu hỏi + chọn hướng tiếp cận):

- Admin bỏ hẳn theme cố định riêng (`.admin-theme`), dùng chung token sáng/tối với site — **không** dựng
  một theme sáng riêng cho admin.
- Tổ chức lại toàn bộ cấu trúc/bố cục (không chỉ đổi màu) — đã khảo sát code trước khi chọn, xác nhận có
  bug lưới thật (không phải chỉ là gu thẩm mỹ) trên trang admin, chi tiết ở từng mục bên dưới.

## Đã xong trước spec này (không lặp lại ở đây)

- `frontend-react/src/components/Charts.jsx` — `TrendBarLineChart` circle marker: `r="1.6"` cố định →
  `r={hovered === index ? 1.1 : 0.5}`, thêm class `trend-line-dot` + `transition: r 120ms ease` trong
  `styles/dashboard.css`. Xác nhận bằng ảnh chụp Puppeteer thật (session broker + 18 lịch hẹn CONFIRMED
  giả lập trong localStorage) trước/sau. `Charts.test.jsx` 38/38 pass.

## Bối cảnh kỹ thuật (khảo sát trước khi thiết kế)

Việc này **đảo ngược một quyết định trước đó**: `docs/superpowers/specs/2026-07-10-nhom4-admin-den-tim-theme-design.md`
đã chủ ý thêm `.admin-theme` (canvas `#141218`, accent tím `#8b5cf6`) sau khi so sánh 2 mockup. Yêu cầu
hôm nay (2026-07-18) từ user thay thế quyết định đó bằng "để light thay vì dark" — spec này là bản ghi
quyết định mới, không phải một lỗi bị bỏ sót.

**Phát hiện quan trọng**: `--color-sidebar-bg` là token riêng, **tối theo mặc định** ở cả `:root` (dùng
cho broker dashboard, `#101f19` xanh lá đậm) lẫn từng theme — nghĩa là "sidebar tối" không phải đặc quyền
của `.admin-theme`, mà là quy ước sẵn có của toàn bộ hệ dashboard (broker dashboard đã tối sidebar/sáng
nội dung từ trước, không qua `.admin-theme`). Xóa `.admin-theme` khiến admin **tự động** khớp đúng pattern
này — không cần thiết kế theme mới, không cần validate lại palette (bộ `--chart-1..6` mặc định đã được
`validate_palette.js` duyệt ở phiên trước).

**Bug lưới xác nhận qua code** (không phải cảm tính):

1. `OverviewSection.jsx:103` — `<div className="grid-5 dashboard-stats-row">` bọc đúng **4** `StatCard`
   (dòng 53–66: `kpis` có 4 phần tử). `.grid-5` ở ≥1280px là `repeat(5, 1fr)` (`styles.css:940`) → cột
   thứ 5 luôn trống. Khớp với khoảng trắng bên phải hàng KPI trong ảnh chụp thật.
2. `OverviewSection.jsx:118-126` — chart "Hoạt động hệ thống theo tháng" nằm một mình trong
   `.dashboard-live-row` (`grid-template-columns: 1fr`, `styles.css:1539-1544`, full-bleed 1 cột).
   `TrendBarLineChart` tự tính chiều rộng theo số điểm dữ liệu (`idealWidthPx = viewBoxWidth *
   TREND_PX_PER_UNIT`, `Charts.jsx:833`) và CSS `.trend-chart-svg { width: min(100%, var(--trend-chart-width));
   }` (`dashboard.css:936-940`) — với 7-12 điểm/tháng, `idealWidthPx` ≈ 500-600px trong khi panel full-bleed
   ≈ 1100px+ → khoảng trắng chết bên phải, khớp ảnh chụp thật.
3. `OverviewSection.jsx:128-130` — `AuditTimeline` (1 component) là **con duy nhất** trong
   `.dashboard-panels-row` (`grid-template-columns: repeat(2, 1fr)`) → cột thứ 2 bỏ trống. Ngay bên dưới,
   `DashboardPanel title="Tình trạng hệ thống"` (dòng 132-140) đứng riêng thành hàng full-width kế tiếp —
   hai panel cùng nhóm "sức khỏe hệ thống" đang tách rời không cần thiết.

**So sánh với broker dashboard** (`BrokerDashboard.jsx:532-584`): mọi hàng grid đều khớp đúng số cột
(`grid-2` × 2 StatCard, `dashboard-charts-row` × [2-span + 1-span] × 2 lần, `dashboard-panels-row` × 2
panel) — không có bug lưới mồ côi nào. Do đó broker dashboard **không** tái cấu trúc panel, chỉ thừa
hưởng theme + cải tiến dùng chung (mục 4).

**Pattern tái dùng đã có sẵn** (`docs/superpowers/specs/2026-07-15-broker-dashboard-revamp-design.md`,
mục 4+5): `ThreeDDonutChart` đã có prop `compact` (`Charts.jsx`) dựng riêng cho cột hẹp trong
`dashboard-chart-span-2` 3-cột — donut xếp dọc (donut trên, legend dưới), `width: min(140px, 100%)`. Dùng
lại nguyên prop này cho donut mới ở admin, không viết CSS mới.

## 1. Thống nhất theme — bỏ `.admin-theme`

**File**: `frontend-react/src/styles.css`

- Xóa khối `.admin-theme { ... }` (dòng ~136-178, toàn bộ override token + `color-scheme: dark`).

**File**: `frontend-react/src/pages/admin/AdminDashboard.jsx`

- Bỏ chuỗi `admin-theme` khỏi `className="dashboard-shell admin-theme"` ở cả 2 chỗ (dòng ~140 — nhánh role
  không phải admin, và ~156 — render chính) → còn lại `className="dashboard-shell"`, khớp với cách
  `BrokerDashboard.jsx` không gắn class theme riêng.

**Hệ quả tự động** (không cần sửa thêm):

- Admin dùng `--color-primary` xanh lá thay vì tím — mọi nút/link/badge/accent chuyển màu tự động vì đều
  tham chiếu token, không hex cứng (đã xác nhận ở spec 2026-07-10, "Ngoài phạm vi": không component nào
  hardcode hex).
- `--chart-1..6` admin dùng lại đúng bộ site-wide đã validate — 3 bộ palette cạnh tranh trước đây
  (light default / site dark / admin purple) còn lại 2 (light/dark theo toggle, đúng như broker).
- `.kpi-chip-navy`/`.kpi-chip-green` (`dashboard.css`, dùng `color-mix(in srgb, var(--color-primary),
  transparent 84%)` — sửa từ spec 2026-07-10 để nền chip tự tính theo accent hiện hành) tiếp tục hoạt
  động đúng, chỉ là giờ cho ra cùng một màu ở cả admin lẫn broker vì `--color-primary` giờ giống nhau —
  không cần sửa gì thêm ở đây.
- Admin giờ theo đúng nút toggle sáng/tối của site (trước đây `.admin-theme` ép `color-scheme: dark`
  luôn, bất kể toggle) — đúng lựa chọn "dùng chung token với site" của user.

## 2. Admin "Tổng quan" — tổ chức lại IA

**File**: `frontend-react/src/pages/admin/OverviewSection.jsx`

### 2.1 Header gộp (thay 2 khối rời thành 1 hàng)

Đã đọc `AdminDashboard.jsx:180-193`: tiêu đề trang + period chip render ở **file khác** (`dashboard-title-row`,
ngoài `OverviewSection.jsx`), và nút "Xuất báo cáo" gọi `exportOverview` — closure cục bộ dùng
`filteredProperties` của `OverviewSection`. Lift 2 nút lên `dashboard-title-row` sẽ cần prop-drilling qua
boundary `AdminDashboard.jsx` → `<Section>` (generic cho mọi tab admin, không riêng overview) — không đáng
rủi ro cho lợi ích nhỏ.

**Quyết định cụ thể**: giữ nguyên boundary file, chỉ gộp `admin-quick-actions` (dòng 80-85) vào **cùng
hàng flex với `admin-filter-bar`** (dòng 87 trở đi), căn phải — toàn bộ thay đổi nằm gọn trong
`OverviewSection.jsx`, không đụng `AdminDashboard.jsx`. Kết quả: từ 2 hàng xếp dọc (quick-actions rồi đến
filter) còn 1 hàng, KPI xuất hiện sớm hơn trong luồng đọc trang — đúng mục tiêu, rủi ro thấp hơn phương án
lift lên title row.

### 2.2 Filter bar

Giữ nguyên vị trí (trước KPI, vì nó lọc dữ liệu KPI/chart/panel bên dưới) và giữ nguyên chức năng — chỉ
kế thừa theme mới, không đổi layout.

### 2.3 KPI row — sửa bug lưới

`grid-5` → `grid-4` (dòng 103). 4 `StatCard` lấp đầy đúng 4 cột, hết khoảng trắng cột thứ 5.

### 2.4 Chart hệ thống + donut phân bổ danh mục (ghép cặp, thay full-bleed)

Đổi wrapper của `TrendBarLineChart` (dòng 118-126) từ `.dashboard-live-row` (1 cột full-bleed) sang
`.dashboard-charts-row` + `.dashboard-chart-span-2` (đúng pattern broker dashboard đang dùng ở
`BrokerDashboard.jsx:547-556` và ReportsSection.jsx:91-94) — chart chiếm 2/3, thêm 1 panel mới chiếm 1/3:

```jsx
<div className="dashboard-charts-row">
  <div className="dashboard-chart-span-2">
    <TrendBarLineChart
      title="Hoạt động hệ thống theo tháng"
      subtitle="Tin đăng mới và lịch hẹn đã xác nhận, tính từ khi có dữ liệu thực tế"
      data={systemActivityData}
      currentLabel="Tin đăng"
      previousLabel="Lịch hẹn xác nhận"
    />
  </div>
  <ThreeDDonutChart
    compact
    title="Phân bổ theo danh mục"
    data={categoryDistributionData}
    centerLabel="tin đăng"
  />
</div>
```

`categoryDistributionData`: hàm mới `buildCategoryDistribution(filteredProperties)` — đếm số tin theo
`category` (`tro`/`nha`/`dat`, 3 giá trị cố định của hệ thống, xem `tech-defaults.md`), trả về shape mà
`ThreeDDonutChart` đã nhận sẵn (khớp shape `data` của `ReportsSection.jsx:77-82`'s `distributionData`,
copy pattern tính toán từ đó nếu có sẵn hàm tương tự, không viết logic mới nếu đã tồn tại — xác nhận lúc
viết plan). Đây là dữ liệu thật tổng hợp từ `filteredProperties` đã tải sẵn — không phải số liệu bịa.

### 2.5 Audit log + Tình trạng hệ thống (ghép cặp, hết cột mồ côi)

Chuyển `DashboardPanel title="Tình trạng hệ thống"` (dòng 132-140) vào làm con thứ 2 của
`.dashboard-panels-row` đang chứa `AuditTimeline` (dòng 128-130):

```jsx
<div className="dashboard-panels-row">
  <AuditTimeline items={recentAuditItems} />
  <DashboardPanel title="Tình trạng hệ thống" count={`${filteredProperties.length} tin trong bộ lọc`}>
    {/* ...5 dòng dashboard-system-line như cũ, không đổi nội dung... */}
  </DashboardPanel>
</div>
```

Không đổi nội dung bên trong 2 panel — chỉ đổi vị trí lồng ghép.

## 3. Broker dashboard — không tái cấu trúc panel

Xác nhận ở phần khảo sát: không có bug lưới. Broker dashboard **giữ nguyên** thứ tự/nhóm panel
(`BrokerDashboard.jsx:532-584`). Thay đổi duy nhất broker dashboard nhận được từ spec này là gián tiếp:
theme (đã dùng chung token từ trước, không đổi gì) và cải tiến dùng chung ở mục 4.

## 4. Cải tiến dùng chung (broker + admin)

### 4.1 Empty state cho `TrendBarLineChart`

**File**: `frontend-react/src/components/Charts.jsx`

Khi **toàn bộ** điểm dữ liệu có `current === 0 && previous === 0` (không phải "ít điểm", mà là **không có
điểm nào khác 0**) — hiện thông báo trống thay vì vẽ trục + cột rỗng. Phân biệt rõ với trường hợp sparse
(vài ngày có dữ liệu, còn lại 0) — sparse vẫn là dữ liệu thật, vẽ bình thường, không che.

```jsx
const isEmpty = data.every((point) => !point.current && !point.previous);
if (isEmpty) {
  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div><h2 className="chart-title">{title}</h2>{subtitle && <p className="chart3d-subtitle">{subtitle}</p>}</div>
      </div>
      <p className="chart-empty-state">Chưa có dữ liệu trong khoảng thời gian này.</p>
    </section>
  );
}
```

(Class `chart-empty-state` mới — style tối giản: căn giữa, `color: var(--color-muted)`, padding dọc đủ để
không co lại quá thấp so với chart bình thường.)

Áp dụng cho cả 3 nơi dùng `TrendBarLineChart` (broker activity, admin system activity, admin user growth ở
ReportsSection) — vì sửa ở component dùng chung, không cần sửa từng nơi gọi.

### 4.2 Rà theo `web-design-guidelines` (Vercel Web Interface Guidelines)

Áp dụng cho các phần tử tương tác **mới/đổi** trong spec này (không quét lại toàn bộ 2 file — ngoài phạm
vi, rủi ro cao hơn giá trị mang lại):

- Nút hành động header gộp (2.1): `aria-label` nếu chỉ có icon, `:focus-visible` rõ ràng.
- `ThreeDDonutChart` mới ở admin: đã có `role="img" aria-label` per-segment từ trước (xác nhận ở phiên
  trước, không cần sửa) — chỉ cần đảm bảo `centerLabel`/title mới có text rõ nghĩa.
- Text trong panel "Tình trạng hệ thống"/audit log khi đặt cạnh nhau ở cột hẹp hơn (2.5): kiểm tra
  `truncate`/`line-clamp` cho tiêu đề audit dài, tránh tràn cột.

## Không đổi / ngoài phạm vi

- Không đổi nội dung/logic của `BrokersSection.jsx`, `PropertiesSection.jsx`, `ReportsSection.jsx`,
  `ViewingsSection.jsx`, `AuditLogSection.jsx` — chỉ nhận theme mới gián tiếp qua việc xóa `.admin-theme`
  (chúng đều nằm trong `dashboard-shell`, tự động đổi màu, không cần sửa file).
- Không đổi cấu trúc panel của `BrokerDashboard.jsx` (mục 3).
- Không thêm animation phức tạp — chỉ `transition` đơn giản (đã dùng ở mục "Đã xong trước spec").
- Không viết lại `TrendBarLineChart`'s cơ chế tính `idealWidthPx`/scroll ngang cho biểu đồ dày điểm dữ
  liệu (30 ngày ở broker) — giữ nguyên, chỉ admin's monthly chart (7-12 điểm) đổi wrapper để không full-bleed.

## Test plan (chi tiết hoá lúc viết plan)

- `Charts.test.jsx`: thêm case `TrendBarLineChart` render empty-state khi mọi điểm = 0; case vẫn vẽ bình
  thường khi sparse (có ít nhất 1 điểm khác 0) — không regress case hiện tại.
- `OverviewSection.test.jsx`: cập nhật assertion theo cấu trúc DOM mới (grid-4, panel ghép cặp, donut mới)
  nếu test hiện tại query theo cấu trúc cũ.
- `npm test -- --run` toàn bộ — không được thấp hơn 244 pass hiện tại (trừ số test đổi/thêm có chủ đích).
- Xác minh trực quan bằng Puppeteer thật (đã có sẵn quy trình từ phiên trước — session-inject qua
  `evaluateOnNewDocument`, scroll trước khi chụp): chụp `/#/admin` (sáng + tối), `/#/broker/dashboard`
  trước/sau, xác nhận không còn khoảng trắng cột 5 / cột mồ côi / khoảng trắng chết cạnh chart.
