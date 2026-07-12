# Nhóm 1 — 5 fix nhỏ, độc lập (category grid, validate SĐT, bỏ Tin nhắn, gộp Cài đặt, fix Loại hình BĐS) — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Đợt đầu trong danh sách 15 mục lớn user vừa cung cấp — 5 mục nhỏ, độc lập, rủi ro thấp, được ưu tiên làm trước theo yêu cầu "fix nhỏ/an toàn trước". Các mục còn lại (lọc ngày, chart đè chữ, dữ liệu giả, dark mode admin, banner) để lại cho các đợt sau.

## Bối cảnh

Investigation (2 Explore agent + tự kiểm tra) đã xác nhận nguyên nhân từng mục:

1. `home.css:277` `.category-grid` vẫn `grid-template-columns: repeat(5, 1fr)` — sót lại từ thời `CATEGORY_CARDS` có 5 phần tử (đã dedup xuống 3 ở Nhóm D phần 1, nhưng CSS chưa cập nhật theo).
2. `BrokersSection.jsx:68` (form "Cấp tài khoản môi giới") và `CreateBrokerRequest.java:14` đều không có ràng buộc định dạng SĐT nào — chỉ `required`/`@NotBlank`, không `pattern`/`@Pattern`.
3. `BrokerDashboard.jsx` có mục sidebar "Tin nhắn" (`href: '#/broker/messages'`) render `StateBlock` placeholder, không có module chat thật nào trong toàn bộ codebase.
4. `section === 'settings'` (`BrokerDashboard.jsx:813-816`) là placeholder trỏ sang `section === 'profile'` (đã có form thật: họ tên, SĐT, Facebook, TikTok, đổi mật khẩu) — 2 route riêng biệt cho cùng 1 nhu cầu.
5. `buildManagedTypeData` (`BrokerDashboard.jsx:1190-1201`) tạo "Căn hộ" từ `category === 'apartment'` — giá trị không bao giờ tồn tại trong `CATEGORIES` thật (chỉ có `tro`/`nha`/`dat`) — nhà cho thuê bị đếm trùng ở cả "Cho thuê" lẫn "Căn hộ".

## Thay đổi

### 1. Category grid trang chủ lấp đầy khung

`frontend-react/src/styles/home.css:277`: đổi `grid-template-columns: repeat(5, 1fr)` → `repeat(3, 1fr)` (khớp đúng số card thật, 3). Breakpoint `≤1024px { repeat(3, 1fr) }` (dòng 281) nay trùng hệt giá trị default — xoá dòng này (thừa, không còn tác dụng). Giữ nguyên breakpoint `≤640px { repeat(2, 1fr) }` (dòng 282).

### 2. Validate SĐT theo đầu số nhà mạng Việt Nam thật

Regex dùng chung (frontend + backend): `^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$` — khớp đầu số di động thật của Viettel/Vinaphone/Mobifone/Vietnamobile/Gmobile, luôn 10 chữ số bắt đầu bằng 0.

**Frontend** (`frontend-react/src/pages/admin/BrokersSection.jsx:68`): thêm `type="tel"`, `pattern="0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}"` (không có `^`/`$`, HTML `pattern` tự neo toàn chuỗi), `maxLength={10}`, `title="Số điện thoại di động Việt Nam hợp lệ, VD: 0912345678"` vào `<input>` hiện có — trình duyệt tự chặn submit khi sai định dạng (cùng cơ chế native validation form đã dùng cho `required`).

**Backend** (`backend-springboot/src/main/java/com/travinh/realty/modules/user/dto/CreateBrokerRequest.java:14`): thêm `@Pattern(regexp = "^0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}$", message = "phone must be a valid Vietnamese mobile number")` bên cạnh `@NotBlank @Size(max = 30)` hiện có — cùng pattern annotation-style đã dùng cho `username` trong chính DTO này.

Đã kiểm tra: mọi số điện thoại cố định trong test hiện có của `CreateBrokerRequest` (`"0900000111"`, `"0900000222"`, v.v., đều bắt đầu `09`) đều khớp regex mới — không có test nào vỡ vì lý do này. `"0123456789"` (BookingHttpTest) và `"02943999888"` (PropertyHttpTest) thuộc DTO khác (`visitorPhone` của viewing request, và số hotline fallback của property) — không liên quan `CreateBrokerRequest`, không bị ảnh hưởng.

### 3. Bỏ hẳn "Tin nhắn"

`frontend-react/src/pages/BrokerDashboard.jsx`:
- Xoá phần tử `{ href: '#/broker/messages', icon: 'MessageCircle', label: 'Tin nhắn' }` khỏi `BROKER_SIDEBAR_ITEMS`.
- Xoá khối `{section === 'messages' && (...)}` (render `StateBlock` placeholder).
- Xoá key `messages` khỏi `brokerTitle()` và `brokerSubtitle()`.

`frontend-react/src/routes/index.jsx`: xoá `BrokerMessagesRoute` function và entry `'/broker/messages': BrokerMessagesRoute`.

### 4. Gộp "Cài đặt" + "Hồ sơ môi giới" thành 1 điểm đến

