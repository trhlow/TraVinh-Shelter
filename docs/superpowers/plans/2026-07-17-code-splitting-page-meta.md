# Code Splitting + Page Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every route a correct `<title>`/`<meta>`, keep private routes out of search indexes, and stop shipping the admin/broker dashboards to public visitors.

**Architecture:** A pure `buildPageMeta()` module maps a route key to `{ title, description, robots }`. A thin `<PageMeta>` component renders those as real `<title>`/`<meta>` tags, which React 19 hoists into `<head>` — no metadata library. Separately, the two dashboard pages become `lazy()` route chunks behind one `<Suspense>` boundary, and `dashboard.css` moves out of the eager bundle into those chunks.

**Tech Stack:** React 19.2.7, Vite 8, Vitest 4 + Testing Library (jsdom), plain CSS custom properties.

## Global Constraints

- **No new dependencies.** React 19.2.7 hoists `<title>`/`<meta>` natively; `react-helmet` is not to be added.
- **Exactly one component may render `<title>` per route.** React hoists every `<title>` without deduplicating; two tags means the browser silently uses the first. Only page-level components render `<PageMeta>` — never `MainLayout` or a shared child.
- **No hard-coded hex colours, no inline `style` props.** Use existing CSS custom properties (`--color-primary`, `--color-hairline`, …) defined in `src/styles.css`.
- **UI text in Vietnamese; code, comments and commit messages in English.** Conventional commits. No AI attribution / no `Co-Authored-By` trailer.
- **Measured baseline to beat:** `386.84 kB` JS + `82.33 kB` CSS, one chunk each.
- Comments only where *why* is non-obvious — never narrate *what* the code does.

## File Structure

| File | Responsibility |
|---|---|
| Create `src/services/pageMeta.js` | Pure route-key → `{ title, description, robots }` map + lookup. No DOM. |
| Create `src/services/pageMeta.test.js` | Unit tests for the above (written first). |
| Create `src/components/PageMeta.jsx` | Renders `<title>`/`<meta>` from `buildPageMeta`. The only place tags are emitted. |
| Create `src/components/PageMeta.test.jsx` | Verifies React 19 hoisting reaches `document.head` in jsdom. |
| Create `src/components/ui/PageLoader.jsx` | Suspense fallback spinner. |
| Modify `src/styles.css` | Append `.page-loader` styles + keyframes. |
| Modify `src/routes/index.jsx` | `lazy()` the two dashboards. |
| Modify `src/App.jsx` | Wrap `<Page>` in `<Suspense>`. |
| Modify `src/main.jsx` | Drop the eager `dashboard.css` import. |
| Modify `src/pages/*.jsx` (8 pages) | Render `<PageMeta>` once each. |

---

### Task 1: Pure metadata module

**Files:**
- Create: `frontend-react/src/services/pageMeta.js`
- Test: `frontend-react/src/services/pageMeta.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `buildPageMeta(routeKey, data = {}) → { title, description, robots }`, where `routeKey` is one of `'home' | 'search' | 'property' | 'projects' | 'brokers' | 'login' | 'broker' | 'admin'`, `data` is `{ propertyTitle?: string }`, and `robots` is `'index' | 'noindex'`. Unknown keys fall back to the `'home'` entry.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/services/pageMeta.test.js`:

```js
import { expect, test } from 'vitest';
import { buildPageMeta } from './pageMeta.js';

test('home has the brand title and is indexable', () => {
  const meta = buildPageMeta('home');
  expect(meta.title).toBe('Công Tín Land — Bất động sản Trà Vinh: nhà, đất, phòng trọ');
  expect(meta.robots).toBe('index');
  expect(meta.description.length).toBeGreaterThan(0);
});

test('every public route is indexable', () => {
  for (const key of ['home', 'search', 'property', 'projects', 'brokers']) {
    expect(buildPageMeta(key).robots).toBe('index');
  }
});

test('private routes are noindex', () => {
  for (const key of ['login', 'broker', 'admin']) {
    expect(buildPageMeta(key).robots).toBe('noindex');
  }
});

test('property title comes from the listing when available', () => {
  const meta = buildPageMeta('property', { propertyTitle: 'Nhà trọ Thanh Trúc' });
  expect(meta.title).toBe('Nhà trọ Thanh Trúc — Công Tín Land');
  expect(meta.robots).toBe('index');
});

test('property falls back to a generic title without listing data', () => {
  expect(buildPageMeta('property').title).toBe('Chi tiết bất động sản — Công Tín Land');
});

test('unknown route keys fall back to home metadata', () => {
  expect(buildPageMeta('does-not-exist')).toEqual(buildPageMeta('home'));
});

test('every route supplies a title and a description', () => {
  for (const key of ['home', 'search', 'property', 'projects', 'brokers', 'login', 'broker', 'admin']) {
    const meta = buildPageMeta(key);
    expect(meta.title, key).toMatch(/Công Tín Land/);
    expect(meta.description, key).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/services/pageMeta.test.js`
