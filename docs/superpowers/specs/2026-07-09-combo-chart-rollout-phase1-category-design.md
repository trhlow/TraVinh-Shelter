# Rollout combo bar+line cho CategoryBarChart (Giai đoạn 1/2) — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Sau khi pilot `WardBarChart` được duyệt, giai đoạn này (1) tách các phần dùng chung của `WardBarChart` thành helper tái sử dụng được, và (2) viết lại `CategoryBarChart` (4 mini-chart "Mật độ tin theo phường", admin `ReportsSection.jsx`) theo đúng kiểu combo bar+line 2 trục như pilot. Giai đoạn 2 (component mới cho nhóm chart cùng đơn vị, thay `ThreeDGroupedBarChart` ở 4 nơi) làm sau, không nằm trong spec này.

## Bối cảnh

`WardBarChart` (`frontend-react/src/components/Charts.jsx:529-664`) vừa được viết lại thành combo bar (count, trục trái) + đường (pct, trục phải), dùng cho "Tin đăng theo phường" (broker dashboard) — đã duyệt qua browser thật.

`CategoryBarChart` (`Charts.jsx:672-698`) hiện vẫn là bản cũ kiểu cột đơn thuần (dùng chung CSS `.ward-bar-*` với `WardBarChart` bản trước khi đổi) — có sẵn cả `count` và `pct` trong `data` (từ `buildCategoryDensityData`), đúng shape cần cho combo 2 trục, chưa cần tính toán gì thêm.

Reviewer của pilot đã cảnh báo: nếu copy y nguyên cách làm của `WardBarChart` cho `CategoryBarChart` mà không tách chung, sẽ nhân đôi phần logic tick/nhãn gần giống hệt nhau. Giai đoạn này tách phần đó ra.

## Thay đổi

### 1. Tách helper dùng chung (trong `Charts.jsx`, không tạo file mới)

Đổi tên các hằng số/hàm cục bộ hiện tại của `WardBarChart` từ tiền tố `WARD_` sang tên tổng quát (vì giờ dùng chung cho cả 2 chart):

```javascript
const COMBO_CHART_TICK_PERCENTS = [0, 25, 50, 75, 100];
const COMBO_CHART_PLOT = { left: 10, right: 90, top: 6, bottom: 38 };

function comboChartTickY(pct) {
  const { top, bottom } = COMBO_CHART_PLOT;
  return bottom - (pct / 100) * (bottom - top);
}
```

Thêm 1 component nội bộ (không export) thay cho 2 khối `<text className="ward-combo-value-label" ...>` gần giống hệt nhau trong `WardBarChart` (nhãn số trên đỉnh cột và nhãn số trên điểm đường):

```javascript
function ComboValueLabel({ x, y, children }) {
  return (
    <text className="combo-value-label" x={x} y={y} textAnchor="middle" fontSize="3.2" fontStyle="italic" fill="var(--color-ink)">
      {children}
    </text>
  );
}
```

(Lớp CSS đổi tên từ `ward-combo-value-label` → `combo-value-label` — không còn đặc thù riêng cho ward nữa.)

### 2. Viết lại `WardBarChart` để dùng helper trên

Thay các chỗ dùng `WARD_COMBO_TICK_PERCENTS`/`wardComboTickY`/`ward-combo-*` bằng `COMBO_CHART_TICK_PERCENTS`/`comboChartTickY`/`combo-*` tương ứng, và 2 khối `<text className="ward-combo-value-label">` (nhãn cột + nhãn đường) thay bằng `<ComboValueLabel x={...} y={...}>{...}</ComboValueLabel>`. Không đổi props, không đổi hành vi click-chọn-phường, không đổi `aria-label`.

Lớp CSS `ward-combo-svg`/`ward-combo-bar-group` đổi tên thành `combo-svg`/`combo-bar-group` (tổng quát, vì `CategoryBarChart` cũng sẽ dùng).

### 3. Viết lại `CategoryBarChart`

Thay toàn bộ nội dung hàm bằng cấu trúc combo bar+line 2 trục — dùng chung `COMBO_CHART_PLOT`/`comboChartTickY`/`ComboValueLabel` với `WardBarChart`:

- Cột = `item.count` (trục trái, thang tự tính theo `max = Math.max(...data.map(d => d.count), 1)`)
- Đường = `item.pct` (trục phải, cố định 0–100, vì `pct` luôn trong khoảng này theo `buildCategoryDensityData`)
- Trục X: `item.label` (Trọ/Nhà/Đất) — **không** rút gọn (khác `WardBarChart`, không có tiền tố dài cần bỏ)
- **Không** có tính năng click (`CategoryBarChart` hiện không nhận `onSelectWard`/tương đương — không thêm mới, đúng YAGNI, giữ đúng phạm vi giai đoạn này)
- Chú giải dưới cùng: dùng lại đúng class `.combo-chart-legend*` đã có sẵn, nhãn "Số tin đăng" / "Tỉ lệ (%)" (giữ nguyên như pilot — nhãn tổng quát, không cần đổi theo ngữ cảnh category vs ward)
- Props giữ nguyên `{ title, data }`, nơi gọi ở `ReportsSection.jsx:87` (4 chỗ, 1 cho mỗi phường) không cần sửa

### 4. Xoá CSS `.ward-bar-*` cũ

`CategoryBarChart` là nơi cuối cùng còn dùng các lớp `ward-bar-cols`/`ward-bar-col`/`ward-bar-count`/`ward-bar-track`/`ward-bar-fill`/`ward-bar-name`/`ward-bar-pct` (trong `frontend-react/src/styles/dashboard.css`) — pilot đã xác nhận không xoá được vì `CategoryBarChart` còn phụ thuộc. Sau bước 3, không còn nơi nào dùng nữa — xoá hẳn 7 rule block này.

### 5. Testing

- 5 test hiện có của `CategoryBarChart` trong `Charts.test.jsx` — cập nhật để phản ánh render mới (dùng cách query bằng class `.combo-value-label` giống pattern đã áp dụng cho `WardBarChart`'s test mới trong pilot, tránh nhầm giữa nhãn giá trị và nhãn tick trục).
- 1 test hiện có của `WardBarChart` (`Charts.test.jsx:68`, `'WardBarChart shows both the count value and the percent value for the same ward'`) — đổi câu query `container.querySelectorAll('.ward-combo-value-label')` thành `.combo-value-label`. 2 test còn lại của `WardBarChart` không query theo class này, không cần sửa.
- Không cần test riêng cho `ComboValueLabel`/`comboChartTickY` (helper nội bộ, không export — được test gián tiếp qua test của 2 component dùng nó, đủ để xác nhận hành vi đúng).

## Ngoài phạm vi

- Giai đoạn 2: component mới cho nhóm chart cùng đơn vị (1 trục, không phải dual-axis) — thay 4 chỗ dùng `ThreeDGroupedBarChart` ("Tăng trưởng người dùng mới", "Hoạt động hệ thống theo tháng", "Top môi giới theo hoạt động", "Hoạt động môi giới theo tháng"), rồi xoá `ThreeDGroupedBarChart`. Cần quyết định riêng về cách vẽ 1 trục dùng chung cho 2 chuỗi cùng đơn vị.
