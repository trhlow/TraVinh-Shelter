# Design: Bản đồ chọn vị trí trong form đăng tin (Broker)

**Ngày**: 2026-07-14
**Phạm vi**: Frontend only (`frontend-react`). Không đổi backend, không đổi format lưu trữ
(`attributes.lat`/`attributes.lng` vẫn là số thập phân, decimal degrees).

## Bối cảnh

Form đăng tin của broker (`pages/BrokerDashboard.jsx`) hiện có 2 ô nhập số thuần (`type="number"`)
cho `lat`/`lng` (dòng ~686-692), kèm hướng dẫn "Nhấn giữ trên ứng dụng Google Maps để lấy tọa độ".
Broker phải tự đọc tọa độ trên Google Maps (thường ở dạng độ-phút-giây, VD `9°55'40.2"N
106°20'21.0"E`) rồi tự quy đổi sang số thập phân bằng tay để gõ vào form — bước quy đổi này sai
nhiều lần, dẫn đến bản đồ trang chủ (`PropertyMapSection.jsx`, Leaflet) và bản đồ trang chi tiết
(`PropertyDetailPage.jsx`, Google Maps iframe embed) hiển thị sai vị trí thực tế so với BĐS.

Cả hai nơi hiển thị đều đã đọc đúng `property.lat`/`property.lng` dạng decimal degrees — không cần
đổi gì ở tầng hiển thị hay backend. Vấn đề chỉ nằm ở khâu **nhập liệu**: thay thế 2 ô số thủ công
bằng một bản đồ tương tác để broker bấm trực tiếp vào đúng vị trí thực tế, loại bỏ hoàn toàn bước quy
đổi tay.

## Data model (không đổi)

`attributes.lat` / `attributes.lng`: number, decimal degrees, validate qua `coordinateOrNull(value,
-90, 90)` / `coordinateOrNull(value, -180, 180)` đã có sẵn (`BrokerDashboard.jsx:1141`). Không cần
migration, không đổi DTO backend.

## 1. Component mới: `components/broker/LocationPicker.jsx`

Dùng `react-leaflet` + `leaflet` (đã là dependency, đang dùng ở `PropertyMapSection.jsx`).

Props:
```
{
  lat: number | null,      // giá trị hiện tại trong form (đã parse từ string qua numericOrNull)
  lng: number | null,
  onChange: (lat: number, lng: number) => void,
}
```

Hành vi nội bộ:

- **Center ban đầu**: nếu `lat`/`lng` hợp lệ (không null) → dùng làm center + đặt marker sẵn ở đó.
  Nếu không (tạo tin mới, chưa có tọa độ) → center mặc định `TRA_VINH_CENTER = [9.9347, 106.3453]`
  (hằng số dùng chung, tách ra `utils/mapConstants.js` để dùng lại ở cả `PropertyMapSection.jsx` và
  component mới — tránh lặp giá trị), zoom 13, chưa có marker.
- **Click vào bản đồ** (Leaflet `useMapEvents({ click })`): đặt/di chuyển marker tới điểm bấm, gọi
  `onChange(lat, lng)` với tọa độ chính xác từ sự kiện click — không làm tròn, không quy đổi qua bước
  trung gian nào.
- **Ô tìm địa chỉ** (phía trên bản đồ, input text + nút tìm hoặc submit-on-enter):
  - Gọi Nominatim (OpenStreetMap geocoding, free, không cần API key), `viewbox` là bbox tỉnh Trà Vinh
    (west, north, east, south — nới rộng hơn ranh giới hành chính một chút để không loại kết quả biên):
    ```
    https://nominatim.openstreetmap.org/search?format=json&q=<query>&viewbox=105.8,10.15,106.8,9.4&bounded=1&limit=1
    ```
  - Debounce 500ms, chỉ gọi khi người dùng ngừng gõ hoặc bấm nút/Enter.
  - Kết quả trả về `{ lat, lon }` → `setView` bản đồ tới đó (zoom 15), **không** tự đặt marker và
    **không** tự gọi `onChange` — đây chỉ là bước "bay tới khu vực gần đúng", vị trí chính xác vẫn
    phải do broker tự bấm xác nhận trên bản đồ (đúng với mục tiêu spec: loại bỏ sai số, không
    thêm nguồn sai số mới từ geocoding).
  - Không có kết quả hoặc lỗi mạng: hiện dòng chữ nhỏ "Không tìm thấy địa chỉ này" dưới ô tìm kiếm,
    không chặn thao tác bấm bản đồ trực tiếp.
- **Dòng hiển thị tọa độ đã chọn**: text nhỏ, chỉ đọc, dạng `Đã chọn: 9.927833, 106.339167` (6 chữ số
  thập phân — đủ chính xác tới ~11cm). Ẩn khi chưa có marker (`lat`/`lng` đều null).

Marker icon: dùng lại `arrowMarkerIcon()` pattern từ `PropertyMapSection.jsx` (tách hàm này ra
`utils/mapMarkerIcon.js` để dùng chung, tránh copy code).

