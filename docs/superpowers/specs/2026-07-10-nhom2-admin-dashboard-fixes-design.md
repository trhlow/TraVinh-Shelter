# Nhóm 2 — Date-filter wiring, mock-data clock skew, admin layout gaps, chart label overlap — Design

**Ngày**: 2026-07-10
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Đợt thứ hai trong danh sách 15 mục lớn user cung cấp, sau khi Nhóm 1 (5 fix nhỏ) đã hoàn tất
(HEAD `e698ff5`). Nhóm 2 gồm 3 vấn đề liên quan đến admin dashboard: date-filter không đổi số liệu (item
12/13), lỗ trống layout (item 10, phần admin), và nhãn chồng chéo trên biểu đồ "Top môi giới theo hoạt
động" (item 14). Các mục còn lại (dữ liệu giả ở stat card/phễu, dark mode admin, banner) để lại cho Nhóm 3/4.

## Bối cảnh

Investigation (đọc trực tiếp code) xác nhận nguyên nhân từng mục:

1. **Item 12** — `OverviewSection.jsx`: KPI "Tổng số tin đăng" có `value: properties.length` (mảng thô)
   nhưng `trend`/`series` của cùng card đã dùng `filteredProperties` — tự mâu thuẫn trong cùng 1 card.
   Biểu đồ chính (`buildSystemActivitySeries`) và widget nhật ký nhúng (`buildAuditItems`) cũng dùng mảng
   thô `properties`/`viewings`/`users`, không lọc theo `range`.
2. **Item 13** — `AuditLogSection.jsx` (trang Nhật ký độc lập) có logic filter **đúng** (`filtered` dùng
   `isInRange`, bảng render `rows={filtered}`). Nhưng `mockData.js` neo toàn bộ `createdAt` giả theo hằng số
   cố định `MOCK_NOW = Date.UTC(2026, 6, 1)` (01/07/2026), trong khi `resolveDateRange()` mặc định dùng
   `new Date()` (giờ thực). Ngày hôm nay là 10/07/2026 — mọi preset ngắn (7 ngày/30 ngày/quý) đều đo theo
   khung giờ thực đã trôi qua mốc neo cố định, nên gần như luôn trả về cùng một tập kết quả rỗng/gần rỗng
   bất kể preset nào được chọn — đúng triệu chứng user mô tả ("chọn gì cũng không đổi").
3. **Item 10 (phần admin)** — `.dashboard-live-row` (`styles.css`) là grid `3fr 2fr` nhưng
   `OverviewSection.jsx` chỉ còn 1 con (`TrendBarLineChart`) — cột 2fr trống hẳn.
4. **Item 14** — Biểu đồ "Top môi giới theo hoạt động" dùng chung `TrendBarLineChart`
   (`preserveAspectRatio="none"`, scale ngang/dọc khác nhau — thiết kế có chủ đích từ một fix trước để bar
   không bị méo) với 4 chỗ khác vốn nhãn ngắn (`T1`-`T12`, tên phường/danh mục). Tên môi giới (qua
   `shortName()`, lấy 2 từ cuối) dài hơn hẳn nên chồng chéo. Đồng thời phát hiện thêm: `.dashboard-charts-row`
   là grid 3 cột nhưng `ReportsSection.jsx` chỉ đặt 2 phần tử vào đó (chart + `BrokerPerformancePanel`) —
   chart bị kẹt ở 1/3 bề rộng, cột thứ 3 trống.

## Quyết định (đã chốt qua trao đổi)

- Biểu đồ 12-tháng chính ở Tổng quan **giữ nguyên** như view xu hướng dài hạn độc lập — chỉ fix KPI value
  + widget nhật ký nhúng để đồng bộ theo `filteredProperties`.
- Neo mock data theo giờ thực (`Date.now()`) thay vì hằng số cố định.
- `.dashboard-live-row` chuyển 1 cột full-width (không thêm nội dung thay thế).
- Nhãn biểu đồ "Top môi giới": rút gọn tên theo kiểu chữ cái đầu + họ đầy đủ (rule mới), nghiêng 30-40°, và
  mở rộng chart ra 2/3 bề rộng hàng (thay vì 1/3) bằng cách lấp cột trống thứ 3 của `.dashboard-charts-row`.

## Thay đổi

