# TrendBarLineChart — scale chart width to real data count — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Chỉ `TrendBarLineChart` (`frontend-react/src/components/Charts.jsx`) — component dùng ở 4 nơi: `BrokerDashboard.jsx`, `admin/OverviewSection.jsx`, `admin/ReportsSection.jsx` (×2). Không đụng `WardBarChart`/`CategoryBarChart` (luôn có 3-4 danh mục cố định, không gặp vấn đề này) hay `COMBO_CHART_PLOT` dùng chung.

## Bối cảnh

User cung cấp ảnh chụp trang admin "Tổng quan": chart "Hoạt động hệ thống theo tháng" chỉ có 1 tháng dữ liệu thật (hệ thống mới chạy ~1 tháng) nhưng cột dữ liệu vẫn render lọt thỏm giữa 1 khoảng trắng rất rộng — vì `viewBox="0 0 100 50"` cùng `preserveAspectRatio="none"` luôn stretch để lấp đầy 100% chiều rộng CSS của panel, bất kể có bao nhiêu cột dữ liệu thật.

User muốn: chart nên "thu hẹp" khi ít dữ liệu, không cố lấp đầy panel bằng khoảng trống. Không được thêm dữ liệu giả (tháng ảo) để lấp — nguyên tắc "honest charts" đã áp dụng từ trước trong session này (Nhóm A/C phần 1).

## Thay đổi

### Vấn đề kỹ thuật cần xử lý cùng lúc: tránh méo hình

Nếu chỉ giới hạn chiều rộng CSS mà giữ nguyên `viewBox="0 0 100 50"`, chữ/cột sẽ bị bóp méo theo chiều ngang (vì chiều cao container vẫn cố định 220px trong khi chiều rộng co lại, khiến scale ngang khác scale dọc dưới `preserveAspectRatio="none"`). Giải pháp: cho cả `viewBox` lẫn chiều rộng CSS co giãn theo cùng 1 tỉ lệ cố định (đơn vị SVG ↔ pixel không đổi), chỉ tổng chiều rộng thay đổi.

### Geometry mới, cục bộ trong `TrendBarLineChart`

Thay vì dùng chung `COMBO_CHART_PLOT` (left=10, right=90 cố định) cho trục X, `TrendBarLineChart` tự tính viewBox width theo số cột dữ liệu thật:

```javascript
const TREND_LEFT_MARGIN = 10;       // giữ nguyên margin cho nhãn trục trái
const TREND_COLUMN_UNIT_WIDTH = 6;  // mỗi cột chiếm cố định 6 đơn vị SVG
const TREND_RIGHT_MARGIN = 4;
const TREND_PX_PER_UNIT = 7;        // px render / 1 đơn vị SVG — cố định, không đổi theo data.length

const viewBoxWidth = TREND_LEFT_MARGIN + data.length * TREND_COLUMN_UNIT_WIDTH + TREND_RIGHT_MARGIN;
const right = viewBoxWidth - TREND_RIGHT_MARGIN;
const idealWidthPx = viewBoxWidth * TREND_PX_PER_UNIT;
```

`top`/`bottom` (6/38, tức 32 đơn vị chiều cao) giữ nguyên như `COMBO_CHART_PLOT` để nhất quán margin trên/dưới với `WardBarChart`/`CategoryBarChart`.

`viewBox` đổi từ `"0 0 100 50"` thành `` `0 0 ${viewBoxWidth} 50` ``.

### CSS: giới hạn chiều rộng render theo panel, không vượt quá

`<svg>` không còn dùng class `.combo-svg` (class đó có `width: 100%` cứng, dùng chung với Ward/Category charts, không đổi). `TrendBarLineChart` bọc trong 1 class mới `.trend-chart-svg`, set qua CSS custom property:

```jsx
<svg className="trend-chart-svg" style={{ '--trend-chart-width': `${idealWidthPx}px` }} ...>
```

```css
.trend-chart-svg {
  display: block;
  width: min(100%, var(--trend-chart-width));
  height: 220px;
}
```

Với 12 tháng dữ liệu thật: `viewBoxWidth = 10+72+4=86`, `idealWidthPx = 86*7 = 602px` — thường sẽ bị `min(100%, ...)` cắt về đúng 100% panel (giống hệt hành vi hiện tại — không đổi gì khi đã có nhiều dữ liệu). Với 1 tháng: `viewBoxWidth = 10+6+4=20`, `idealWidthPx = 140px` — chart hẹp, đủ chỗ cho 1 cột + nhãn, không kéo giãn.

### Các phần khác giữ nguyên

`barWidth`, `axisMax`, ticks, đường line/dot, legend, `role="img"`/`aria-label` — không đổi logic, chỉ đổi công thức tính `left/right`/`viewBox`/chiều rộng render.

## Testing

- Test mới: với `data.length = 1`, `viewBox` width phải nhỏ hơn hẳn so với `data.length = 12` (xác nhận qua thuộc tính `viewBox` thật trên SVG, không phải suy đoán).
- Test mới: `--trend-chart-width` (qua `style` attribute) tỉ lệ thuận với `data.length` — ví dụ 12 tháng phải lớn hơn 1 tháng đúng theo công thức.
- Test hiện có (`BrokerDashboard.activity.test.jsx`, `OverviewSection.test.jsx`, `ReportsSection.test.jsx` ×2) vẫn phải xanh — không đổi `role="img"`/`aria-label`/nhãn trục X.
- Chạy `cd frontend-react && npm test -- --run` — baseline trước thay đổi: 149/149.

## Ngoài phạm vi

- Không đổi `WardBarChart`/`CategoryBarChart`/`COMBO_CHART_PLOT` dùng chung.
- Không thêm dữ liệu giả để lấp khoảng trống.
- Không đổi chiều cao (220px) hay bất kỳ hành vi trục Y/tick nào.
