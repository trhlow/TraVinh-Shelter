# Design: Quản lý danh sách phòng trống trong form đăng tin (Broker)

**Ngày**: 2026-07-12
**Phạm vi**: Frontend only (`frontend-react`). Không đổi backend — sẽ được devnguyen implement,
devlong chỉ viết spec này (theo phân chia scope trong `.claude/CLAUDE.md`).

## Bối cảnh

Khi broker đăng nhà trọ, họ thường quản lý **nguyên một dãy nhiều phòng** (VD: dãy trọ 8 phòng, đang
trống 5 phòng). Hiện tại hệ thống buộc họ đăng từng phòng thành từng tin riêng lẻ, thay vì đăng 1 tin
"dãy trọ" và liệt kê bên trong tin đó phòng nào còn trống, phòng nào đã thuê.

Phần **hiển thị** cho use case này đã tồn tại sẵn và hoạt động đúng — chỉ thiếu phần **nhập liệu**:

- Backend: `Property.attributes` là JSONB tự do (`Map<String, Object>`), được
  `PropertyService.normalizeAttributes()` truyền qua nguyên vẹn, không có schema cố định. Một key
  `rooms` (mảng object) đã đi qua được đường này mà **không cần đổi gì ở backend**.
- Frontend đọc: `normalizeProperty()` (`services/api.js:391`) map `attributes.rooms` →
  `property.rooms`.
- Frontend hiển thị: `components/property/RoomList.jsx` (danh sách phòng ở trang chi tiết),
  `components/TroShowcaseCard.jsx` (badge "Còn N phòng trống" + khoảng giá ở card trang chủ/search).
  Cả hai đều đã đọc đúng shape `{ label, price, available }` — xem mock data mẫu ở
  `services/mockData.js:167` (`p-tro-thanh-truc`) và `:213` (`p-tro-hoa-thuan`).
- **Thiếu duy nhất**: form đăng tin của broker (`pages/BrokerDashboard.jsx`, section `properties`)
  không có UI nào để nhập/sửa `rooms` — broker không có cách nào tạo ra dữ liệu này qua sản phẩm thật,
  chỉ tồn tại trong mock data.

Spec này định nghĩa UI nhập liệu còn thiếu đó.

## Data model (không đổi — dùng lại nguyên trạng)

```
attributes.rooms: [
  { label: string, price: number, available: boolean },
  ...
]
```

Không cần migration, không cần đổi DTO backend (`CreatePropertyRequest`/`UpdatePropertyRequest`/
`PropertyResponse` đều nhận `attributes` dạng `Map<String, Object>` tự do).

## 1. Áp dụng khi nào

Chỉ khi `categorySlug === 'tro'` — khớp với điều kiện hiển thị hiện có (`isTro` check trong
`PropertyDetailPage.jsx`, `TroShowcaseCard.jsx` chỉ render dòng "Còn N phòng trống" khi
`property.rooms.length > 0`). Nhà và Đất không có khái niệm nhiều phòng nhỏ cho thuê riêng lẻ, không
áp dụng section này.

## 2. Form state (`BrokerDashboard.jsx`)

- `EMPTY_FORM` (dòng ~37) thêm field: `rooms: []`.
- `editListing(property)` (dòng ~357) prefill khi sửa tin có sẵn:
  ```js
  rooms: Array.isArray(property.rooms)
    ? property.rooms.map(r => ({ label: r.label, price: String(r.price ?? ''), available: r.available !== false }))
    : [],
  ```

## 3. UI

Đặt section mới ngay dưới nhóm field "Phòng ngủ"/"Phòng tắm" hiện có (dòng ~657-664), trong
`dashboard-listing-grid`, chỉ render khi `listingForm.categorySlug === 'tro'`, span đủ chiều rộng
(dùng class `dashboard-listing-span2` sẵn có trong file).

### 3.1 Thanh "Thêm nhanh N phòng"

3 input nhỏ inline + 1 nút:
- Số lượng (`type="number"`, `min="1"`, mặc định 1)
- Tiền tố tên phòng (`type="text"`, mặc định `"P."`)
- Giá mặc định (`type="number"`, `min="0"`)
- Nút **"Thêm nhanh"** — khi bấm, sinh N dòng mới nối vào cuối `rooms` hiện có:
  - Đánh số tiếp nối từ số phòng đang có, zero-pad 2 chữ số: nếu đã có 3 phòng (P.01–P.03), thêm
    nhanh 5 phòng → sinh `P.04, P.05, P.06, P.07, P.08`. Đếm dựa trên `rooms.length` hiện tại tại
    thời điểm bấm, không cố gắng parse số lớn nhất trong label cũ (đơn giản, đủ dùng cho use case
    "thêm cả dãy mới").
  - Mỗi dòng sinh ra: `{ label: `${prefix}${String(index).padStart(2, '0')}`, price: defaultPrice, available: true }`.

