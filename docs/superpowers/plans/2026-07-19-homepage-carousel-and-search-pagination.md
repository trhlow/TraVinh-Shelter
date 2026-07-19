# Carousel "Tin đăng mới nhất" + Phân trang trang tìm kiếm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm carousel "Tin đăng mới nhất" trên trang chủ (component mới, dùng lại `PropertyCard`) và phân trang thật (9 tin/trang) trên trang tìm kiếm (`SearchPage.jsx`), thay cho việc hiện toàn bộ kết quả trong một grid không giới hạn.

**Architecture:** 2 mảng công việc độc lập nhưng chia sẻ một phần tầng dữ liệu:
- `propertyFilters.js` được mở rộng thêm `sort`/`page` cho `buildPropertyQuery`, cộng 2 helper thuần (`sortProperties`, `paginateProperties`) dùng cho cả carousel (chỉ cần sort, không phân trang) và trang tìm kiếm (cần cả hai).
- `api.js` có hàm mới `fetchPropertiesPage()` — **không sửa `fetchProperties()` hiện có**, để không ảnh hưởng các nơi đang gọi hàm cũ (HomePage 3 hàng danh mục, trang chi tiết).
- `PropertyCarousel` (component mới) dùng `fetchProperties({ sort, size })` — không cần phân trang.
- `SearchPage.jsx` chuyển từ "fetch hết + sort client-side" sang `fetchPropertiesPage()` + `Pagination` (component mới).

**Tech Stack:** React 19, Vite 8, CSS custom properties, Vitest + Testing Library. Backend không cần sửa (`PropertyService.search` đã nhận `Pageable` chuẩn của Spring Data, tự bind `page`/`size`/`sort` từ query string).

## Global Constraints

- Không hard-code `#hex` trong JSX; chỉ `var(--color-*)`.
- Không `inline style`, trừ giá trị tính toán động thật sự cần thiết (không có trường hợp nào trong plan này thực sự cần — nếu code thực tế phát sinh nhu cầu, coi là ngoại lệ đã có tiền lệ ở các component chart, không phải lý do để lạm dụng).
- Không raw px cho `font-size`/`margin`/`padding`/`gap` trong CSS mới — chỉ `var(--text-*)` (28/20/16/14/13/11px) / `var(--space-*)` (thang 4px). Đây là bài học trực tiếp từ plan trước (Task 2 của kế hoạch chart redesign bị review bắt lỗi raw px, phải sửa lại) — viết đúng ngay từ đầu.
- Tiếng Việt cho UI, tiếng Anh cho code/identifier, conventional commit, không có AI attribution trailer.
- TDD cho mọi logic nghiệp vụ thật (helper thuần, component có nhánh rẽ hành vi) — viết test trước, thấy fail đúng lý do, rồi mới implement. CSS thuần không cần TDD.
- `npm test -- --run` (từ `frontend-react/`) phải xanh xuyên suốt.
- Carousel không tự động chạy (không `setInterval`), không animation phức tạp — chỉ `transition` ngắn có lý do.
- Breakpoint cho carousel dùng đúng mốc của `card.css` (`744px`/`1128px`) — họ hàng với `.pcard-grid` mà carousel tái dùng `PropertyCard` — không dùng mốc `768px`/`1024px` của khu vực dashboard.
- Spring Pageable page là 0-indexed — mọi state `page` trong code (JS) giữ 0-indexed, chỉ số hiển thị cho người dùng (`Pagination` component) mới +1 để hiện "Trang 1, 2, 3...".

---

### Task 1: Mở rộng `propertyFilters.js` — `sort`/`page` cho `buildPropertyQuery`, thêm `sortProperties`/`paginateProperties`

**Files:**
- Modify: `frontend-react/src/services/propertyFilters.js`
- Test: `frontend-react/src/services/propertyFilters.test.js`

**Interfaces:**
- Consumes: không có gì mới.
- Produces: `buildPropertyQuery(filters)` nhận thêm field `sort`/`page` tuỳ chọn trong `filters`. `export function sortProperties(properties, sort)` — `sort: 'createdAt,desc' | 'price,asc' | 'price,desc' | undefined`. `export function paginateProperties(properties, page = 0, size = 9)` → `{ items, totalElements, totalPages, page }`. Task 2 (`fetchPropertiesPage`) import cả 2 hàm mới này theo tên.

- [ ] **Bước 1: Viết test fail trước**

Thêm vào `frontend-react/src/services/propertyFilters.test.js`, trong `describe('property filters', ...)` đã có, ngay sau test `'buildPropertyQuery includes size when provided'`:

```js
  test('buildPropertyQuery includes page and sort when provided', () => {
    expect(buildPropertyQuery({ page: 2, sort: 'createdAt,desc' })).toBe('page=2&sort=createdAt%2Cdesc');
  });

  test('buildPropertyQuery includes page=0 (falsy but valid)', () => {
    expect(buildPropertyQuery({ page: 0 })).toBe('page=0');
  });
```

