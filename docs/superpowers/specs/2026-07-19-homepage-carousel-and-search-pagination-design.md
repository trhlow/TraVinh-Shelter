# Carousel "Tin đăng mới nhất" + Phân trang trang tìm kiếm — Design Spec

> Nguồn gốc: đề xuất thiết kế (tiếng Việt, không kèm code) do người dùng đưa ra, tham khảo từ một bản
> phác thảo hành vi UX cho carousel trang chủ và phân trang trang danh sách. Đã qua 1 vòng brainstorm
> (2 câu hỏi quyết định phạm vi + xử lý trùng lặp) trước khi viết spec này.

## Bối cảnh

Hiện trạng (đã xác minh trực tiếp trong code, không suy đoán):

- **`HomePage.jsx`** không có section "Tin đăng mới nhất" nào. Có 3 hàng riêng theo danh mục
  (Phòng trọ / Nhà / Đất — hằng số `SHOWCASE_ROWS`), mỗi hàng là một `pcard-grid` (CSS grid tĩnh,
  4 tin/hàng, không carousel). Comment tại `HomePage.jsx:250-251` ghi rõ đây là quyết định có chủ
  đích: *"One listing appears once, in its own category row; no redundant mixed 'featured' grid
  above them."*
- **`SearchPage.jsx`** (trang kết quả tìm kiếm / "Xem tất cả") **không có phân trang**. `fetchProperties(appliedFilters)`
  lấy toàn bộ kết quả khớp bộ lọc một lần, render hết trong một `grid-3`. "Sắp xếp" (`sort` state,
  dòng 64) là **sort phía client** — gọi `.sort()` trên mảng `properties` đã fetch, không gửi lên API.
- **Backend đã hỗ trợ phân trang** — `PropertyService.search(params, Pageable pageable)` nhận
  `Pageable` chuẩn của Spring Data, tự bind `page`/`size`/`sort` từ query string. Không cần sửa Java.
