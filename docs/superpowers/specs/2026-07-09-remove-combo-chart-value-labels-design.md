# Bỏ nhãn số in nghiêng trên combo chart (đè nhau) — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Fix lỗi hiển thị trên `WardBarChart` (broker dashboard) và `CategoryBarChart` (4 mini-chart admin) — 2 component combo bar+line đã duyệt trước đó (pilot + Phase 1). Không đụng tới trục/tick/legend/click hay bất kỳ hành vi nào khác.

## Bối cảnh

User cung cấp ảnh chụp thực tế: khi 1 cột cao và điểm % của nó gần đỉnh cột (ví dụ đúng 100% hoặc 0%), nhãn số in nghiêng của cột (`ComboValueLabel` cho count) và nhãn số của đường (`ComboValueLabel` cho pct) đè lên nhau, không đọc được. User xác nhận muốn bỏ hẳn cả 2 loại nhãn — chỉ dựa vào tick số ở 2 trục trái/phải (đã có sẵn, tự scale theo dữ liệu thật) để người dùng đọc giá trị, giống 1 biểu đồ combo kiểu Excel/SGK chuẩn.

`ComboValueLabel` (`frontend-react/src/components/Charts.jsx:532-538`) hiện được gọi 4 lần: 2 lần trong `WardBarChart` (nhãn count trên cột, nhãn pct trên đường), 2 lần trong `CategoryBarChart` (tương tự). Không có CSS rule riêng cho `.combo-value-label` (style hoàn toàn qua SVG attribute) — xác nhận qua grep, không có gì cần dọn ở file CSS.

## Thay đổi

### 1. Xoá 4 lần gọi `<ComboValueLabel>`

Trong cả `WardBarChart` và `CategoryBarChart`, xoá khối JSX map render `<ComboValueLabel>` cho nhãn count trên cột và nhãn pct trên đường (2 khối mỗi component). Không thay bằng gì khác — chart chỉ còn cột, đường, chấm tròn, tick 2 trục, tên trục X, chú giải.

### 2. Xoá component `ComboValueLabel`

Sau bước 1, không còn nơi nào gọi `ComboValueLabel` — xoá hẳn định nghĩa hàm (dòng 532-538).

### 3. Cập nhật JSDoc

Comment của `CategoryBarChart` hiện liệt kê `ComboValueLabel` là 1 phần logic dùng chung với `WardBarChart` — sửa lại để không nhắc tới component đã xoá.

### 4. Sửa 2 test đang query `.combo-value-label`

- `Charts.test.jsx:60-71` (`WardBarChart shows both the count value and the percent value for the same ward`) và `Charts.test.jsx:233-249` (`CategoryBarChart renders title and one column per category with count and percent`) đều dùng `container.querySelectorAll('.combo-value-label')` — class này không còn tồn tại sau bước 1-2.
- Giữ nguyên mục đích gốc của 2 test (xác nhận cả chuỗi count và chuỗi pct đều được vẽ đúng, không chỉ 1 trong 2) nhưng đổi cách kiểm tra: đọc trực tiếp thuộc tính SVG thật — chiều cao `<rect className="combo-bar">` phản ánh đúng `count` (đã có tiền lệ ở test `CategoryBarChart scales bar height...`), và toạ độ `cy` của `<circle>` (điểm trên đường) phản ánh đúng `pct`.

## Ngoài phạm vi

- Không đổi trục, tick, legend, màu sắc, hành vi click.
- Không áp dụng gì cho `ThreeDGroupedBarChart` (Phase 2, chưa bắt đầu, không liên quan tới lỗi này).