Thêm một `describe` block mới ở cuối file (sau `describe('property filters', ...)`'s closing `});`):

```js
describe('sortProperties', () => {
  const items = [
    { id: 'a', createdAt: '2026-07-01T00:00:00Z', rawPrice: 2_000_000_000 },
    { id: 'b', createdAt: '2026-07-03T00:00:00Z', rawPrice: 1_000_000_000 },
    { id: 'c', createdAt: '2026-07-02T00:00:00Z', rawPrice: 3_000_000_000 },
  ];

  test('sorts by createdAt descending', () => {
    const result = sortProperties(items, 'createdAt,desc');
    expect(result.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  test('sorts by price ascending', () => {
    const result = sortProperties(items, 'price,asc');
    expect(result.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  test('sorts by price descending', () => {
    const result = sortProperties(items, 'price,desc');
    expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  test('returns items unchanged (same order) for an unknown or missing sort key', () => {
    expect(sortProperties(items, 'unknown,key').map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(sortProperties(items, undefined).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  test('does not mutate the input array', () => {
    const original = [...items];
    sortProperties(items, 'price,asc');
    expect(items).toEqual(original);
  });
});

describe('paginateProperties', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}` }));

  test('slices the requested page at the given size', () => {
    const result = paginateProperties(items, 1, 9);
    expect(result.items.map((item) => item.id)).toEqual(['p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17']);
  });

  test('computes totalElements from the full list, not the sliced page', () => {
    const result = paginateProperties(items, 0, 9);
    expect(result.totalElements).toBe(20);
  });

  test('computes totalPages by ceiling division', () => {
    expect(paginateProperties(items, 0, 9).totalPages).toBe(3); // 20 / 9 = 2.22 -> 3
    expect(paginateProperties([], 0, 9).totalPages).toBe(1); // empty list still reports 1 page, not 0
  });

  test('returns the requested page number unchanged', () => {
    expect(paginateProperties(items, 2, 9).page).toBe(2);
  });

  test('returns an empty items array for a page past the end, without throwing', () => {
    const result = paginateProperties(items, 10, 9);
    expect(result.items).toEqual([]);
    expect(result.totalElements).toBe(20);
  });
});
```

Cập nhật import ở đầu file test (hiện `import { buildPropertyQuery, filterProperties } from './propertyFilters.js';`):

```js
import { buildPropertyQuery, filterProperties, paginateProperties, sortProperties } from './propertyFilters.js';
```

- [ ] **Bước 2: Chạy test, xác nhận fail đúng lý do**

Run: `cd frontend-react && npx vitest run --environment jsdom src/services/propertyFilters.test.js`
Expected: FAIL — `sortProperties`/`paginateProperties` không tồn tại (undefined is not a function); 2 test `page`/`sort` của `buildPropertyQuery` fail vì query string thiếu `page`/`sort`.

- [ ] **Bước 3: Implement**

Trong `frontend-react/src/services/propertyFilters.js`, sửa `buildPropertyQuery` (thêm 2 dòng cuối trước `return`):

```js
export function buildPropertyQuery(filters) {
  const safeFilters = withDefaultFilters(filters);
  const params = new URLSearchParams();
  if (safeFilters.query) params.set('q', safeFilters.query.trim());
  if (safeFilters.category !== 'all') params.set('categorySlug', safeFilters.category);
  if (safeFilters.transaction !== 'all') params.set('attr.transaction', safeFilters.transaction);
  if (safeFilters.ward !== 'all') params.set('attr.ward', safeFilters.ward);
  if (safeFilters.houseType !== 'all') params.set('attr.houseType', safeFilters.houseType);
  if (safeFilters.minPrice) params.set('minPrice', safeFilters.minPrice);
  if (safeFilters.maxPrice) params.set('maxPrice', safeFilters.maxPrice);
  if (safeFilters.minArea) params.set('attr.area.min', safeFilters.minArea);
  if (safeFilters.maxArea) params.set('attr.area.max', safeFilters.maxArea);
  if (safeFilters.broker) params.set('brokerEmail', safeFilters.broker.trim());
  if (safeFilters.size) params.set('size', String(safeFilters.size));
  if (safeFilters.page != null) params.set('page', String(safeFilters.page));
  if (safeFilters.sort) params.set('sort', safeFilters.sort);
  return params.toString();
}
```

(`page != null` — không dùng truthy check thường như `size`/`sort`, vì `page: 0` là giá trị hợp lệ đầu tiên và sẽ bị bỏ sót nếu dùng `if (safeFilters.page)`.)

Thêm vào cuối file `propertyFilters.js` (sau `buildAdminQuery`):

```js
// Field name -> comparator, mirroring the backend's `sort=field,direction` Pageable
// convention so the same string works for both the real API call and this local sort.
const SORT_COMPARATORS = {
  'createdAt,desc': (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  'price,asc': (a, b) => (a.rawPrice ?? 0) - (b.rawPrice ?? 0),
  'price,desc': (a, b) => (b.rawPrice ?? 0) - (a.rawPrice ?? 0),
};

export function sortProperties(properties, sort) {
  const comparator = SORT_COMPARATORS[sort];
  if (!comparator) return properties;
  return [...properties].sort(comparator);
}

// Mirrors Spring Data's Page<> shape (0-indexed page, ceil-divided totalPages) so the
// mock branch of fetchPropertiesPage() and the real backend produce the same shape.
export function paginateProperties(properties, page = 0, size = 9) {
  const totalElements = properties.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const items = properties.slice(page * size, (page + 1) * size);
  return { items, totalElements, totalPages, page };
}
```

- [ ] **Bước 4: Chạy test, xác nhận pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/services/propertyFilters.test.js`
Expected: tất cả test pass (11 test cũ + 12 test mới = 23).

- [ ] **Bước 5: Chạy toàn bộ test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: không fail nào, tổng số test tăng thêm 12.

- [ ] **Bước 6: Commit**

```bash
git add frontend-react/src/services/propertyFilters.js frontend-react/src/services/propertyFilters.test.js
git commit -m "feat: add sort/page query support and pagination helpers to propertyFilters

buildPropertyQuery gains optional sort/page params, mirroring Spring's
Pageable sort=field,direction convention. sortProperties/paginateProperties
are pure helpers so mock mode can reproduce the same paged shape the
real backend's Page<> response already provides."
```

---

### Task 2: `fetchPropertiesPage()` trong `api.js`

**Files:**
- Modify: `frontend-react/src/services/api.js`
- Test: `frontend-react/src/services/api.fetchPropertiesPage.test.js` (tạo mới)

**Interfaces:**
- Consumes: `sortProperties`, `paginateProperties` (Task 1), `filterProperties`/`buildPropertyQuery` (đã có), `MOCK_PROPERTIES` (đã có), `normalizeProperty`/`request`/`delay` (nội bộ file, đã có).
- Produces: `export async function fetchPropertiesPage(filters, page = 0, size = 9, sort = 'createdAt,desc')` → `Promise<{ items: Property[], totalElements: number, totalPages: number, page: number }>`. Task 6 (`SearchPage.jsx`) gọi hàm này theo tên.

- [ ] **Bước 1: Viết test fail trước**

Tạo file mới `frontend-react/src/services/api.fetchPropertiesPage.test.js`:

```js
import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test('mock mode: filters, sorts, and paginates MOCK_PROPERTIES, returning Spring Page<>-shaped metadata', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'true');
  vi.resetModules();
  const { fetchPropertiesPage } = await import('./api.js');

  const result = await fetchPropertiesPage({ category: 'nha' }, 0, 5, 'createdAt,desc');

  expect(result.items.length).toBeLessThanOrEqual(5);
  expect(result.items.every((item) => item.category === 'nha')).toBe(true);
  expect(typeof result.totalElements).toBe('number');
  expect(typeof result.totalPages).toBe('number');
  expect(result.page).toBe(0);
  // newest-first: every item's createdAt is >= the next item's createdAt
  for (let i = 0; i < result.items.length - 1; i += 1) {
    expect(new Date(result.items[i].createdAt).getTime())
      .toBeGreaterThanOrEqual(new Date(result.items[i + 1].createdAt).getTime());
  }
});

test('mock mode: page 2 of a filtered set does not repeat items from page 1', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'true');
  vi.resetModules();
  const { fetchPropertiesPage } = await import('./api.js');

  const page0 = await fetchPropertiesPage({}, 0, 5, 'createdAt,desc');
  const page1 = await fetchPropertiesPage({}, 1, 5, 'createdAt,desc');

  const page0Ids = new Set(page0.items.map((item) => item.id));
  expect(page1.items.every((item) => !page0Ids.has(item.id))).toBe(true);
});

test('real API mode: sends page/size/sort as query params and reads Page<> metadata from the response', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'false');
  vi.resetModules();
  const { fetchPropertiesPage } = await import('./api.js');

  let capturedUrl = '';
  vi.stubGlobal('fetch', vi.fn((url) => {
    capturedUrl = url;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        content: [
          { id: 'p1', title: 'A', address: '1 Test St', price: 1000000000, status: 'AVAILABLE', category: { id: 'c1', slug: 'nha' }, attributes: {} },
        ],
        totalElements: 42,
        totalPages: 5,
        number: 2,
      }),
    });
  }));

  const result = await fetchPropertiesPage({ category: 'nha' }, 2, 9, 'price,asc');

  expect(capturedUrl).toContain('page=2');
  expect(capturedUrl).toContain('size=9');
  expect(capturedUrl).toContain('sort=price%2Casc');
  expect(result.items).toHaveLength(1);
  expect(result.items[0].id).toBe('p1');
  expect(result.totalElements).toBe(42);
  expect(result.totalPages).toBe(5);
  expect(result.page).toBe(2);
});
```

- [ ] **Bước 2: Chạy test, xác nhận fail đúng lý do**

Run: `cd frontend-react && npx vitest run --environment jsdom src/services/api.fetchPropertiesPage.test.js`
Expected: FAIL — `fetchPropertiesPage` không phải một export của `api.js`.

- [ ] **Bước 3: Implement**

Trong `frontend-react/src/services/api.js`, sửa dòng import đầu file (hiện `import { buildAdminQuery, buildPropertyQuery, filterProperties } from './propertyFilters.js';`):

```js
import { buildAdminQuery, buildPropertyQuery, filterProperties, paginateProperties, sortProperties } from './propertyFilters.js';
```

Thêm hàm mới ngay sau `fetchProperties` (không sửa `fetchProperties` hiện có):

```js
// Separate from fetchProperties() on purpose: that function's bare-array return shape
// is relied on by HomePage's category rows and fetchPropertyDetail's fallback fetch.
// Changing it would force every call site to change too. This function exists only
// for pages that need real pagination (SearchPage), and mirrors the real backend's
// Page<> shape (content/totalElements/totalPages/number) in both branches.
export async function fetchPropertiesPage(filters, page = 0, size = 9, sort = 'createdAt,desc') {
  if (USE_MOCK_API) {
    const filtered = filterProperties(MOCK_PROPERTIES, filters);
    const sorted = sortProperties(filtered, sort);
    return delay(paginateProperties(sorted, page, size));
  }
  const query = buildPropertyQuery({ ...filters, page, size, sort });
  const response = await request(`/properties${query ? `?${query}` : ''}`);
  return {
    items: (response.content || []).map(normalizeProperty),
    totalElements: response.totalElements ?? 0,
    totalPages: response.totalPages ?? 1,
    page: response.number ?? page,
  };
}
```

- [ ] **Bước 4: Chạy test, xác nhận pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/services/api.fetchPropertiesPage.test.js`
Expected: cả 3 test pass.

- [ ] **Bước 5: Chạy toàn bộ test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: không fail nào.

- [ ] **Bước 6: Commit**

```bash
git add frontend-react/src/services/api.js frontend-react/src/services/api.fetchPropertiesPage.test.js
git commit -m "feat: add fetchPropertiesPage API function

New function, not a change to fetchProperties() — keeps every existing
caller (HomePage category rows, property detail fallback) untouched.
Mock and real branches both return the same Spring Page<>-shaped
{ items, totalElements, totalPages, page }."
```

---

### Task 3: Component `PropertyCarousel`

**Files:**
- Create: `frontend-react/src/components/PropertyCarousel.jsx`
- Modify: `frontend-react/src/styles/home.css`
- Test: `frontend-react/src/components/PropertyCarousel.test.jsx` (tạo mới)

**Interfaces:**
- Consumes: `PropertyCard` (đã có, `../components/PropertyCard.jsx`), `Icon` (đã có, `./ui/Icon.jsx`).
- Produces: `export default function PropertyCarousel({ items, visibleCount = 3 })` — `items: Property[] | null`. `export function getCarouselButtonState(scrollLeft, scrollWidth, clientWidth, epsilon = 1)` — hàm thuần, xuất riêng để test không phụ thuộc layout thật của jsdom. Task 4 (HomePage) import `PropertyCarousel` (default export) theo tên.

**Quyết định thiết kế quan trọng (đã tính trong lúc viết plan, không phải chỗ để tuỳ biến lúc code):**
Carousel dùng cơ chế cuộn ngang thật (`overflow-x: auto` + `scroll-snap`) thay vì tự vẽ lại vị trí bằng `transform`. Nút mũi tên gọi `element.scrollBy({ left: ± clientWidth, behavior: 'smooth' })` — cuộn đúng "một khung nhìn" bất kể khung nhìn đó đang hiện 1, 2 hay 3 card tại breakpoint hiện tại, nên JS không cần biết chính xác breakpoint nào đang active. Trạng thái disabled của 2 nút được tính từ `scrollLeft`/`scrollWidth`/`clientWidth` thật của phần tử — nhưng vì jsdom không tính layout thật (`scrollWidth`/`clientWidth` luôn là 0 trong test), phần tính toán đó được tách thành hàm thuần `getCarouselButtonState` để test trực tiếp bằng số giả, không phụ thuộc layout.

- [ ] **Bước 1: Viết test fail trước**

Tạo file mới `frontend-react/src/components/PropertyCarousel.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PropertyCarousel, { getCarouselButtonState } from './PropertyCarousel.jsx';

afterEach(() => cleanup());

function itemsOf(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    title: `Tin đăng ${i}`,
    priceLabel: '1 tỷ',
    ward: 'phuong-tra-vinh',
  }));
}

