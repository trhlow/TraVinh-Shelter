# Item 9 — Homepage banner: 4 trust chips bị nền tối che khuất — Design

**Ngày**: 2026-07-10
**Branch**: `devlong-test-giao-dien`
**Phạm vi**: Item 9 từ punch list gốc (banner trang chủ), cuối cùng đã scope được sau khi user mô tả cụ thể.
Đây là mục cuối cùng còn lại trong toàn bộ 2 punch list của session này.

## Bối cảnh

User báo 4 dòng chữ "Pháp lý đã kiểm tra / Môi giới xác minh / Hình ảnh thực tế / Không phí ẩn" bị nền của
banner che mất, đề xuất 2 hướng: kéo nền banner lên, hoặc kéo 4 dòng chữ xuống.

So sánh trực tiếp `bannertrangchu.png` (ảnh mẫu, đọc bằng Read tool) với code (`HomePage.jsx:179-215`,
`styles.css:734-853`) xác định nguyên nhân thật khác với cả 2 giả thuyết ban đầu — không phải chồng lấn
không gian (ảnh nền `.hero-bg` đã nằm gọn trong `.hero-inner`, `position:absolute; inset:0`, không hề đè
lên `.hero-trust-chips` — 2 khối này là anh em cùng cấp trong DOM, không chồng nhau):

- `.hero` (`<section>` bao ngoài, `styles.css:734-740`) có `background: #0f1c17` (gần đen) — hardcode hex,
  phủ toàn bộ chiều cao section, kể cả phần bên dưới khung ảnh bo góc `.hero-inner`, nơi `.hero-trust-chips`
  render. Trong ảnh mẫu, khu vực này là nền trắng của trang (`--color-canvas`), không phải nền tối.
- `.hero-trust-chip` (`styles.css:846-853`) có `color: #5a655e` — hardcode hex, và giá trị này trùng khớp
  chính xác với `--color-muted-soft`'s dark-mode value (`styles.css:98`, trong khối `[data-theme="dark"]`).
  Tức là màu chữ này được thiết kế để đọc được trên nền tối kiểu dark-mode, nhưng đang hiển thị trên nền
  `.hero`'s riêng nó cũng tối `#0f1c17` — độ tương phản quá thấp, chữ gần như biến mất, đúng như user mô tả
  "bị nền che".

Đã dựng mockup trực quan (visual companion) so sánh "hiện tại" vs "đề xuất sửa" bằng đúng giá trị hex trong
code — user xác nhận khớp đúng vấn đề đang gặp và đồng ý với hướng sửa.

## Quyết định

- Sửa tại gốc màu sắc (2 giá trị hardcode hex), không di chuyển bất kỳ phần tử nào trong layout — vì ảnh và
  chữ chưa từng chồng lên nhau về mặt không gian.

## Thay đổi

### 1. `.hero`'s background: hex hardcode → token

`frontend-react/src/styles.css:737`, đổi:

```css
  background: #0f1c17;
```

thành:

```css
  background: var(--color-canvas);
```

Khu vực ngoài khung ảnh bo góc (nơi 4 dòng chữ trust-chip render) sẽ trở lại đúng màu nền trang (trắng ở
light mode, khớp ảnh mẫu; tối phù hợp riêng nếu site đang ở dark mode — tự đổi theo token, không còn cứng
1 màu).

### 2. `.hero-trust-chip`'s màu chữ: hex hardcode (giá trị dark-mode-only) → token semantic đúng ngữ cảnh

`frontend-react/src/styles.css:851`, đổi:

```css
  color: #5a655e;
```

thành:

```css
  color: var(--color-muted);
```

`--color-muted` tự đổi đúng theo theme hiện hành (`#6b7671` sáng / `#8a938d` tối) — khớp với nền `.hero` mới
(cũng đã đổi sang token ở bước 1), thay vì 1 giá trị cứng chỉ đúng trong 1 trường hợp riêng.

## Ngoài phạm vi

- Không đụng `.hero-bg`/`.hero-bg-img`/`.hero-bg-scrim` — khung ảnh bo góc của banner giữ nguyên, không có
  vấn đề gì ở đó.
- Không đụng bố cục/margin/padding của `.hero-inner`, `.hero-trust-chips` — không cần di chuyển phần tử nào.

## Testing

Thay đổi CSS token thuần túy, tương tự Nhóm 4 — không có hành vi JS/component để test bằng jsdom. Không có
công cụ browser-automation trong môi trường này. Xác minh: `npm run dev`, xem trang chủ ở cả 2 theme
sáng/tối, xác nhận 4 dòng trust-chip đọc được rõ ràng trên nền trắng (sáng) / nền tối phù hợp (tối), khớp bố
cục ảnh mẫu `bannertrangchu.png`.

`npm test -- --run` chạy lại để xác nhận không có test nào assert `#0f1c17`/`#5a655e` làm test đỏ oan (cần
grep xác nhận trước khi sửa, không giả định).