## 2. Thay đổi trong `BrokerDashboard.jsx`

### 2.1 Thay thế UI (dòng ~686-692)

Xoá 2 `<input type="number">` cho lat/lng. Thay bằng:

```jsx
<FormField label="Vị trí trên bản đồ" className="dashboard-listing-span2">
  <LocationPicker
    lat={numericOrNull(listingForm.lat)}
    lng={numericOrNull(listingForm.lng)}
    onChange={(lat, lng) => setListingForm((current) => ({ ...current, lat: String(lat), lng: String(lng) }))}
  />
  <p className="form-hint">Bấm vào bản đồ để chọn đúng vị trí thực tế của bất động sản.</p>
</FormField>
```

`listingForm.lat`/`listingForm.lng` **vẫn giữ nguyên kiểu string** trong state (đúng pattern hiện tại
của mọi field số trong form này) — chỉ đổi cách chúng được set (từ gõ tay số → từ bấm bản đồ).
`propertyPayload()` (dòng ~1101-1102) không đổi gì, vẫn gọi `coordinateOrNull(form.lat, -90, 90)` như
cũ.

### 2.2 `editListing()` (dòng ~363-391)

Không đổi — `lat`/`lng` đã được set qua `coordinateFormValue(property.lat)` sẵn có, `LocationPicker`
tự đọc từ `listingForm.lat`/`listingForm.lng` qua props như mọi field khác.

### 2.3 Reset form khi tạo tin mới

Không đổi — `EMPTY_FORM.lat = ''`, `EMPTY_FORM.lng = ''` khiến `numericOrNull('') === null` →
`LocationPicker` nhận `lat={null} lng={null}` → tự fallback về `TRA_VINH_CENTER`, không cần logic mới.

## 3. CSS

Thêm class `.location-picker` (kích thước tương tự `.home-map` ở `styles/home.css:415`, nhưng nhỏ
hơn — cao ~320px thay vì full section) và `.location-picker-search` (input tìm kiếm dạng pill, tái
dùng token `--radius-full`, `--color-hairline` theo `design.md`) vào `styles/dashboard.css`. Không
hard-code hex, không inline style — đúng `workflow.md`.

## 4. Test

### 4.1 `components/broker/LocationPicker.test.jsx` (file mới)

- Không truyền `lat`/`lng` (null) → map center mặc định Trà Vinh, không render marker.
- Truyền `lat`/`lng` hợp lệ → map center đúng tọa độ đó, marker hiển thị tại vị trí đó.
- Simulate click trên map → `onChange` được gọi đúng 1 lần với `(lat, lng)` khớp toạ độ click.
- Nhập text vào ô tìm địa chỉ, mock `fetch` trả kết quả Nominatim hợp lệ → map `setView` tới toạ độ
  kết quả; `onChange` **không** được gọi (chỉ bay tới khu vực, không tự đặt vị trí).
- Mock `fetch` trả rỗng/lỗi → hiện thông báo "Không tìm thấy địa chỉ này".

### 4.2 `pages/BrokerDashboard.listingForm.test.jsx` (bổ sung vào file đã có)

- Mở form tạo tin mới → `LocationPicker` nhận `lat={null} lng={null}`.
- Sửa tin có sẵn toạ độ → `LocationPicker` nhận đúng `lat`/`lng` đã lưu (không phải Trà Vinh mặc định).
- Simulate `onChange(9.927833, 106.339167)` từ `LocationPicker` → submit → payload
  `attributes.lat === 9.927833`, `attributes.lng === 106.339167` (đúng số, không lệch do làm tròn
  string).

## 5. Không đổi

- `components/home/PropertyMapSection.jsx`, `pages/PropertyDetailPage.jsx` — đã đọc đúng
  `property.lat`/`property.lng` decimal degrees, không cần sửa gì.
- `services/api.js` (`normalizeProperty`) — không đổi.
- Backend (`backend-springboot`) — `attributes.lat`/`lng` vẫn passthrough JSONB, không cần
  migration/DTO mới.
- Validate range (`coordinateOrNull(-90..90, -180..180)`) — giữ nguyên, chỉ khác nguồn gốc giá trị
  đầu vào (từ marker thay vì gõ tay).

## Out of scope

- Reverse geocoding (hiển thị địa chỉ text từ toạ độ đã chọn).
- Cho phép gõ tay toạ độ song song với bản đồ (đã quyết định bỏ hẳn 2 ô input số).
- Đổi provider bản đồ trang chi tiết (vẫn Google Maps iframe embed) hay trang chủ (vẫn Leaflet/OSM) —
  chỉ đổi input, không đổi output.
- Giới hạn vùng chọn trong ranh giới Trà Vinh (broker vẫn có thể bấm ra ngoài tỉnh nếu muốn — không
  chặn, chỉ có `viewbox` gợi ý cho tìm kiếm).