### 1. `OverviewSection.jsx` — đồng bộ KPI + widget nhật ký theo bộ lọc ngày

- KPI "Tổng số tin đăng": đổi `value: properties.length` → `value: filteredProperties.length`.
- `buildAuditItems({ users, properties, viewings })` (dòng 65) đổi tham số `properties`/`viewings` thành
  `filteredProperties`/`filteredViewings` — cần thêm `filteredViewings`, lọc chỉ theo ngày (`isInRange` trên
  `viewing.createdAt || viewing.requestedAt`), **không** theo ward/category — viewing không có trường
  `ward`/`category` trực tiếp (chỉ có `propertyId`, join sang property để lấy ward/category là việc thừa cho
  phạm vi fix này). `users` giữ nguyên mảng thô (không có trường ngày liên quan ngữ cảnh audit — tài khoản
  không có khái niệm "trong khoảng ngày" ở đây, chỉ có ngày tạo tài khoản, không phải chủ đề chính của audit
  "gần đây").
- `buildSystemActivitySeries(properties, viewings)` (biểu đồ 12-tháng) **giữ nguyên tham số thô** — theo
  quyết định đã chốt, không lọc theo `range`.

### 2. `mockData.js` — neo mock data theo giờ thực

Đổi:
```javascript
const MOCK_NOW = Date.UTC(2026, 6, 1); // fixed so tests stay deterministic
```
thành:
```javascript
const MOCK_NOW = Date.now(); // real-time anchor so date-range presets stay meaningful whenever this runs
```
Đã kiểm tra: không có test nào assert theo ngày tuyệt đối bắt nguồn từ `MOCK_NOW` — các test hiện có
(`adminAudit.test.js`, `mockData.test.js`, `propertyFilters.test.js`) chỉ assert tương đối (số lượng, số
tháng khác nhau ≥4, thứ tự sắp xếp, ward/category hợp lệ) — các assertion này đều đúng bất kể mốc neo là gì,
vì chúng chỉ phụ thuộc vào **khoảng cách tương đối** (`index * N ngày`) giữa các mục, không phải ngày tuyệt
đối. Không nơi nào khác trong `src/` tham chiếu `MOCK_NOW`.

### 3. `.dashboard-live-row` — lấp lỗ trống admin Tổng quan

`styles.css`:
```css
.dashboard-live-row {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  margin-bottom: 24px;
}
```
thành:
```css
.dashboard-live-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
```
Block `@media (max-width: 1024px) { .dashboard-live-row { grid-template-columns: 1fr; } }` trở nên thừa
(trùng giá trị mặc định) — xoá.

### 4. Biểu đồ "Top môi giới theo hoạt động" — rộng hơn, nhãn ngắn hơn, nghiêng

**a) Mở rộng chart (lấp cột trống thứ 3 của `.dashboard-charts-row`)** — `ReportsSection.jsx`:
```jsx
<div className="dashboard-charts-row">
  <TrendBarLineChart
    title="Top môi giới theo hoạt động"
    ...
  />
  <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
</div>
```
Bọc `TrendBarLineChart` trong wrapper có class `dashboard-chart-span-2` (CSS mới: `grid-column: span 2;`)
để nó chiếm 2/3 hàng thay vì 1/3 — lấp đúng cột trống thứ 3, và tăng bề rộng chart gấp đôi so với hiện tại.

**b) Rút ngắn tên môi giới** — `ReportsSection.jsx`, `shortName()` (dòng 198-201) đổi từ "lấy 2 từ cuối"
sang "chữ cái đầu của các từ trước + từ cuối đầy đủ":
```javascript
function shortName(name) {
  const parts = String(name || 'MG').trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || name;
  const initials = parts.slice(0, -1).map((part) => part[0].toUpperCase()).join('.');
  return `${initials}.${parts[parts.length - 1]}`;
}
```
Ví dụ: "Trần Hoàng Long" → "T.H.Long"; "Nguyễn Văn Toàn" → "N.V.Toàn"; "Trần Mỹ Linh" → "T.M.Linh".

**c) Nghiêng nhãn 30-40° mà không méo chữ** — `TrendBarLineChart` (`Charts.jsx`) hiện dùng
`preserveAspectRatio="none"` với tỉ lệ scale ngang (7px/unit) khác dọc (4.4px/unit, do CSS height cố định
220px / viewBox height 50) — nếu xoay `<text>` bằng SVG `transform="rotate(...)"` bên trong viewBox này,
chữ sẽ bị **xiên (shear)** chứ không xoay sạch, vì phép xoay áp dụng trước khi bị stretch không đều.