test('renders skeleton placeholders while items is null (loading)', () => {
  const { container } = render(<PropertyCarousel items={null} />);
  expect(container.querySelectorAll('.pcard-skeleton')).toHaveLength(3);
});

test('renders nothing when items is an empty array — no empty carousel section', () => {
  const { container } = render(<PropertyCarousel items={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders every item as a real PropertyCard', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(5)} />);
  expect(container.querySelectorAll('.pcard')).toHaveLength(5);
});

test('hides both arrow buttons when there are no more items than fit in one view', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(3)} visibleCount={3} />);
  expect(container.querySelectorAll('.carousel-arrow-btn')).toHaveLength(0);
});

test('shows arrow buttons when there are more items than fit in one view', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(5)} visibleCount={3} />);
  expect(container.querySelectorAll('.carousel-arrow-btn')).toHaveLength(2);
});

test('never auto-advances — no timer-driven scroll call', () => {
  const scrollBySpy = Element.prototype.scrollBy;
  let callCount = 0;
  Element.prototype.scrollBy = () => { callCount += 1; };
  render(<PropertyCarousel items={itemsOf(6)} />);
  // No fake timers needed: if the component used setInterval/setTimeout to
  // auto-advance, this would need to be proven absent by construction, not by
  // waiting. The real guarantee is architectural (no timer in the component) —
  // this assertion just confirms mounting alone triggers zero scroll calls.
  expect(callCount).toBe(0);
  Element.prototype.scrollBy = scrollBySpy;
});

