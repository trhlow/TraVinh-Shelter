# Nhóm 3 — Bỏ toàn bộ dữ liệu giả ở broker dashboard (Lượt xem, Leads, Phễu chuyển đổi) — Design

**Ngày**: 2026-07-10
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Đợt thứ ba (lớn nhất) trong danh sách 15 mục lớn user cung cấp, sau khi Nhóm 1 và Nhóm 2 đã hoàn
tất (HEAD `0329f8d`). Bỏ hẳn mọi số liệu bịa ở broker dashboard: "Lượt xem trong tuần", "Leads mới", "Khách
hàng tiềm năng", "Phễu chuyển đổi khách hàng" — theo đúng quyết định đã chốt trước đó ("Bỏ hẳn, thay bằng
trạng thái trung thực", không chỉ đổi nhãn thành "ước tính"). Cũng hoàn thành item còn dang dở từ danh sách
15 mục *gốc* ("Nhóm C: redesign Phễu chuyển đổi khách hàng").

## Bối cảnh

Investigation (đọc trực tiếp code, không đoán) xác nhận phạm vi thật sự lớn hơn 4 số liệu ban đầu:

- `listingViews(listing)` (`BrokerDashboard.jsx:1126`) = `max(32, title.length * 3)` — công thức từ độ dài
  chuỗi tiêu đề, không có bảng/cột/event theo dõi lượt xem thật nào tồn tại trong toàn bộ codebase.
- `listingContacts(listing)` (`BrokerDashboard.jsx:1130`) = `max(1, round(listingViews/18))` — suy ra từ số
  lượt xem giả ở trên.
- `leads`/`pendingLeads` = `listings.length * 2` — bịa ở **cả 2 nơi**: `api.js:116` (đường real backend,
  tính phía client dù đang gọi API thật) và `mockData.js:286` (hardcode `pendingLeads: 7`).
- 4 nơi hiển thị số liệu bịa này (nhiều hơn phạm vi ban đầu nêu):
  1. StatCard "Lượt xem trong tuần" (`BrokerDashboard.jsx:498`).
  2. StatCard "Leads mới" (`BrokerDashboard.jsx:499`).
  3. Bảng `RecentListings` (preview 4 tin ở trang tổng quan) — 2 cột "Lượt xem"/"Liên hệ" (dòng 918-919,
     937-938).
  4. `ListingRow` (trang "Tin đăng của tôi" đầy đủ) — dòng meta `{listingViews(listing)} lượt xem` (dòng 1037).
  5. Toàn bộ trang "Khách hàng tiềm năng" (`section === 'leads'`, dòng 793-804): `ThreeDFunnelChart` "Phễu
     khách hàng tiềm năng" (4 tầng, chỉ 1 tầng có chạm dữ liệu thật — `viewings.length`, và ngay cả tầng đó
     cũng bị trộn `Math.max(viewingCount, 0.42*fakeLeads)`, không thuần thật) + `LeadPreview` (liệt kê lại
     chính tin đăng của broker, gắn nhãn giả làm "lead cần xử lý").
