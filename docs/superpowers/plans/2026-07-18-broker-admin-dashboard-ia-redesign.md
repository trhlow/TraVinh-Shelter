# Broker + Admin Dashboard — Theme Unification & Admin IA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the admin dashboard's fixed dark/purple `.admin-theme` in favor of the site's shared light/dark tokens, and fix 4 concrete layout bugs on the admin "Tổng quan" page (phantom empty grid column, dead space beside the system-activity chart, an orphaned single-child grid) plus add a shared empty-state to the trend chart used by both dashboards.

**Architecture:** Pure CSS-token deletion for the theme change (no new theme to design — admin inherits broker dashboard's existing sidebar-dark/content-light convention automatically). Admin Overview layout changes are JSX/CSS-class swaps reusing existing grid primitives (`grid-4`, `dashboard-charts-row`+`dashboard-chart-span-2`, `dashboard-panels-row`) and an existing chart component (`ThreeDDonutChart` with its `compact` prop) — no new components. Broker dashboard's own panel structure is unchanged (already free of layout bugs).

**Tech Stack:** React 19, Vite 8, CSS custom properties, Vitest + Testing Library.

## Global Constraints

- UI text tiếng Việt, code tiếng Anh, commit message tiếng Anh (conventional commits), no AI attribution trailer.
- No hard-coded `#hex` in JSX; colors only via `var(--color-*)`.
- No `inline style` except where the codebase already uses inline `style={{ '--custom-prop': ... }}` for computed CSS variables (existing pattern in `Charts.jsx`, do not introduce new inline style usage beyond that).
- TDD for the one piece of business logic in this plan (`TrendBarLineChart` empty-state branch) — RED → GREEN → REFACTOR.
- `npm test -- --run` (from `frontend-react/`) must stay at 244 passing or higher after every task (only increasing from added tests, never decreasing).
- Backend and existing site functionality untouched — this plan only touches `frontend-react/src/{styles.css,styles/dashboard.css,components/Charts.jsx,components/Charts.test.jsx,pages/admin/AdminDashboard.jsx,pages/admin/OverviewSection.jsx,pages/admin/OverviewSection.test.jsx}`.
- Design spec this plan implements: `docs/superpowers/specs/2026-07-18-broker-admin-dashboard-ia-redesign-design.md`.

---

### Task 1: Remove `.admin-theme` — admin inherits shared site tokens

**Files:**
- Modify: `frontend-react/src/styles.css:135-178`
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx:140,156`

**Interfaces:**
- Consumes: nothing new — `--color-sidebar-bg`, `--color-primary`, `--chart-1..6` etc. already exist as tokens in `:root` (`styles.css:7-53`) and `[data-theme="dark"]` (`styles.css:71-122`).
- Produces: nothing new — this task only deletes an override scope. No later task depends on new interfaces from this one.

- [ ] **Step 1: Delete the `.admin-theme` CSS block**

In `frontend-react/src/styles.css`, delete lines 135-178 (the comment header and the entire rule block):

```css
/* ── Admin area: fixed đen-tím theme, never follows the site's light/dark toggle ───── */
.admin-theme {
  color-scheme: dark;
  --color-canvas: #141218;
  --color-surface-soft: #1c1a24;
  --color-surface-strong: #262331;
  --color-ink: #f2f0f6;
  --color-body: #d6d0e0;
  --color-muted: #a89fc2;
  --color-muted-soft: #7a7195;
  --color-primary: #8b5cf6;
  --color-primary-active: #7c3aed;
  --color-primary-disabled: #4c3a7a;
  --color-on-primary: #ffffff;
  --color-hairline: #2e2a3d;
  --color-hairline-soft: #211f2b;
  --color-border-strong: #453f5c;
  --color-success: #4ade80;
  --color-success-bg: #14532d;
  --color-warning: #fbbf24;
  --color-warning-bg: #78350f;
  --color-error: #f87171;
  --color-error-bg: #7f1d1d;
  --color-sidebar-bg: #1a1625;
  --shadow-card: rgba(255, 255, 255, 0.06) 0 0 0 1px,
                 rgba(0, 0, 0, 0.4) 0 2px 6px 0,
                 rgba(0, 0, 0, 0.5) 0 4px 8px 0;
  /* Self-contained categorical set, validated against this scope's own
     #141218 canvas — .admin-theme is always-dark regardless of the site
     light/dark toggle, so it cannot borrow chart-2..6 from [data-theme]
     the way it used to (those resolve against the SITE's dark surface,
     not admin's, and could silently mismatch if the toggle were light).
     Slot 1 doubles as --color-primary (admin's own accent); slots 1-4
     additionally clear all-pairs for the donut chart's cyclic adjacency. */
  --chart-1: #8b5cf6;
  --chart-2: #008300;
  --chart-3: #d55181;
  --chart-4: #c98500;
  --chart-5: #199e70;
  --chart-6: #d95926;
  background: var(--color-canvas);
  color: var(--color-body);
}

```

After deletion, `styles.css` should read (line 133 `}` closing the previous block, straight into the RESET section):

```css
  --shadow-dropdown: 0 4px 16px rgba(0,0,0,0.5);
}