Expected: FAIL — `Failed to resolve import "./pageMeta.js"`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend-react/src/services/pageMeta.js`:

```js
const BRAND = 'Công Tín Land';

const PAGE_META = {
  home: {
    title: `${BRAND} — Bất động sản Trà Vinh: nhà, đất, phòng trọ`,
    description:
      'Nền tảng bất động sản Trà Vinh: phòng trọ, nhà bán và đất nền. Pháp lý minh bạch, môi giới xác minh, hình ảnh thực tế.',
    robots: 'index',
  },
  search: {
    title: `Tìm kiếm bất động sản — ${BRAND}`,
    description: 'Tìm phòng trọ, nhà bán và đất nền tại Trà Vinh theo phường, mức giá và diện tích.',
    robots: 'index',
  },
  property: {
    title: `Chi tiết bất động sản — ${BRAND}`,
    description: 'Thông tin chi tiết bất động sản tại Trà Vinh: giá, diện tích, pháp lý, tiện ích và liên hệ môi giới.',
    robots: 'index',
  },
  projects: {
    title: `Dự án — ${BRAND}`,
    description: 'Các dự án bất động sản tại Trà Vinh do Công Tín Land phân phối.',
    robots: 'index',
  },
  brokers: {
    title: `Đội ngũ môi giới — ${BRAND}`,
    description: 'Đội ngũ môi giới Công Tín Land am hiểu thị trường Trà Vinh, đồng hành từ lúc xem nhà đến khi công chứng.',
    robots: 'index',
  },
  login: {
    title: `Đăng nhập — ${BRAND}`,
    description: 'Đăng nhập tài khoản Công Tín Land.',
    robots: 'noindex',
  },
  broker: {
    title: `Bảng điều khiển môi giới — ${BRAND}`,
    description: 'Bảng điều khiển môi giới Công Tín Land.',
    robots: 'noindex',
  },
  admin: {
    title: `Quản trị — ${BRAND}`,
    description: 'Trang quản trị Công Tín Land.',
    robots: 'noindex',
  },
};