- `mockData.js:287`'s `conversion: '22%'` — field chết, không được đọc ở đâu cả trong toàn bộ `src/`.
- Tầng "Chốt giao dịch" của phễu bịa 18% số lead giả, trong khi dữ liệu thật (property status SOLD/RENTED)
  đã tồn tại và đã được dùng đúng mục đích này ở nơi khác (`ReportsSection.jsx`'s `buildBrokerRows`).

## Quyết định (đã chốt qua trao đổi)

- Bỏ hẳn trang "Khách hàng tiềm năng" (sidebar tab, route, phễu, `LeadPreview`) — dữ liệu thật duy nhất của
  trang này (lịch hẹn xem) đã có tab riêng "Lịch hẹn" rồi, không cần dựng lại phễu bằng dữ liệu thật thay thế.
- Bỏ 2 stat card giả khỏi hàng 4 ô ở trang tổng quan broker — hàng thu nhỏ lại `grid-4` → `grid-2` (2 ô thật
  còn lại: "Tin đăng đang hoạt động", "Lịch hẹn xác nhận tháng này"), không thêm số liệu mới thay thế.
- Bỏ 2 cột/dòng lượt xem-liên hệ giả ở mọi bảng liệt kê tin đăng — không có dữ liệu thật thay thế ở mức độ
  từng tin đăng (cần hệ thống theo dõi lượt xem thật, ngoài phạm vi đợt này).
- Bỏ dữ liệu bịa từ gốc (backend-call layer + mock data), không chỉ ở tầng UI — theo đúng tiền lệ đã áp dụng
  khi bỏ Zalo trước đó trong session này.

## Thay đổi

### 1. Bỏ hẳn trang "Khách hàng tiềm năng"

`frontend-react/src/pages/BrokerDashboard.jsx`:
- Xoá `{ href: '#/broker/leads', icon: 'Users', label: 'Khách hàng tiềm năng' }` khỏi `BROKER_SIDEBAR_ITEMS`.
- Xoá khối `{section === 'leads' && (...)}` (dòng 793-804, chứa `ThreeDFunnelChart` + `LeadPreview`).
- Xoá function `LeadPreview` (dòng 977-998) và `buildLeadFunnelData` (dòng 1189-1197) — cả 2 chỉ được gọi
  từ khối vừa xoá.
- Xoá memo `leadFunnelData` (dòng 195).
- Xoá key `leads` khỏi `brokerTitle()` (dòng 1267) và `brokerSubtitle()` (dòng 1277).

`frontend-react/src/routes/index.jsx`: xoá function `BrokerLeadsRoute` và entry `'/broker/leads':
BrokerLeadsRoute`.

`frontend-react/src/components/Charts.jsx`: xoá `ThreeDFunnelChart` (dòng 203-230) — sau khi xoá trang trên,
đây là nơi gọi component này duy nhất trong toàn bộ codebase.

`frontend-react/src/styles/dashboard.css`: xoá các rule CSS dành riêng cho `ThreeDFunnelChart` (`.chart3d-funnel`,
`.chart3d-funnel-row`, `.chart3d-funnel-segment`, `.chart3d-panel.is-3d .chart3d-funnel-segment::after`,
`.chart3d-funnel-label`, `.chart3d-funnel-value` — dòng 130-182 khu vực đó) — đã xác nhận không class nào
trong nhóm này được dùng bởi component khác.

**Lưu ý quan trọng, KHÔNG xoá**: `.dashboard-broker-list`/`.dashboard-broker-row` (dùng bởi `LeadPreview`,
`styles.css:2167-2182`) — 2 class này **dùng chung** với `ReportsSection.jsx`'s "Danh sách môi giới" panel
(admin). Chỉ xoá JSX của `LeadPreview` (nơi dùng những class này ở broker dashboard), giữ nguyên định nghĩa
CSS vì admin vẫn cần.

### 2. Bỏ 2 stat card giả ở trang tổng quan broker

`frontend-react/src/pages/BrokerDashboard.jsx`:
- Xoá 2 `<StatCard icon="Eye" title="Lượt xem trong tuần" .../>` và `<StatCard icon="Users" title="Leads mới" .../>`
  (dòng 498-499). Đổi `className="grid-4 dashboard-stats-row"` (dòng 496) → `"grid-2 dashboard-stats-row"`.
- Xoá khỏi `dashboardStats` memo (dòng 141-157): `estimatedViews` (dòng 149, 154) và `leads` (dòng 155).
- Xoá memo `totalListingsDelta` (dòng 166) và `leadsDelta` (dòng 170-172) — cả 2 chỉ được đọc bởi 2 StatCard
  vừa xoá.
- Xoá memo `totalListingsSparkline` (dòng 174-177) — chỉ được đọc bởi 2 StatCard vừa xoá (đã xác nhận qua
  grep, không nơi nào khác dùng).
- **Giữ nguyên** `activeListingsDelta`/`activeListingsSparkline` — vẫn được StatCard "Tin đăng đang hoạt
  động" (thật) sử dụng.

### 3. Bỏ số liệu lượt xem/liên hệ giả theo từng tin đăng

`frontend-react/src/pages/BrokerDashboard.jsx`:
- Xoá function `listingViews` (dòng 1126-1128) và `listingContacts` (dòng 1130-1132) — sau các thay đổi
  trên, đây là 2 hàm không còn ai gọi.
- `RecentListings` (dòng 907-...): xoá 2 cột `<th>Lượt xem</th>`/`<th>Liên hệ</th>` và 2 `<td>` tương ứng
  (dòng 918-919, 937-938) — bảng còn lại 4 cột: Bất động sản/Loại/Trạng thái/Thao tác.
- `ListingRow` (dòng 1021-1061): xoá dòng `<span>{listingViews(listing)} lượt xem</span>` (dòng 1037) khỏi
  `.dashboard-listing-meta` — chỉ còn `<span>{listing.area || 0}m²</span>`.

### 4. Bỏ dữ liệu bịa từ gốc (backend-call layer + mock)

`frontend-react/src/services/api.js`: `fetchBrokerDashboard`'s nhánh real-backend (dòng 107-119) xoá dòng
`pendingLeads: Math.max(0, listings.length * 2),` khỏi object trả về.

`frontend-react/src/services/mockData.js`: `BROKER_DASHBOARD` (dòng 284-288) xoá `pendingLeads: 7,` và
`conversion: '22%',` (field chết, không đọc ở đâu).

`frontend-react/src/pages/BrokerDashboard.jsx`: `stats` state khởi tạo (dòng 65) xoá `pendingLeads: 0` khỏi
object mặc định.

## Testing

- Frontend: `cd frontend-react && npm test -- --run` — baseline trước Nhóm 3: 160/160.
- Không có test hiện có nào assert theo tên "leads"/"Khách hàng tiềm năng"/"Lượt xem trong tuần"/"Leads
  mới"/`ThreeDFunnelChart`/`listingViews`/`listingContacts` — đã grep xác nhận (chỉ có `Charts.jsx`,
  `BrokerDashboard.jsx`, `routes/index.jsx` chứa các tên này, không file test nào). Riêng
  `BrokerDashboard.filter.test.jsx:15` có 1 dòng fixture `pendingLeads: 3` mô phỏng response cũ — dòng này
  trở thành field thừa vô hại (không còn ai đọc `.pendingLeads` từ `stats` sau thay đổi mục 4) nhưng nên xoá
  luôn cho khớp shape response thật mới, tránh gây hiểu lầm cho người đọc test sau này.
- Test mới cần có: xác nhận sidebar broker không còn mục "Khách hàng tiềm năng", route `/broker/leads`
  không còn tồn tại (theo đúng pattern đã dùng khi xoá "Tin nhắn" ở Nhóm 1); xác nhận hàng stat-card tổng
  quan chỉ còn đúng 2 ô; xác nhận bảng "Tin đăng gần đây" không còn cột Lượt xem/Liên hệ.

## Ngoài phạm vi

- Không xây dựng lại phễu bằng dữ liệu thật (quyết định đã chốt: bỏ hẳn trang, không redesign).
- Không thêm hệ thống theo dõi lượt xem/liên hệ thật (cần tracking mới ở backend, ngoài phạm vi đợt này).
- Không đụng `.dashboard-broker-list`/`.dashboard-broker-row` CSS (dùng chung với admin `ReportsSection.jsx`).
- Không đụng dark-mode admin theme hay banner trang chủ — thuộc Nhóm 4.
