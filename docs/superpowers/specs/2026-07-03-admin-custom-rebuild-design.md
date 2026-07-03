# Design: Admin dashboard custom đen-tím + nâng cấp broker

**Date**: 2026-07-03
**Branch**: `feat/admin-custom-rebuild` (base: `feat/dashboard-live-charts`, chưa merge main)
**Status**: Approved by user (all 7 sections)

## Context

Admin hiện chạy react-admin (Material UI) tại `/admin/*` — hoạt động đúng nhưng user muốn
quay lại giao diện custom đồng nhất với broker dashboard, đổi màu chủ đạo sang **đen-tím**,
và bổ sung các năng lực dashboard chuẩn (lọc, drill-down, heatmap, quick actions, thông báo,
xuất CSV, audit log). Broker chỉ nâng nhẹ: lọc thời gian + xuất CSV.

Quyết định của user:
1. **Bỏ hẳn react-admin** — dựng lại 4 màn quản lý bằng component custom, gỡ react-admin/MUI.
2. **Admin luôn tối, accent tím** — cố định, không đổi theo toggle sáng/tối của site.
3. Chức năng: lọc + drill-down, quick actions + thông báo, xuất CSV, audit log.
   Loại: drag&drop layout, scheduled email reports, xlsx/pdf (cần hạ tầng không có).
4. Broker: chỉ thêm date-range filter + xuất CSV tin của mình, giữ theme đỏ.

## 1. Kiến trúc (Phương án A — hồi sinh + tách module)

Khôi phục `AdminDashboard.jsx` cũ từ git (`a06e6dc^`, 593 dòng — có sẵn AdminSidebar,
BrokerTable, PropertyTable) làm khung, tách thành module nhỏ:

```
pages/admin/
  AdminDashboard.jsx    ← shell: sidebar + section routing (giữ hash /#/admin/*)
  OverviewSection.jsx   ← dashboard chính (KPI, charts, heatmap, filter bar)
  AccountsSection.jsx   ← bảng Tài khoản (giữ guard chặn khóa ADMIN)
  BrokersSection.jsx    ← bảng Môi giới + form cấp tài khoản
  PropertiesSection.jsx ← bảng Bài đăng + duyệt/ẩn; nhận filter từ drill-down
  ViewingsSection.jsx   ← bảng Lịch hẹn xem
  AuditLogSection.jsx   ← Nhật ký hoạt động (mới)
components/dashboard/
  DataTable.jsx         ← bảng dùng chung: search, sort, phân trang client, nút Xuất CSV
  DateRangeFilter.jsx   ← Hôm nay / 7 ngày / Tháng / Quý / Tùy chọn (from–to)
  NotificationBell.jsx  ← chuông + badge + dropdown, gom sự kiện từ dữ liệu thật
components/Charts.jsx   ← thêm HeatmapChart (phường × danh mục)
utils/exportCsv.js      ← CSV client-side, BOM UTF-8 cho Excel tiếng Việt
```

Xóa: `src/admin-ra/` toàn bộ. Routes `/#/admin/*` trỏ sang `pages/admin/AdminDashboard.jsx`
với section param (pattern giống `/#/broker/*`).

## 2. Theme đen-tím

Class `.admin-theme` bọc toàn khu admin, định nghĩa lại token semantic trong scope:

| Token | Giá trị admin |
|---|---|
| `--color-canvas` | `#141218` |
| `--color-surface-soft` | `#1e1a28` |
| `--color-surface-strong` | `#262130` |
| `--color-ink` | `#f2f0f7` |
| `--color-body` | `#d6d1e0` |
| `--color-muted` | `#a29bb8` |
| `--color-primary` | `#8b5cf6` (tím) |
| `--color-primary-active` | `#7c3aed` |
| `--color-hairline` | `#332d40` |
| shadow/chart | theo bộ dark hiện có |

Widget/chart hiện có tự đổi màu vì chỉ tham chiếu token — không sửa component.
Cố định tối bất kể `data-theme`. Cập nhật `design.md`: bỏ ngoại lệ MUI, thay bằng
ngoại lệ "admin dùng token đen-tím cố định qua `.admin-theme`".