export function buildPageMeta(routeKey, data = {}) {
  const base = PAGE_META[routeKey] ?? PAGE_META.home;
  if (routeKey === 'property' && data.propertyTitle) {
    return { ...base, title: `${data.propertyTitle} — ${BRAND}` };
  }
  return base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/services/pageMeta.test.js`
Expected: PASS — 7 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/services/pageMeta.js frontend-react/src/services/pageMeta.test.js
git commit -m "feat: add pure page metadata module with per-route title and robots"
```

---

### Task 2: PageMeta component

**Files:**
- Create: `frontend-react/src/components/PageMeta.jsx`
- Test: `frontend-react/src/components/PageMeta.test.jsx`

**Interfaces:**
- Consumes: `buildPageMeta(routeKey, data)` from Task 1.
- Produces: `<PageMeta routeKey="home" data={{ propertyTitle }} />` — default export, renders no visible DOM.

**Note on the `robots` tag:** `index` is the crawler default, so no tag is emitted for public routes. Only `noindex` produces a `<meta name="robots">`.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/components/PageMeta.test.jsx`. This project has **no vitest setup file and no `globals: true`** — every test file imports jest-dom and wires `cleanup` itself. Follow that convention exactly; without `cleanup()` the hoisted `<meta>` tags accumulate in `document.head` and the "no robots tag" test fails for the wrong reason.

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import PageMeta from './PageMeta.jsx';

afterEach(() => cleanup());

test('sets the document title', () => {
  render(<PageMeta routeKey="brokers" />);
  expect(document.title).toBe('Đội ngũ môi giới — Công Tín Land');
});

test('emits a description meta tag into head', () => {
  render(<PageMeta routeKey="home" />);
  const tag = document.head.querySelector('meta[name="description"]');
  expect(tag).not.toBeNull();
  expect(tag.getAttribute('content')).toContain('Trà Vinh');
});

test('emits robots noindex for private routes', () => {
  render(<PageMeta routeKey="admin" />);
  expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
});

test('emits no robots tag for public routes', () => {
  render(<PageMeta routeKey="search" />);
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('uses the listing title for a property page', () => {
  render(<PageMeta routeKey="property" data={{ propertyTitle: 'Nhà phố Phường 6' }} />);
  expect(document.title).toBe('Nhà phố Phường 6 — Công Tín Land');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/PageMeta.test.jsx`
Expected: FAIL — `Failed to resolve import "./PageMeta.jsx"`.

- [ ] **Step 3: Write minimal implementation**

Create `frontend-react/src/components/PageMeta.jsx`:

```jsx
import { buildPageMeta } from '../services/pageMeta.js';

export default function PageMeta({ routeKey, data }) {
  const { title, description, robots } = buildPageMeta(routeKey, data);
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {robots === 'noindex' && <meta name="robots" content="noindex" />}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/PageMeta.test.jsx`
Expected: PASS — 5 passed.

**If these fail because tags land in `document.body` rather than `document.head`:** React 19 hoisting is active only for tags it recognises as metadata. Confirm React resolves to 19.2.7 with `node -p "require('./node_modules/react/package.json').version"`. Do not work around it by writing to `document.title` imperatively — report the finding instead; it invalidates the design's core assumption.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/PageMeta.jsx frontend-react/src/components/PageMeta.test.jsx
git commit -m "feat: add PageMeta component rendering native React 19 document metadata"
```

---

### Task 3: Wire PageMeta into every page

**Files:**
- Modify: `frontend-react/src/pages/HomePage.jsx:174` (inside the `<MainLayout>` return)
- Modify: `frontend-react/src/pages/SearchPage.jsx:143`
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx:146`
- Modify: `frontend-react/src/pages/ProjectsPage.jsx:58`
- Modify: `frontend-react/src/pages/BrokersPage.jsx:40`
- Modify: `frontend-react/src/pages/LoginPage.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx:64`
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx:48`

**Interfaces:**
- Consumes: `<PageMeta routeKey data />` from Task 2.
- Produces: nothing for later tasks.

Route keys are hard-coded per page — each page maps to exactly one key, so no routing change is needed. `LoginPage` serves both `/login` and `/forgot-password`; both use `'login'`. `BrokerDashboard` serves all `/broker/*` (`'broker'`), `AdminDashboard` all `/admin/*` (`'admin'`).

- [ ] **Step 1: Add PageMeta to the five public pages**

In each of `HomePage.jsx`, `SearchPage.jsx`, `ProjectsPage.jsx`, `BrokersPage.jsx`, add the import (path is `../components/PageMeta.jsx`) and render it as the first child inside `<MainLayout>`:

```jsx
import PageMeta from '../components/PageMeta.jsx';
```

```jsx
<MainLayout session={session} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
  <PageMeta routeKey="home" />
  {/* …existing children unchanged… */}
```

Use `routeKey="home"` in `HomePage`, `"search"` in `SearchPage`, `"projects"` in `ProjectsPage`, `"brokers"` in `BrokersPage`.

- [ ] **Step 2: Add PageMeta to PropertyDetailPage with the live listing title**

`PropertyDetailPage.jsx:87` initialises state as `useState(fallbackProperty)`, so `property.title` is always a string — it holds the fallback listing's name until the fetch resolves.

**This step's original reasoning was wrong and was corrected during the final review.** It claimed passing `property.title` unconditionally was fine because the page body renders that same fallback content, so the title would match what the user sees. What it missed: `property.title` being *always* truthy makes `buildPageMeta`'s generic `'Chi tiết bất động sản — Công Tín Land'` branch dead code, and titles `/#/property`, `/#/property/detail` and **every listing whose fetch fails** as `NHÀ TRỌ THANH TRÚC - TRỐNG 2 PHÒNG — Công Tín Land` — putting a specific phòng trọ's name on a failed đất or nhà listing's tab, bookmark and history entry. It also contradicted the design spec, which requires the generic title until data arrives.

