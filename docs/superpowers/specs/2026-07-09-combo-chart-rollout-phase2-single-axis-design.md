# Combo-chart rollout, Phase 2: single-axis TrendBarLineChart — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Thay 4 chỗ dùng `ThreeDGroupedBarChart` bằng 1 component combo bar+line **1 trục** mới, rồi xoá `ThreeDGroupedBarChart` (chỉ phần code/CSS đặc thù của riêng nó — không đụng `ThreeDChartPanel`/`ChartModeToggle`/`ThreeDDonutChart`/`ThreeDFunnelChart`/`ThreeDAreaChart`, vẫn đang sống).

## Bối cảnh

Pilot (`WardBarChart`) và Phase 1 (`CategoryBarChart`) đã đổi 2 chart sang combo bar+line **2 trục** (count trái, % phải — vì 2 chuỗi khác đơn vị). 4 chỗ còn lại dùng `ThreeDGroupedBarChart` (`frontend-react/src/components/Charts.jsx:173-212`) lại có 2 chuỗi **cùng đơn vị** "số lượng" — không cần 2 trục, chỉ cần 1 trục chung tự scale theo max của cả 2 chuỗi.

4 nơi dùng hiện tại (props y hệt nhau về shape, chỉ khác nội dung):

1. `frontend-react/src/pages/BrokerDashboard.jsx:505-511` — "Hoạt động môi giới theo tháng", `data={activityChartData}` (từ `buildActivitySeries`), `currentLabel="Bài đăng"`, `previousLabel="Lịch hẹn xác nhận"`
2. `frontend-react/src/pages/admin/OverviewSection.jsx:114-120` — "Hoạt động hệ thống theo tháng", `data={systemActivityData}` (từ `buildSystemActivitySeries`), `currentLabel="Tin đăng"`, `previousLabel="Lịch hẹn xác nhận"`
3. `frontend-react/src/pages/admin/ReportsSection.jsx:70-76` — "Tăng trưởng người dùng mới", `data={userGrowthData}` (từ `buildUserGrowthData` — `previous` luôn `0`, không có dữ liệu kỳ trước thật), `currentLabel="Người dùng mới"`, `previousLabel="Kỳ trước"`
4. `frontend-react/src/pages/admin/ReportsSection.jsx:92-98` — "Top môi giới theo hoạt động", `data={topBrokerData}` (từ `buildTopBrokerData` — nhãn X là tên môi giới, không phải tháng), `currentLabel="Tin đăng"`, `previousLabel="Lịch hẹn xác nhận"`

Cả 4 đều nhận `data: [{label, current, previous}]` — chỉ khác `label` là tháng ("T7") hay tên môi giới — cùng shape, dùng chung 1 component được.

## Thay đổi

### 1. Component mới `TrendBarLineChart`

Trong `Charts.jsx`, thêm component mới nhận đúng props `ThreeDGroupedBarChart` đang nhận (để 4 nơi gọi gần như không đổi gì ngoài đổi tên):

```
TrendBarLineChart({ title, subtitle, data, currentLabel, previousLabel })
```

**Tái dùng tối đa** từ pilot/Phase 1 (không viết lại logic hình học): `COMBO_CHART_PLOT`, `COMBO_CHART_TICK_PERCENTS`, `comboChartTickY` — hàm này chỉ map 1 giá trị % vị trí (0-100) sang toạ độ Y trong khung vẽ cố định, không quan tâm % đó đại diện cho gì, nên dùng lại y hệt cho trục giá trị thật (không phải trục %). `CHART_PALETTE[0]`/`CHART_PALETTE[4]` cho màu cột/đường, `TRACK_COLOR` cho trục, `.combo-svg`/`.combo-bar`/`.combo-chart-legend*` cho CSS (không cần CSS mới).

**Khác pilot/Phase 1**: chỉ **1 trục** (trái), không có trục phải. `axisMax = Math.max(...data.flatMap(d => [d.current || 0, d.previous || 0]), 1)` — scale theo max thật của cả 2 chuỗi cộng lại, không cố định 0-100 như trục % trước đây. Tick hiện giá trị thật (`Math.round(axisMax * tickPercent / 100)`), không phải %.

### 2. Tự động ẩn đường khi `previous` toàn bộ = 0

`data.every((point) => !point.previous)` → chỉ vẽ cột (current), không vẽ đường/chấm/legend-item thứ 2. Xử lý đúng trường hợp "Tăng trưởng người dùng mới" (previous luôn 0 vì không có dữ liệu kỳ trước thật) mà không cần đổi gì ở `ReportsSection.jsx` — component tự phát hiện từ data thật, không phải flag truyền vào.