Giữ lại đúng 1 đích: mục sidebar "Cài đặt" (`#/broker/settings`) — nội dung của nó đổi thành chính form hồ sơ (họ tên, SĐT, avatar, Facebook, TikTok, đổi mật khẩu) hiện đang nằm dưới `section === 'profile'`.

`frontend-react/src/pages/BrokerDashboard.jsx`:
- Đổi điều kiện `{section === 'profile' && (...)}` (khối JSX chứa form hồ sơ thật) thành `{section === 'settings' && (...)}`.
- Xoá khối `{section === 'settings' && (...)}` cũ (placeholder trỏ "Mở hồ sơ").
- Đổi mọi link nội bộ trỏ `#/broker/profile` thành `#/broker/settings`: dòng 624 (`Vui lòng hoàn tất hồ sơ... <a href="#/broker/profile">Mở hồ sơ</a>`) và dòng 891 (nút header).
- `brokerTitle()`: xoá key `profile`, đổi text của key `settings` thành `'Cài đặt'` (giữ nguyên — vẫn là tên tab).
- `brokerSubtitle()`: xoá key `profile` (`'Quản lý thông tin liên hệ hiển thị trên các tin đăng.'`), thay subtitle của key `settings` bằng đúng câu đó (mô tả đúng nội dung thật sự hiển thị, câu cũ "Cấu hình nhanh các thông tin tài khoản môi giới." không còn khớp).

`frontend-react/src/routes/index.jsx`: xoá `BrokerProfileRoute` function và entry `'/broker/profile': BrokerProfileRoute`. `BrokerSettingsRoute` (đã có sẵn, trỏ `section="settings"`) giữ nguyên, giờ render đúng nội dung hồ sơ thật.

**Test cần cập nhật**: `App.test.jsx:53` và `BrokerDashboard.filter.test.jsx:82` hiện điều hướng tới `#/broker/profile`/`section="profile"` — đổi thành `#/broker/settings`/`section="settings"`.

### 5. Loại hình BĐS quản lý — rút về 3 danh mục thật

`frontend-react/src/pages/BrokerDashboard.jsx`, `buildManagedTypeData` (dòng 1190-1201) đổi từ:

```javascript
function buildManagedTypeData(listings) {
  const houseSale = listings.filter((item) => item.category === 'nha' && item.transaction !== 'rent').length;
  const land = listings.filter((item) => item.category === 'dat' || item.category === 'land').length;
  const apartment = listings.filter((item) => item.category === 'apartment' || (item.category === 'nha' && item.transaction === 'rent')).length;
  const rentals = listings.filter((item) => item.category === 'tro' || item.transaction === 'rent').length;
  return [
    { label: 'Nhà phố', value: houseSale },
    { label: 'Đất nền', value: land },
    { label: 'Căn hộ', value: apartment },
    { label: 'Cho thuê', value: rentals },
  ].map((item) => ({ ...item, value: item.value || 0 }));
}
```

thành:

```javascript
function buildManagedTypeData(listings) {
  const tro = listings.filter((item) => item.category === 'tro').length;
  const nha = listings.filter((item) => item.category === 'nha').length;
  const dat = listings.filter((item) => item.category === 'dat').length;
  return [
    { label: 'Trọ', value: tro },
    { label: 'Nhà', value: nha },
    { label: 'Đất', value: dat },
  ];
}
```

Đếm thuần theo `category` thật, không còn trộn logic `transaction` (loại giao dịch thuê/bán là khái niệm khác, không phải loại hình BĐS — cùng nguyên tắc đã áp dụng khi sửa danh mục trang chủ ở Nhóm D phần 1) — mỗi tin đăng chỉ rơi vào đúng 1 trong 3 nhóm, không còn đếm trùng.

## Testing

- Frontend: `cd frontend-react && npm test -- --run` — baseline trước thay đổi: 151/151. Cần test mới cho mục 5 (`buildManagedTypeData` trả đúng 3 nhóm, không đếm trùng khi có tin `nha`+`transaction:'rent'`), test cho mục 2 (input SĐT có `pattern` đúng regex), test cập nhật cho mục 3 (sidebar không còn "Tin nhắn", route `/broker/messages` không tồn tại) và mục 4 (route `/broker/settings` render đúng form hồ sơ, route `/broker/profile` không còn tồn tại).
- Backend: `cd backend-springboot && mvn test` — ghi lại baseline thật trước khi sửa (không giả định con số cũ). Cần test mới cho `CreateBrokerRequest` từ chối SĐT sai định dạng (VD: `"1"`, `"0123456789"` sai đầu số) và chấp nhận SĐT đúng định dạng.

## Ngoài phạm vi

- Không đụng `UpdateProfileRequest.phone()` (broker tự sửa SĐT trong hồ sơ) — user chỉ yêu cầu ràng buộc ở form "Cấp tài khoản môi giới" của admin, không mở rộng thêm.
- Không đổi label/icon sidebar "Cài đặt" — chỉ đổi nội dung bên trong.
- 10 mục còn lại trong danh sách 15 mục lớn (lọc ngày admin, chart đè chữ, dữ liệu giả ở Phễu/Lượt xem/Leads/Khách hàng tiềm năng, dark mode admin, banner trang chủ, layout khuyết ô ở admin) — không thuộc phạm vi spec này.