test('"Xem tất cả" links to the unfiltered search page', () => {
  render(<PropertyCarousel items={itemsOf(5)} />);
  expect(screen.getByText('Xem tất cả').closest('a')).toHaveAttribute('href', '#/search');
});

test('clicking the right arrow scrolls forward by one viewport width', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(6)} />);
  const track = container.querySelector('.carousel-track');
  Object.defineProperty(track, 'clientWidth', { value: 900, configurable: true });
  const scrollBySpy = vi_fnScrollBy(track);
  fireEvent.click(screen.getByLabelText('Xem tin tiếp theo'));
  expect(scrollBySpy).toHaveBeenCalledWith({ left: 900, behavior: 'smooth' });
});

test('clicking the left arrow scrolls backward by one viewport width', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(6)} />);
  const track = container.querySelector('.carousel-track');
  Object.defineProperty(track, 'clientWidth', { value: 900, configurable: true });
  const scrollBySpy = vi_fnScrollBy(track);
  fireEvent.click(screen.getByLabelText('Xem tin trước đó'));
  expect(scrollBySpy).toHaveBeenCalledWith({ left: -900, behavior: 'smooth' });
});

// jsdom has no real scrollBy — stub it per-element and return the stub so the
// test can assert on call args, without needing a global vi.fn() import juggle.
function vi_fnScrollBy(element) {
  const calls = [];
  element.scrollBy = (arg) => calls.push(arg);
  calls.toHaveBeenCalledWith = undefined; // not used; see helper below
  return {
    toHaveBeenCalledWith: (expected) => {
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual(expected);
    },
  };
}

// ── getCarouselButtonState (pure) ──────────────────────────
test('getCarouselButtonState: at the very start, prev is disabled, next is enabled', () => {
  expect(getCarouselButtonState(0, 3000, 900)).toEqual({ canGoPrev: false, canGoNext: true });
});

test('getCarouselButtonState: at the very end, next is disabled, prev is enabled', () => {
  expect(getCarouselButtonState(2100, 3000, 900)).toEqual({ canGoPrev: true, canGoNext: false });
});

test('getCarouselButtonState: in the middle, both are enabled', () => {
  expect(getCarouselButtonState(900, 3000, 900)).toEqual({ canGoPrev: true, canGoNext: true });
});

test('getCarouselButtonState: everything fits in one view, both are disabled', () => {
  expect(getCarouselButtonState(0, 900, 900)).toEqual({ canGoPrev: false, canGoNext: false });
});
```

(Ghi chú: cách viết `vi_fnScrollBy` ở trên là một helper thủ công thay vì `vi.fn()` gắn trực tiếp lên `Element.prototype.scrollBy`, vì `scrollBy` không tồn tại thật trong jsdom và cần gán trực tiếp lên từng instance element trong từng test để đo lời gọi mà không rò rỉ giữa các test. Nếu lúc code thấy cách này rườm rà, có thể thay bằng `element.scrollBy = vi.fn()` rồi `expect(element.scrollBy).toHaveBeenCalledWith(...)` trực tiếp — miễn giữ đúng ý nghĩa test, không đổi hành vi kiểm tra.)

- [ ] **Bước 2: Chạy test, xác nhận fail đúng lý do**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/PropertyCarousel.test.jsx`
Expected: FAIL — không tìm thấy file `PropertyCarousel.jsx`.

- [ ] **Bước 3: Implement**

Tạo file `frontend-react/src/components/PropertyCarousel.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import PropertyCard from './PropertyCard.jsx';
import Icon from './ui/Icon.jsx';

// Pure — separated from the component so button-disabled logic is testable
// with plain numbers, since jsdom never computes real scrollWidth/clientWidth.
export function getCarouselButtonState(scrollLeft, scrollWidth, clientWidth, epsilon = 1) {
  return {
    canGoPrev: scrollLeft > epsilon,
    canGoNext: scrollLeft + clientWidth < scrollWidth - epsilon,
  };
}

export default function PropertyCarousel({ items, visibleCount = 3 }) {
  const trackRef = useRef(null);
  const [buttonState, setButtonState] = useState({ canGoPrev: false, canGoNext: true });

  function updateButtonState() {
    const track = trackRef.current;
    if (!track) return;
    setButtonState(getCarouselButtonState(track.scrollLeft, track.scrollWidth, track.clientWidth));
  }

  useEffect(() => {
    updateButtonState();
    // items changes the track's content/width — re-measure once rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function scrollByOneView(direction) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth, behavior: 'smooth' });
  }

  if (items === null) {
    return (
      <section className="section">
        <div className="container">
          <div className="pcard-grid">
            {Array.from({ length: visibleCount }, (_, i) => (
              <div key={i} className="pcard-skeleton" aria-hidden="true" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  const showArrows = items.length > visibleCount;

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="text-display-md">Tin đăng mới nhất</h2>
            <p>Tin mới cập nhật trên toàn hệ thống</p>
          </div>
          <div className="carousel-header-actions">
            {showArrows && (
              <div className="carousel-arrows">
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  aria-label="Xem tin trước đó"
                  disabled={!buttonState.canGoPrev}
                  onClick={() => scrollByOneView(-1)}
                >
                  <Icon name="ChevronLeft" size={18} />
                </button>
                <button
                  type="button"
                  className="carousel-arrow-btn"
                  aria-label="Xem tin tiếp theo"
                  disabled={!buttonState.canGoNext}
                  onClick={() => scrollByOneView(1)}
                >
                  <Icon name="ChevronRight" size={18} />
                </button>
              </div>
            )}
            <a href="#/search" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
        </div>
        <div className="carousel-track" ref={trackRef} onScroll={updateButtonState}>
          {items.map((property) => (
            <div className="carousel-item" key={property.id || property.title}>
              <PropertyCard property={property} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Bước 4: Thêm CSS**

Trong `frontend-react/src/styles/home.css`, **xoá** khối CSS chết `.tro-showcase-row`/`.tro-showcase-card`/`.tro-showcase-card:hover` (comment tiêu đề `HOME — SHOWCASE CARDS (Trọ / Nhà / Đất rows)` — đã xác nhận không còn JSX nào dùng, là code chết từ thiết kế trước `ListingGrid`/`pcard-grid` hiện tại). Thay bằng khối carousel mới, cùng vị trí:

```css
/* ============================================================
   HOME — NEWEST LISTINGS CAROUSEL
   ============================================================ */
