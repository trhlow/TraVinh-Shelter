# Bỏ hoa hồng/doanh thu khỏi Admin & Broker Dashboard — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Nhóm A trong chuỗi 4 nhóm sửa đổi Admin/Broker Dashboard (B → A → C → D, nhóm B đã xong). Nhóm này chỉ đổi nội dung/số liệu liên quan hoa hồng-doanh thu — không đổi loại biểu đồ (3D→2D là Nhóm C), không đụng dark mode/Zalo/YouTube/category (Nhóm D).

## Bối cảnh

Toàn dự án không có khái niệm hoa hồng/doanh thu trong nghiệp vụ thật (không có giao dịch tiền tệ được ghi nhận), nhưng UI hiện có nhiều chỗ hiển thị số liệu **hoàn toàn giả lập** (công thức nhân/cộng tùy ý, không dựa trên dữ liệu thật):

- `BrokerDashboard.jsx`: trang riêng "Hoa hồng & Doanh thu" (`/broker/revenue`), KPI "Hoa hồng dự kiến tháng này", chart "Hoa hồng theo tháng" (`buildCommissionSeries` — công thức giả `(count + base + index%4) * multiplier`)
- `OverviewSection.jsx` (admin): KPI "Doanh thu tháng này", chart "Doanh thu giao dịch toàn hệ thống" (`estimatePropertyRevenue` — giả định giá × 1.2% hoặc số cố định theo status)
- `ReportsSection.jsx` (admin): chart "Top môi giới theo doanh số" xếp hạng theo revenue giả lập tương tự

Toàn bộ số liệu này bị xóa, thay bằng số liệu **hoạt động thật** đã có sẵn trong dữ liệu (số tin đăng theo tháng, số lịch hẹn đã xác nhận theo tháng).

## Thay đổi

### 1. Broker Dashboard — xóa hẳn trang Hoa hồng & Doanh thu

- `BrokerDashboard.jsx`: xóa sidebar item `{ href: '#/broker/revenue', ... label: 'Hoa hồng & Doanh thu' }`, xóa khối JSX `section === 'revenue'`, xóa case `revenue` trong 2 hàm title/subtitle map.
- `routes/index.jsx`: xóa `BrokerRevenueRoute`, xóa `'/broker/revenue': BrokerRevenueRoute`.

### 2. Broker Tổng quan (`section === 'dashboard'`) — đổi KPI + chart

- KPI `"Hoa hồng dự kiến tháng này"` (icon DollarSign) → **`"Lịch hẹn xác nhận tháng này"`**: đếm `viewings.filter(v => v.status === 'CONFIRMED' && sameMonth(v.requestedAt||v.createdAt, now)).length`.
- Chart `"Hoa hồng theo tháng"` (`ThreeDGroupedBarChart`, `currentLabel="Năm nay"`, `previousLabel="Năm trước"`) → **`"Hoạt động môi giới theo tháng"`**, `currentLabel="Bài đăng"`, `previousLabel="Lịch hẹn xác nhận"`. Dữ liệu 12 tháng (theo tháng dương lịch, giữ nguyên cách nhóm-theo-tháng-trong-năm hiện có của `buildCommissionSeries`, không đổi sang rolling-12-month): mỗi tháng đếm số tin đăng có `createdAt` rơi vào tháng đó, và số viewings `CONFIRMED` có `requestedAt`/`createdAt` rơi vào tháng đó.
- Xóa `buildCommissionSeries`, biến `commissionChartData`, `commissionThisMonth`. Thêm `buildActivitySeries(listings, viewings)` trả về mảng 12 phần tử `{ label: 'T1'..'T12', current: <số tin đăng>, previous: <số lịch hẹn xác nhận> }`.

### 3. Admin Tổng quan (`OverviewSection.jsx`) — đổi KPI + chart