The shipped implementation tracks a `propertyLoaded` flag (reset when `propertyId` changes, set only on a real fetch result) and passes `propertyTitle: propertyLoaded ? property.title : undefined`. The page body is deliberately left alone — the fallback body is pre-existing debt, out of scope for this branch.

```jsx
import PageMeta from '../components/PageMeta.jsx';
```

```jsx
<MainLayout session={session} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
  <PageMeta routeKey="property" data={{ propertyTitle: property.title }} />
  {/* …existing children unchanged… */}
```

- [ ] **Step 3: Add PageMeta to the three private pages**

`LoginPage.jsx` does not use `MainLayout`; render `<PageMeta routeKey="login" />` as the first child of whatever element it returns. If it returns a bare element, wrap the return in a fragment:

```jsx
import PageMeta from '../components/PageMeta.jsx';
```

```jsx
<>
  <PageMeta routeKey="login" />
  {/* …existing return unchanged… */}
</>
```

In `BrokerDashboard.jsx` use `routeKey="broker"`, in `admin/AdminDashboard.jsx` use `routeKey="admin"` (import path `../../components/PageMeta.jsx`), each as the first child of the returned root element.

- [ ] **Step 4: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS — all existing test files green. `<PageMeta>` renders no visible DOM, so no existing query should break.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages
git commit -m "feat: render per-route title and meta on every page"
```

---

### Task 4: Suspense fallback loader

**Files:**
- Create: `frontend-react/src/components/ui/PageLoader.jsx`
- Modify: `frontend-react/src/styles.css` (append at end)

**Interfaces:**
- Consumes: CSS custom properties `--color-hairline`, `--color-primary` from `src/styles.css:root`.
- Produces: `<PageLoader />` — default export, used as the `Suspense` fallback in Task 5.

- [ ] **Step 1: Create the component**

Create `frontend-react/src/components/ui/PageLoader.jsx`:

```jsx
export default function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Đang tải">
      <span className="page-loader-spinner" />
    </div>
  );
}
```

- [ ] **Step 2: Add the styles**

Append to `frontend-react/src/styles.css`:

```css
/* ── Page loader (lazy route fallback) ─────────────────── */
.page-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.page-loader-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-hairline);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: page-loader-spin 0.7s linear infinite;
}