Giải pháp: thêm prop mới `rotateLabels` (boolean, mặc định `false` — không đổi hành vi 4 chỗ gọi hiện có:
mật độ phường, mật độ danh mục, tăng trưởng người dùng, hoạt động môi giới theo tháng ở admin overview).
Khi `rotateLabels === true`:
- Không render các `<text>` nhãn trục X bên trong `<svg>` nữa.
- Render thêm 1 hàng `<div className="trend-chart-labels-row">` ngay dưới `<svg>`, cùng bề rộng CSS với
  `.trend-chart-svg` (dùng chung biến `--trend-chart-width`), layout `display: flex` với đúng `data.length`
  ô con bằng nhau (`flex: 1 1 0`), mỗi ô chứa 1 `<span className="trend-chart-label-rotated">{label}</span>`
  xoay bằng CSS thường (`transform: rotate(-35deg)`) — nằm ngoài viewBox bị stretch nên xoay sạch, không xiên.

Chỉ áp dụng `rotateLabels={true}` cho lời gọi "Top môi giới theo hoạt động" trong `ReportsSection.jsx`; 4
lời gọi còn lại không truyền prop này, giữ nguyên render nhãn ngang trong SVG như cũ.

## Testing

- Frontend: `cd frontend-react && npm test -- --run` — baseline trước Nhóm 2: 153/153 (sau Nhóm 1).
- Test mới cần có:
  - `OverviewSection.jsx`: KPI "Tổng số tin đăng" hiển thị đúng `filteredProperties.length` khi đổi date
    preset (không còn bằng `properties.length` thô khi có filter thu hẹp); audit widget chỉ hiển thị mục
    trong khoảng lọc.
  - `mockData.js`/`adminAudit.test.js`: xác nhận lại các assertion tương đối hiện có vẫn pass sau khi đổi
    `MOCK_NOW` (không cần test mới, test hiện có đã đủ phủ vì chỉ assert tương đối).
  - `Charts.jsx`/`Charts.test.jsx`: test mới cho `rotateLabels={true}` — không còn `<text>` nhãn trong
    `role="img"`, có `.trend-chart-labels-row` với đúng số `.trend-chart-label-rotated` bằng `data.length`,
    mỗi span có `transform: rotate(-35deg)` (qua computed style hoặc class CSS). Test hiện có (dùng mode
    mặc định, không truyền `rotateLabels`) phải tiếp tục pass y nguyên — xác nhận không phá vỡ 4 chỗ gọi cũ.
  - `ReportsSection.jsx`/`ReportsSection.test.jsx`: test mới cho `shortName()` với ví dụ 3 từ ("Trần Hoàng
    Long" → "T.H.Long") và trường hợp 1 từ (trả nguyên tên, không thêm dấu chấm).
- Manual visual check (không có browser automation trong môi trường này — ghi rõ trong plan là bước thủ
  công của user sau khi merge): admin Tổng quan không còn cột trống 2fr; đổi date preset thấy KPI + nhật ký
  nhúng thay đổi số; trang Nhật ký đổi preset thấy số bản ghi thay đổi hợp lý (không còn kẹt ở cùng 1 số);
  biểu đồ Top môi giới rộng hơn rõ rệt, nhãn nghiêng, không chồng chéo.

## Ngoài phạm vi

- Biểu đồ 12-tháng chính không đổi theo date-range preset (quyết định đã chốt — xem mục "Quyết định").
- Không đụng đến `buildSystemActivitySeries`/`buildTopBrokerData`'s giới hạn `slice(0, 6)` — số cột tối đa
  vẫn là 6 dù broker tăng lên 50-60 (leaderboard top-6, không phải toàn bộ danh sách) — mở rộng bề rộng chart
  giải quyết vấn đề chồng chéo cho 6 cột hiện tại, không phải cho một số cột không giới hạn.
- Không đụng đến dữ liệu giả (Lượt xem/Leads/Phễu chuyển đổi) — thuộc Nhóm 3.
- Không đụng dark-mode admin theme hay banner trang chủ — thuộc Nhóm 4.