## 3. Dashboard Tổng quan (theo wireframe maugddashboard.png)

- **Filter bar** trên cùng: DateRangeFilter + lọc phường + lọc danh mục → áp lên toàn bộ
  số liệu bên dưới (client-side trên data đã fetch).
- Hàng 1 — **4 KPI cards** có % thay đổi so kỳ trước (theo khoảng lọc): Bài đăng mới,
  Đang hiển thị, Môi giới, Lịch hẹn chờ.
- Hàng 2 — **LiveLineChart** "Hoạt động hệ thống" + **WardBarChart** (cột bấm được).
- Hàng 3 — **HeatmapChart** phường × danh mục (4×3, đậm nhạt theo số tin, dữ liệu thật)
  + Donut cơ cấu tài khoản + Gauge tỷ lệ hiển thị.
- Hàng 4 — Bài đăng mới + Tình trạng hệ thống (giữ nguyên, text-only không ảnh).
- **Quick actions** ở header: "＋ Cấp tài khoản môi giới", "Duyệt tin chờ (n)",
  "Xuất báo cáo tổng quan" (CSV số liệu KPI).
- **Drill-down**: click cột phường / ô heatmap → PropertiesSection với filter tương ứng
  qua hash param (`#/admin/properties?ward=...&category=...`).

## 4. Các màn quản lý

`DataTable` chung (search + sort + phân trang + Xuất CSV) dùng cho 4 bảng. Giữ nguyên
nghiệp vụ hiện có: khóa/mở khóa tài khoản (**giữ guard chặn dòng ADMIN** — port 3 test
từ `statusControls.test.jsx`), duyệt/ẩn/đổi trạng thái tin, xác nhận/hủy lịch hẹn,
cấp tài khoản môi giới.

## 5. Thông báo + Audit log

- **NotificationBell** (topbar admin): gom tin `PENDING`, lịch hẹn `PENDING`, tài khoản
  `LOCKED` từ data đã fetch; click item → nhảy section liên quan. Không cần backend mới.
- **AuditLogSection**: thêm `fetchAdminAuditLogs(token, params)` vào `api.js`.
  **Mock-mode-first**: backend đã có entity `AuditLog` + repository nhưng chưa có gì
  ghi log và chưa có REST endpoint (repository chưa được inject ở đâu) — nên lần này
  audit log chạy bằng mock data sinh từ mockData; nhánh real-API trả mảng rỗng kèm
  ghi chú UI "Backend chưa ghi nhật ký". Viết write-path + endpoint backend là việc
  của một vòng sau. Bảng lọc theo ngày + loại hành động.

## 6. Broker (nhẹ)

Giữ theme đỏ + bố cục hiện tại. Thêm: DateRangeFilter cho tab Tổng quan (lọc theo
`createdAt`), nút Xuất CSV danh sách tin của mình (tái dùng exportCsv).

## 7. Mock data + dọn dẹp

- MockData: thêm `createdAt` trải đều ~6 tháng, bổ sung lên ~20+ tin để filter/heatmap
  có dữ liệu nhìn được.
- Gỡ dependencies: `react-admin`, `ra-*`, `@mui/*` (+ emotion nếu không còn ai dùng).
- Xóa `src/admin-ra/`, port test guard sang component mới.

## Testing

- Vitest (TDD cho logic): exportCsv (escape, BOM, số/ngày), DateRangeFilter (tính khoảng
  ngày), buildHeatmapData, notification aggregation, admin lock guard (port), KPI
  delta theo kỳ trước.
- Smoke Playwright mock mode: đăng nhập admin → kiểm 6 section, filter, drill-down,
  notification, CSV download; broker → filter + export; screenshot cả light/dark site
  (admin phải luôn tối).

## Out of scope

Drag & drop widget layout, scheduled/email reports, xuất xlsx/pdf, realtime backend
(live chart vẫn mô phỏng random-walk), mọi thay đổi backend (kể cả write-path +
endpoint audit log — để vòng sau; mock mode là chính).
