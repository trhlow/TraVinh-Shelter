# Nhóm D (phần 1) — Bỏ Zalo, thêm YouTube, dedup danh mục — Design

**Ngày**: 2026-07-09
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: 3 mục cơ học, độc lập, không còn điểm mơ hồ, từ danh sách Nhóm D gốc:
- Mục 5: bỏ Zalo hoàn toàn (frontend lẫn backend)
- Mục 6: thêm icon YouTube vào footer
- Mục 8: dedup danh mục "Khám phá theo loại hình" trên trang chủ

Item 7 (rebuild theme đen-tím cho `/admin`) và item 9 (khóa hiển thị tháng dashboard — đã xác nhận tự thỏa mãn, không cần code) không nằm trong phạm vi spec này.

## Bối cảnh

Khảo sát code hiện tại (trước khi viết spec):

- **Zalo** xuất hiện ở 3 nơi UI công khai/private + 1 field dữ liệu: icon trên `BrokersPage.jsx` (broker card), nút "Chat Zalo" tự tạo từ số điện thoại trên `PropertyDetailPage.jsx`, và field `zaloUrl` trong form profile môi giới (`BrokerDashboard.jsx`). `zaloUrl` **không phải chỉ mock** — nó là cột thật `users.zalo_url` (Flyway `V14__add_broker_social_links.sql`), có mặt trong `User.java`, 5 DTO backend (`UpdateProfileRequest`, `UserProfileResponse`, `CurrentUserProfileResponse`, `BrokerContactResponse`, `BrokerSummaryResponse`), và `UserProfileService`. Token CSS `--color-zalo` (`styles.css:36`) chỉ dùng cho các UI này, không dùng nơi khác.
- **YouTube**: footer (`MainLayout.jsx`) hiện chỉ có Facebook + TikTok (URL đều placeholder `#/`), chưa có YouTube. `lucide-react`'s `Youtube` icon đã sẵn có trong `components/ui/Icon.jsx`, không cần cài thêm thư viện.
- **Category dedup**: `HomePage.jsx`'s `CATEGORY_CARDS` là mảng cứng riêng (không lấy từ `data/locations.js`'s `CATEGORIES` chuẩn), có 5 mục nhưng 3 mục (Nhà phố/Căn hộ/Biệt thự) cùng trỏ `slug: 'nha'` — click vào card nào trong 3 card này cũng ra cùng 1 kết quả tìm kiếm, gây nhầm lẫn. `CATEGORIES` chuẩn (`data/locations.js:9-13`) thực ra chỉ có **3 mục**: `tro`/Trọ, `nha`/Nhà, `dat`/Đất — không có "Thuê" (đó là loại giao dịch `transaction`, không phải danh mục BĐS). Card "Cho thuê" hiện tại của `CATEGORY_CARDS` gán sai vào `slug: 'tro'`.

## Thay đổi

### 1. Bỏ Zalo hoàn toàn

**Backend** (`backend-springboot/`):
- `modules/user/model/User.java`: xóa field `zaloUrl`, getter, và phần set trong `updateProfile(...)`
- `modules/user/dto/UpdateProfileRequest.java`, `UserProfileResponse.java`, `CurrentUserProfileResponse.java`, `BrokerContactResponse.java`, `modules/property/dto/BrokerSummaryResponse.java`: xóa field `zaloUrl` khỏi từng DTO
- `modules/user/UserProfileService.java`: xóa logic đọc/ghi `zaloUrl`
- Migration mới `V18__drop_broker_zalo_url.sql`: `ALTER TABLE users DROP COLUMN zalo_url;` — **không sửa `V14`** (nguyên tắc Flyway: migration đã apply là bất biến)
- Cập nhật test đang tham chiếu `zaloUrl`: `AdminBrokerControllerHttpTest`, `BrokerSummaryResponseTest`, `UserProfileHttpTest`, `UserProfileServiceTest` — xóa assertion liên quan, không thêm test mới (đây là xóa tính năng, không phải thêm)