.carousel-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.carousel-arrows {
  display: flex;
  gap: var(--space-2);
}

.carousel-arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  color: var(--color-ink);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.carousel-arrow-btn:hover:not(:disabled) {
  background: var(--color-surface-soft);
  border-color: var(--color-hairline-strong);
}

.carousel-arrow-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.carousel-track {
  display: flex;
  gap: var(--space-4);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--space-2);
}

.carousel-item {
  flex: 0 0 85%;
  scroll-snap-align: start;
  min-width: 0;
}

@media (min-width: 744px) {
  .carousel-item { flex-basis: calc(50% - var(--space-4) / 2); }
}

@media (min-width: 1128px) {
  .carousel-item { flex-basis: calc(33.333% - (var(--space-4) * 2 / 3)); }
}
```

(Vị trí trong file: đặt đúng chỗ khối `.tro-showcase-row` cũ đang chiếm, để không phải dò lại toàn bộ file — khối cũ nằm ngay dưới comment `HOME — SHOWCASE CARDS`.)

- [ ] **Bước 5: Chạy test, xác nhận pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/PropertyCarousel.test.jsx`
Expected: tất cả test pass.

- [ ] **Bước 6: Chạy toàn bộ test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: không fail nào (không có JSX nào khác dùng `.tro-showcase-row`/`.tro-showcase-card` — đã xác nhận bằng grep trước khi viết plan này, nhưng chạy lại đầy đủ suite để chắc chắn không có test ẩn nào phụ thuộc class đó).

- [ ] **Bước 7: Commit**

```bash
git add frontend-react/src/components/PropertyCarousel.jsx frontend-react/src/components/PropertyCarousel.test.jsx frontend-react/src/styles/home.css
git commit -m "feat: add PropertyCarousel component

Real horizontal scroll (overflow-x + scroll-snap) driven by
scrollBy(clientWidth) on arrow click, not a JS-tracked index — works
correctly across breakpoints without JS needing to know how many
cards are visible at each one. Button disabled-state logic is a pure
function (getCarouselButtonState) since jsdom has no real layout to
test against. Also removes .tro-showcase-row/.tro-showcase-card, dead
CSS from a pre-ListingGrid design with zero remaining JSX consumers."
```

---

### Task 4: Gắn `PropertyCarousel` vào `HomePage.jsx`

**Files:**
- Modify: `frontend-react/src/pages/HomePage.jsx`
- Modify: `frontend-react/src/pages/HomePage.test.jsx`

**Interfaces:**
- Consumes: `PropertyCarousel` (Task 3), `fetchProperties` (đã có, không sửa).
- Produces: không có gì mới cho task khác dùng — đây là điểm cuối tích hợp của Task 3.

- [ ] **Bước 1: Cập nhật import**

Trong `frontend-react/src/pages/HomePage.jsx`, thêm import (sau dòng `import PropertyCard from '../components/PropertyCard.jsx';`):

```jsx
import PropertyCarousel from '../components/PropertyCarousel.jsx';
```

- [ ] **Bước 2: Thêm state + fetch cho tin mới nhất**

Trong hàm `HomePage`, ngay sau khai báo `datProperties` (dòng hiện tại `const [datProperties, setDatProperties] = useState(null);`):

```jsx
  const [newestProperties, setNewestProperties] = useState(null);
```

Thêm `useEffect` mới, ngay sau `useEffect` fetch 3 hàng danh mục hiện có (sau dấu đóng `}, []);` của effect đó):

```jsx
  useEffect(() => {
    let alive = true;
    fetchProperties({ sort: 'createdAt,desc', size: 12 })
      .then((items) => { if (alive) setNewestProperties(items); })
      .catch(() => { if (alive) setNewestProperties([]); });
    return () => { alive = false; };
  }, []);
```

- [ ] **Bước 3: Chèn carousel vào JSX**

Giữa `{/* 1. HERO */}` section (kết thúc bằng `</section>`) và `{/* 2. CATEGORIES */}`, thêm:

```jsx
      {/* 1.5 NEWEST LISTINGS CAROUSEL */}
      <PropertyCarousel items={newestProperties} />

      {/* 2. CATEGORIES */}
```

- [ ] **Bước 4: Viết test cho HomePage (fail trước)**

Trong `frontend-react/src/pages/HomePage.test.jsx`, cập nhật import ở đầu file (hiện chỉ import `HomePage` từ `./HomePage.jsx`), thêm import `fetchProperties` từ module đã mock và `beforeEach`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchProperties: vi.fn().mockResolvedValue([]),
}));

import { fetchProperties } from '../services/api.js';
import HomePage from './HomePage.jsx';

beforeEach(() => { fetchProperties.mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
```

(`beforeEach` reset về `[]` mỗi test — tránh một test sau bị ảnh hưởng bởi `mockResolvedValue` mà một test trước đó đổi, không phụ thuộc thứ tự chạy test.)

Thêm 2 test mới vào cuối file:

```jsx
test('"Tin đăng mới nhất" carousel does not render when there is no data', async () => {
  render(<HomePage />);
  await screen.findByText('Khám phá theo loại hình'); // wait for the page to finish its initial render
  expect(screen.queryByText('Tin đăng mới nhất')).not.toBeInTheDocument();
});

test('"Tin đăng mới nhất" carousel renders real listings fetched with sort=createdAt,desc', async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, title: `Tin ${i}`, priceLabel: '1 tỷ' }));
  fetchProperties.mockResolvedValue(items);
  render(<HomePage />);

  const heading = await screen.findByText('Tin đăng mới nhất');
  const section = heading.closest('.section');
  expect(section.querySelectorAll('.pcard')).toHaveLength(5);

  expect(fetchProperties).toHaveBeenCalledWith({ sort: 'createdAt,desc', size: 12 });
});
```

- [ ] **Bước 5: Chạy test, xác nhận fail đúng lý do**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/HomePage.test.jsx`
Expected: FAIL trước khi Bước 1-3 được áp dụng — nếu làm đúng thứ tự plan (implement trước, test sau như các task khác) thì thực chất bước fail này nên chạy TRƯỚC bước 1-3. **Lưu ý cho người thực thi**: task này ngoại lệ về thứ tự TDD literal — vì đây là một trang tích hợp (không phải logic thuần), thứ tự thực dụng là: viết import+state+effect+JSX (Bước 1-3) trước, viết test tích hợp sau (Bước 4), chạy 1 lần để xác nhận pass (không có bước "chạy fail" tách riêng, vì component đã tồn tại — chỉ có logic *tích hợp* mới, không phải logic thuần cần chứng minh RED trước). Điều bắt buộc giữ nguyên là: **chạy test ít nhất 1 lần và đọc kỹ output** trước khi coi là xong, không đoán.

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/HomePage.test.jsx`
Expected: 5 test pass (3 test cũ + 2 test mới).

- [ ] **Bước 6: Chạy toàn bộ test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: không fail nào.

- [ ] **Bước 7: Commit**

```bash
git add frontend-react/src/pages/HomePage.jsx frontend-react/src/pages/HomePage.test.jsx
git commit -m "feat: wire PropertyCarousel into HomePage as the newest-listings section