- Xóa KPI `"Doanh thu tháng này"`, hàm `estimateCurrentMonthRevenue`, `estimatePropertyRevenue`.
- Xóa chart `"Doanh thu giao dịch toàn hệ thống"` (`ThreeDAreaChart`), hàm `buildRevenueSeries`.
- Thêm KPI **`"Lịch hẹn xác nhận tháng này"`** (toàn hệ thống, cùng công thức đếm CONFIRMED trong tháng như broker).
- Thêm chart **`"Hoạt động hệ thống theo tháng"`**: dùng `ThreeDGroupedBarChart` (giữ nguyên 3D — Nhóm C sẽ đổi 2D sau), `currentLabel="Tin đăng"`, `previousLabel="Lịch hẹn xác nhận"`, dữ liệu theo `rollingMonthBuckets()` đã có sẵn trong file (12 tháng gần nhất), mỗi bucket đếm tin đăng tạo trong tháng đó và viewings CONFIRMED trong tháng đó.
- Import: bỏ `ThreeDAreaChart` khỏi import từ `Charts.jsx`, `StatCard`/`DashboardPanel` giữ nguyên vì vẫn dùng.

### 4. Admin Báo cáo & Thống kê (`ReportsSection.jsx`) — đổi tiêu chí Top môi giới

- Chart `"Top môi giới theo doanh số"` → **`"Top môi giới theo hoạt động"`**, `currentLabel="Tin đăng"`, `previousLabel="Lịch hẹn xác nhận"` (bỏ `valueSuffix="tr"` vì không còn đơn vị tiền).
- `buildBrokerRows(brokers, properties, viewings)` — thêm tham số `viewings`, tính:
  - `listings`: số tin đăng của broker (giữ nguyên logic hiện có)
  - `confirmedViewings`: đếm viewings có `status === 'CONFIRMED'` mà `viewing.propertyId` thuộc về property của broker đó (join qua `properties` để lấy `property.broker.id`/`property.broker.email` giống cách match tin đăng hiện tại)
  - `activityScore = listings + confirmedViewings`
  - Xóa field `revenue`, xóa `estimatePropertyRevenue`
  - Sort theo `activityScore` giảm dần (thay vì `revenue`)
- `buildTopBrokerData` đổi từ `current/previous = revenue/1_000_000` sang `current = listings`, `previous = confirmedViewings` của từng broker (6 broker đầu theo `activityScore`).
- `BrokerPerformancePanel`: giữ nguyên "hiệu suất %" (tỷ lệ tin SOLD/RENTED — trạng thái, không phải tiền, không thuộc phạm vi xóa).
- Component nhận thêm `viewings` từ `data?.viewings || []` (đã có sẵn trong `data` prop truyền từ `AdminDashboard.jsx`, chỉ cần destructure thêm).

### 5. Test

- `OverviewSection.test.jsx`: sửa assertion `'Doanh thu giao dịch toàn hệ thống'` → `'Hoạt động hệ thống theo tháng'`.
- `ReportsSection.test.jsx`: nếu có assertion tên chart cũ, cập nhật theo tên mới; thêm case kiểm tra ranking theo activity nếu cần.
- Không có test nào khác phụ thuộc `revenue`/`Hoa hồng` (đã kiểm tra `App.test.jsx`, `BrokerDashboard.filter.test.jsx`) — `BookingForm.test.jsx` đã đúng sẵn từ trước (assert KHÔNG có chữ "hoa hồng"/"commission"), không cần sửa.

## Ngoài phạm vi (để nhóm khác xử lý)

- Đổi loại biểu đồ 3D→2D (trừ biểu đồ tròn) → Nhóm C
- "Tin đăng theo phường" dạng cột X/Y%, "Mật độ tin theo phường" tách 4 biểu đồ, "Phễu chuyển đổi khách hàng" → Nhóm C
- Bỏ Zalo, thêm YouTube, sửa dark mode admin theme, sửa category list, khóa tháng dashboard, căn label → Nhóm D

## Rủi ro / lưu ý khi thực thi

- `BrokerDashboard.jsx` là file lớn (~1300 dòng) — đọc kỹ nội dung hiện tại trước khi sửa, không dùng `git checkout`/`git restore` (bài học từ sự cố mất dữ liệu trước đó, xem `feedback.md`).
- `ReportsSection.jsx` cần join `viewings` → `properties` → `broker` qua `propertyId` — kiểm tra kỹ shape dữ liệu thật (`viewing.propertyId`, `property.broker.id`/`.email`) trước khi viết logic, tránh giả định sai field name.