**Frontend** (`frontend-react/`):
- `pages/BrokerDashboard.jsx`: xóa `zaloUrl` khỏi `profileForm` state khởi tạo, khỏi bước hydrate từ `profileData`, xóa `FormField` nhập Zalo trong form, xóa khỏi `ProfileSocialLine` (component chỉ còn hiển thị Facebook + TikTok)
- `pages/BrokersPage.jsx`: xóa icon/link Zalo trên broker card, xóa `zalo: broker.zalo || ''` khỏi bước normalize
- `pages/PropertyDetailPage.jsx`: xóa nút "Chat Zalo" (deep-link tự tạo từ số điện thoại — không dùng field `zaloUrl` nhưng cùng thuộc phạm vi "bỏ Zalo" theo yêu cầu người dùng)
- `services/api.js`: xóa mapping `zaloUrl`/`zalo` khỏi các hàm normalize broker
- `services/mockData.js`: xóa field `zalo` khỏi 8 broker mock entries
- `styles.css`: xóa token `--color-zalo` (không còn nơi nào dùng sau khi xóa UI) và rule CSS `.contact-phone-zalo-zalo` (hoặc tên class tương ứng gắn với nút "Chat Zalo" vừa xóa)
- Cập nhật test: `BrokerDashboard.filter.test.jsx`, `BrokersPage.test.jsx`, `PropertyDetailPage.test.jsx` — xóa assertion liên quan tới Zalo

### 2. Thêm icon YouTube vào footer

`components/layout/MainLayout.jsx`: thêm phần tử `{ label: 'YouTube', icon: 'Youtube', href: '#/' }` vào mảng social hiện có (giữ đúng shape/pattern với Facebook và TikTok — URL placeholder `#/`, đặt sau TikTok trong thứ tự hiển thị). Không cần thêm CSS mới — `.footer-social-icon` đã style theo icon component chung, không phụ thuộc icon cụ thể nào.

Cập nhật `MainLayout.test.jsx`: test hiện tại (dòng ~8-12) assert **không có** icon Youtube trong footer — đổi thành assert **có** icon Youtube (cùng cách các test khác xác nhận Facebook/TikTok đã có).

### 3. Dedup danh mục "Khám phá theo loại hình"

`pages/HomePage.jsx`: xóa mảng cứng `CATEGORY_CARDS` (5 mục, 3 mục trùng slug `nha`, cộng 1 card "Cho thuê" gán sai vào `slug: 'tro'`), thay bằng đúng 3 danh mục thật từ `CATEGORIES` (`data/locations.js:9-13`): Trọ, Nhà, Đất — mỗi card slug duy nhất, khớp dữ liệu tìm kiếm thật của hệ thống. `CATEGORIES` chỉ có `{slug, label}`, không có icon — giữ nguyên icon hiện có của `CATEGORY_CARDS` theo đúng slug tương ứng (Trọ → `Key` icon của card "Cho thuê" cũ; Nhà → `Home` icon của card "Nhà phố" cũ; Đất → `Layers` icon của card "Đất nền" cũ), bỏ 2 icon còn lại (`Building` của "Căn hộ", `Castle` của "Biệt thự" — cả hai đều trỏ `slug: 'nha'` trùng lặp, không còn card riêng). Trường `count` ("320 tin đăng"...) hiện đang là số hardcode không phản ánh dữ liệu thật — giữ nguyên hành vi hardcode hiện tại (không đổi thành dynamic count, ngoài phạm vi mục dedup này), chỉ giữ lại giá trị `count` gắn với đúng slug đang dùng.

Không có thay đổi CSS cho mục này — khảo sát cho thấy `.category-card`/`.category-card-*` không có lỗi alignment rõ ràng trong code hiện tại; người dùng sẽ cung cấp mô tả/ảnh cụ thể sau nếu vẫn còn thấy lỗi, xử lý ở lần sau.

## Testing

- Backend: `mvn test` — 4 test file bị ảnh hưởng cập nhật xong phải xanh, không giảm số lượng test case ngoài các case xóa hẳn vì tính năng không còn tồn tại.
- Frontend: `npm test -- --run` — 4 test file bị ảnh hưởng cập nhật xong phải xanh; tổng số test có thể giảm nhẹ (xóa assertion liên quan Zalo) nhưng không được giảm vì lỗi thật.
- Manual: chạy `docker compose up --build` hoặc `npm run dev` + `mvn spring-boot:run`, xác nhận: broker card không còn icon Zalo, trang chi tiết BĐS không còn nút Chat Zalo, form profile môi giới không còn field Zalo, footer có icon YouTube, trang chủ "Khám phá theo loại hình" chỉ còn 4 card không trùng lặp.

## Ngoài phạm vi

- Item 7 (rebuild theme đen-tím `/admin`) và item 9 (khóa tháng dashboard, đã xác nhận không cần sửa) — không thuộc spec này.
- Lỗi căn chỉnh label ở mục 8 — chưa xác định được cụ thể, để lại cho lần sau khi có mô tả/ảnh rõ hơn.
- Không đổi icon/thứ tự Facebook/TikTok hiện có trong footer.