Fetches 12 newest listings (sort=createdAt,desc) via the existing
fetchProperties(), independent of the 3 category rows below it.
Deliberately duplicates listings that may also appear in their own
category row — 'newest' and 'by category' are different lenses on
the same catalog, not redundant (per this session's design review)."
```

---

### Task 5: Component `Pagination`

**Files:**
- Create: `frontend-react/src/components/Pagination.jsx`
- Modify: `frontend-react/src/styles.css`
- Test: `frontend-react/src/components/Pagination.test.jsx` (tạo mới)

**Interfaces:**
- Consumes: `Icon` (đã có).
- Produces: `export default function Pagination({ page, totalPages, onPageChange, disabled })` — `page` 0-indexed. `export function buildPageList(current, total)` — hàm thuần, `current`/`total` là 1-indexed (để dễ test/đọc — component tự +1 khi gọi). Task 6 (`SearchPage.jsx`) import `Pagination` (default) theo tên.

- [ ] **Bước 1: Viết test fail trước**

Tạo file `frontend-react/src/components/Pagination.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Pagination, { buildPageList } from './Pagination.jsx';

afterEach(() => cleanup());

// ── buildPageList (pure) ──────────────────────────────────
test('buildPageList shows every page when total is small', () => {
  expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
});

test('buildPageList collapses the middle with an ellipsis when total is large', () => {
  expect(buildPageList(1, 10)).toEqual([1, 2, '...', 10]);
});

test('buildPageList keeps current page and its neighbors visible', () => {
  expect(buildPageList(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
});

test('buildPageList at the last page has no trailing ellipsis', () => {
  expect(buildPageList(10, 10)).toEqual([1, '...', 9, 10]);
});

// ── Pagination component ──────────────────────────────────
test('renders nothing when there is only 1 page', () => {
  const { container } = render(<Pagination page={0} totalPages={1} onPageChange={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders page numbers 1-indexed, marking the current page', () => {
  render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
  const current = screen.getByRole('button', { name: '2' });
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(current).toHaveClass('is-active');
});

test('"Trước" is disabled on the first page, "Tiếp" is disabled on the last page', () => {
  const { rerender } = render(<Pagination page={0} totalPages={3} onPageChange={() => {}} />);
  expect(screen.getByText('Trước').closest('button')).toBeDisabled();
  expect(screen.getByText('Tiếp').closest('button')).not.toBeDisabled();

  rerender(<Pagination page={2} totalPages={3} onPageChange={() => {}} />);
  expect(screen.getByText('Trước').closest('button')).not.toBeDisabled();
  expect(screen.getByText('Tiếp').closest('button')).toBeDisabled();
});

test('clicking a page number calls onPageChange with the 0-indexed page', () => {
  const onPageChange = vi.fn();
  render(<Pagination page={0} totalPages={3} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

test('clicking "Tiếp" advances by one page', () => {
  const onPageChange = vi.fn();
  render(<Pagination page={0} totalPages={3} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByText('Tiếp').closest('button'));
  expect(onPageChange).toHaveBeenCalledWith(1);
});

test('all buttons are disabled while disabled=true, even mid-list pages', () => {
  render(<Pagination page={1} totalPages={5} onPageChange={() => {}} disabled />);
  expect(screen.getByText('Trước').closest('button')).toBeDisabled();
  expect(screen.getByText('Tiếp').closest('button')).toBeDisabled();
  expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
});
```

- [ ] **Bước 2: Chạy test, xác nhận fail đúng lý do**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Pagination.test.jsx`
Expected: FAIL — không tìm thấy file `Pagination.jsx`.

- [ ] **Bước 3: Implement**

Tạo file `frontend-react/src/components/Pagination.jsx`:

```jsx
import Icon from './ui/Icon.jsx';

// Pure — windowed page list: always show first, last, current, and current's
// immediate neighbors; collapse any gap into a single '...' entry.
export function buildPageList(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('...');
    result.push(page);
  });
  return result;
}

export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;
  const current = page + 1;
  const pageList = buildPageList(current, totalPages);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="pagination-btn"
        disabled={disabled || page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon name="ChevronLeft" size={16} /> Trước
      </button>
      <div className="pagination-pages">
        {pageList.map((item, index) => (
          item === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`pagination-page-btn${item === current ? ' is-active' : ''}`}
              disabled={disabled}
              aria-current={item === current ? 'page' : undefined}
              onClick={() => onPageChange(item - 1)}
            >
              {item}
            </button>
          )
        ))}
      </div>
      <button
        type="button"
        className="pagination-btn"
        disabled={disabled || page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Tiếp <Icon name="ChevronRight" size={16} />
      </button>
    </nav>
  );
}
```

- [ ] **Bước 4: Thêm CSS**

Trong `frontend-react/src/styles.css`, thêm ngay sau khối `.sort-select { ... }` hiện có (dòng ~2818, search class đó để tìm đúng vị trí):

```css
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-8);
  flex-wrap: wrap;
}

.pagination-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  color: var(--color-body);
  font-size: var(--text-sm);
  cursor: pointer;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.pagination-pages {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.pagination-page-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-body);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

.pagination-page-btn:hover:not(:disabled):not(.is-active) {
  background: var(--color-surface-soft);
}

.pagination-page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.pagination-page-btn.is-active {
  background: var(--color-primary);
  color: var(--color-canvas);
  border-color: var(--color-primary);
}

.pagination-ellipsis {
  color: var(--color-muted);
  padding: 0 var(--space-1);
}
```

- [ ] **Bước 5: Chạy test, xác nhận pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Pagination.test.jsx`
Expected: tất cả test pass.

- [ ] **Bước 6: Chạy toàn bộ test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: không fail nào.

- [ ] **Bước 7: Commit**

```bash
git add frontend-react/src/components/Pagination.jsx frontend-react/src/components/Pagination.test.jsx frontend-react/src/styles.css
git commit -m "feat: add Pagination component

Windowed page-number list (buildPageList, pure/testable) collapsing
long ranges into a single ellipsis. page prop is 0-indexed to match
Spring's Pageable; displayed numbers are 1-indexed."
```

---

### Task 6: Chuyển `SearchPage.jsx` sang `fetchPropertiesPage` + gắn `Pagination`

**Files:**
- Modify: `frontend-react/src/pages/SearchPage.jsx`
- Test: `frontend-react/src/pages/SearchPage.test.jsx` (tạo mới — chưa từng có)

**Interfaces:**
- Consumes: `fetchPropertiesPage` (Task 2), `Pagination` (Task 5).
- Produces: không có gì mới cho task khác dùng.

- [ ] **Bước 1: Cập nhật import**

Sửa dòng import ở đầu `frontend-react/src/pages/SearchPage.jsx` (hiện `import { fetchCategories, fetchProperties } from '../services/api.js';`):

```jsx
import { fetchCategories, fetchPropertiesPage } from '../services/api.js';
import Pagination from '../components/Pagination.jsx';
```

- [ ] **Bước 2: Thêm state phân trang, bỏ sort client-side**

Thay khối state hiện tại (dòng ~55-64):

```jsx
  const [filters, setFilters] = useState(() => filtersFromQuery(queryParams));
  const [appliedFilters, setAppliedFilters] = useState(() => filtersFromQuery(queryParams));
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('newest');
```

thành:

```jsx
  const [filters, setFilters] = useState(() => filtersFromQuery(queryParams));
  const [appliedFilters, setAppliedFilters] = useState(() => filtersFromQuery(queryParams));
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
```

Thêm hằng số ngay trên khai báo `function filtersFromQuery` (đầu file, gần `PRICE_GROUPS`):

```jsx
const PAGE_SIZE = 9;
const SORT_PARAM = {
  newest: 'createdAt,desc',
  'price-asc': 'price,asc',
  'price-desc': 'price,desc',
};
```

- [ ] **Bước 3: Reset về trang 1 khi đổi filter/sort/URL, thay effect fetch**

Sửa effect đồng bộ `queryParams` (dòng ~66-70):

```jsx
  useEffect(() => {
    const nextFilters = filtersFromQuery(queryParams);
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(0);
  }, [queryKey]);
```

Thay effect fetch properties + `sortedProperties` memo (dòng ~86-112) bằng:

```jsx
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    fetchPropertiesPage(appliedFilters, page, PAGE_SIZE, SORT_PARAM[sort] || SORT_PARAM.newest)
      .then((result) => {
        if (!alive) return;
        setProperties(result.items);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
      })
      .catch((exception) => {
        if (!alive) return;
        setError(exception.message || 'Không tải được danh sách tin.');
        setProperties([]);
        setTotalPages(1);
        setTotalElements(0);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [appliedFilters, sort, page]);
```

(Xoá hoàn toàn `useMemo` cũ của `sortedProperties` — không còn cần, server đã trả đúng thứ tự.)

- [ ] **Bước 4: Reset trang khi bấm "Tìm kiếm ngay"**

Sửa nút tìm kiếm (dòng ~267-272) — đây là chỗ DUY NHẤT thay đổi cho nút này, không lặp lại ở bước nào khác:

```jsx
            <button
              className="btn btn-primary btn-full"
              onClick={() => { setAppliedFilters(filters); setPage(0); }}
            >
              Tìm kiếm ngay
            </button>
```

(Việc đổi `sort` — bao gồm reset trang khi đổi sort — được gộp chung vào Bước 5 dưới đây, vì `<select className="sort-select">` nằm trong cùng khối "Results area" đang được viết lại toàn bộ ở bước đó. Không sửa `<select>` này ở bước 4 — chỉ có MỘT chỗ trong file thật chứa phần tử này, tránh 2 bước cùng đụng một dòng theo 2 cách viết khác nhau.)

- [ ] **Bước 5: Đổi nguồn hiển thị số kết quả + danh sách render + thêm ref cuộn + gắn `Pagination`**

Thêm `useRef` vào import React hooks đầu file (hiện `import { useEffect, useMemo, useState } from 'react';` — bỏ `useMemo` vì không còn dùng, thêm `useRef`):

```jsx
import { useEffect, useRef, useState } from 'react';
```

Thêm khai báo ref trong component, cạnh các state khác:

```jsx
  const resultsRef = useRef(null);
```

Sửa khối "Results area" (dòng ~276-315):

```jsx
          {/* Results area */}
          <section ref={resultsRef}>
            <div className="results-toolbar">
              <span className="results-count">
                {loading ? 'Đang tìm...' : `${totalElements} kết quả`}
              </span>
              <div className="filter-bar-inner">
                <span className="results-count">Sắp xếp:</span>
                <select
                  className="sort-select"
                  value={sort}
                  onChange={(event) => { setSort(event.target.value); setPage(0); }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price-asc">Giá thấp đến cao</option>
                  <option value="price-desc">Giá cao đến thấp</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <div data-testid="property-grid" className="grid-3">
              {loading && [1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="skeleton skeleton-card" />
              ))}
              {!loading && properties.length === 0 && (
                <div className="card empty-state">
                  <h2 className="empty-state-title">Chưa có tin phù hợp</h2>
                  <p className="empty-state-desc">Hãy thử nới bộ lọc hoặc chọn khu vực khác.</p>
                </div>
              )}
              {!loading && properties.map((property) => (
                <PropertyCard key={property.id || property.title} property={property} compact />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              disabled={loading}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </section>
```

(Lưu ý: `<select className="sort-select" ...>` xuất hiện 2 lần trong bước 4 và bước 5 của plan này — thực tế chỉ có MỘT chỗ trong code, bước 5 ghi lại toàn bộ khối "Results area" bao gồm luôn thay đổi đã mô tả ở bước 4 để không bị nhầm khi áp dụng patch; không tạo ra 2 `<select>` trùng nhau trong file thật.)

- [ ] **Bước 6: Viết test cho `SearchPage` (fail trước)**

Tạo file mới `frontend-react/src/pages/SearchPage.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchPropertiesPage: vi.fn(),
}));

import { fetchPropertiesPage } from '../services/api.js';
import SearchPage from './SearchPage.jsx';

function pageResult(page, totalPages, totalElements, items = []) {
  return { items, totalElements, totalPages, page };
}

beforeEach(() => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 1, 0));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('fetches page 0 on first render with the default sort', async () => {
  render(<SearchPage queryParams={{}} />);
  await waitFor(() => expect(fetchPropertiesPage).toHaveBeenCalled());
  const [, page, size, sort] = fetchPropertiesPage.mock.calls[0];
  expect(page).toBe(0);
  expect(size).toBe(9);
  expect(sort).toBe('createdAt,desc');
});

test('shows totalElements from the response, not just the current page\'s item count', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 5, 42, Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, title: `T${i}` }))));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('42 kết quả');
});

test('does not render pagination when there is only 1 page', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 1, 3, [{ id: 'p1', title: 'A' }]));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('3 kết quả');
  expect(screen.queryByRole('navigation', { name: 'Phân trang' })).not.toBeInTheDocument();
});