- **`fetchProperties()`** ở frontend hiện trả về **mảng phẳng** (`normalizePagedProperties` chỉ lấy
  `response.content`, vứt `totalElements`/`totalPages`). Hàm này được gọi ở nhiều nơi (HomePage,
  `fetchPropertyDetail`'s fallback, v.v.) — đổi shape trả về sẽ buộc sửa mọi nơi gọi, rủi ro không
  cần thiết.
- **`buildPropertyQuery()`** (frontend, `propertyFilters.js`) hỗ trợ `size` nhưng **chưa có `page` hay
  `sort`**. Hàm chị em `buildAdminQuery()` (dùng cho trang admin) đã có sẵn cả 3 — dùng làm mẫu.
- Có một khối CSS carousel scroll-snap cũ (`home.css`, `.tro-showcase-row`/`.tro-showcase-card`)
  **không còn JSX nào dùng** — code chết từ một thiết kế trước đó, sẽ xoá khi thêm carousel mới
  (không tái dùng nguyên trạng vì yêu cầu hành vi khác: nút mũi tên + trạng thái disable, hiển thị
  đúng 3 card/lần thay vì cuộn tự do).

## Quyết định đã chốt (từ vòng brainstorm)

1. **Carousel là section mới, KHÔNG thay 3 hàng danh mục hiện có.** 3 hàng Trọ/Nhà/Đất giữ nguyên,
   không đổi.
2. **Chấp nhận một tin có thể xuất hiện cả ở carousel lẫn ở hàng danh mục của nó.** Không thêm logic
   loại trừ — carousel phục vụ "mới nhất toàn sàn", hàng danh mục phục vụ "theo loại hình", hai mục
   đích khác nhau.
3. **Không sửa `fetchProperties()` hiện có.** Thêm hàm mới `fetchPropertiesPage()` dành riêng cho
   phân trang, để không đụng đến HomePage/trang chi tiết đang dùng hàm cũ.
4. **Sort chuyển từ client-side sang query param**, đi kèm với `page` — bắt buộc, vì sort cục bộ
   trên 9 tin của 1 trang sẽ cho thứ tự sai so với toàn bộ kết quả.

---

## Phần 1 — Carousel "Tin đăng mới nhất" (HomePage)

### Vị trí

Ngay sau Hero (`HeroSearchBar`), **trước** section "Khám phá theo loại hình". Lý do: đây là nội dung
tổng hợp toàn sàn theo thời gian, hợp lý đứng trước khi trang chia nhỏ theo danh mục.

### Component mới: `PropertyCarousel`

File: `frontend-react/src/components/PropertyCarousel.jsx`

```jsx
function PropertyCarousel({ items /* Property[] | null */, visibleCount = 3 })
```

- `items === null` → trạng thái loading, hiển thị `visibleCount` khung skeleton (tái dùng class
  `pcard-skeleton` đã có).
- `items.length === 0` → không render section này luôn (không hiện "chưa có tin" — trang chủ không
  cần một section trống, khác với `ListingGrid` của các hàng danh mục vốn đã có empty-state riêng).
- `items.length <= visibleCount` → render card tĩnh (grid, giống `pcard-grid` hiện có), **ẩn cả 2 nút
  mũi tên** — đúng yêu cầu gốc ("Nếu tổng số tin không quá ba, ẩn cả hai nút").
- Ngược lại → render carousel thật.

### Hành vi carousel (khi có nhiều hơn `visibleCount` tin)

- **Desktop**: hiện đúng 3 card. Mỗi lần bấm mũi tên → nhảy nguyên nhóm 3 tin tiếp theo (không cuộn
  từng pixel, không cuộn từng 1 card).
- **Tablet**: hiện 2 card/lần. Dự án không dùng token breakpoint (đã kiểm tra: `styles.css` dùng
  `@media (min-width: 768px)`/`(min-width: 1024px)` trực tiếp, không có custom property) — dùng
  `@media (min-width: 768px)` cho mốc tablet, khớp quy ước sẵn có trong file.
- **Mobile**: hiện 1 card đầy đủ + hé một phần card tiếp theo (dùng `scroll-snap-align` +
  `overflow-x: auto`, không cần JS điều khiển bước nhảy — để trình duyệt xử lý cuộn/vuốt tự nhiên).
- **Desktop/tablet**: dùng JS để track `startIndex`, cập nhật `transform: translateX(...)` hoặc
  `scrollTo` theo nhóm — không dùng animation phức tạp, chỉ `transition` ngắn (đúng
  `.claude/rules/design.md`: "Animation phức tạp — chỉ transition ngắn, có lý do").
- **Nút trái**: `disabled` khi `startIndex === 0`.
- **Nút phải**: `disabled` khi đã hiện đến nhóm cuối (`startIndex + visibleCount >= items.length`).
- **Không tự động chuyển** (không `setInterval`).
- Chỉ báo dạng chấm/số (`1 / 4`) — **không bắt buộc**, bỏ qua ở bản đầu tiên (YAGNI — thêm sau nếu
  cần, tránh làm phình component không cần thiết).

### Bố cục tiêu đề

```text
Tin đăng mới nhất                              [←] [→]  Xem tất cả
Tin mới cập nhật trên toàn hệ thống
```

- Trái: `<h2>` + dòng mô tả ngắn — tái dùng cấu trúc `.section-header`/`.section-header-text` đã có
  ở các hàng danh mục, giữ nhất quán về typography.
- Phải: 2 nút mũi tên (hình tròn, 40–44px, viền nhẹ theo `--color-hairline`, đổi nền khi hover) rồi
  đến link "Xem tất cả" (tái dùng class `.section-header-link` đã có) — thứ tự `[←][→]  Xem tất cả`.
- "Xem tất cả" ở đây trỏ tới `#/search` (không filter theo danh mục, vì carousel trộn mọi danh mục) —
  **và đây chính là trang được nâng cấp phân trang ở Phần 2**.

### Card trong carousel

Dùng nguyên `PropertyCard` đã có — **không tạo card mới**. `PropertyCard` đã tự xử lý: ảnh theo tỉ lệ
chuẩn 4:3, badge loại hình, giá, tiêu đề, diện tích/phòng/WC, địa chỉ, ảnh fallback khi thiếu ảnh
(theo `design.md`). Không cần thêm gì ở tầng card.

Điểm đã xác minh **không phải sửa**: `PropertyCard` không dùng bản đồ làm ảnh đại diện, và tiêu đề
hiển thị `property.title` thật từ dữ liệu — vấn đề "tiêu đề là số `121`" trong đề xuất gốc là dữ liệu
mock/demo, không phải lỗi component; không thuộc phạm vi spec này.

### Dữ liệu

`fetchProperties({ sort: 'createdAt,desc', size: 12 })` — dùng **hàm `fetchProperties` sẵn có**
(không phải hàm phân trang mới), vì carousel chỉ cần "12 tin mới nhất", không cần phân trang.

Cần bổ sung support cho tham số `sort` trong `buildPropertyQuery()` (`propertyFilters.js`) — hiện
hàm này hoàn toàn không có `sort`. Thêm:

```js
if (safeFilters.sort) params.set('sort', safeFilters.sort);
```

Và trong mock mode (`filterProperties`), thêm sort theo `createdAt` giảm dần khi `filters.sort ===
'createdAt,desc'` — đã xác minh mọi item trong `MOCK_PROPERTIES` có sẵn `createdAt` hợp lệ
(`mockData.js:321`, `MOCK_NOW - index * 8 * DAY_MS`), không cần bổ sung dữ liệu.

---

## Phần 2 — Phân trang `SearchPage.jsx`

### API mới: `fetchPropertiesPage`

File: `frontend-react/src/services/api.js`. **Hàm mới, không sửa `fetchProperties`.**

```js
export async function fetchPropertiesPage(filters, page = 0, size = 9, sort = 'createdAt,desc') {
  // mock: filterProperties() rồi tự slice + đếm total
  // real: buildPropertyQuery({...filters, page, size, sort}) rồi giữ nguyên
  //       response.totalElements/response.totalPages thay vì vứt đi như normalizePagedProperties
  // Trả về: { items: Property[], totalElements: number, totalPages: number, page: number }
}
```

- Mock mode: `filterProperties(MOCK_PROPERTIES, filters)` lọc như cũ, sort theo `sort` (tái dùng logic
  sort sẽ viết cho Phần 1), rồi `.slice(page * size, (page + 1) * size)`, `totalElements =` độ dài
  mảng đã lọc (trước khi slice).
- Real API: mở rộng `buildPropertyQuery` nhận thêm `page`/`sort` (giống cách `buildAdminQuery` đã
  làm), gọi `/properties?...&page=...&size=9&sort=...`, đọc `response.totalElements`/
  `response.totalPages`/`response.number` từ Spring `Page<>` JSON thay vì chỉ lấy `.content`.

### Thay đổi trong `SearchPage.jsx`

- Thêm state `page` (0-indexed, khớp Spring Pageable).
- `sort` **không còn sort client-side** — trở thành một phần của query, kích hoạt fetch lại giống
  `appliedFilters`.
- `useEffect` fetch lại khi `appliedFilters`, `sort`, hoặc `page` đổi — gọi `fetchPropertiesPage`.
- **Đổi bộ lọc** (`setAppliedFilters`) hoặc **đổi sort** → `setPage(0)` (về trang 1). Đổi **trang**
  không đổi `appliedFilters`/`sort`.
- Xoá `sortedProperties` (useMemo sort client-side) — không cần nữa, server đã trả đúng thứ tự.
- Danh sách hiện đang gọi `data-testid="property-grid"` — giữ nguyên, chỉ đổi nguồn dữ liệu.

### UI phân trang

Component mới `Pagination` (hoặc đặt trực tiếp trong `SearchPage.jsx` nếu đủ nhỏ — quyết định lúc
code dựa trên độ phức tạp thực tế, tránh tách file chỉ vì "nên tách"):

```text
← Trước    1    2    3    ...    8    Tiếp →
```

- Trang hiện tại: nền `--color-primary`, chữ `--color-canvas` (hoặc viền `--color-primary` nếu muốn
  nhẹ hơn — quyết định theo mock-up lúc code, không có mock-up cho phần này nên tự nhất quán với style
  nút đã dùng ở carousel).
- "Trước" disabled ở trang đầu, "Tiếp" disabled ở trang cuối.
- Khi đổi trang: `window.scrollTo` về đầu khu vực kết quả (`.results-toolbar` hoặc phần tử tương
  đương) — **không** cuộn lên tận header/navbar.
- Không hiện thanh phân trang nếu `totalPages <= 1`.
- Ẩn ở trạng thái loading, hoặc disable toàn bộ nút trong lúc loading để tránh double-click gọi 2
  request chồng nhau.

### Loading / giữ kích thước khung

Khi chuyển trang, không thay `.grid-3` thành spinner giữa trang trắng — dùng lại pattern skeleton đã
có (`skeleton skeleton-card`, đang dùng cho lần load đầu) để khung không nhảy kích thước.

### Bộ lọc đang áp dụng

Yêu cầu gốc có đề cập hiển thị "47 kết quả phù hợp" + chip điều kiện lọc (`[Phòng trọ ×] [Trà Vinh ×]
...`). Dòng "N kết quả" **đã có sẵn** (`results-count`, hiện đọc `sortedProperties.length` — sau khi
có phân trang thật sẽ đổi sang đọc `totalElements` từ response, không phải `items.length` của riêng
trang hiện tại). Chip điều kiện lọc dạng tag-xoá-từng-cái **chưa có** trong code hiện tại — đây là một
tính năng UI riêng, **ngoài phạm vi spec này** (xem mục Ngoài phạm vi).

---

## Testing

- `PropertyCarousel`: test unit (Vitest + Testing Library) — ẩn nút khi `items.length <=
  visibleCount`; nút trái disabled ở đầu; nút phải disabled ở cuối; bấm nút phải nhảy đúng
  `visibleCount` item; loading state render đúng số skeleton; `items.length === 0` không render gì.
- `fetchPropertiesPage` (mock mode): test unit cho `propertyFilters.js`/`api.js` — slice đúng theo
  `page`/`size`; `totalElements` đúng bằng số lượng SAU lọc TRƯỚC slice; sort áp dụng trước khi slice.
- `SearchPage`: test đổi trang giữ nguyên `appliedFilters`+`sort`; đổi filter hoặc sort reset về
  trang 0; nút Trước/Tiếp disabled đúng biên; không hiện thanh phân trang khi `totalPages <= 1`.

## Ràng buộc toàn cục (Global Constraints)

- Không hard-code `#hex` trong JSX — chỉ `var(--color-*)`.
- Không `inline style` ngoại trừ giá trị tính toán động thật sự cần thiết (ví dụ `transform:
  translateX()` của carousel) — theo đúng exception đã thiết lập trong các component chart trước đó.
- Tiếng Việt cho UI, tiếng Anh cho code/identifier, conventional commit, không có AI attribution.
- TDD cho `PropertyCarousel` và `fetchPropertiesPage` (đều là logic nghiệp vụ thật, có nhánh rẽ rõ
  ràng — không phải CSS thuần).
- Không animation phức tạp — carousel chỉ dùng `transition` ngắn có lý do (đổi nhóm card).
- `npm test -- --run` phải xanh xuyên suốt.

## Ngoài phạm vi (backlog, không làm trong plan này)

- Chip điều kiện lọc dạng "xoá từng cái" (`[Phòng trọ ×] ... Xoá tất cả`) trên `SearchPage` — tính
  năng UI riêng, độc lập với carousel/phân trang.
- Sửa dữ liệu mock có tiêu đề là số (`121`, `12`) — vấn đề dữ liệu demo, không phải component.
- Áp dụng carousel cho 3 hàng danh mục Trọ/Nhà/Đất hiện có (đã quyết định giữ nguyên dạng grid tĩnh).
- Chỉ báo dạng chấm/số (`1 / 4`) trên carousel — có thể thêm sau nếu cần, không bắt buộc ở bản đầu.
- Dọn `.tro-showcase-row`/`.tro-showcase-card` (CSS chết trong `home.css`) — nên dọn trong lúc code
  Phần 1 (cùng khu vực, cùng tinh thần "không để code chết", như đã làm ở plan chart trước) nhưng
  không phải mục tiêu chính của spec này; nêu ở đây để không quên.
