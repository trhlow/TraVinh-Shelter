# Design: Broker dashboard revamp (bản đồ nhúng, chart theo ngày, thông báo, layout)

**Ngày**: 2026-07-15
**Phạm vi**: Frontend only (`frontend-react`). Không đổi backend — `attributes` vẫn là JSONB tự do,
chỉ đổi key nào frontend đọc/ghi bên trong đó.

## Bối cảnh

5 thay đổi độc lập trong khu vực broker, gộp chung 1 spec vì cùng phạm vi file
(`pages/BrokerDashboard.jsx`, `components/Charts.jsx`) và cùng release cùng lúc:

1. Thay `LocationPicker` (bản đồ Leaflet bấm chọn tọa độ, xây dựng 2026-07-14 — xem
   `2026-07-14-broker-location-picker-design.md`) bằng ô dán mã nhúng Google Maps.
2. Biểu đồ "Hoạt động môi giới theo tháng" đổi sang chia theo ngày trong tháng hiện tại.
3. Chuông thông báo broker không có dropdown/click-to-navigate như admin — thêm cho khớp.
4. Card "Loại hình BĐS đang quản lý" thu gọn, đổi chỗ với "Lịch hẹn sắp tới".

## 1. Bản đồ: dán mã nhúng Google Maps

### Quyết định (đã chốt qua trao đổi với broker)

- Bỏ hẳn tọa độ `lat`/`lng` khỏi data model — không giữ song song.
- Broker dán **nguyên đoạn `<iframe...>` Google đưa** (Chia sẻ → Nhúng bản đồ), không phải chỉ link
  `src`. Hệ thống tự bóc tách `src="..."` từ đoạn dán, chỉ lưu lại giá trị `src` (string) — không lưu
  nguyên HTML dán vào, để tránh XSS khi hiển thị lại cho người khác (admin, khách xem tin).
- Vì bỏ `lat`/`lng`, bản đồ ghim tất cả tin ở trang chủ (`PropertyMapSection.jsx`, Leaflet) không còn
  dữ liệu để hoạt động chính xác → gỡ bỏ hẳn section này khỏi trang chủ, cùng toàn bộ dependency
  Leaflet không còn nơi nào dùng.

### 1.1 Data model

`attributes.mapEmbedUrl`: string | null — giá trị `src` bóc tách từ iframe Google Maps dán vào. Thay
thế hoàn toàn `attributes.lat`/`attributes.lng` (xóa khỏi payload, không migration vì JSONB tự do).

### 1.2 Parse & validate mã nhúng dán vào

Hàm mới `extractGoogleMapsEmbedSrc(pastedHtml)` (thêm vào `BrokerDashboard.jsx`, cạnh các helper
form khác):

- Regex bóc `src="..."` hoặc `src='...'` đầu tiên tìm thấy trong chuỗi dán vào.
- Validate: `src` phải là URL hợp lệ (`new URL(...)` không throw) và hostname kết thúc bằng
  `google.com` (chấp nhận `www.google.com`, `maps.google.com`) — chặn dán link từ domain khác giả
  dạng iframe Google Maps.
- Không tìm thấy `src` hợp lệ → trả `null`, form hiện lỗi "Mã nhúng không hợp lệ — hãy dán nguyên đoạn
  từ Google Maps (Chia sẻ → Nhúng bản đồ)." qua field lỗi cạnh ô dán (không phải `setError` toàn
  trang, theo pattern `form-hint`/lỗi field hiện có).
- Có `src` hợp lệ → lưu vào `listingForm.mapEmbedUrl`, xóa lỗi, hiện preview `<iframe>` sống ngay dưới
  ô dán (dùng lại style `.property-map` đã có ở `PropertyDetailPage.jsx`, hoặc class mới nếu kích
  thước preview trong form cần nhỏ hơn).

### 1.3 Thay đổi trong `BrokerDashboard.jsx`

- `EMPTY_FORM`: bỏ `lat`, `lng`; thêm `mapEmbedUrl: ''`, `mapEmbedInput: ''` (state riêng cho nội dung
  đang gõ trong textarea — tách khỏi `mapEmbedUrl` đã parse, để giữ nguyên input người dùng gõ dở kể
  cả khi parse lỗi).