test('clicking a page number keeps the same filters and sort, changes only the page', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 3, 27, Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, title: `T${i}` }))));
  render(<SearchPage queryParams={{ category: 'nha' }} />);
  await screen.findByText('27 kết quả');

  fireEvent.click(screen.getByRole('button', { name: '2' }));

  await waitFor(() => {
    const lastCall = fetchPropertiesPage.mock.calls.at(-1);
    expect(lastCall[1]).toBe(1); // page index
    expect(lastCall[0]).toMatchObject({ category: 'nha' }); // filters unchanged
  });
});

test('changing sort resets to page 0', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(2, 3, 27, Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, title: `T${i}` }))));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('27 kết quả');

  fireEvent.change(screen.getByDisplayValue('Mới nhất'), { target: { value: 'price-asc' } });

  await waitFor(() => {
    const lastCall = fetchPropertiesPage.mock.calls.at(-1);
    expect(lastCall[1]).toBe(0); // page reset
    expect(lastCall[3]).toBe('price,asc');
  });
});

test('clicking "Tìm kiếm ngay" resets to page 0 with the new filters', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 1, 5, [{ id: 'p1', title: 'A' }]));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('5 kết quả');

  fireEvent.change(screen.getByPlaceholderText('Ví dụ: Trà Vinh, Phường 6...'), { target: { value: 'Long Đức' } });
  fireEvent.click(screen.getByText('Tìm kiếm ngay'));

  await waitFor(() => {
    const lastCall = fetchPropertiesPage.mock.calls.at(-1);
    expect(lastCall[1]).toBe(0);
    expect(lastCall[0]).toMatchObject({ query: 'Long Đức' });
  });
});
```

- [ ] **Bước 7: Chạy test, xác nhận pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/SearchPage.test.jsx`
Expected: tất cả 6 test pass. Nếu fail, đọc kỹ output thật — đây là trang phức tạp nhất trong plan (nhiều state phối hợp), khả năng cao cần điều chỉnh nhỏ ở cách `waitFor`/query text khớp với DOM thật (ví dụ label chính xác của input tìm kiếm, thứ tự tham số gọi `fetchPropertiesPage`) — không đoán, sửa theo output thật.

