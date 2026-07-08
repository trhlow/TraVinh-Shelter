# Admin Dashboard IA Restructure — Design

**Ngày**: 2026-07-08
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Nhóm B trong chuỗi 4 nhóm sửa đổi Admin/Broker Dashboard (B → A → C → D). Nhóm này chỉ tái cấu trúc thông tin (IA) của Admin Dashboard — không đụng tới business logic doanh thu/hoa hồng (nhóm A) hay đổi loại biểu đồ (nhóm C).

## Bối cảnh

Sidebar Admin hiện có 9 mục nhưng thực chất chỉ có 6 nội dung khác nhau:
- `/admin/reports`, `/admin/rbac`, `/admin/settings` đều render lại y hệt `OverviewSection` (chỉ khác tiêu đề trang) — không có nội dung riêng.
- `/admin/accounts` (Quản lý người dùng) quản lý khóa/mở tài khoản role `USER` — nhưng dự án không có khái niệm "người dùng cần admin quản lý", chỉ có tài khoản môi giới do admin cấp (`tech-defaults.md`).
- Overview có panel "Tin đăng chờ duyệt" với nút Duyệt/Từ chối dựa trên một trạng thái `PENDING` giả lập (`isPendingProperty()` đoán qua chuỗi text) — nhưng backend enum thật chỉ có `AVAILABLE | RENTED | SOLD | HIDDEN`, không có `PENDING`. Tin đăng lên thẳng, admin chỉ hậu kiểm (gỡ nếu vi phạm), không duyệt trước khi hiển thị.

## Thay đổi

### 1. Sidebar — từ 9 mục còn 6 mục

| Trước (href → label) | Sau |
|---|---|
| `/admin/overview` → Tổng quan | Tổng quan (giữ, nội dung rút gọn — xem mục 2) |
| `/admin/accounts` → Quản lý người dùng | ❌ xóa |
| `/admin/brokers` → Quản lý môi giới | giữ nguyên |
| `/admin/properties` → Duyệt tin đăng | **Quản lý tin đăng** (đổi tên) |
| `/admin/viewings` → Giao dịch | giữ nguyên |
| `/admin/reports` → Báo cáo & Thống kê | giữ, nội dung mới (tách khỏi Overview — xem mục 3) |
| `/admin/rbac` → Phân quyền (RBAC) | ❌ xóa |
| `/admin/settings` → Cài đặt hệ thống | ❌ xóa |
| `/admin/audit` → Nhật ký | giữ nguyên |

### 2. Overview — bỏ phần giả lập/trùng lặp

- Xóa `PendingApprovalPanel` (component + JSX render trong Overview).
- Xóa KPI card "Tin chờ duyệt" (dùng `isPendingProperty`/`pendingApprovals`).
- Xóa `isPendingProperty()` (không còn nơi dùng).
- Xóa `RbacPanel`, `RoleRow`, `RBAC_MODULES`, `DEFAULT_RBAC`, state `rbac`, `toggleRbac`.
- Xóa `changePropertyStatus` action liên quan tới duyệt (giữ action này ở `PropertiesSection` cho nghiệp vụ gỡ/khôi phục — không xóa action, chỉ xóa nơi gọi nó để "duyệt").
- 4 chart phân tích (`ThreeDGroupedBarChart` tăng trưởng người dùng, `ThreeDDonutChart` phân bổ tin đăng, `HeatmapChart` mật độ, `ThreeDGroupedBarChart` top môi giới) và `BrokerPerformancePanel` chuyển sang `ReportsSection.jsx` mới (mục 3).
- Overview còn lại: quick actions, filter bar, KPI cards (Tổng người dùng*, Môi giới hoạt động, Tổng tin đăng — bỏ Doanh thu tháng này vì thuộc nhóm A), `AuditTimeline`, khối "Tình trạng hệ thống".

  \* KPI "Tổng số người dùng" hiện đếm `users.length` (role USER) — giữ nguyên số liệu hiển thị ở Overview dù đã bỏ trang quản lý chi tiết, vì đây là con số tổng quan, không phải thao tác quản lý từng tài khoản.

### 3. `ReportsSection.jsx` (component mới)

Nhận props giống các section khác (`data`, `loading`, `actions`). Chứa:
- `ThreeDGroupedBarChart` "Tăng trưởng người dùng mới"
- `ThreeDDonutChart` "Phân bổ tin đăng theo khu vực"
- `HeatmapChart` "Mật độ tin theo phường"
- `ThreeDGroupedBarChart` "Top môi giới theo doanh số" → **lưu ý**: chart này hiện dùng dữ liệu doanh thu ước tính (`estimatePropertyRevenue`) — thuộc phạm vi nhóm A, tạm giữ nguyên logic ở nhóm B này, nhóm A sẽ sửa nội dung sau (đổi "doanh số" → "hoạt động" theo yêu cầu #1.1 của user).
- `BrokerPerformancePanel`

Các hàm builder liên quan (`buildUserGrowthData`, `buildTopBrokerData`, `buildBrokerRows`, `rollingMonthBuckets`, `dateOrFallback`, `sameMonth`, `shortName`) di chuyển theo từ `OverviewSection.jsx` sang `ReportsSection.jsx`. `buildWardData`/`buildHeatmapData` import tiếp tục dùng chung từ `Charts.jsx`.

### 4. Xóa file

- `AccountsSection.jsx`, `AccountsSection.test.jsx`

### 5. Routes & AdminDashboard

- `routes/index.jsx` — xóa route map `'/admin/accounts': 'accounts'`, `'/admin/rbac': 'rbac'`, `'/admin/settings': 'settings'`.
- `AdminDashboard.jsx`:
  - `ADMIN_SIDEBAR_ITEMS` — xóa 3 mục, đổi label "Duyệt tin đăng" → "Quản lý tin đăng"
  - `SECTION_COMPONENTS` — xóa `accounts`, `rbac`, `settings`; `reports` trỏ sang `ReportsSection` (không còn alias `OverviewSection`)
  - `adminTitle`/`adminSubtitle` — xóa case `accounts`/`rbac`/`settings`, cập nhật case `properties`/`reports`
  - Xóa import `AccountsSection`, thêm import `ReportsSection`

### 6. Test

- `OverviewSection.test.jsx` — xóa các test case cho pending-approval/RBAC, giữ test KPI/audit/filter còn lại
- `ReportsSection.test.jsx` (mới) — test render 4 chart + broker performance panel với data giả lập
- Xóa test file của `AccountsSection`
- Cập nhật `App.test.jsx` nếu có assert route `/admin/accounts`, `/admin/rbac`, `/admin/settings`

## Ngoài phạm vi (để nhóm khác xử lý)

- Đổi nội dung/label "doanh thu", "doanh số" → nhóm A
- Đổi loại biểu đồ (3D→2D, ward chart trục X/Y%, density 4-chart) → nhóm C
- Bỏ Zalo, thêm YouTube, sửa dark mode admin theme, sửa category list, khóa tháng dashboard → nhóm D

## Rủi ro / lưu ý khi thực thi

- `AdminDashboard.jsx`, `OverviewSection.jsx` hiện có ~2300 dòng thay đổi **chưa commit** từ phiên làm việc trước (không liên quan tới task này) — plan thực thi phải đọc kỹ nội dung hiện tại trước khi sửa, không dùng `git checkout`/`git restore` trên các file này trong bất kỳ tình huống nào (bài học từ sự cố mất dữ liệu trước đó).