- `editListing()`: khi sửa tin có sẵn, chỉ có `property.mapEmbedUrl` (src đã bóc, không lưu HTML gốc
  broker dán — xem 1.2). Đồng bộ lại `mapEmbedInput` bằng chuỗi tổng hợp
  `<iframe src="${property.mapEmbedUrl}"></iframe>` — không giống hệt HTML Google gốc nhưng vẫn là
  iframe hợp lệ, `extractGoogleMapsEmbedSrc()` parse lại ra đúng `mapEmbedUrl` cũ, và preview hiển thị
  đúng như cũ. `mapEmbedUrl` set thẳng từ `property.mapEmbedUrl`. Bỏ `coordinateFormValue(property.lat/lng)`.
- `propertyPayload()`: bỏ `lat: coordinateOrNull(...)`, `lng: coordinateOrNull(...)`; thêm
  `mapEmbedUrl: form.mapEmbedUrl || null`.
- Bỏ helper `coordinateOrNull`, `coordinateFormValue` (chỉ dùng cho lat/lng, không còn nơi khác dùng).
- UI (thay đoạn `<LocationPicker>` dòng ~687-694):
  ```jsx
  <FormField label="Mã nhúng Google Maps" className="dashboard-listing-span2">
    <textarea
      className="input"
      rows={3}
      value={listingForm.mapEmbedInput}
      onChange={(event) => handleMapEmbedChange(event.target.value)}
      placeholder='Dán nguyên đoạn <iframe src="https://www.google.com/maps/embed?...">...'
    />
    {mapEmbedError && <p className="form-error">{mapEmbedError}</p>}
    {listingForm.mapEmbedUrl && (
      <iframe className="location-embed-preview" src={listingForm.mapEmbedUrl} title="Xem trước vị trí" loading="lazy" />
    )}
    <p className="form-hint">Trên Google Maps: bấm Chia sẻ → Nhúng bản đồ → Sao chép HTML, dán nguyên vào đây.</p>
  </FormField>
  ```

### 1.4 Hiển thị (`PropertyDetailPage.jsx`)

- `PropertyMap` nhận thẳng `embedUrl` thay vì `lat`/`lng`, bỏ hết logic build URL (`VITE_GOOGLE_MAPS_EMBED_API_KEY`
  không còn dùng ở đây nữa — property giờ tự mang link riêng).
- Điều kiện render (dòng 144, 296): `hasMapEmbed = Boolean(property.mapEmbedUrl)` thay
  `hasValidCoordinates(property.lat, property.lng)`. Ẩn cả section "Vị trí trên bản đồ" nếu không có.
- Xóa hàm `hasValidCoordinates`.

### 1.5 `services/api.js`

- `normalizeProperty()`: bỏ `lat: numericCoordinate(...)`, `lng: numericCoordinate(...)`; thêm
  `mapEmbedUrl: attributes.mapEmbedUrl || null`.
- Xóa hàm `numericCoordinate` (chỉ dùng cho lat/lng).

### 1.6 Dọn dẹp (xóa hẳn, không còn nơi nào dùng sau thay đổi trên)

- `components/broker/LocationPicker.jsx` + `LocationPicker.test.jsx`
- `components/home/PropertyMapSection.jsx` + `PropertyMapSection.test.jsx`
- `utils/mapConstants.js`, `utils/mapMarkerIcon.js`
- Import `PropertyMapSection` + JSX `<PropertyMapSection properties={mapProperties} />` khỏi
  `HomePage.jsx` (và biến `mapProperties` nếu chỉ dùng cho việc này — kiểm tra lại khi implement)
- Assertion liên quan bản đồ trang chủ trong `HomePage.test.jsx`
- Dependency `leaflet`, `react-leaflet` khỏi `package.json` + import CSS Leaflet trong `main.jsx`
- CSS `.location-picker`, `.location-picker-search`, `.home-map*` không còn dùng trong
  `styles/dashboard.css`/`styles/home.css` (rà lại khi implement, chỉ xóa rule thật sự không còn
  reference)

### Out of scope

- Không validate mã nhúng dán vào có đúng thật sự trỏ tới Trà Vinh hay không (broker tự chịu trách
  nhiệm dán đúng địa chỉ, giống hệt cách họ tự chọn điểm trên bản đồ trước đây).
- Không thêm preview địa chỉ text từ mã nhúng (Google embed URL không có địa chỉ dạng đọc được, chỉ có
  toạ độ mã hoá `pb=`).
- Backend: không đổi gì — `attributes` JSONB nhận key mới `mapEmbedUrl` như mọi key khác.

## 2. Biểu đồ theo ngày

**Quyết định**: chia theo từng ngày của **tháng dương lịch hiện tại** (ngày 1 → hôm nay/cuối tháng),
không phải cửa sổ trượt 30 ngày — khớp với tiêu đề "Tháng X" đang hiển thị phía trên biểu đồ.