### 3. Cập nhật 4 nơi gọi

Đổi `<ThreeDGroupedBarChart ...>` thành `<TrendBarLineChart ...>` với **props y hệt như cũ** ở cả 4 chỗ — không cần đổi tên prop hay logic tính data.

### 4. Xoá `ThreeDGroupedBarChart` và CSS đặc thù của nó

Sau bước 3, xoá hẳn hàm `ThreeDGroupedBarChart` (`Charts.jsx:173-212`). Grep xác nhận trước: các class sau **chỉ được `ThreeDGroupedBarChart` dùng**, không nơi nào khác trong `Charts.jsx` tham chiếu tới (đã kiểm tra qua grep lúc viết spec này) — an toàn xoá:

`chart3d-bar-legend`, `chart3d-legend-dot`, `chart3d-current-dot`, `chart3d-previous-dot`, `chart3d-bar-stage`, `chart3d-bar-group`, `chart3d-bar-stack`, `chart3d-bar` (và các biến thể `chart3d-bar-previous`/`chart3d-bar-current`/pseudo-element `::before`/`::after` cho hiệu ứng 3D), `chart3d-bar-value`, `chart3d-axis-label` (`frontend-react/src/styles/dashboard.css`, khoảng dòng 76-193, cộng phần trong media query ở dòng ~366).

**Không xoá** (vẫn dùng bởi `ThreeDDonutChart`/`ThreeDFunnelChart`/`ThreeDAreaChart`, đều còn sống): `.chart3d-panel`, `.chart3d-header`, `.chart3d-subtitle`, `.chart-mode-toggle`, `.chart-mode-btn`, mọi class `chart3d-donut-*`/`chart3d-funnel-*`/`chart3d-area-*`. Cũng không xoá `ThreeDChartPanel`/`ChartModeToggle` (component nội bộ dùng chung) — chỉ `ThreeDGroupedBarChart` bị xoá.

### 5. Testing

- Test mới cho `TrendBarLineChart`: render với `{label, current, previous}` đầy đủ 2 chuỗi khác 0 → xác nhận cả cột và đường đều vẽ (dùng cách kiểm tra qua thuộc tính SVG thật `.combo-bar`/`circle`, giống pattern đã dùng ở `WardBarChart`/`CategoryBarChart`, không dùng text label vì đã bỏ nhãn số).
- Test: `previous` toàn bộ 0 → không có `<circle>`/`<path>` nào được vẽ, chỉ còn `.combo-bar`.
- Test: trục tự scale theo max thật của cả 2 chuỗi (không cố định 0-100).
- `Charts.test.jsx` không có test riêng cho `ThreeDGroupedBarChart` (đã grep xác nhận) — không có gì cần xoá ở đó ngoài việc thêm test mới cho `TrendBarLineChart`.
- **Ràng buộc bắt buộc**: đã grep xác nhận 4 test ở mức trang phụ thuộc trực tiếp vào `role="img"` + `aria-label={title}` trên phần tử bao ngoài của chart (kế thừa từ `ThreeDGroupedBarChart`'s `.chart3d-bar-stage`):
  - `BrokerDashboard.activity.test.jsx:26` — `screen.getByRole('img', { name: 'Hoạt động môi giới theo tháng' })`
  - `OverviewSection.test.jsx:50` — `screen.getByRole('img', { name: 'Hoạt động hệ thống theo tháng' })`
  - `ReportsSection.test.jsx:61` và `:69` — `screen.getByRole('img', { name: 'Tăng trưởng người dùng mới' })`

  `TrendBarLineChart` **phải** đặt `role="img"` và `aria-label={title}` trên phần tử SVG/container bao toàn bộ phần vẽ (tương đương vai trò của `.chart3d-bar-stage` cũ), nếu không cả 4 test này sẽ vỡ ngay cả khi component mới hoạt động đúng.

## Ngoài phạm vi

- Không đụng `ThreeDDonutChart`, `ThreeDFunnelChart`, `ThreeDAreaChart`, `ThreeDChartPanel`, `ChartModeToggle`.
- Item 4 (thiết kế lại "Phễu chuyển đổi khách hàng") — việc khác, không liên quan tới phase này.
- Item 2 (3D→2D toàn diện cho các chart còn lại như donut/funnel) — ngoài phạm vi, phase này chỉ giải quyết đúng 4 chart cột.
