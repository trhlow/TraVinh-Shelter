# Mật độ tin theo phường (4 biểu đồ) + biểu đồ trung thực với dữ liệu thật — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Phần đầu của Nhóm C (đổi biểu đồ) trong chuỗi 4 nhóm sửa Admin/Broker Dashboard. Chỉ xử lý item 15/15.1 (mật độ tin theo phường) và vấn đề "chart bịa số/hiện lịch sử giả" vừa phát hiện. Việc đổi 3D→2D toàn diện (item 2), "Tin đăng theo phường" dạng cột %, phễu chuyển đổi (item 4) — để lại cho phần sau của Nhóm C, không đụng ở đây.

## Bối cảnh

**Vấn đề 1 (item 15/15.1)**: `ReportsSection.jsx` đang dùng `HeatmapChart` (ward × category, tô màu theo mật độ) cho "Mật độ tin theo phường". `HeatmapChart`/`buildHeatmapData` không có CSS nào trong `styles.css` (grep xác nhận `.heatmap-*` không tồn tại) — component này chưa từng được style thật, chỉ là khung. Không nơi nào khác trong code dùng `HeatmapChart`/`buildHeatmapData` ngoài chính nó và test của nó.

**Vấn đề 2 (mới phát hiện)**: 2 chart xu hướng theo tháng đang không trung thực với dữ liệu thật:
- `ReportsSection.jsx` — `buildUserGrowthData`: dòng `current: bucket.current || (index % 4 === 0 ? 1 : 0)` bịa ra số 1 khi tháng đó không có user thật. Ngoài ra dùng `dateOrFallback(user.createdAt, index)` — khi `user.createdAt` thiếu/lỗi, hàm này trả về `now` lùi lại `index % 12` tháng — với vòng lặp `users.forEach((user, index) => ...)`, `index` tăng dần theo từng user nên user thiếu ngày bị rải rác giả vào các tháng quá khứ khác nhau (bịa dữ liệu thêm một lớp nữa).
- `OverviewSection.jsx` — `buildSystemActivitySeries`: không bịa số (đã dùng đúng count thật), nhưng luôn hiện đủ 12 tháng rolling kể cả các tháng chưa từng có dữ liệu (toàn số 0 ở đầu mảng), tạo cảm giác có lịch sử hoạt động từ lâu dù nền tảng mới ra mắt.
- `BrokerDashboard.jsx` — `buildActivitySeries`: nhóm theo **tháng dương lịch cố định T1-T12** (mọi năm gộp vào cùng 1 bucket theo `date.getMonth()`), không phải rolling 12 tháng — nên không thể "cắt tháng trống ở đầu" theo cách có ý nghĩa (T1 luôn đứng đầu bất kể có dữ liệu hay không).

## Thay đổi

### 1. `CategoryBarChart` (component mới, `Charts.jsx`) — thay `HeatmapChart`

Tái sử dụng nguyên bộ CSS class đã có sẵn và đang chạy thật của `WardBarChart` (`.chart-panel`, `.ward-bar-cols`, `.ward-bar-col`, `.ward-bar-count`, `.ward-bar-track`, `.ward-bar-fill`, `.ward-bar-name`, `.ward-bar-pct`) — không viết CSS mới, tránh rủi ro component không style (bài học từ `HeatmapChart`/`BarChart` chưa từng được style). Component nhận `{ title, data }` với `data: [{ slug, label, count, pct }]` (3 phần tử — Trọ/Nhà/Đất), tính `max = Math.max(...data.map(d => d.count), 1)` và scale chiều cao cột theo `max` thật (giống hệt logic `WardBarChart` — đây chính là "trục Y tự động scale theo dữ liệu thật" mà item 15.1 yêu cầu, không cần thêm logic tick-mark riêng).

Hàm builder mới `buildCategoryDensityData(properties, wardCode)`:
```javascript
export function buildCategoryDensityData(properties, wardCode) {
  const wardProperties = properties.filter((property) => property.ward === wardCode);
  const total = wardProperties.length;
  return CATEGORIES.map((category) => {
    const count = wardProperties.filter((property) => property.category === category.slug).length;
    return {
      slug: category.slug,
      label: category.label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}
```
(`CATEGORIES` đã có 3 phần tử Trọ/Nhà/Đất, không phân biệt thuê/mua — đúng ý "cho thuê hay mua đều được tính vào".)

### 2. `ReportsSection.jsx` — 4 `CategoryBarChart` thay `HeatmapChart`

