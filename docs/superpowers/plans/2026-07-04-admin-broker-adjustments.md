# Admin & Broker UI Adjustments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete "Chờ duyệt" property status and the redundant admin account list, add a "Về trang chủ" link to the admin sidebar, clean up the public broker cards (drop response-time, keep sold ≤ total, add "Xem tất cả"), and replace the broker dashboard's "Tạm ẩn" panel with clickable status tabs.

**Architecture:** Frontend-only changes to the React 19 app (`frontend-react`). Admin area uses react-admin v5 (`admin-ra/`, Material UI, design-system-exempt); the public site + broker dashboard use the project's own CSS-token components. Filtering logic lives in pure helpers (`propertyFilters.js`, plus new exported helpers in `BrokersPage.jsx` and `BrokerDashboard.jsx`) so each behavior change is covered by a Vitest unit test.

**Tech Stack:** React 19, Vite 8, react-admin 5.15, Material UI 7 (admin only), lucide-react icons, Vitest + Testing Library.

## Global Constraints

- UI text is **Tiếng Việt**; code identifiers, functions, and comments are **English** (`.claude/rules/workflow.md`).
- Commit messages: **English, conventional commits** (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`). **Do NOT add any "Co-Authored-By" line or Claude attribution** (`CLAUDE.md`).
- No inline styles; no hard-coded `#hex` in JSX — only CSS classes / CSS custom properties (`.claude/rules/design.md`).
- Public site + broker dashboard use only `lucide-react` via `components/ui/Icon.jsx`. **Exception:** the `/admin/*` react-admin area uses Material UI by design and is exempt from the design tokens/typography rules.
- Spacing in CSS uses literal px values matching the 4px scale (this project defines `--radius-*` and `--color-*` tokens but **not** `--space-*` variables — do not reference `--space-*`).
- Mock API mode (`VITE_USE_MOCK_API=true`) is the default dev path; verify behavior against mock data.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `frontend-react/src/admin-ra/resources/statusControls.jsx` | Admin status enums/choices | Remove `PENDING` from `PROPERTY_STATUS` |
| `frontend-react/src/services/mockData.js` | Mock property/user data | Remove `PENDING` from `ADMIN_STATUS_CYCLE` |
| `frontend-react/src/services/mockData.test.js` | Guard: no pending mock listings | **Create** |
| `frontend-react/src/admin-ra/AdminApp.jsx` | react-admin root (resources, layout) | Drop `users` resource; add custom layout |
| `frontend-react/src/admin-ra/resources/users.jsx` | Admin "Tài khoản" list | **Delete** |
| `frontend-react/src/admin-ra/AdminLayout.jsx` | Custom react-admin layout + menu with "Về trang chủ" | **Create** |
| `frontend-react/src/services/propertyFilters.js` | Pure property filter/query helpers | Add `broker` filter |
| `frontend-react/src/services/propertyFilters.test.js` | Filter unit tests | Add broker cases |
| `frontend-react/src/pages/SearchPage.jsx` | Search page + query→filter mapping | Read `broker`/`brokerName`, subtitle |
| `frontend-react/src/pages/BrokersPage.jsx` | Public broker directory cards | Drop response metric, fix sold≤total, add "Xem tất cả"; export `brokerStatsFrom` |
| `frontend-react/src/pages/BrokersPage.test.js` | `brokerStatsFrom` unit test | **Create** |
| `frontend-react/src/pages/BrokerDashboard.jsx` | Broker's own listing manager | Status tabs replace "Tạm ẩn" panel; export filter helpers |
| `frontend-react/src/pages/brokerDashboardListings.test.js` | Listing status filter unit test | **Create** |
| `frontend-react/src/styles.css` | Site styles | Add `.broker-card-footer` / `.broker-card-viewall` |
| `frontend-react/src/styles/dashboard.css` | Dashboard styles | Add `.dashboard-status-tab*` |

---

### Task 1: Remove the "Chờ duyệt" (PENDING) property status

**Files:**
- Modify: `frontend-react/src/admin-ra/resources/statusControls.jsx`
- Modify: `frontend-react/src/services/mockData.js`
- Test: `frontend-react/src/services/mockData.test.js` (create)

**Interfaces:**
- Consumes: `MOCK_PROPERTIES` (array of properties, each with a `rawStatus` string) from `services/mockData.js`.
- Produces: `PROPERTY_STATUS` (array of `{ id, name }`) no longer contains `{ id: 'PENDING', … }`; no `MOCK_PROPERTIES` item has `rawStatus === 'PENDING'`.

> Note: `STATUS_COLOR.PENDING` and `VIEWING_STATUS`'s `PENDING` ("Chờ xác nhận") are shared with the **viewings** feature — leave them untouched. Only the *property* status list changes. The broker dashboard's `isPendingListing` helper becomes unreachable but is defensive and out of scope here — do not touch it.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/services/mockData.test.js`:

```js
import { describe, expect, test } from 'vitest';
import { MOCK_PROPERTIES } from './mockData.js';

describe('mock property statuses', () => {
  test('không còn tin ở trạng thái chờ duyệt (PENDING)', () => {
    expect(MOCK_PROPERTIES.some((property) => property.rawStatus === 'PENDING')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/services/mockData.test.js`
Expected: FAIL — `ADMIN_STATUS_CYCLE` still contains `'PENDING'`, so some property has `rawStatus === 'PENDING'`.

- [ ] **Step 3: Remove PENDING from the mock status cycle**

In `frontend-react/src/services/mockData.js`, change the `ADMIN_STATUS_CYCLE` line:

```js
const ADMIN_STATUS_CYCLE = ['AVAILABLE', 'AVAILABLE', 'HIDDEN', 'AVAILABLE', 'SOLD', 'RENTED'];
```

(was `['AVAILABLE', 'AVAILABLE', 'HIDDEN', 'PENDING', 'SOLD', 'RENTED']`)

- [ ] **Step 4: Remove PENDING from the admin property status choices**

In `frontend-react/src/admin-ra/resources/statusControls.jsx`, delete the PENDING entry so `PROPERTY_STATUS` reads:

```jsx
export const PROPERTY_STATUS = [
  { id: 'AVAILABLE', name: 'Đang hiển thị' },
  { id: 'SOLD', name: 'Đã bán' },
  { id: 'RENTED', name: 'Đã thuê' },
  { id: 'HIDDEN', name: 'Đã ẩn' },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/services/mockData.test.js`
Expected: PASS.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS (no test depended on a PENDING property status).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/admin-ra/resources/statusControls.jsx frontend-react/src/services/mockData.js frontend-react/src/services/mockData.test.js
git commit -m "refactor(admin): remove pending (cho duyet) property status"
```

---

### Task 2: Remove the admin "Tài khoản" (Users) resource

**Files:**
- Modify: `frontend-react/src/admin-ra/AdminApp.jsx`
- Delete: `frontend-react/src/admin-ra/resources/users.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: react-admin `<Admin>` registers only `brokers`, `properties`, `viewings` resources — the "Tài khoản" menu item is gone.

> `users.jsx` is imported only by `AdminApp.jsx` (verified). `MOCK_USERS` in `mockData.js` is still used by the auth/data providers — leave it. `i18nProvider`/`vi-messages` may keep unused `resources.users.*` labels — harmless, leave them.

- [ ] **Step 1: Remove the UserList import and resource registration**

In `frontend-react/src/admin-ra/AdminApp.jsx`, delete this import line:

```jsx
import { UserList } from './resources/users.jsx';
```

and delete this line from inside `<Admin>`:

```jsx
        <Resource name="users" list={UserList} />
```

After the edit the `<Admin>` children are exactly:

```jsx
        <Resource name="brokers" list={BrokerList} create={BrokerCreate} />
        <Resource name="properties" list={PropertyList} />
        <Resource name="viewings" list={ViewingList} />
```

- [ ] **Step 2: Delete the now-unused resource file**

```bash
git rm frontend-react/src/admin-ra/resources/users.jsx
```

- [ ] **Step 3: Verify the app still builds**

Run: `cd frontend-react && npm run build`
Expected: build succeeds with no "Cannot find module './resources/users.jsx'" or unused-import errors.

- [ ] **Step 4: Run the full test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS.

- [ ] **Step 5: Manual check**

Run `cd frontend-react && npm run dev`, open `http://localhost:5173/#/admin` (log in with an `admin`-containing email in mock mode). Confirm the left menu shows **Môi giới, Bài đăng, Lịch hẹn** and no **Tài khoản** item.

- [ ] **Step 6: Commit**

```bash
git add -A frontend-react/src/admin-ra
git commit -m "refactor(admin): remove user account resource"
```

---

### Task 3: Add "Về trang chủ" to the admin sidebar

**Files:**
- Create: `frontend-react/src/admin-ra/AdminLayout.jsx`
- Modify: `frontend-react/src/admin-ra/AdminApp.jsx`

**Interfaces:**
- Consumes: react-admin's `Layout` and `Menu` (with the v5 compound child `Menu.ResourceItems`), MUI `MenuItem`/`ListItemIcon`/`ListItemText`, and the site's lucide wrapper `components/ui/Icon.jsx`.
- Produces: default export `AdminLayout` — a react-admin layout whose sidebar appends a "Về trang chủ" item that navigates the **outer** hash router to `#/`.

> The admin runs inside `<HashRouter basename="/admin">`. A react-admin `Menu.Item to="/"` would stay inside `/admin`; a **plain anchor** `<a href="#/">` sets `location.hash = '#/'`, which the outer `App.jsx` hashchange listener resolves to `HomePage` (same pattern already used by `AdminApp`'s no-permission fallback and the broker sidebar). MUI `MenuItem` renders as an anchor via `component="a"`. Using the lucide `Icon` avoids adding an `@mui/icons-material` dependency (not installed in this project).

- [ ] **Step 1: Create the custom layout**

Create `frontend-react/src/admin-ra/AdminLayout.jsx`:

```jsx
import { Layout, Menu } from 'react-admin';
import { MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import Icon from '../components/ui/Icon.jsx';

// react-admin auto-renders the resource menu items; we append a plain anchor that escapes
// the admin HashRouter (basename="/admin") back to the site root via the outer hash router.
function AdminMenu() {
  return (
    <Menu>
      <Menu.ResourceItems />
      <MenuItem component="a" href="#/">
        <ListItemIcon>
          <Icon name="Home" size={20} />
        </ListItemIcon>
        <ListItemText>Về trang chủ</ListItemText>
      </MenuItem>
    </Menu>
  );
}

export default function AdminLayout(props) {
  return <Layout {...props} menu={AdminMenu} />;
}
```

- [ ] **Step 2: Wire the layout into `<Admin>`**

In `frontend-react/src/admin-ra/AdminApp.jsx`, add the import (next to the other admin-ra imports):

```jsx
import AdminLayout from './AdminLayout.jsx';
```

and add the `layout` prop to `<Admin>` so its opening tag reads:

```jsx
      <Admin
        dataProvider={dataProvider}
        authProvider={authProvider}
        i18nProvider={i18nProvider}
        dashboard={OverviewDashboard}
        layout={AdminLayout}
        loginPage={false}
        disableTelemetry
      >
```

- [ ] **Step 3: Verify the app builds**

Run: `cd frontend-react && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check**

Run `cd frontend-react && npm run dev`, open `#/admin`. Confirm the sidebar lists the resources followed by a **Về trang chủ** item with a home icon. Click it → the app leaves `/admin` and renders the public home page (`#/`).

- [ ] **Step 5: Run the full test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/admin-ra/AdminLayout.jsx frontend-react/src/admin-ra/AdminApp.jsx
git commit -m "feat(admin): add back-to-home link in sidebar"
```

---

### Task 4: Add a `broker` filter to property search

**Files:**
- Modify: `frontend-react/src/services/propertyFilters.js`
- Modify: `frontend-react/src/pages/SearchPage.jsx`
- Test: `frontend-react/src/services/propertyFilters.test.js`

**Interfaces:**
- Consumes: property objects carrying `broker.email` (present on `MOCK_PROPERTIES` and on `normalizeProperty` output).
- Produces:
  - `filterProperties(properties, { broker })` returns only properties whose `broker.email` (case-insensitive) equals `broker`.
  - `buildPropertyQuery({ broker })` appends `brokerEmail=<value>`.
  - `SearchPage` reads `queryParams.broker` (filter) and `queryParams.brokerName` (display only); URL shape consumed by Task 5 is `#/search?broker=<email>&brokerName=<name>`.

> This filter is applied client-side in mock mode (default dev). For a real backend, `brokerEmail` is passed through but backend support is out of scope.

- [ ] **Step 1: Write the failing tests**

Append to `frontend-react/src/services/propertyFilters.test.js` (inside the existing `describe('property filters', …)` block, before its closing `});`):

```js
  test('filters by broker email', () => {
    const result = filterProperties(MOCK_PROPERTIES, { broker: 'toan@congtinland.vn' });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.broker.email === 'toan@congtinland.vn')).toBe(true);
  });

  test('includes broker in API query when set', () => {
    expect(buildPropertyQuery({ broker: 'toan@congtinland.vn' })).toBe('brokerEmail=toan%40congtinland.vn');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/services/propertyFilters.test.js`
Expected: FAIL — `filterProperties` ignores `broker` (returns other brokers too); `buildPropertyQuery` returns `''`.

- [ ] **Step 3: Add `broker` to the default filters**

In `frontend-react/src/services/propertyFilters.js`, add `broker: ''` to `withDefaultFilters`:

```js
function withDefaultFilters(filters = {}) {
  return {
    query: '',
    category: 'all',
    transaction: 'all',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    ward: 'all',
    houseType: 'all',
    broker: '',
    ...filters,
  };
}
```

- [ ] **Step 4: Apply the broker filter in `filterProperties`**

In `filterProperties`, add a normalized broker value near the other locals and a match clause in the predicate:

```js
export function filterProperties(properties, filters) {
  const safeFilters = withDefaultFilters(filters);
  const query = normalize(safeFilters.query);
  const brokerEmail = normalize(safeFilters.broker);
  const minPrice = parseOptionalNumber(safeFilters.minPrice);
  const maxPrice = parseOptionalNumber(safeFilters.maxPrice);
  const minArea = parseOptionalNumber(safeFilters.minArea);
  const maxArea = parseOptionalNumber(safeFilters.maxArea);

  return properties.filter((property) => {
    const comparablePrice = property.rawPrice ?? property.price;
    const matchesQuery = !query || normalize(`${property.title} ${property.address} ${property.category} ${property.broker?.name}`).includes(query);
    const matchesBroker = !brokerEmail || normalize(property.broker?.email) === brokerEmail;
    const matchesCategory = safeFilters.category === 'all' || property.category === safeFilters.category;
    const matchesTransaction = safeFilters.transaction === 'all' || property.transaction === safeFilters.transaction;
    const matchesWard = safeFilters.ward === 'all' || property.ward === safeFilters.ward;
    const matchesHouseType = safeFilters.houseType === 'all' || property.houseType === safeFilters.houseType;
    const matchesMin = minPrice == null || comparablePrice >= minPrice;
    const matchesMax = maxPrice == null || comparablePrice <= maxPrice;
    const matchesMinArea = minArea == null || Number(property.area || 0) >= minArea;
    const matchesMaxArea = maxArea == null || Number(property.area || 0) <= maxArea;
    return matchesQuery && matchesBroker && matchesCategory && matchesTransaction && matchesWard
      && matchesHouseType && matchesMin && matchesMax && matchesMinArea && matchesMaxArea;
  });
}
```

- [ ] **Step 5: Emit `brokerEmail` in `buildPropertyQuery`**

Add this line at the end of `buildPropertyQuery`, just before `return params.toString();`:

```js
  if (safeFilters.broker) params.set('brokerEmail', safeFilters.broker.trim());
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/services/propertyFilters.test.js`
Expected: PASS (all 4 tests).

- [ ] **Step 7: Read `broker` in the search page filters**

In `frontend-react/src/pages/SearchPage.jsx`, add `broker` to `filtersFromQuery`'s returned object:

```js
  return {
    query: queryParams.query || queryParams.q || '',
    category,
    transaction,
    ward: queryParams.ward || 'all',
    houseType: queryParams.houseType || 'all',
    minPrice: queryParams.minPrice || '',
    maxPrice: queryParams.maxPrice || '',
    minArea: '',
    maxArea: '',
    broker: queryParams.broker || '',
  };
```

- [ ] **Step 8: Preserve `broker` when the category changes**

Still in `SearchPage.jsx`, in `updateFilter`'s `name === 'category'` branch, add `broker: current.broker,` so the reset object keeps the broker filter:

```js
      if (name === 'category') {
        return {
          ...current,
          query: current.query,
          category: value,
          transaction: value === 'tro' ? 'rent' : value === 'all' ? 'all' : 'sale',
          houseType: 'all',
          minPrice: '',
          maxPrice: '',
          minArea: '',
          maxArea: '',
          broker: current.broker,
        };
      }
```

- [ ] **Step 9: Show a broker subtitle**

In `SearchPage.jsx`, read the display name inside the component (near the top of `SearchPage`, after the `queryKey` line):

```js
  const brokerName = queryParams?.brokerName || '';
```

Change the subtitle computation from `const subtitle = subtitleFor(appliedFilters);` to:

```js
  const subtitle = subtitleFor(appliedFilters, brokerName);
```

and update `subtitleFor` to handle the broker case first:

```js
function subtitleFor(filters, brokerName = '') {
  if (filters.broker) return `Tin đăng của ${brokerName || 'môi giới'}`;
  if (filters.query?.trim()) return `Kết quả cho "${filters.query.trim()}"`;
  if (filters.category === 'tro') return 'Phòng trọ tại Trà Vinh';
  if (filters.category === 'nha' && filters.transaction === 'rent') return 'Nhà cho thuê tại Trà Vinh';
  if (filters.category === 'nha') return 'Nhà đất bán tại Trà Vinh';
  if (filters.category === 'dat' && filters.transaction === 'rent') return 'Đất cho thuê tại Trà Vinh';
  if (filters.category === 'dat') return 'Đất bán tại Trà Vinh';
  return '';
}
```

- [ ] **Step 10: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add frontend-react/src/services/propertyFilters.js frontend-react/src/services/propertyFilters.test.js frontend-react/src/pages/SearchPage.jsx
git commit -m "feat(search): filter properties by broker"
```

---

### Task 5: Clean up the public broker cards

**Files:**
- Modify: `frontend-react/src/pages/BrokersPage.jsx`
- Modify: `frontend-react/src/styles.css`
- Test: `frontend-react/src/pages/BrokersPage.test.js` (create)

**Interfaces:**
- Consumes: `MOCK_PROPERTIES`; the Task 4 search URL shape `#/search?broker=<email>&brokerName=<name>`.
- Produces: `brokerStatsFrom(properties)` is now **exported** and guarantees `closedDeals <= listings.length` for every broker; broker objects no longer carry `responseMinutes`.

Three behavior changes: (a) drop the "Phút p/hồi" metric and the "Phản hồi nhanh nhất" sort; (b) `closedDeals` (Đã bán) must never exceed `listings.length` (Tin đăng); (c) each card gets a bottom-right "Xem tất cả" link to that broker's search results.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/pages/BrokersPage.test.js`:

```js
import { describe, expect, test } from 'vitest';
import { MOCK_PROPERTIES } from '../services/mockData.js';
import { brokerStatsFrom } from './BrokersPage.jsx';

describe('brokerStatsFrom', () => {
  test('đã bán không vượt quá tổng tin đăng', () => {
    const brokers = brokerStatsFrom(MOCK_PROPERTIES);

    expect(brokers.length).toBeGreaterThan(0);
    brokers.forEach((broker) => {
      expect(broker.closedDeals).toBeLessThanOrEqual(broker.listings.length);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/pages/BrokersPage.test.js`
Expected: FAIL — `brokerStatsFrom` is not exported (import is `undefined`), and its `closedDeals` uses `Math.max(sold, listings.length + 2 - …)` which exceeds `listings.length`.

- [ ] **Step 3: Export `brokerStatsFrom` and cap `closedDeals`**

In `frontend-react/src/pages/BrokersPage.jsx`:

Change the declaration to a named export and drop the unused `index` param on the `forEach`:

```js
export function brokerStatsFrom(properties) {
  const groups = new Map();
  properties.forEach((property) => {
    const broker = property.broker || {};
    const name = broker.name || broker.fullName || 'Môi giới Công Tín Land';
    const email = broker.email || `${name.toLowerCase().replace(/\s+/g, '.')}@congtinland.vn`;
    const current = groups.get(email) || {
      name,
      email,
      avatarUrl: broker.avatarUrl || '',
      listings: [],
      wards: new Set(),
      categories: new Set(),
    };
    current.listings.push(property);
    if (property.ward) current.wards.add(property.ward);
    current.categories.add(categoryLabel(property.category));
    groups.set(email, current);
  });

  return [...groups.values()].map((broker) => {
    const sold = broker.listings.filter((listing) => (
      listing.rawStatus === 'SOLD' || listing.statusLabel === 'Đã bán' || listing.status === 'Đã bán'
    )).length;
    return {
      ...broker,
      wards: [...broker.wards],
      specialties: [...broker.categories],
      closedDeals: sold,
    };
  });
}
```

Two removals inside this rewrite vs. the original: the `responseMinutes: responseMinutesFrom(broker.responseTime, index),` line, and the fabricated `closedDeals: Math.max(...)`.

- [ ] **Step 4: Delete the now-unused `responseMinutesFrom` helper**

Remove this function from the bottom of `BrokersPage.jsx`:

```js
function responseMinutesFrom(value, fallbackIndex) {
  const parsed = Number(String(value || '').match(/\d+/)?.[0]);
  return Number.isFinite(parsed) ? parsed : 5 + fallbackIndex * 2;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/pages/BrokersPage.test.js`
Expected: PASS.

- [ ] **Step 6: Remove the response-time metric and sort option**

In the broker sort chain, delete the `fast-response` line so it reads:

```js
      .sort((a, b) => {
        if (sort === 'most-listings') return b.listings.length - a.listings.length;
        return b.closedDeals - a.closedDeals;
      });
```

In the sort `<select>`, delete the `fast-response` option so the options are:

```jsx
            <option value="top-sales">Người bán nhiều nhất</option>
            <option value="most-listings">Đăng tin nhiều nhất</option>
```

In the metric grid, delete the "Phút p/hồi" metric so it reads:

```jsx
                  <div className="broker-metric-grid">
                    <Metric label="Đã bán" value={broker.closedDeals} />
                    <Metric label="Tin đăng" value={broker.listings.length} />
                  </div>
```

- [ ] **Step 7: Add the "Xem tất cả" footer link**

In `BrokersPage.jsx`, immediately after the `broker-listings-stack` `</div>` and before the closing `</article>`, add:

```jsx
              <div className="broker-card-footer">
                <a
                  className="broker-card-viewall"
                  href={`#/search?broker=${encodeURIComponent(broker.email)}&brokerName=${encodeURIComponent(broker.name)}`}
                >
                  Xem tất cả
                  <Icon name="ArrowRight" size={16} className="icon-brand" />
                </a>
              </div>
```

(`Icon` is already imported at the top of the file.)

- [ ] **Step 8: Add the footer styles**

In `frontend-react/src/styles.css`, immediately after the `.broker-specialty-tags { … }` rule (before the `PROJECT CARD` comment block), add:

```css
.broker-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-hairline-soft);
}

.broker-card-viewall {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-primary);
  text-decoration: none;
}

.broker-card-viewall:hover {
  text-decoration: underline;
}
```

- [ ] **Step 9: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS.

- [ ] **Step 10: Manual check**

Run `cd frontend-react && npm run dev`, open `#/brokers`. Confirm each card shows only **Đã bán** and **Tin đăng** metrics (no "Phút p/hồi"), the sort dropdown has no "Phản hồi nhanh nhất", every card's **Đã bán ≤ Tin đăng**, and a bottom-right **Xem tất cả** link that navigates to `#/search?...` showing that broker's listings with a "Tin đăng của …" subtitle.

- [ ] **Step 11: Commit**

```bash
git add frontend-react/src/pages/BrokersPage.jsx frontend-react/src/pages/BrokersPage.test.js frontend-react/src/styles.css
git commit -m "feat(brokers): drop response metric, cap sold, add view-all link"
```

---

### Task 6: Replace the broker dashboard "Tạm ẩn" panel with status tabs

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Test: `frontend-react/src/pages/brokerDashboardListings.test.js` (create)

**Interfaces:**
- Consumes: listing objects with a `rawStatus` string and the existing `isAvailableListing(listing)` helper.
- Produces (new named exports from `BrokerDashboard.jsx`):
  - `filterListingsByStatus(listings, status)` → array; `status === 'AVAILABLE'` returns active listings (via `isAvailableListing`), otherwise exact `rawStatus` match.
  - `countListingsByStatus(listings)` → `{ AVAILABLE, SOLD, RENTED, HIDDEN }` counts.

The "Tin đăng của tôi" section currently renders two stacked panels ("Đang hoạt động hoặc đã bán" + "Tạm ẩn"). Replace them with a single panel preceded by a clickable status tab bar: **Đang hoạt động / Đã bán / Đã thuê / Đã ẩn** (default: Đang hoạt động).

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/pages/brokerDashboardListings.test.js`:

```js
import { describe, expect, test } from 'vitest';
import { filterListingsByStatus, countListingsByStatus } from './BrokerDashboard.jsx';

const listings = [
  { id: 1, rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị' },
  { id: 2, rawStatus: 'SOLD', statusLabel: 'Đã bán' },
  { id: 3, rawStatus: 'HIDDEN', statusLabel: 'Đã ẩn' },
  { id: 4, rawStatus: 'RENTED', statusLabel: 'Đã thuê' },
  { id: 5, rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị' },
];

describe('broker dashboard listing status filters', () => {
  test('lọc tin đang hoạt động', () => {
    expect(filterListingsByStatus(listings, 'AVAILABLE').map((l) => l.id)).toEqual([1, 5]);
  });

  test('lọc tin đã ẩn', () => {
    expect(filterListingsByStatus(listings, 'HIDDEN').map((l) => l.id)).toEqual([3]);
  });

  test('đếm tin theo từng trạng thái', () => {
    expect(countListingsByStatus(listings)).toEqual({ AVAILABLE: 2, SOLD: 1, RENTED: 1, HIDDEN: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/pages/brokerDashboardListings.test.js`
Expected: FAIL — `filterListingsByStatus` / `countListingsByStatus` are not exported (`undefined`).

- [ ] **Step 3: Add the tab config and pure helpers**

In `frontend-react/src/pages/BrokerDashboard.jsx`, add the following at module scope (place it just above the existing `function isAvailableListing(listing) {` helper near the bottom of the file):

```js
const LISTING_STATUS_TABS = [
  { id: 'AVAILABLE', label: 'Đang hoạt động' },
  { id: 'SOLD', label: 'Đã bán' },
  { id: 'RENTED', label: 'Đã thuê' },
  { id: 'HIDDEN', label: 'Đã ẩn' },
];

export function filterListingsByStatus(listings, status) {
  if (status === 'AVAILABLE') {
    return listings.filter((listing) => isAvailableListing(listing));
  }
  return listings.filter((listing) => listing.rawStatus === status);
}

export function countListingsByStatus(listings) {
  return LISTING_STATUS_TABS.reduce((counts, tab) => {
    counts[tab.id] = filterListingsByStatus(listings, tab.id).length;
    return counts;
  }, {});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/pages/brokerDashboardListings.test.js`
Expected: PASS.

- [ ] **Step 5: Add the active-tab state**

In the `BrokerDashboard` component, add a state hook right after the `listingQuery` state line (`const [listingQuery, setListingQuery] = useState('');`):

```js
  const [listingStatusTab, setListingStatusTab] = useState('AVAILABLE');
```

- [ ] **Step 6: Replace the visible/hidden memos with status-based memos**

Still in `BrokerDashboard`, replace these two lines:

```js
  const visibleListings = useMemo(() => filteredListings.filter((listing) => listing.rawStatus !== 'HIDDEN'), [filteredListings]);
  const hiddenListings = useMemo(() => filteredListings.filter((listing) => listing.rawStatus === 'HIDDEN'), [filteredListings]);
```

with:

```js
  const statusFilteredListings = useMemo(() => filterListingsByStatus(filteredListings, listingStatusTab), [filteredListings, listingStatusTab]);
  const statusCounts = useMemo(() => countListingsByStatus(filteredListings), [filteredListings]);
```

- [ ] **Step 7: Replace the two-panel JSX with a tab bar + single panel**

In the `section === 'properties'` block, replace the entire `<div className="dashboard-panels-col"> … </div>` (the two `DashboardPanel`s titled "Đang hoạt động hoặc đã bán" and "Tạm ẩn") with:

```jsx
              <div className="dashboard-status-tabs">
                {LISTING_STATUS_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`dashboard-status-tab${listingStatusTab === tab.id ? ' is-active' : ''}`}
                    onClick={() => setListingStatusTab(tab.id)}
                  >
                    {tab.label}
                    <span className="dashboard-status-tab-count">{statusCounts[tab.id] || 0}</span>
                  </button>
                ))}
              </div>
              <DashboardPanel
                title={LISTING_STATUS_TABS.find((tab) => tab.id === listingStatusTab)?.label || 'Tin đăng'}
                count={loading ? 'Đang tải' : `${statusFilteredListings.length} tin`}
              >
                <ListingList
                  listings={statusFilteredListings}
                  loading={loading}
                  saving={saving}
                  onEdit={editListing}
                  onDelete={removeListing}
                  onStatus={changeStatus}
                  emptyTitle="Không có tin ở trạng thái này"
                  emptyDescription="Chọn trạng thái khác hoặc đổi từ khóa tìm kiếm."
                />
              </DashboardPanel>
```

- [ ] **Step 8: Add the tab styles**

Append to `frontend-react/src/styles/dashboard.css`:

```css
.dashboard-status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.dashboard-status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-full);
  background: var(--color-canvas);
  color: var(--color-body);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease, border-color 180ms ease;
}

.dashboard-status-tab.is-active {
  background: var(--color-ink);
  border-color: var(--color-ink);
  color: var(--color-canvas);
}

.dashboard-status-tab-count {
  font-size: 12px;
  font-weight: 700;
  opacity: 0.7;
}
```

- [ ] **Step 9: Run the tests**

Run: `cd frontend-react && npx vitest run src/pages/brokerDashboardListings.test.js`
Expected: PASS.

Then the full suite:

Run: `cd frontend-react && npm test -- --run`
Expected: PASS.

- [ ] **Step 10: Manual check**

Run `cd frontend-react && npm run dev`, log in with a `broker`-containing email, open `#/broker/properties`. Confirm: no "Tạm ẩn" panel; a tab row **Đang hoạt động / Đã bán / Đã thuê / Đã ẩn** with per-tab counts; clicking a tab filters the list below; the panel title matches the active tab; the search box still narrows results within the active tab.

- [ ] **Step 11: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/brokerDashboardListings.test.js frontend-react/src/styles/dashboard.css
git commit -m "feat(broker): replace hidden panel with listing status tabs"
```

---

## Self-Review

**1. Spec coverage** (each requirement → task):

| Requirement (user) | Task |
|---|---|
| Admin: bỏ trạng thái "chờ duyệt" trong bài đăng | Task 1 |
| Admin (chỉ 1 admin): bỏ phần "tài khoản" | Task 2 |
| Admin: thêm "quay lại trang chủ" | Task 3 |
| Môi giới: bỏ hiển thị "5 phút phản hồi" | Task 5 (steps 3, 6) |
| Môi giới: "Tin đăng" (tổng) phải lớn hơ/bằng "Đã bán" | Task 5 (steps 3, 5) |
| Môi giới: góc dưới phải "Xem tất cả" những gì môi giới đã đăng | Task 5 (steps 7–8) + Task 4 (search broker filter) |
| Broker dashboard tin đăng: bỏ danh sách "tạm ẩn" phía dưới | Task 6 (step 7) |
| Broker dashboard: thêm tab click Đang hoạt động / Đã bán / Đã thuê / Đã ẩn | Task 6 (steps 3, 7) |

All eight requirements are covered.

**2. Placeholder scan:** No "TODO/TBD/handle edge cases" placeholders; every code step contains complete code and every test/run step has an exact command with expected PASS/FAIL.

**3. Type consistency:** `broker` filter key is spelled `broker` in `withDefaultFilters`, `filterProperties`, `filtersFromQuery`, and the `updateFilter` category branch; the emitted query param is `brokerEmail` (Task 4) and the link in Task 5 uses `?broker=…&brokerName=…` consumed by Task 4's `filtersFromQuery` (`broker`) and `brokerName` (display). `filterListingsByStatus` / `countListingsByStatus` names match between their definition, the export interface, the test import, and the component memos in Task 6. `brokerStatsFrom` is exported (Task 5) and imported by its test with the same name.

---

**Ordering note:** Tasks 1–3 (admin) are independent of Tasks 4–6. Task 4 must land before Task 5 (the "Xem tất cả" link relies on the search broker filter). Task 6 is independent of the others.