### Thay đổi trong `BrokerDashboard.jsx`

- Xóa `buildActivitySeries()`, `rollingMonthBuckets()`, `sameMonth()` (chỉ dùng cho bucket theo
  tháng).
- Hàm mới `buildDailyActivitySeries(listings, viewings, referenceDate = new Date())`:
  - Bucket mỗi ngày trong tháng của `referenceDate` (dùng lại pattern ngày-trong-tháng của
    `buildMonthlySeries()` ở `Charts.jsx` — copy logic tính `daysInMonth`/`dayKey`, không import trực
    tiếp `buildMonthlySeries` vì nó chỉ nhận 1 mảng item/1 `getDate`, còn ở đây cần gộp 2 nguồn dữ
    liệu khác nhau vào `current`/`previous` như `buildActivitySeries` cũ).
  - `current` = số tin đăng có `createdAt` rơi vào ngày đó.
  - `previous` = số lịch hẹn có `status === 'CONFIRMED'` và `requestedAt`/`createdAt` rơi vào ngày đó.
  - Label mỗi bucket: số ngày trong tháng (`'1'`, `'2'`, ... `'31'`) — khớp trục X của
    `TrendBarLineChart` hiện tại (đang là `'T1'`..`'T12'`).
  - Áp dụng `trimLeadingEmptyMonths`-tương-tự? **Không** — giữ đủ toàn bộ ngày trong tháng kể cả chưa
    tới (đọc thẳng theo yêu cầu "biểu đồ theo ngày" của broker, không cắt bớt như bucket tháng cũ vốn
    cắt tháng chưa có dữ liệu ở đầu dãy 12 tháng).
- `activityChartData = useMemo(() => buildDailyActivitySeries(listings, viewings), [listings, viewings])`.
- Đổi tiêu đề `TrendBarLineChart`: `"Hoạt động môi giới theo tháng"` → `"Hoạt động môi giới theo ngày"`,
  subtitle: `"Số bài đăng mới và lịch hẹn đã xác nhận theo từng ngày trong tháng ${activityMonthLabel}"`.

### Không đổi

- `activityMonthLabel`, `dashboard-period-chip` ("Tháng X") — vẫn đúng ngữ cảnh vì chart giờ hiển thị
  chi tiết theo ngày *trong* tháng đó.
- `TrendBarLineChart` component (`Charts.jsx`) — không cần sửa, đã nhận `data` dạng
  `[{label, current, previous}]` bất kể đơn vị bucket là tháng hay ngày.

## 3. Thông báo broker (parity với admin)

### Thay đổi

- File mới `utils/brokerNotifications.js`:
  ```js
  export function buildBrokerNotifications({ listings = [], viewings = [] }) {
    const items = [];
    const pendingListings = listings.filter((l) => isPendingListing(l)).length; // reuse logic tương đương BrokerDashboard.isPendingListing
    const pendingViewings = viewings.filter((v) => v.status === 'PENDING').length;
    if (pendingListings > 0) {
      items.push({ id: 'pending-listings', icon: 'Clock', text: `${pendingListings} tin chờ duyệt`, href: '#/broker/properties', tone: 'warning' });
    }
    if (pendingViewings > 0) {
      items.push({ id: 'pending-viewings', icon: 'Calendar', text: `${pendingViewings} lịch hẹn chờ xác nhận`, href: '#/broker/viewings', tone: 'warning' });
    }
    return items;
  }
  ```
  (`isPendingListing` hiện là hàm nội bộ không export trong `BrokerDashboard.jsx` — export nó ra để
  dùng chung, tránh trùng logic.)
- `BrokerDashboard.jsx`: import `NotificationBell` (`components/dashboard/NotificationBell.jsx`, đã
  dùng ở admin, không đổi component này) + `buildBrokerNotifications`. Thay khối nút chuông tĩnh
  (dòng ~456-460) bằng:
  ```jsx
  <NotificationBell notifications={brokerNotifications} />
  ```
  với `brokerNotifications = useMemo(() => buildBrokerNotifications({ listings, viewings }), [listings, viewings])`.
- Bỏ `dashboard-icon-dot` thủ công hiện tại (badge số lượng đã có sẵn trong `NotificationBell`).

## 4+5. Đổi chỗ card "Loại hình BĐS" ↔ "Lịch hẹn sắp tới"

**Quyết định** (đã xác nhận qua preview ASCII): swap vị trí, không xóa card nào.

### Thay đổi trong `BrokerDashboard.jsx` (JSX, khối `section === 'dashboard'`)