Xóa `heatmapData`/`buildHeatmapData` import + usage. Thêm:
```javascript
const wardDensityData = useMemo(
  () => WARDS.filter((w) => w.code !== 'all').map((w) => ({
    code: w.code,
    label: w.label,
    data: buildCategoryDensityData(filteredProperties, w.code),
  })),
  [filteredProperties],
);
```
JSX thay `<HeatmapChart .../>` bằng 4 `<CategoryBarChart title={`Mật độ tin — ${ward.label}`} data={ward.data} />` (map qua `wardDensityData`), đặt trong một hàng/grid riêng (`dashboard-charts-row` giữ nguyên cấu trúc lưới hiện có, có thể cần thêm 1 hàng CSS grid mới nếu 4 chart không vừa 1 hàng — dùng class `dashboard-charts-row` lặp lại hoặc class mới `dashboard-ward-density-row` nếu cần, quyết định cụ thể để lại cho lúc code — không phải quyết định kiến trúc).

Bỏ `onSelectCell`/drill-down khi click ô (tính năng chỉ tồn tại trên `HeatmapChart`, không có trong `CategoryBarChart`) — chấp nhận mất tính năng này vì không nằm trong yêu cầu ban đầu (item 15/15.1 không nhắc tới drill-down).

### 3. Xóa `HeatmapChart`/`buildHeatmapData` khỏi `Charts.jsx` + test

Sau thay đổi trên, không còn nơi nào dùng `HeatmapChart`/`buildHeatmapData` ngoài `Charts.test.jsx`. Xóa cả hai hàm khỏi `Charts.jsx`, xóa test case tương ứng khỏi `Charts.test.jsx`.

### 4. Bỏ số bịa trong `buildUserGrowthData` (`ReportsSection.jsx`)

Đổi:
```javascript
current: bucket.current || (index % 4 === 0 ? 1 : 0),
previous: Math.max(0, Math.round((bucket.current || 1) * 0.72)),
```
thành:
```javascript
current: bucket.current,
previous: 0,
```
(Bỏ luôn field "kỳ trước" giả — không có dữ liệu user lịch sử thật để so sánh kỳ trước, để `previous: 0` thay vì bịa công thức nhân 0.72. Chart vẫn hiển thị 2 cột như cũ (`currentLabel`/`previousLabel`) nhưng cột "Kỳ trước" luôn 0 cho tới khi dự án đủ lâu để tính kỳ trước thật — chấp nhận cách này thay vì đổi hẳn sang single-series chart, để tránh phải sửa `ThreeDGroupedBarChart` hoặc đổi loại chart component, việc đó ngoài phạm vi phần này của Nhóm C.)

Sửa `dateOrFallback` dùng trong `buildUserGrowthData`: khi gọi cho user, không truyền `index` của vòng lặp nữa (luôn truyền `0`) — để nếu `user.createdAt` thiếu/lỗi, user đó rơi vào tháng hiện tại thay vì bị rải rác giả vào quá khứ:
```javascript
users.forEach((user) => {
  const date = dateOrFallback(user.createdAt, 0);
  ...
});
```

### 5. Thêm helper dùng chung `trimLeadingEmptyMonths` (`utils/chartSeries.js`, file mới)

```javascript
// Cuts leading entries where every numeric series value is 0, so trend charts
// don't imply history from before the platform had any real data. Always
// keeps at least the last entry (the current period), even if it's still 0.
export function trimLeadingEmptyMonths(buckets) {
  const firstRealIndex = buckets.findIndex((bucket) => (bucket.current || 0) > 0 || (bucket.previous || 0) > 0);
  if (firstRealIndex === -1) return buckets.slice(-1);
  return buckets.slice(firstRealIndex);
}
```

Áp dụng:
- `ReportsSection.jsx` — `buildUserGrowthData`: bọc kết quả trả về bằng `trimLeadingEmptyMonths(...)`.
- `OverviewSection.jsx` — `buildSystemActivitySeries`: bọc kết quả trả về bằng `trimLeadingEmptyMonths(...)`.
- `BrokerDashboard.jsx` — `buildActivitySeries`: đổi từ nhóm theo **tháng dương lịch cố định** (`Array.from({length:12}, ...)` theo `date.getMonth()`) sang **rolling 12 tháng gần nhất** (cùng kiểu `rollingMonthBuckets()` đã dùng ở 2 file admin — copy pattern, không import chéo giữa `pages/` để giữ file độc lập theo cấu trúc hiện tại của dự án), rồi áp `trimLeadingEmptyMonths(...)`. Đây là thay đổi hành vi (tháng dương lịch cố định → 12 tháng gần nhất có thật) — cần thiết vì bucket theo tháng dương lịch cố định không thể "cắt đầu" có ý nghĩa.

## Ngoài phạm vi (để phần sau Nhóm C xử lý)

- Đổi 3D→2D cho toàn bộ chart trừ biểu đồ tròn (item 2)
- "Tin đăng theo phường" đổi thành cột X/Y + % trên đỉnh cột (item 3 — khác với `CategoryBarChart` ở đây, đây là chart tổng theo phường không tách category)
- Đổi cách biểu đạt "Phễu chuyển đổi khách hàng" (item 4)