- [ ] **Bước 8: Chạy toàn bộ test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: không fail nào. Đặc biệt kiểm tra không còn test nào (nếu có, ở nơi khác trong codebase) still reference `fetchProperties` (không phải `fetchPropertiesPage`) trong ngữ cảnh `SearchPage` — chạy `grep -rn "fetchProperties\b" frontend-react/src/pages/SearchPage.jsx` phải trả về rỗng sau bước này (chỉ `fetchPropertiesPage` còn lại).

- [ ] **Bước 9: Commit**

```bash
git add frontend-react/src/pages/SearchPage.jsx frontend-react/src/pages/SearchPage.test.jsx
git commit -m "feat: real pagination on SearchPage, replacing unbounded single-fetch grid

Sort moves from client-side Array.sort (wrong once paginated — would
only reorder the current page's 9 items) to a query param sent
alongside page/size. Changing filters or sort explicitly resets to
page 0 at the point of the user action, not via a reactive effect
chain, to avoid a double-fetch when both page and filters would
otherwise change in the same render cycle."
```

---

### Task 7: Xác minh trực quan — carousel + phân trang, các breakpoint, sáng/tối

**Files:** không có (chỉ xác minh).

**Interfaces:** không có.

- [ ] **Bước 1: Khởi động dev server (mock API)**

Run (background): `cd frontend-react && VITE_USE_MOCK_API=true npm run dev`
Expected: server tại `http://localhost:5173`.

- [ ] **Bước 2: Chụp ảnh trang chủ — carousel**

Dùng Playwright (đã có sẵn ở root `package.json`, dùng lại đúng script pattern đã dùng để xác minh plan trước — khởi tạo trực tiếp một script `.mjs` tạm trong thư mục gốc repo để node resolve được `node_modules`, không đặt trong scratchpad ngoài repo):
- `/` (trang chủ) ở 3 viewport: `375px` (mobile), `900px` (tablet), `1440px` (desktop) — light theme.
- Xác nhận: carousel hiện đúng 1 (mobile, có hé một phần card kế tiếp)/2 (tablet)/3 (desktop) card cùng lúc; 2 nút mũi tên hiện khi đủ dữ liệu (mock có 48 item, chắc chắn > 12 đã fetch, nên > 3 hiển thị cùng lúc ở mọi breakpoint — nút phải phải bấm được, nút trái disabled ở vị trí đầu); không có nút nào looks giống code cũ (`.tro-showcase-*` không còn tồn tại trong DOM).

- [ ] **Bước 3: Chụp ảnh trang tìm kiếm — phân trang**

`/#/search` ở desktop (1440px), light + dark:
- Xác nhận: đúng 9 card/trang (grid 3×3 ở desktop); thanh phân trang hiện đúng dạng `Trước 1 2 3 ... N Tiếp`; bấm sang trang 2, xác nhận danh sách đổi và bộ lọc/sort không bị reset; đổi "Sắp xếp", xác nhận quay về trang 1 (số trang hiện tại trong thanh phân trang phải là 1/trang đầu được tô đậm).

- [ ] **Bước 4: Kiểm tra console**

Không có lỗi console ở bất kỳ trang/viewport nào đã chụp — một trang có thể render khung sườn trong khi mọi lệnh gọi API đều lỗi ngầm, chỉ ảnh chụp không đủ để phát hiện việc này.

- [ ] **Bước 5: Dừng dev server, dọn file tạm**

Nếu có tạo script `.mjs` tạm trong thư mục gốc để chạy Playwright, xoá file đó sau khi xong (đã có tiền lệ chính xác từ plan trước: `_verify-charts-tmp.mjs` được tạo, dùng, rồi xoá — làm giống hệt vậy, không để lại file rác trong repo).

- [ ] **Bước 6: Báo cáo**

Nếu phát hiện bất kỳ vấn đề trực quan nào, sửa trước khi coi plan này là hoàn thành — đây là cổng nghiệm thu cuối cùng của toàn bộ plan, theo đúng tinh thần `verification-before-completion`.