- Đổi `className` của row đang chứa `TrendBarLineChart` + `ThreeDDonutChart` từ `dashboard-live-row`
  sang `dashboard-charts-row` (grid 3 cột đã có sẵn, đúng pattern cần: 1 phần tử rộng + 1 phần tử hẹp).
- Row A (trend + viewings):
  ```jsx
  <div className="dashboard-charts-row">
    <div className="dashboard-chart-span-2">
      <TrendBarLineChart title="Hoạt động môi giới theo ngày" ... />
    </div>
    <DashboardPanel title="Lịch hẹn sắp tới" count={...}>
      <UpcomingViewingsSummary viewings={upcomingViewings} loading={viewingsLoading} />
    </DashboardPanel>
  </div>
  ```
- Row B (ward + donut, thế chỗ viewings cũ):
  ```jsx
  <div className="dashboard-charts-row">
    <div className="dashboard-chart-span-2">
      <WardBarChart title="Tin đăng theo phường" data={wardChart} />
    </div>
    <ThreeDDonutChart
      title="Loại hình BĐS đang quản lý"
      subtitle="Trọ, nhà và đất đang quản lý"
      data={managedTypeData}
      centerLabel="tin"
      compact
    />
  </div>
  ```
- `dashboard-live-row` CSS (`styles.css:1526-1531`) — kiểm tra không còn nơi nào dùng class này sau
  thay đổi, xóa rule nếu đúng vậy (rà lại lúc implement, tránh xóa nhầm nếu còn chỗ khác tham chiếu).

### `ThreeDDonutChart` — prop `compact` mới (`components/Charts.jsx`)

- Thêm `compact = false` vào signature, mặc định `false` — không đổi hành vi ở
  `admin/ReportsSection.jsx` (không truyền prop này).
- Khi `compact`, thêm class `chart3d-donut-layout--compact` lên wrapper `chart3d-donut-layout`.
- CSS mới (`styles/dashboard.css`, cạnh rule `.chart3d-donut-layout` dòng ~76-81):
  ```css
  .chart3d-donut-layout--compact {
    grid-template-columns: 1fr; /* xếp dọc: donut trên, legend dưới, thay vì 2 cột ngang */
  }
  .chart3d-donut-layout--compact .chart3d-donut {
    width: min(140px, 100%); /* nhỏ hơn mặc định 230px, vừa cột hẹp trong dashboard-chart-span-2 3-col grid */
    margin: 8px auto 16px;
  }
  ```
  (Giá trị cụ thể tinh chỉnh lúc implement dựa trên preview thực tế, miễn giữ đúng ý: donut nhỏ lại,
  xếp dọc trong cột hẹp — không tràn/vỡ layout.)

## Test plan (tổng hợp, chi tiết hoá lúc viết plan)

- `BrokerDashboard.listingForm.test.jsx`: cập nhật test hiện có liên quan `lat`/`lng` sang
  `mapEmbedUrl` — dán mã nhúng hợp lệ → preview hiện, payload có `mapEmbedUrl`; dán mã không hợp lệ →
  báo lỗi field, không set `mapEmbedUrl`; sửa tin có sẵn `mapEmbedUrl` → textarea hiện chuỗi
  `<iframe src="...">` tổng hợp lại từ `mapEmbedUrl` đã lưu (đúng theo 2.1 mục "Data model" bản sửa ở
  `editListing()`), preview hiện đúng link cũ.
- Test mới cho `buildDailyActivitySeries` (đơn vị hoặc trong file `BrokerDashboard` test) — số ngày
  đúng bằng số ngày trong tháng hiện tại, `current`/`previous` đúng theo ngày.
- Test mới `utils/brokerNotifications.test.js` — cùng pattern `adminNotifications.test.js`.
- Cập nhật `PropertyMapSection.test.jsx`/`HomePage.test.jsx`, `LocationPicker.test.jsx` bị xóa cùng
  component.
- Snapshot/behavior test cho swap layout nếu `BrokerDashboard` test hiện có assert thứ tự card (kiểm
  tra lúc implement).

## Không đổi / Out of scope

- Backend Java — không cần thay đổi gì, `attributes` JSONB nhận key mới tự do.
- `WardBarChart`, `TrendBarLineChart`, `NotificationBell` component logic gốc — chỉ tái sử dụng, không
  sửa hành vi lõi (trừ prop `compact` mới thêm cho `ThreeDDonutChart`, không phá API cũ).
- Không thêm tính năng "chọn khoảng ngày tuỳ ý" cho biểu đồ hoạt động — cố định theo tháng dương lịch
  hiện tại như phần 2 đã chốt.