/* ============================================================
   RESET & BASE
   ============================================================ */
```

- [ ] **Step 2: Remove the `admin-theme` class from `AdminDashboard.jsx`**

In `frontend-react/src/pages/admin/AdminDashboard.jsx`, there are exactly 2 occurrences of `className="dashboard-shell admin-theme"` (line 140, the non-admin-role fallback render, and line 156, the main render). Change both to `className="dashboard-shell"`:

```jsx
      <div className="dashboard-shell">
```

- [ ] **Step 3: Confirm no test references the removed class**

Run: `cd frontend-react && grep -rn "admin-theme" src/`
Expected: no output (already confirmed clean — this step is a guard against drift, not expected to find anything).

- [ ] **Step 4: Run the full test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: `244 passed` (same count as before this task — pure CSS/class removal touches no test-covered behavior).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/styles.css frontend-react/src/pages/admin/AdminDashboard.jsx
git commit -m "fix: drop fixed admin dark theme, share site tokens instead

Admin now inherits the same green/light-dark tokens the rest of the
site (and the broker dashboard's dark-sidebar/light-content pattern)
already use, instead of a separate purple/always-dark override."
```

---

### Task 2: `TrendBarLineChart` empty state (shared by broker + admin)

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: `Icon` component — `import Icon from './ui/Icon.jsx'` (new import in `Charts.jsx`; `Icon.jsx` only imports from `lucide-react`, no circular-import risk). Reuses existing CSS classes `widget-state-block`, `widget-state-icon`, `widget-state-title`, `widget-state-desc` (defined `styles/dashboard.css:671-704`, already used by `StateBlock` in `DashboardWidgets.jsx` — this task does NOT import `StateBlock` itself, since `DashboardWidgets.jsx` imports `Sparkline` from `Charts.jsx` and importing back would create a circular import; instead this task writes the equivalent markup inline using the same class names).
- Produces: `TrendBarLineChart` behavior change only — no new exported names. Task 4 (admin's new `TrendBarLineChart` usage) and existing broker/admin/reports usages all pick this up automatically, no call-site changes needed anywhere.

- [ ] **Step 1: Write the failing tests**

Add to `frontend-react/src/components/Charts.test.jsx`, right after the existing test `'TrendBarLineChart hides the line and second legend item when every previous value is 0'` (after line 483, before the `'TrendBarLineChart renders a narrow viewBox...'` test):

```jsx
test('TrendBarLineChart shows an empty state when every point is entirely zero', () => {
  const data = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
  ];
  const { container } = render(
    <TrendBarLineChart title="Hoạt động" subtitle="Theo tháng" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />,
  );

  expect(screen.getByText('Hoạt động')).toBeInTheDocument();
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
  expect(container.querySelector('.combo-bar')).not.toBeInTheDocument();
  expect(container.querySelector('circle')).not.toBeInTheDocument();
});

test('TrendBarLineChart still renders bars normally when data is sparse but not all-zero', () => {
  const data = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 3, previous: 0 },
    { label: 'T3', current: 0, previous: 0 },
  ];
  const { container } = render(<TrendBarLineChart title="Hoạt động" data={data} />);

  expect(screen.queryByText('Chưa có dữ liệu trong khoảng thời gian này.')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.combo-bar')).toHaveLength(3);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "empty state"`
Expected: FAIL — `Chưa có dữ liệu trong khoảng thời gian này.` not found (component doesn't render it yet).

- [ ] **Step 3: Add the `Icon` import and the empty-state branch**

In `frontend-react/src/components/Charts.jsx`, add the import at the top (after the existing 2 imports, line 2):

```jsx
import Icon from './ui/Icon.jsx';
```

In the `TrendBarLineChart` function body (currently starting at line 827), insert the empty-state check right after the `hasPrevious` line (currently line 834: `const hasPrevious = data.some((point) => point.previous);`):

```jsx
  const hasPrevious = data.some((point) => point.previous);
  const isEmpty = data.every((point) => !point.current && !point.previous);

  if (isEmpty) {
    return (
      <section className="chart-panel">
        <div className="chart3d-header">
          <div>
            <h2 className="chart-title">{title}</h2>
            {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="widget-state-block">
          <span className="widget-state-icon">
            <Icon name="BarChart3" size={24} strokeWidth={1.75} />
          </span>
          <p className="widget-state-title">Chưa có dữ liệu trong khoảng thời gian này.</p>
        </div>
      </section>
    );
  }
```

(The `title` used by `screen.getByText('Hoạt động')` in the test comes from the `<h2 className="chart-title">` — matches the non-empty render path's existing title markup, so accessible-name expectations elsewhere in the codebase that query by chart title text still work. This early return happens before `axisMax`/`points`/`linePath` are computed, so no division-by-zero or empty-array edge cases run.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx`
Expected: all tests in the file pass (40 total — 38 existing + 2 new).

- [ ] **Step 5: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: `246 passed` (244 + 2 new).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "feat: add empty state to TrendBarLineChart when all data is zero

Distinguishes genuinely-empty data (no bars/line, honest empty-state
message) from sparse data (few nonzero points, still drawn normally) —
previously both cases drew the same mostly-blank chart."
```

---

### Task 3: Admin Overview — merge quick actions into the filter bar, fix `grid-5` → `grid-4`

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Modify: `frontend-react/src/pages/admin/OverviewSection.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — pure JSX/CSS restructuring within `OverviewSection.jsx`. Task 4 and Task 5 both edit further down in the same returned JSX and are unaffected by this task's changes (this task only touches lines 80-116 of the original file).

- [ ] **Step 1: Update the existing test that checks quick-action placement**

The existing test `'renders KPI cards, filter bar, and quick actions'` in `frontend-react/src/pages/admin/OverviewSection.test.jsx` (lines 22-30) already queries by role/text, not by DOM structure, so it does not need changes — confirm this by reading it: it asserts `screen.getByRole('link', { name: /Cấp tài khoản môi giới/ })` has `href="#/admin/brokers"`, which stays true regardless of which flex row the link lives in. No edit needed to this test file in this step — proceed directly to the implementation.

- [ ] **Step 2: Add the CSS rule for the right-aligned actions group**

In `frontend-react/src/styles/dashboard.css`, right after the `.admin-filter-bar .input { width: auto; }` rule (line 1273), add:

```css
.admin-filter-bar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}
```

- [ ] **Step 3: Remove the dead `.admin-quick-actions` CSS rule**

Confirm it has no other callers first:

Run: `cd frontend-react && grep -rn "admin-quick-actions" src/`
Expected: 2 matches — the CSS rule itself (`styles/dashboard.css:1254`) and the JSX usage about to be removed in Step 4 (`pages/admin/OverviewSection.jsx:80`).

In `frontend-react/src/styles/dashboard.css`, delete the now-unused rule (lines 1253-1259):

```css
/* ── Admin quick actions + filter bar ──────────────────── */
.admin-quick-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

```

Replace with just:

```css
/* ── Admin filter bar ──────────────────────────────────── */
```

(keeping a section comment, dropping the dead rule).

- [ ] **Step 4: Merge quick-actions into the filter bar row, fix the KPI grid class**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, replace the block from the opening `<>` through the KPI `</div>` (original lines 78-116):

```jsx
  return (
    <>
      <div className="admin-quick-actions">
        <a className="btn btn-primary btn-sm" href="#/admin/brokers">
          ＋ Cấp tài khoản môi giới
        </a>
        <button className="btn btn-ghost btn-sm" type="button" onClick={exportOverview}>Xuất báo cáo</button>
      </div>

      <div className="admin-filter-bar">
        <DateRangeFilter
          preset={preset}
          custom={custom}
          onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }}
        />
        <label className="dashboard-table-sub" htmlFor="overview-ward-filter">Lọc theo phường</label>
        <select id="overview-ward-filter" className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
          {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
        </select>
      </div>

      <div className="grid-5 dashboard-stats-row">
```

with:

```jsx
  return (
    <>
      <div className="admin-filter-bar">
        <DateRangeFilter
          preset={preset}
          custom={custom}
          onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }}
        />
        <label className="dashboard-table-sub" htmlFor="overview-ward-filter">Lọc theo phường</label>
        <select id="overview-ward-filter" className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
          {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
        </select>
        <div className="admin-filter-bar-actions">
          <a className="btn btn-primary btn-sm" href="#/admin/brokers">
            ＋ Cấp tài khoản môi giới
          </a>
          <button className="btn btn-ghost btn-sm" type="button" onClick={exportOverview}>Xuất báo cáo</button>
        </div>
      </div>

      <div className="grid-4 dashboard-stats-row">
```

- [ ] **Step 5: Run the OverviewSection tests**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: all 5 existing tests pass unchanged (they query by role/text, not by the `grid-5`/`admin-quick-actions` classes just removed).

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: `246 passed` (no change in count from Task 2's total — this task doesn't add tests, Step 1 confirmed the existing test needed no edits).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/styles/dashboard.css
git commit -m "fix: merge admin quick actions into filter bar, fix grid-5/4 mismatch

Quick-action buttons no longer take a separate full-width row above the
filters — one combined row, so KPI cards appear sooner. Also fixes the
4-card KPI row being wrapped in a 5-column grid (grid-5), which left a
permanent empty 5th column at >=1280px."
```

---

### Task 4: Admin Overview — pair the system-activity chart with a category-breakdown donut

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`
- Modify: `frontend-react/src/pages/admin/OverviewSection.test.jsx`

**Interfaces:**
- Consumes: `ThreeDDonutChart` from `../../components/Charts.jsx` (already imported in `ReportsSection.jsx` as `import { ThreeDDonutChart } from '../../components/Charts.jsx'` — same import needed here). Signature: `ThreeDDonutChart({ title, subtitle, data, centerLabel, compact })` where `data` is `[{ label: string, value: number }]` (confirmed at `Charts.jsx:250-321` — `normalized = withColors(data)`, `total = normalized.reduce((sum, item) => sum + item.value, 0)`).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing test**

Add to `frontend-react/src/pages/admin/OverviewSection.test.jsx`, after the existing test `'renders monthly activity chart and system status panel'` (after line 37):

```jsx
test('renders a category-breakdown donut beside the system activity chart', () => {
  const mixedCategoryData = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-01T00:00:00Z' },
      { id: 'p2', title: 'B', ward: 'phuong-tra-vinh', category: 'nha', rawStatus: 'AVAILABLE', createdAt: '2026-06-02T00:00:00Z' },
      { id: 'p3', title: 'C', ward: 'phuong-tra-vinh', category: 'nha', rawStatus: 'AVAILABLE', createdAt: '2026-06-03T00:00:00Z' },
    ],
    viewings: [],
  };
  render(<OverviewSection data={mixedCategoryData} loading={false} />);

  expect(screen.getByText('Phân bổ theo danh mục')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Nhà: 2, \d+%/ })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Trọ: 1, \d+%/ })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx -t "category-breakdown donut"`
Expected: FAIL — `Phân bổ theo danh mục` not found.

- [ ] **Step 3: Import `ThreeDDonutChart` and `CATEGORIES`-based grouping**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, update the import from `Charts.jsx` (currently line 2):

```jsx
import { buildDailySeries, ThreeDDonutChart, TrendBarLineChart } from '../../components/Charts.jsx';
```

(`CATEGORIES` is already imported from `'../../data/locations.js'` at line 5 — no change needed there.)

Add a new `useMemo` right after `systemActivityData` (currently line 68):

```jsx
  const categoryDistributionData = useMemo(
    () => CATEGORIES.map((item) => ({
      label: item.label,
      value: filteredProperties.filter((property) => property.category === item.slug).length,
    })),
    [filteredProperties],
  );
```

- [ ] **Step 4: Replace the full-bleed chart row with a paired chart+donut row**

Replace (original lines 118-126, already shifted slightly by Task 3's edits but still the sole `<div className="dashboard-live-row">` block):

```jsx
      <div className="dashboard-live-row">
        <TrendBarLineChart
          title="Hoạt động hệ thống theo tháng"
          subtitle="Tin đăng mới và lịch hẹn đã xác nhận, tính từ khi có dữ liệu thực tế"
          data={systemActivityData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
      </div>
```

with:

```jsx
      <div className="dashboard-charts-row">
        <div className="dashboard-chart-span-2">
          <TrendBarLineChart
            title="Hoạt động hệ thống theo tháng"
            subtitle="Tin đăng mới và lịch hẹn đã xác nhận, tính từ khi có dữ liệu thực tế"
            data={systemActivityData}
            currentLabel="Tin đăng"
            previousLabel="Lịch hẹn xác nhận"
          />
        </div>
        <ThreeDDonutChart
          compact
          title="Phân bổ theo danh mục"
          data={categoryDistributionData}
          centerLabel="tin đăng"
        />
      </div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: all 6 tests pass (5 existing + 1 new).

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: `247 passed` (246 + 1 new).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/OverviewSection.test.jsx
git commit -m "feat: pair admin system-activity chart with a category donut

The chart previously sat alone in a full-bleed row while its own
internal width stayed capped at ~500-600px for 7-12 monthly points,
leaving dead space. Pairing it with a real category breakdown (reusing
ThreeDDonutChart's existing compact layout) fills the row and adds
content the admin overview was missing (broker dashboard already shows
this breakdown, admin didn't)."
```

---

### Task 5: Admin Overview — pair audit log with system status

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new.

- [ ] **Step 1: Move the "Tình trạng hệ thống" panel into the audit log's row**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, replace (original lines 128-140, now shifted by earlier tasks but still the block starting at `<div className="dashboard-panels-row">` through the closing `</DashboardPanel>` of "Tình trạng hệ thống"):

```jsx
      <div className="dashboard-panels-row">
        <AuditTimeline items={recentAuditItems} />
      </div>

      <DashboardPanel title="Tình trạng hệ thống" count={`${filteredProperties.length} tin trong bộ lọc`}>
        <div className="dashboard-system-lines">
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tổng bài đăng</span><span className="dashboard-system-line-value">{properties.length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Bài đăng đang hiển thị</span><span className="dashboard-system-line-value">{visibleCount}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Môi giới được cấp</span><span className="dashboard-system-line-value">{brokers.length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Lịch hẹn chờ</span><span className="dashboard-system-line-value">{viewings.filter((viewing) => viewing.status === 'PENDING').length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tài khoản bị khóa</span><span className="dashboard-system-line-value">{users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length}</span></div>
        </div>
      </DashboardPanel>
    </>
  );
}
```

with:

```jsx
      <div className="dashboard-panels-row">
        <AuditTimeline items={recentAuditItems} />
        <DashboardPanel title="Tình trạng hệ thống" count={`${filteredProperties.length} tin trong bộ lọc`}>
          <div className="dashboard-system-lines">
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tổng bài đăng</span><span className="dashboard-system-line-value">{properties.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Bài đăng đang hiển thị</span><span className="dashboard-system-line-value">{visibleCount}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Môi giới được cấp</span><span className="dashboard-system-line-value">{brokers.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Lịch hẹn chờ</span><span className="dashboard-system-line-value">{viewings.filter((viewing) => viewing.status === 'PENDING').length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tài khoản bị khóa</span><span className="dashboard-system-line-value">{users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length}</span></div>
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}
```

(Content of both panels is byte-for-byte unchanged — only the nesting moved "Tình trạng hệ thống" from a standalone `DashboardPanel` into the second slot of the existing 2-column `dashboard-panels-row`.)

- [ ] **Step 2: Run the OverviewSection tests**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: all 6 tests still pass (`screen.getByText('Tình trạng hệ thống')` and `getAllByText('Lịch hẹn chờ')` still find the same text, just relocated in the DOM tree — neither test queries the parent grid structure).

- [ ] **Step 3: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: `247 passed` (unchanged from Task 4 — no tests added or removed in this task).

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx
git commit -m "fix: pair audit log with system status instead of orphaning each in its own row

AuditTimeline was the sole child of a 2-column grid (empty 2nd column);
'Tình trạng hệ thống' sat alone in a full-width row right below it.
Grouping the two related system-health panels into one row removes
both the empty column and the redundant row break."
```

---

### Task 6: Visual verification — both dashboards, light and dark

**Files:** none (verification only, no code changes).

**Interfaces:** none.

- [ ] **Step 1: Start the dev server**

Run (background): `cd frontend-react && npm run dev`
Expected: server on `http://localhost:5173`.

- [ ] **Step 2: Screenshot admin overview — light and dark**

Using the project's existing Puppeteer verification pattern (`puppeteer-core` driving the system Chrome, session seeded via `page.evaluateOnNewDocument` before first navigation — see `feedback.md` memory "Browser automation IS available"), capture:
- `/#/admin/overview` with `localStorage['travinh-theme'] = 'light'`
- `/#/admin/overview` with `localStorage['travinh-theme'] = 'dark'`
- `/#/broker/dashboard` (unchanged, confirm no regression)

Expected, checked by eye against each screenshot:
- Admin sidebar dark, content area matches the toggled theme (light or dark) — not a fixed purple/dark canvas regardless of toggle.
- KPI row: exactly 4 evenly-sized cards, no empty 5th slot.
- "Hoạt động hệ thống theo tháng" chart sits beside "Phân bổ theo danh mục" donut, no large dead space to the right of the chart.
- "Log hoạt động hệ thống" and "Tình trạng hệ thống" sit side by side in one row, not stacked with an empty column.
- Broker dashboard unchanged from before this plan (still light content / dark sidebar, same panel layout, dots on the trend line still small per the earlier session's fix).

- [ ] **Step 3: Confirm the web-design-guidelines items from the spec are already satisfied**

Two items the spec flagged for checking (§4.2) turn out to require no code change — confirm both by reading the code, not just by inspection of the rendered page:

- Header action buttons (Task 3): `"＋ Cấp tài khoản môi giới"` is an `<a>` and `"Xuất báo cáo"` is a `<button>`, both with visible text labels (not icon-only) — the "icon-only buttons need aria-label" rule doesn't apply to either.
- Audit list text in the narrower paired column (Task 5): `.dashboard-audit-meta` already has `min-width: 0` (`styles.css:2099-2101`), so long titles wrap instead of overflowing the flex row — the guideline's concern (flex children need `min-w-0`) is already satisfied. Titles wrap to multiple lines rather than truncating with an ellipsis; this is acceptable (no broken layout) and does not need new CSS.

Run: `cd frontend-react && grep -n "dashboard-audit-meta" src/styles.css`
Expected: the `min-width: 0` rule is present, confirming the above.

- [ ] **Step 4: Report findings**

If any visual issue is found, fix it before considering this plan complete (do not defer to "future work" — this is the acceptance gate for the whole plan, per `verification-before-completion`).