### 3.2 Danh sách dòng phòng

Mỗi phần tử trong `rooms` render 1 dòng gồm:
- Input text: Tên phòng (`label`)
- Input number: Giá (`price`)
- Checkbox: "Còn trống" (`available`)
- Nút xóa dòng (icon `X` từ `lucide-react`, cùng pattern icon-button đã dùng ở nơi khác trong file
  này, VD `Icon name="Pencil"` ở dòng 908)

### 3.3 Thêm thủ công

Nút **"+ Thêm 1 phòng"** — thêm 1 dòng trống (`{ label: '', price: '', available: true }`) vào cuối
`rooms`, cho trường hợp broker chỉ muốn sửa/thêm 1 phòng lẻ thay vì dùng "Thêm nhanh".

### 3.4 Trạng thái rỗng

Khi `rooms.length === 0`, hiện dòng gợi ý nhỏ (style giống các placeholder/hint khác trong form):

> "Chưa có phòng nào — dùng 'Thêm nhanh' để thêm cả dãy, hoặc thêm từng phòng."

### 3.5 Không đổi field cũ

"Phòng ngủ"/"Phòng tắm" (form field số lượng hiện có, dùng chung mọi danh mục) **giữ nguyên, độc lập
hoàn toàn** với danh sách `rooms` mới — không tự động tính lại, không ẩn đi khi có danh sách phòng.

## 4. Validate & submit (`buildAttributes(form)`, dòng ~1017)

- Trước khi build payload: lọc `rooms` bỏ các dòng có `label` rỗng sau khi `trim()`.
- `price` rỗng hoặc không parse được số → coi là `0` (không chặn submit — component hiển thị
  `RoomList.jsx`/`formatRoomPrice()` đã tự xử lý `price <= 0` → hiển thị "Liên hệ").
- Chỉ gắn `attributes.rooms = [...]` (đã lọc, đã coerce `price` sang `Number`) khi
  `categorySlug === 'tro'` **và** danh sách sau lọc có ít nhất 1 phần tử.
- Nếu danh sách rỗng sau lọc: **không gửi key `rooms`** trong `attributes` — giữ nguyên hành vi hiện
  tại cho tin trọ dạng 1 phòng đơn (không có breakdown theo phòng).

## 5. Không đổi

- `components/property/RoomList.jsx`, `components/TroShowcaseCard.jsx`, `pages/PropertyDetailPage.jsx`
  — đã đọc đúng field cần thiết từ `property.rooms`, không cần sửa.
- `services/api.js` (`normalizeProperty`) — đã map `attributes.rooms` → `property.rooms` sẵn.
- Backend (`backend-springboot`) — `attributes` passthrough generic, không cần migration/DTO mới.

## 6. Test (bổ sung vào `pages/BrokerDashboard.listingForm.test.jsx` — file test đã tồn tại)

- "Thêm nhanh" N phòng sinh đúng số dòng, label tiếp nối đúng thứ tự và zero-pad đúng.
- Thêm 1 phòng thủ công, xóa 1 dòng phòng.
- Submit: `attributes.rooms` chỉ xuất hiện trong payload khi category = `tro` và có ít nhất 1 phòng
  hợp lệ (label không rỗng); dòng có label rỗng bị lọc bỏ khỏi payload.
- Submit khi category khác `tro`: không gắn `attributes.rooms` dù `form.rooms` có dữ liệu (trường hợp
  broker đổi category sau khi đã nhập phòng).
- Sửa tin có sẵn `property.rooms` → `editListing()` prefill đúng vào `listingForm.rooms`.

## Out of scope

- Mở rộng sang danh mục Nhà/Đất.
- Ảnh riêng từng phòng.
- Validate trùng tên phòng (label) trong cùng 1 tin.
- Trường diện tích/ghi chú riêng từng phòng.
- Bất kỳ thay đổi nào ở backend-springboot (migration, DTO, entity).
