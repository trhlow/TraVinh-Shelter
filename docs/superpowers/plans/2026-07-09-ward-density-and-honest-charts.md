# Mật độ tin theo phường (4 biểu đồ) + biểu đồ trung thực với dữ liệu thật — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unstyled `HeatmapChart` on "Mật độ tin theo phường" with 4 real bar charts (one per ward, auto-scaling Y axis), and stop 3 monthly trend charts from fabricating or padding data for months that have no real records.

**Architecture:** A new shared `trimLeadingEmptyMonths` helper in `utils/chartSeries.js` cuts leading all-zero months off any rolling-month bucket array. A new `CategoryBarChart` component in `Charts.jsx` reuses `WardBarChart`'s existing, already-styled CSS classes (`.chart-panel`, `.ward-bar-*`) to render one ward's Trọ/Nhà/Đất counts as a real bar chart. `ReportsSection.jsx` renders 4 of these (one per real ward), replacing `HeatmapChart`, which is then deleted as dead code. Three existing month-bucket builders (`buildUserGrowthData`, `buildSystemActivitySeries`, and `BrokerDashboard`'s `buildActivitySeries`) are fixed to stop inventing numbers and to trim leading empty months via the new helper.

**Tech Stack:** React 19, Vitest + Testing Library (jsdom), existing project CSS (`styles.css`, `styles/dashboard.css`) — no new dependencies.

## Global Constraints

- UI text: Tiếng Việt. Code (vars/functions/comments): Tiếng Anh. Commit messages: Tiếng Anh, conventional commits.
- No inline styles beyond what existing chart components already do (CSS custom properties via `style={{ '--bar-h': ... }}` etc. — established pattern, not new).
- No hard-coded `#hex` in JSX — only CSS variables (existing `CHART_PALETTE` in `Charts.jsx` already follows this; reuse it, don't add hex).
- No new UI libraries. `lucide-react` only for icons (this plan adds no icons).
- Charts must never fabricate/interpolate/pad numeric values — every displayed value must trace to a real record count.
- `CATEGORIES` = 3 entries (`tro`/Trọ, `nha`/Nhà, `dat`/Đất) from `frontend-react/src/data/locations.js` — do not add a 4th "cho thuê" category; rent/sale are transaction types already folded into these 3, not separate categories.
- `WARDS` = 5 entries including a synthetic `{ code: 'all', label: 'Tất cả Trà Vinh' }` — always filter this out with `WARDS.filter((w) => w.code !== 'all')` before mapping to per-ward charts (established pattern already used in `buildWardData` and `buildHeatmapData` in `Charts.jsx`).
- Run frontend tests with `cd frontend-react && npm test -- --run` (whole suite) or `npx vitest run <file>` (single file). The `npm test` script already includes `--environment jsdom`.

---

### Task 1: `trimLeadingEmptyMonths` helper

**Files:**
- Create: `frontend-react/src/utils/chartSeries.js`
- Test: `frontend-react/src/utils/chartSeries.test.js`

**Interfaces:**
- Produces: `trimLeadingEmptyMonths(buckets: Array<{ current?: number, previous?: number, [key: string]: any }>) => Array<...>` — same shape as `buckets`, exported as a named export. Cuts every leading entry where both `current` and `previous` are falsy/0; keeps everything from the first entry where either is truthy through to the end. If no entry ever has real data, returns an array containing only the last entry (so the current period always renders, even at 0).

- [ ] **Step 1: Write the failing tests**

Create `frontend-react/src/utils/chartSeries.test.js`:

```javascript
import { expect, test } from 'vitest';
import { trimLeadingEmptyMonths } from './chartSeries.js';

test('trimLeadingEmptyMonths cuts leading zero-value entries', () => {
  const buckets = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
    { label: 'T3', current: 5, previous: 0 },
    { label: 'T4', current: 2, previous: 1 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result.map((b) => b.label)).toEqual(['T3', 'T4']);
});

test('trimLeadingEmptyMonths keeps a bucket real if only previous is non-zero', () => {
  const buckets = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 3 },
    { label: 'T3', current: 0, previous: 0 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result.map((b) => b.label)).toEqual(['T2', 'T3']);
});

test('trimLeadingEmptyMonths returns only the last entry when everything is zero', () => {
  const buckets = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
    { label: 'T3', current: 0, previous: 0 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result).toHaveLength(1);
  expect(result[0].label).toBe('T3');
});

test('trimLeadingEmptyMonths returns the array unchanged when the first entry already has data', () => {
  const buckets = [
    { label: 'T1', current: 1, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result).toEqual(buckets);
});

test('trimLeadingEmptyMonths treats missing current/previous fields as 0', () => {
  const buckets = [
    { label: 'T1' },
    { label: 'T2', current: 4 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result.map((b) => b.label)).toEqual(['T2']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/utils/chartSeries.test.js`
Expected: FAIL — `Failed to resolve import "./chartSeries.js"` (file doesn't exist yet).

- [ ] **Step 3: Implement the helper**

Create `frontend-react/src/utils/chartSeries.js`:

```javascript
// Cuts leading entries where every numeric series value is 0, so trend charts
// don't imply history from before the platform had any real data. Always
// keeps at least the last entry (the current period), even if it's still 0.
export function trimLeadingEmptyMonths(buckets) {
  const firstRealIndex = buckets.findIndex((bucket) => (bucket.current || 0) > 0 || (bucket.previous || 0) > 0);
  if (firstRealIndex === -1) return buckets.slice(-1);
  return buckets.slice(firstRealIndex);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/utils/chartSeries.test.js`
Expected: PASS — 5/5 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/utils/chartSeries.js frontend-react/src/utils/chartSeries.test.js
git commit -m "feat: add trimLeadingEmptyMonths helper for honest trend charts"
```

---

### Task 2: `buildCategoryDensityData` + `CategoryBarChart`

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (add two new exports; do not touch `HeatmapChart`/`buildHeatmapData` yet — Task 4 removes them)
- Test: `frontend-react/src/components/Charts.test.jsx` (add new test cases; do not remove existing `HeatmapChart` tests yet)

**Interfaces:**
- Consumes: `CATEGORIES` from `../data/locations.js` (already imported in `Charts.jsx` line 2 — `{ slug, label }` for `tro`/`nha`/`dat`), the existing `CHART_PALETTE` array and `withColors`-style indexing pattern already used by `WardBarChart`.
- Produces:
  - `buildCategoryDensityData(properties: Array<{ ward, category }>, wardCode: string) => Array<{ slug: string, label: string, count: number, pct: number }>` (always 3 entries, one per `CATEGORIES` entry, in `CATEGORIES` order).
  - `CategoryBarChart({ title: string, data: Array<{ slug, label, count, pct }> })` — React component, default export style matches other named exports in this file (`export function CategoryBarChart(...)`).

- [ ] **Step 1: Write the failing tests**

Add to the end of `frontend-react/src/components/Charts.test.jsx` (add `buildCategoryDensityData` and `CategoryBarChart` to the existing import on line 4-6):

```javascript
import {
  buildDailySeries, buildHeatmapData, buildMonthlySeries, buildWardData, HeatmapChart, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart,
} from './Charts.jsx';
```

Then append at the end of the file:

```javascript
// ── buildCategoryDensityData / CategoryBarChart ──────────

test('buildCategoryDensityData returns all 3 categories with counts scoped to one ward', () => {
  const properties = [
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
    { ward: 'phuong-long-duc', category: 'dat' }, // different ward, must not count
  ];
  const data = buildCategoryDensityData(properties, 'phuong-tra-vinh');

  expect(data).toHaveLength(3);
  expect(data.map((item) => item.slug)).toEqual(['tro', 'nha', 'dat']);
  expect(data.find((item) => item.slug === 'tro').count).toBe(2);
  expect(data.find((item) => item.slug === 'nha').count).toBe(1);
  expect(data.find((item) => item.slug === 'dat').count).toBe(0);
});

test('buildCategoryDensityData computes percent share within the ward', () => {
  const properties = [
    { ward: 'phuong-hoa-thuan', category: 'tro' },
    { ward: 'phuong-hoa-thuan', category: 'tro' },
    { ward: 'phuong-hoa-thuan', category: 'tro' },
    { ward: 'phuong-hoa-thuan', category: 'nha' },
  ];
  const data = buildCategoryDensityData(properties, 'phuong-hoa-thuan');
  expect(data.find((item) => item.slug === 'tro').pct).toBe(75);
  expect(data.find((item) => item.slug === 'nha').pct).toBe(25);
});

test('buildCategoryDensityData returns all-zero counts and 0% when the ward has no listings', () => {
  const data = buildCategoryDensityData([], 'phuong-nguyet-hoa');
  data.forEach((item) => {
    expect(item.count).toBe(0);
    expect(item.pct).toBe(0);
  });
});

test('CategoryBarChart renders title and one column per category with count and percent', () => {
  const data = buildCategoryDensityData([
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
  ], 'phuong-tra-vinh');
  render(<CategoryBarChart title="Mật độ tin — Phường Trà Vinh" data={data} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin — Phường Trà Vinh' })).toBeInTheDocument();
  expect(screen.getByText('Trọ')).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument(); // tro count
  expect(screen.getByText('80%')).toBeInTheDocument(); // 4/5
});

test('CategoryBarChart scales bar height to the real max, not a fixed range', () => {
  const highVolume = buildCategoryDensityData(
    Array.from({ length: 7 }, () => ({ ward: 'phuong-tra-vinh', category: 'tro' })),
    'phuong-tra-vinh',
  );
  const { container } = render(<CategoryBarChart title="Test" data={highVolume} />);
  const filledBar = container.querySelector('.ward-bar-fill');
  // max count among the 3 categories is 7 (all in "tro") -> that bar must render at 100% height
  expect(filledBar.style.height).toBe('100%');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — `buildCategoryDensityData`/`CategoryBarChart` are not exported from `Charts.jsx`.

- [ ] **Step 3: Implement `buildCategoryDensityData` and `CategoryBarChart`**

In `frontend-react/src/components/Charts.jsx`, add after the `buildWardData` function (after line 346, before the `dayKey` comment block):

```javascript
// One row per real category (Trọ/Nhà/Đất) scoped to a single ward, so each
// ward gets its own bar chart with counts/percent computed from that ward's
// listings only.
export function buildCategoryDensityData(properties, wardCode) {
  const wardProperties = properties.filter((property) => property.ward === wardCode);
  const total = wardProperties.length;
  return CATEGORIES.map((category) => {
    const count = wardProperties.filter((property) => property.category === category.slug).length;
    return {
      slug: category.slug,
      label: category.label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}
```

Add the component right after `WardBarChart` (after line 555, before the `GaugeChart` JSDoc comment):

```javascript
/**
 * CategoryBarChart — one real column per property category (Trọ/Nhà/Đất) for
 * a single ward. Reuses WardBarChart's CSS classes so it renders styled
 * without adding new CSS. Height scales to the real max count among the 3
 * categories, so the Y axis auto-adjusts as data grows (no fixed 0-3 range).
 */
export function CategoryBarChart({ title, data }) {
  const max = Math.max(...data.map((item) => item.count), 1);

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="ward-bar-cols">
        {data.map((item, index) => (
          <div className="ward-bar-col" key={item.slug}>
            <span className="ward-bar-count">{item.count}</span>
            <div className="ward-bar-track">
              <span
                className="ward-bar-fill"
                style={{
                  height: `${Math.max(4, (item.count / max) * 100)}%`,
                  backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
                }}
              />
            </div>
            <span className="ward-bar-name">{item.label}</span>
            <span className="ward-bar-pct">{item.pct}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — all tests including the 5 new ones.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "feat: add CategoryBarChart for per-ward category density"
```

---

### Task 3: Wire `ReportsSection.jsx` to 4 `CategoryBarChart` panels

**Files:**
- Modify: `frontend-react/src/pages/admin/ReportsSection.jsx`
- Modify: `frontend-react/src/styles.css` (new grid row class for 4 charts)
- Modify: `frontend-react/src/pages/admin/ReportsSection.test.jsx`

**Interfaces:**
- Consumes: `buildCategoryDensityData`, `CategoryBarChart` from `../../components/Charts.jsx` (produced by Task 2). `WARDS` from `../../data/locations.js` (already imported in this file).
- Produces: no new exports — internal page wiring only.

- [ ] **Step 1: Update the failing test first**

In `frontend-react/src/pages/admin/ReportsSection.test.jsx`, replace the assertion on line 24 (`expect(screen.getByText('Mật độ tin theo phường')).toBeInTheDocument();`) — the old single heatmap title no longer exists; 4 per-ward chart titles replace it:

```javascript
test('renders growth, distribution, density, and broker performance charts', () => {
  render(<ReportsSection data={data} loading={false} />);
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  expect(screen.getByText('Phân bổ tin đăng theo khu vực')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Long Đức')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Nguyệt Hóa')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Hòa Thuận')).toBeInTheDocument();
  expect(screen.getByText('Danh sách môi giới')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/pages/admin/ReportsSection.test.jsx`
Expected: FAIL — the 4 ward-specific titles don't exist yet (still rendering `HeatmapChart`).

- [ ] **Step 3: Rewire `ReportsSection.jsx`**

In `frontend-react/src/pages/admin/ReportsSection.jsx`, change the import block (lines 1-12):

```javascript
import { useMemo, useState } from 'react';
import {
  buildCategoryDensityData,
  buildWardData,
  CategoryBarChart,
  ThreeDDonutChart,
  ThreeDGroupedBarChart,
} from '../../components/Charts.jsx';
import { DashboardPanel, StateBlock, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES } from '../../data/locations.js';
import { isInRange, resolveDateRange } from '../../utils/dateRange.js';
```

Replace the `heatmapData` useMemo (lines 41-44) with:

```javascript
  const wardDensityData = useMemo(
    () => WARDS.filter((item) => item.code !== 'all').map((item) => ({
      code: item.code,
      label: item.label,
      data: buildCategoryDensityData(filteredProperties, item.code),
    })),
    [filteredProperties],
  );
```

Remove the `drillTo` function (lines 46-49) — it was only used by `HeatmapChart`'s `onSelectCell`, which is being removed:

```javascript
  const drillTo = (params) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#/admin/properties?${query}`;
  };
```

Replace the `dashboard-charts-row` block (lines 85-95):

```javascript
      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <ThreeDGroupedBarChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
      </div>
```

with:

```javascript
      <div className="dashboard-ward-density-row">
        {wardDensityData.map((ward) => (
          <CategoryBarChart key={ward.code} title={`Mật độ tin — ${ward.label}`} data={ward.data} />
        ))}
      </div>

      <div className="dashboard-charts-row">
        <ThreeDGroupedBarChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
      </div>
```

- [ ] **Step 4: Add the 4-column grid CSS**

In `frontend-react/src/styles.css`, add right after the `.dashboard-charts-row` responsive rule (after line 1494, before `.dashboard-live-row` on line 1496):

```css
.dashboard-ward-density-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 1280px) {
  .dashboard-ward-density-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .dashboard-ward-density-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/admin/ReportsSection.test.jsx`
Expected: PASS.

Also run the full suite once, since `ReportsSection.jsx` still imports `HeatmapChart`-adjacent names indirectly through `Charts.jsx` (not removed until Task 4) — confirm nothing else broke:

Run: `cd frontend-react && npm test -- --run`
Expected: PASS (HeatmapChart/buildHeatmapData still exist in Charts.jsx at this point, just unused by ReportsSection now — Task 4 removes them).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/admin/ReportsSection.jsx frontend-react/src/pages/admin/ReportsSection.test.jsx frontend-react/src/styles.css
git commit -m "feat(admin): show 4 per-ward category density charts instead of the heatmap"
```

---

### Task 4: Remove dead `HeatmapChart`/`buildHeatmapData`

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (delete `buildHeatmapData` and `HeatmapChart`)
- Modify: `frontend-react/src/components/Charts.test.jsx` (delete their tests)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — pure deletion. Confirmed by Task 3 that no page imports these anymore.

- [ ] **Step 1: Confirm no remaining usages**

Run: `cd frontend-react && npx vitest run src/pages` (sanity pass before deleting) — or a simple search:

```bash
grep -rn "HeatmapChart\|buildHeatmapData" frontend-react/src --include=*.jsx --include=*.js
```

Expected: matches only inside `frontend-react/src/components/Charts.jsx` (the definitions) and `frontend-react/src/components/Charts.test.jsx` (the tests) — no page file references them anymore.

- [ ] **Step 2: Delete the component and builder from `Charts.jsx`**

In `frontend-react/src/components/Charts.jsx`, delete the `buildHeatmapData` function (the block starting with the comment `// Ward × category matrix; full grid always renders...` through its closing `}`, lines 609-624) and the `HeatmapChart` component plus its JSDoc comment (lines 626-672, the `/** HeatmapChart — ... */` block through the final `}` and the trailing blank line before EOF). After deletion, `Fragment` (imported on line 1) becomes unused — remove it from the import too:

```javascript
import { useState } from 'react';
import { CATEGORIES, WARDS } from '../data/locations.js';
```

- [ ] **Step 3: Delete the corresponding tests from `Charts.test.jsx`**

Remove the `HeatmapChart` import from the top-of-file import (revert to the pre-Task-2 list minus `buildHeatmapData`/`HeatmapChart`):

```javascript
import {
  buildDailySeries, buildMonthlySeries, buildWardData, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart,
} from './Charts.jsx';
```

Delete the entire `// ── HeatmapChart ──────────────────────────────────────────` section (the 3 tests: `'buildHeatmapData always yields 4 wards x 3 categories with counts and max'`, `'HeatmapChart renders labels and fires onSelectCell with ward + category'`, `'HeatmapChart shows a low-to-high color scale legend'`).

- [ ] **Step 4: Run tests to verify everything still passes**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — no `HeatmapChart` tests remain, all others pass.

Run: `cd frontend-react && npm test -- --run`
Expected: PASS — full suite green (no other file referenced the deleted exports).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "chore: remove unused HeatmapChart/buildHeatmapData (replaced by CategoryBarChart)"
```

---

### Task 5: Stop `buildUserGrowthData` from fabricating data

**Files:**
- Modify: `frontend-react/src/pages/admin/ReportsSection.jsx`
- Modify: `frontend-react/src/pages/admin/ReportsSection.test.jsx`

**Interfaces:**
- Consumes: `trimLeadingEmptyMonths` from `../../utils/chartSeries.js` (produced by Task 1).
- Produces: no signature change to `buildUserGrowthData(users)` — same call site (`useMemo` on line 32), same return shape (`Array<{ label, current, previous }>`), just honest values and possibly fewer entries (trimmed).

- [ ] **Step 1: Write the failing test**

Add to `frontend-react/src/pages/admin/ReportsSection.test.jsx` (needs `within` added to the Testing Library import on line 3):

```javascript
import { cleanup, render, screen, within } from '@testing-library/react';
```

Append a new test:

```javascript
test('user growth chart shows only months with real users, no fabricated bars', () => {
  const now = new Date();
  const growthData = {
    users: [{ id: 'u1', role: 'USER', status: 'ACTIVE', createdAt: now.toISOString() }],
    brokers: [],
    properties: [],
    viewings: [],
  };
  render(<ReportsSection data={growthData} loading={false} />);
  const stage = screen.getByRole('img', { name: 'Tăng trưởng người dùng mới' });
  const monthLabels = within(stage).getAllByText(/^T\d{1,2}$/);
  expect(monthLabels).toHaveLength(1);
});

test('user growth chart shows 0 for the current month when there are no users at all', () => {
  const emptyData = { users: [], brokers: [], properties: [], viewings: [] };
  render(<ReportsSection data={emptyData} loading={false} />);
  const stage = screen.getByRole('img', { name: 'Tăng trưởng người dùng mới' });
  const monthLabels = within(stage).getAllByText(/^T\d{1,2}$/);
  expect(monthLabels).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/admin/ReportsSection.test.jsx`
Expected: FAIL — current `buildUserGrowthData` fabricates a bar every 4th month (`index % 4 === 0 ? 1 : 0`) and never trims, so 12 month labels render instead of 1.

- [ ] **Step 3: Fix `buildUserGrowthData`**

In `frontend-react/src/pages/admin/ReportsSection.jsx`, add the import (alongside the existing `../../utils/dateRange.js` import):

```javascript
import { trimLeadingEmptyMonths } from '../../utils/chartSeries.js';
```

Replace the `buildUserGrowthData` function:

```javascript
function buildUserGrowthData(users) {
  const buckets = rollingMonthBuckets();
  users.forEach((user) => {
    const date = dateOrFallback(user.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current += 1;
  });
  return trimLeadingEmptyMonths(buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: 0,
  })));
}
```

(Removes the `index` parameter from the `forEach` callback — it's no longer used since `dateOrFallback` always gets `0` — and removes both the `index % 4 === 0 ? 1 : 0` fabrication and the `* 0.72` fake "previous period" estimate. There's no real historical comparison data, so `previous` is honestly `0` rather than a guess.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/admin/ReportsSection.test.jsx`
Expected: PASS — all tests including the 2 new ones.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/admin/ReportsSection.jsx frontend-react/src/pages/admin/ReportsSection.test.jsx
git commit -m "fix(admin): stop fabricating user-growth chart data, trim empty leading months"
```

---

### Task 6: Trim empty leading months on `buildSystemActivitySeries`

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`
- Modify: `frontend-react/src/pages/admin/OverviewSection.test.jsx`

**Interfaces:**
- Consumes: `trimLeadingEmptyMonths` from `../../utils/chartSeries.js` (produced by Task 1).
- Produces: no signature change to `buildSystemActivitySeries(properties, viewings)` — same call site (line 63), same return shape, fewer entries when the platform has less than 12 months of history.

- [ ] **Step 1: Write the failing test**

Add to `frontend-react/src/pages/admin/OverviewSection.test.jsx` (needs `within` added to the import on line 3):

```javascript
import { cleanup, render, screen, within } from '@testing-library/react';
```

Append:

```javascript
test('system activity chart trims months before the platform had any real data', () => {
  const now = new Date();
  const recentOnly = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: now.toISOString() },
    ],
    viewings: [],
  };
  render(<OverviewSection data={recentOnly} loading={false} />);
  const stage = screen.getByRole('img', { name: 'Hoạt động hệ thống theo tháng' });
  const monthLabels = within(stage).getAllByText(/^T\d{1,2}$/);
  expect(monthLabels).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/pages/admin/OverviewSection.test.jsx`
Expected: FAIL — current `buildSystemActivitySeries` always returns all 12 rolling months, so 12 labels render instead of 1.

- [ ] **Step 3: Fix `buildSystemActivitySeries`**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, add the import (alongside the existing `../../utils/dateRange.js` and `../../utils/exportCsv.js` imports):

```javascript
import { trimLeadingEmptyMonths } from '../../utils/chartSeries.js';
```

Replace the return statement in `buildSystemActivitySeries` (lines 171-175):

```javascript
  return trimLeadingEmptyMonths(buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: bucket.previous || 0,
  })));
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/admin/OverviewSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/OverviewSection.test.jsx
git commit -m "fix(admin): trim empty leading months on the system activity chart"
```

---

### Task 7: Rolling-window + trim on broker's `buildActivitySeries`

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.activity.test.jsx`

**Interfaces:**
- Consumes: `trimLeadingEmptyMonths` from `../utils/chartSeries.js` (produced by Task 1, note the relative path is one level up from `../../utils/` used in the admin pages — `BrokerDashboard.jsx` lives directly under `pages/`, not `pages/admin/`).
- Produces: no signature change to `buildActivitySeries(listings, viewings)` — same call site (line 188), same return shape (`Array<{ label, current, previous }>`). Behavior changes: buckets are now a real rolling 12-month window ending at the current month (matching the pattern in `ReportsSection.jsx`/`OverviewSection.jsx`) instead of a fixed Jan-Dec calendar grouping, and leading empty months are trimmed.

- [ ] **Step 1: Write the failing test**

Add `within` to the Testing Library import at the top of `frontend-react/src/pages/BrokerDashboard.activity.test.jsx`:

```javascript
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
```

Append this test — it reuses the file's existing pattern (the `fetch` mock rejects, so `listings`/`viewings` both resolve to empty arrays, same as the file's first test):

```javascript
test('activity chart shows exactly the current month when there is no real activity yet', async () => {
  render(<BrokerDashboard session={session} onLogin={() => {}} onLogout={() => {}} currentPath="/broker/dashboard" section="dashboard" />);
  await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Bảng điều khiển' }).length).toBeGreaterThan(0));
  const stage = screen.getByRole('img', { name: 'Hoạt động môi giới theo tháng' });
  const monthLabels = within(stage).getAllByText(/^T\d{1,2}$/);
  expect(monthLabels).toHaveLength(1);
});
```

(With 0 listings and 0 viewings, `trimLeadingEmptyMonths` keeps only the last bucket — the current month, at 0 — per its "always keep at least the last entry" rule from Task 1.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.activity.test.jsx`
Expected: FAIL — current `buildActivitySeries` always returns all 12 fixed calendar months (T1-T12), so 12 labels render instead of 1.

- [ ] **Step 3: Fix `buildActivitySeries`**

In `frontend-react/src/pages/BrokerDashboard.jsx`, add the import (alongside the existing `../utils/dateRange.js` and `../utils/exportCsv.js` imports on lines 12-13):

```javascript
import { trimLeadingEmptyMonths } from '../utils/chartSeries.js';
```

Replace the `buildActivitySeries` function (lines 1152-1169):

```javascript
function buildActivitySeries(listings, viewings) {
  const buckets = rollingMonthBuckets();
  listings.forEach((listing) => {
    const date = new Date(listing.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current += 1;
  });
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const date = new Date(viewing.requestedAt || viewing.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.previous += 1;
  });
  return trimLeadingEmptyMonths(buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: bucket.previous || 0,
  })));
}

function rollingMonthBuckets(referenceDate = new Date(), length = 12) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (length - 1 - index), 1);
    return {
      date,
      label: `T${date.getMonth() + 1}`,
      current: 0,
      previous: 0,
    };
  });
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
```

This replaces the old fixed-length-12 `postCounts`/`confirmedCounts` arrays indexed by `date.getMonth()` (which always grouped every year's January together, rendered all 12 calendar months regardless of data, and couldn't be meaningfully trimmed since "T1" always sorted first) with the same rolling-12-months-ending-now + trim pattern already used in `ReportsSection.jsx` and `OverviewSection.jsx`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.activity.test.jsx`
Expected: PASS.

Run the full suite to confirm no regression elsewhere (other `BrokerDashboard.*.test.jsx` files exercise the same component):

Run: `cd frontend-react && npm test -- --run`
Expected: PASS — 0 failures.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.activity.test.jsx
git commit -m "fix(broker): switch activity chart to a real rolling 12-month window, trim empty months"
```

---

## Final Verification (after all 7 tasks)

Run the full frontend suite once more from a clean state:

```bash
cd frontend-react && npm test -- --run
```

Expected: all tests pass (baseline was 131/131 before this plan; expect 131 + ~13 new tests from Tasks 1, 2, 5, 6, 7 minus 3 removed `HeatmapChart` tests from Task 4 ≈ 141).
