# Combo cột + đường 2 trục cho "Tin đăng theo phường" (pilot) — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Chỉ đổi cách vẽ của `WardBarChart` (dùng ở "Tin đăng theo phường", broker dashboard). Đây là bản thử (pilot) — nếu duyệt, các chart cột khác (`CategoryBarChart`, `ThreeDGroupedBarChart` × 4 nơi) sẽ được đổi ở phần sau, không nằm trong spec này.

## Bối cảnh

User cung cấp ảnh mẫu kiểu biểu đồ SGK Địa lý: cột (đơn vị A, trục trái) + đường có chấm (đơn vị B, trục phải), nhãn số in nghiêng trên mỗi cột/điểm, chú giải ngang dưới cùng, khung viền mỏng, trục có mũi tên. User muốn áp style này cho mọi biểu đồ cột trong dashboard, nhưng yêu cầu thử 1 cái trước.

`WardBarChart` (`frontend-react/src/components/Charts.jsx:529`) là lựa chọn pilot tốt nhất: chỉ 1 nơi dùng (`BrokerDashboard.jsx:527`), và `data` đầu vào (từ `buildWardData`) đã sẵn có cả `count` (số tin) và `pct` (% trên tổng) — đúng 2 chuỗi số khác đơn vị mà kiểu combo 2 trục cần, không phải tính thêm gì mới.

## Thay đổi

### Phạm vi sửa

Sửa **nội bộ cách render** của `WardBarChart` trong `frontend-react/src/components/Charts.jsx`. Giữ nguyên:
- Tên export `WardBarChart`
- Props signature: `{ title, data, onSelectWard }`
- Shape của `data`: `[{ code, label, count, pct }]` (không đổi `buildWardData`)
- Hành vi click-chọn-phường khi `onSelectWard` được truyền

→ Nơi gọi `BrokerDashboard.jsx:527` (`<WardBarChart title="Tin đăng theo phường" data={wardChart} />`) **không cần sửa**.

Không tạo component dùng chung mới ở bước này (YAGNI — chỉ tách `ComboBarLineChart` tái sử dụng được khi có ≥2 chỗ dùng thật, tức là sau khi pilot này được duyệt và áp dụng tiếp).

### Kỹ thuật vẽ

Vẽ bằng SVG thuần với `viewBox` (giống cách `TrendAreaChart`/`ThreeDAreaChart` đã làm trong file này) — cột và đường cùng chung 1 hệ toạ độ nên điểm trên đường luôn khớp chính xác vị trí X của cột tương ứng (không dùng cách vẽ cột bằng CSS-flex rồi overlay SVG đường riêng, vì 2 hệ toạ độ độc lập dễ lệch khi resize).

`viewBox="0 0 100 50"` (100 rộng, 50 cao, tỷ lệ tương tự các chart SVG khác trong file), `preserveAspectRatio="none"`.

### Trục và thang đo

- **Trục trái** (số tin đăng): 5 mốc tick tại 100%/75%/50%/25%/0% của `max = Math.max(...data.map(w => w.count), 1)` — tái dùng đúng công thức tick đã có sẵn trong `BarChart` (dead code, cùng file, dòng ~97) thay vì viết thuật toán "làm tròn số đẹp" mới (over-engineering cho 4 điểm dữ liệu).
- **Trục phải** (%): 5 mốc cố định 0/25/50/75/100 (vì `pct` luôn nằm trong khoảng 0–100 theo định nghĩa ở `buildWardData`).
- Nhãn đơn vị nhỏ phía trên mỗi trục: "tin" (trái), "%" (phải).

### Cột và đường

- **Cột** (`count`): màu `CHART_PALETTE[0]` (giữ đúng màu xanh hiện tại của `ward-bar-fill`, không đổi token màu).
- **Đường** (`pct`): màu accent thứ 2 khác biệt rõ với cột — dùng `CHART_PALETTE[1]` (đã là màu khác cột theo palette hiện có, không hard-code hex mới), vẽ nối 4 điểm bằng `<path>`, mỗi điểm có `<circle>` đánh dấu.
- Nhãn số in nghiêng (`font-style: italic`, CSS mới, không phải thuộc tính SVG `font-style` viết tay trong JSX — style qua class) đặt ngay trên đỉnh mỗi cột và trên mỗi điểm đường.

### Trục X và chú giải

- Trục X: tên phường rút gọn bỏ tiền tố "Phường" (theo đúng cách `ReportsSection.jsx`'s `distributionData` đã làm: `.replace('Phường ', '')`).
- Chú giải nằm ngang dưới chart (khác `.chart-legend` hiện có — class đó là layout dọc dùng cho donut, cần class mới `.combo-chart-legend` dạng hàng ngang): ô vuông màu cột + nhãn "Số tin đăng", đường có chấm + nhãn "Tỉ lệ (%)".

### Khung chứa

Tái dùng nguyên `.chart-panel` (đã có `border: 1px solid var(--color-hairline)`, bo góc, shadow — đúng token sẵn có, không cần CSS khung mới).

### Click-chọn-phường

Nếu `onSelectWard` được truyền: mỗi cột (không phải cả cụm cột+đường) vẫn là `<button>` bấm được, giữ nguyên `aria-label` dạng `"Phường Trà Vinh: 1 tin"` như hiện tại — không đổi hành vi accessibility.

## Testing

Cập nhật test `WardBarChart` trong `Charts.test.jsx`:
- Test hiện có `'WardBarChart renders a column with count, name, and percent per ward'` — giữ các assertion cốt lõi (heading title, ward label text, "100%" text hiện diện) vì các giá trị này vẫn render, chỉ đổi cách trình bày trực quan.
- Test hiện có `'WardBarChart columns are clickable when onSelectWard is provided'` — giữ nguyên, không đổi (aria-label không đổi).
- Thêm 1 test mới xác nhận cả 2 chuỗi số cùng hiển thị: với 1 ward có `count=3, pct=100`, cả text "3" và "100%" đều xuất hiện trong DOM (xác nhận trục trái/phải đều vẽ đúng dữ liệu, không chỉ 1 trong 2 chuỗi).

## Ngoài phạm vi

- `CategoryBarChart` (4 mini chart mật độ tin, admin) — chờ pilot này được duyệt.
- `ThreeDGroupedBarChart` (4 nơi dùng: tăng trưởng người dùng, hoạt động hệ thống, top môi giới, hoạt động môi giới) — cùng chờ, và còn cần quyết định riêng về việc dùng 1 trục hay 2 trục (2 chuỗi hiện tại cùng đơn vị "số lượng").
- Tách `ComboBarLineChart` thành component dùng chung — chỉ làm khi áp dụng cho chỗ thứ 2 trở đi.