@keyframes page-loader-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .page-loader-spinner {
    animation-duration: 2.4s;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend-react/src/components/ui/PageLoader.jsx frontend-react/src/styles.css
git commit -m "feat: add PageLoader spinner for lazy route fallback"
```

---

### Task 5: Lazy-load the dashboard routes

**Files:**
- Modify: `frontend-react/src/routes/index.jsx:1-8` (imports)
- Modify: `frontend-react/src/App.jsx:38-46` (the returned `<Page>`)

**Interfaces:**
- Consumes: `<PageLoader />` from Task 4.
- Produces: `resolveRoute(path)` keeps its existing `{ Page, params }` shape — `Page` may now be a lazy component, which callers render identically.

- [ ] **Step 1: Convert the two dashboards to lazy imports**

In `frontend-react/src/routes/index.jsx`, replace the static `AdminDashboard` and `BrokerDashboard` imports:

```jsx
import { lazy } from 'react';
import BrokersPage from '../pages/BrokersPage.jsx';
import HomePage from '../pages/HomePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ProjectsPage from '../pages/ProjectsPage.jsx';
import PropertyDetailPage from '../pages/PropertyDetailPage.jsx';
import SearchPage from '../pages/SearchPage.jsx';

const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard.jsx'));
const BrokerDashboard = lazy(() => import('../pages/BrokerDashboard.jsx'));
```

Everything else in the file — the `BrokerDashboardRoute` wrappers, `ADMIN_SECTIONS`, `routes`, `resolveRoute` — stays exactly as it is. Home, search and property detail deliberately stay eager: they are the primary entry paths.

- [ ] **Step 2: Add the Suspense boundary**

In `frontend-react/src/App.jsx`, import `Suspense` and `PageLoader`, then wrap the returned page:

```jsx
import { Suspense, useEffect, useState } from 'react';
import PageLoader from './components/ui/PageLoader.jsx';
```

```jsx
  return (
    <Suspense fallback={<PageLoader />}>
      <Page
        {...params}
        currentPath={path}
        session={session}
        onLogin={handleLogin}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </Suspense>
  );
```

- [ ] **Step 3: Run the suite and watch `App.test.jsx` fail**

Run: `cd frontend-react && npm test -- --run`
Expected: **FAIL — 4 tests in `src/App.test.jsx`.** This is predicted, not a surprise. `src/App.test.jsx` is the only test file that goes through the router; the five `BrokerDashboard.*.test.jsx` / `brokerDashboardListings.test.js` files import the component directly and are unaffected.

The four failures, and why:

1. `resolves every admin sub-path to the custom admin dashboard with a section` (line ~70) — asserts `expect(resolved.Page).toBe(AdminDashboard)`. A `lazy()` wrapper is a different object from the module's default export, so identity comparison can never hold again.
2. `routes to broker dashboard for broker sessions` (line ~34)
3. `routes to separate broker pages for broker sessions` (line ~46)
4. `routes to broker properties page for broker sessions` (line ~58)

Failures 2–4 all call `screen.getAllByRole(...)` synchronously right after `render(<App />)`. A lazy chunk resolves on a microtask, so at that moment the fallback spinner is on screen, not the dashboard.

- [ ] **Step 4: Fix the identity assertion**

In `frontend-react/src/App.test.jsx`, delete this import (it becomes unused):

```jsx
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
```

Replace the whole admin-resolution test with a version that asserts every admin path resolves to the *same* page, without coupling to the module's default export:

```jsx
test('resolves every admin sub-path to the custom admin dashboard with a section', () => {
  const cases = [
    ['/admin', 'overview'],
    ['/admin/brokers', 'brokers'],
    ['/admin/properties', 'properties'],
    ['/admin/viewings', 'viewings'],
    ['/admin/audit', 'audit'],
  ];
  const adminPage = resolveRoute('/admin').Page;
  for (const [path, section] of cases) {
    const resolved = resolveRoute(path);
    expect(resolved.Page).toBe(adminPage);
    expect(resolved.params.section).toBe(section);
  }
});
```

This keeps the test's real intent — all `/admin/*` paths share one page and carry the right section. The claim it gives up (that the page *is* the admin dashboard) is already proven by `mounts the admin overview dashboard for an admin session` at line ~85, which renders and finds the "Tổng quan" heading. Coverage is preserved across the two tests; do not add a brittle workaround to resurrect the identity check.

- [ ] **Step 5: Make the three broker route tests await the chunk**

In the same file, change each of the three broker tests to async and await the heading. Full replacement for all three:

```jsx
test('routes to broker dashboard for broker sessions', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker';
  render(<App />);
  expect((await screen.findAllByRole('heading', { name: 'Bảng điều khiển' })).length).toBeGreaterThan(0);
});

test('routes to separate broker pages for broker sessions', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/settings';
  render(<App />);
  expect((await screen.findAllByRole('heading', { name: 'Cài đặt' })).length).toBeGreaterThan(0);
});

test('routes to broker properties page for broker sessions', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/properties';
  render(<App />);
  expect((await screen.findAllByRole('heading', { name: 'Tin đăng của tôi' })).length).toBeGreaterThan(0);
});
```

Leave every other test in the file alone: `login page hides demo role account shortcuts`, `routes to forgot password page`, `routes to public projects and brokers pages` and `the revenue route no longer resolves to a dedicated broker page` all hit eager pages, and `mounts the admin overview dashboard for an admin session` already uses `await screen.findByRole`.

- [ ] **Step 6: Run the suite again**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS — every file green, including `src/App.test.jsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/routes/index.jsx frontend-react/src/App.jsx frontend-react/src/App.test.jsx
git commit -m "feat: lazy-load admin and broker dashboard routes"
```

---

### Task 6: Move dashboard CSS into the lazy chunks and measure

**Files:**
- Modify: `frontend-react/src/main.jsx:8` (remove one import)
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (add import)
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx` (add import)

**Interfaces:**
- Consumes: the lazy chunks from Task 5 — this task only pays off because those two pages are already split.
- Produces: nothing for later tasks.

**Why this is safe:** every `dashboard-*` class lives in `components/dashboard/*`, `DashboardWidgets.jsx`, `pages/admin/*` and `BrokerDashboard.jsx`. `MainLayout.jsx` and `LoginPage.jsx` use none. `Charts.jsx` is imported only by dashboard code, so it follows these chunks automatically and needs no separate handling.

- [ ] **Step 1: Remove the eager import**

In `frontend-react/src/main.jsx`, delete this line:

```js
import './styles/dashboard.css';
```

The other five imports (`styles.css`, `home.css`, `carousel.css`, `gallery.css`, `detail.css`) stay — they serve the public flow.

- [ ] **Step 2: Import it from both dashboard pages**

At the top of `frontend-react/src/pages/BrokerDashboard.jsx`:

```js
import '../styles/dashboard.css';
```

At the top of `frontend-react/src/pages/admin/AdminDashboard.jsx`:

```js
import '../../styles/dashboard.css';
```

Both import it so either dashboard works when entered directly; Vite emits it once as a shared chunk.

- [ ] **Step 3: Build and compare against the baseline**

Run: `cd frontend-react && npx vite build`

Expected: multiple JS chunks instead of one, plus a separate dashboard CSS file. The main `index-*.js` must be **smaller than the 386.84 kB baseline**, and `index-*.css` **smaller than 82.33 kB**. Record the actual numbers.

If the main chunk did **not** shrink, stop and investigate rather than proceeding — something still imports the dashboards eagerly. Check with:

```bash
cd frontend-react && grep -rn "AdminDashboard\|BrokerDashboard" src/ --include=*.jsx | grep -v test | grep -v "lazy("
```

- [ ] **Step 4: Verify the dashboards still render correctly**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS, all files.

Then drive the real app — tests do not prove CSS loaded. Run `npm run dev`, visit `/#/broker/dashboard` and `/#/admin/overview`, and confirm the dashboards are styled, not unstyled HTML. Confirm the browser tab title changes between `/#/`, `/#/brokers` and a property page.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/main.jsx frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/admin/AdminDashboard.jsx
git commit -m "perf: move dashboard styles into the lazy dashboard chunks"
```

---

## Verification before claiming done

REQUIRED SUB-SKILL: `superpowers:verification-before-completion`.

Evidence required — do not claim success without pasting the actual output:

1. `npm test -- --run` — green, with the file/test counts shown.
2. `npx vite build` — main chunk and CSS sizes quoted next to the `386.84 kB` / `82.33 kB` baseline.
3. Browser check: tab titles correct on home / brokers / a property page; both dashboards styled.
4. Head check in the browser devtools: `<meta name="robots" content="noindex">` present on `/#/admin/overview` but absent on `/#/`, and the **first** `<title>` in `<head>` is the route's.

   **Correction to an earlier version of this criterion**, which demanded exactly one `<title>`: that is wrong and would read as a failure. `index.html:6` ships a static `<title>Công Tín Land</title>`, so a real browser's `<head>` holds **two** title elements. React special-cases `title` in `mountHoistable` and inserts its own *before* any existing one, so React's title is always first and `document.title` (first-title-wins) returns it. The static tag is a useful pre-hydration default — do not delete it. jsdom tests never see this because they render into an empty head.

## Out of scope — do not do these here

Removing the unused `react-router-dom` dependency, replacing the hash router, server-side Open Graph tags, splitting `BrokerDashboard.jsx`, collapsing `MaterialIcon.jsx`, breaking up `styles.css`, adding a 404 page. Each has its own spec. **This work does not improve Zalo/Facebook link previews** — those crawlers do not run JavaScript.
