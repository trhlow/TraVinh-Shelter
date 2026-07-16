# Nhóm 2 — Date-filter wiring, mock clock skew, admin layout gaps, chart label overlap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 admin-dashboard bugs: date-range filter not reflected in the Overview KPI/audit widget, mock data timestamps drifting stale relative to real time, an empty grid column in Overview's live-row, and an empty grid column + label overlap on the "Top môi giới theo hoạt động" chart.

**Architecture:** 5 tasks. Task 1 (OverviewSection wiring) and Task 2 (mock clock anchor) and Task 3 (CSS grid fix) are fully independent of each other and of Tasks 4-5. Task 4 (shared `TrendBarLineChart` opt-in prop) must land before Task 5 (the one call site that uses it) — run them in that order.

**Tech Stack:** React 19, Vitest + Testing Library, plain CSS (no inline styles, no new libraries).

## Global Constraints

- Conventional commits, English commit messages, no `Co-Authored-By` trailer.
- Frontend tests: `cd frontend-react && npm test -- --run`. Baseline before this plan: 153/153 (after Nhóm 1).
- No hard-coded `#hex` colors, no new inline styles introduced by any task in this plan.
- The 12-month "Hoạt động hệ thống theo tháng" trend chart in `OverviewSection.jsx` stays **unfiltered** by the date-range preset (an explicit, already-approved decision) — do not wire `buildSystemActivitySeries`'s inputs to `filteredProperties`/`filteredViewings`.
- `TrendBarLineChart`'s 4 existing call sites (ward density, category density, user growth, broker-activity-by-month in admin overview) must keep rendering exactly as before — any new behavior in this chart component must be strictly opt-in via a new prop that defaults to today's behavior.

---

### Task 1: Wire OverviewSection's KPI value + audit widget to the date filter

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`
- Test: `frontend-react/src/pages/admin/OverviewSection.test.jsx`

**Interfaces:** None — no other task depends on this.

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/pages/admin/OverviewSection.test.jsx`, add these 2 tests after the existing 3 tests (they need `fireEvent` and a `DateRangeFilter` preset click — check the import line first: it currently imports `{ cleanup, render, screen, within }` from `'@testing-library/react'`, add `fireEvent`):

```javascript
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import OverviewSection from './OverviewSection.jsx';
```

```javascript
test('Tổng số tin đăng KPI value narrows when a date preset excludes older listings', () => {
  const now = new Date();
  const mixedAgeData = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'Mới', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: now.toISOString() },
      { id: 'p2', title: 'Cũ', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2020-01-01T00:00:00Z' },
    ],
    viewings: [],
  };
  render(<OverviewSection data={mixedAgeData} loading={false} />);

  // Scope to the KPI link itself — "Tổng bài đăng" in the system-status panel below
  // legitimately keeps showing the unfiltered total ('2') by design, so an unscoped
  // screen.getByText('2') would still pass even if the KPI value itself were still buggy.
  const kpiLink = () => screen.getByRole('link', { name: /Tổng số tin đăng/ });

  // 'Tất cả' (default preset) counts both listings.
  expect(within(kpiLink()).getByText('2')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));

  // narrowed to the last 7 days: only the just-created listing counts, the 2020 one is excluded.
  expect(within(kpiLink()).getByText('1')).toBeInTheDocument();
  expect(within(kpiLink()).queryByText('2')).not.toBeInTheDocument();
});

test('audit widget only shows properties/viewings inside the selected date range', () => {
  const now = new Date();
  const mixedAgeData = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'Tin mới trong tuần', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: 'p2', title: 'Tin rất cũ', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z' },
    ],
    viewings: [],
  };
  render(<OverviewSection data={mixedAgeData} loading={false} />);

  fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));

  expect(screen.getByText(/Tin mới trong tuần/)).toBeInTheDocument();
  expect(screen.queryByText(/Tin rất cũ/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: FAIL — both new tests fail because `value: properties.length` and `buildAuditItems({ users, properties, viewings })` still use the raw unfiltered arrays, so nothing narrows when the "7 ngày" preset is clicked.

- [ ] **Step 3: Add `filteredViewings` and wire the KPI value + audit widget**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, add a new `filteredViewings` memo right after the existing `prevProperties` memo (after line 34):

```javascript
  const filteredViewings = useMemo(() => viewings.filter((viewing) => (
    isInRange(viewing.createdAt || viewing.requestedAt, range)
  )), [viewings, range]);
```

Change the KPI's `value` (in the `kpis` array) from:

```javascript
    {
      icon: 'Building',
      title: 'Tổng số tin đăng',
      value: properties.length,
      tone: 'navy',
      trend: prevProperties ? percentDelta(filteredProperties.length, prevProperties.length) : null,
      series: totalListingsSparkline,
      href: '#/admin/properties',
    },
```

to:

```javascript
    {
      icon: 'Building',
      title: 'Tổng số tin đăng',
      value: filteredProperties.length,
      tone: 'navy',
      trend: prevProperties ? percentDelta(filteredProperties.length, prevProperties.length) : null,
      series: totalListingsSparkline,
      href: '#/admin/properties',
    },
```

Change the `recentAuditItems` memo from:

```javascript
  const recentAuditItems = useMemo(() => buildAuditItems({ users, properties, viewings }).slice(0, 5), [users, properties, viewings]);
```

to:

```javascript
  const recentAuditItems = useMemo(() => buildAuditItems({ users, properties: filteredProperties, viewings: filteredViewings }).slice(0, 5), [users, filteredProperties, filteredViewings]);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: PASS — all 5 tests (3 existing + 2 new).

- [ ] **Step 5: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 155/155 (153 baseline + 2 new).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/OverviewSection.test.jsx
git commit -m "fix(admin): wire Tổng quan KPI value and audit widget to the date-range filter"
```

---

### Task 2: Anchor mock data to real time instead of a fixed calendar date

**Files:**
- Modify: `frontend-react/src/services/mockData.js:251`

**Interfaces:** None — no other task depends on this.

- [ ] **Step 1: Record the current test baseline**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run 2>&1 | tail -5`
Expected: 155/155 (after Task 1).

- [ ] **Step 2: Change the constant**

In `frontend-react/src/services/mockData.js`, change:

```javascript
const MOCK_NOW = Date.UTC(2026, 6, 1); // fixed so tests stay deterministic
```

to:

```javascript
const MOCK_NOW = Date.now(); // real-time anchor so date-range presets stay meaningful whenever this runs
```

- [ ] **Step 3: Run the full frontend suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 155/155 (no test added/removed; every existing test that touches `MOCK_PROPERTIES`/`MOCK_AUDIT_LOGS` asserts relative facts — counts, month-spread ≥4, sort order, valid ward/category — not absolute dates, so they hold under either anchor).

If any test unexpectedly fails here, do NOT patch the test to force a pass — stop and report which assertion broke and why; it means an absolute-date assumption was missed in the plan's pre-check and needs a real decision, not a workaround.

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/services/mockData.js
git commit -m "fix(mock): anchor mock data timestamps to real time instead of a fixed 2026-07-01 date"
```

---

### Task 3: Fill the empty grid column in admin Overview's live-row

**Files:**
- Modify: `frontend-react/src/styles.css:1510-1529`

**Interfaces:** None — pure CSS, no other task depends on this.

- [ ] **Step 1: Change the grid to a single column**

In `frontend-react/src/styles.css`, change:

```css
.dashboard-live-row {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
  margin-bottom: 24px;
}
```

to:

```css
.dashboard-live-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 24px;
}
```

- [ ] **Step 2: Remove the now-redundant media override for this class only**

A few lines down, this media block currently sets 2 unrelated rules together:

```css
@media (max-width: 1024px) {
  .dashboard-live-row { grid-template-columns: 1fr; }
  .dashboard-topbar-title { display: none; }
}
```

Remove only the `.dashboard-live-row` line (it now duplicates the default set in Step 1) — keep the block and the `.dashboard-topbar-title` rule, which is unrelated to this fix:

```css
@media (max-width: 1024px) {
  .dashboard-topbar-title { display: none; }
}
```

- [ ] **Step 3: Run the full frontend suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 155/155 (CSS-only change, no tests added/removed; jsdom doesn't compute grid layout, so there's nothing new to assert — same rationale as Nhóm 1 Task 1).

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/styles.css
git commit -m "fix(admin): fill the empty grid column in Tổng quan's live-activity row"
```

---

### Task 4: Add an opt-in `rotateLabels` mode to `TrendBarLineChart`

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx:703-789` (the `TrendBarLineChart` function)
- Modify: `frontend-react/src/styles/dashboard.css` (add new CSS after the `.combo-chart-legend-line` rule, around line 929)
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Produces: `TrendBarLineChart` gains a new prop `rotateLabels` (boolean, default `false`). When `false` (or omitted), behavior is byte-identical to today. When `true`, the component renders a `<div className="trend-chart-labels-row">` sibling to the `<svg>` instead of in-SVG `<text>` x-axis labels, containing one `<div className="trend-chart-label-cell"><span className="trend-chart-label-rotated">{label}</span></div>` per data point.

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/components/Charts.test.jsx`, add these 2 tests after the existing `TrendBarLineChart` tests (find the last one, `'TrendBarLineChart scales the viewBox and CSS width up as real data points grow'`, and add after it):

```javascript
test('TrendBarLineChart with rotateLabels renders an HTML label row instead of in-SVG text, one rotated span per data point', () => {
  const data = [
    { label: 'T.H.Long', current: 3, previous: 1 },
    { label: 'N.V.Toàn', current: 5, previous: 2 },
    { label: 'T.M.Linh', current: 2, previous: 0 },
  ];
  const { container } = render(<TrendBarLineChart title="Top môi giới" data={data} rotateLabels />);

  const stage = screen.getByRole('img', { name: 'Top môi giới' });
  // no in-SVG text labels for the data points when rotateLabels is on
  expect(within(stage).queryByText('T.H.Long')).not.toBeInTheDocument();

  const labelsRow = container.querySelector('.trend-chart-labels-row');
  expect(labelsRow).toBeInTheDocument();
  const rotatedSpans = within(labelsRow).getAllByText(/^(T\.H\.Long|N\.V\.Toàn|T\.M\.Linh)$/);
  expect(rotatedSpans).toHaveLength(3);
  rotatedSpans.forEach((span) => expect(span).toHaveClass('trend-chart-label-rotated'));
});

test('TrendBarLineChart without rotateLabels keeps rendering in-SVG text labels (default unchanged)', () => {
  const data = [{ label: 'T1', current: 3, previous: 1 }];
  const { container } = render(<TrendBarLineChart title="Test" data={data} />);

  expect(container.querySelector('.trend-chart-labels-row')).not.toBeInTheDocument();
  const stage = screen.getByRole('img', { name: 'Test' });
  expect(within(stage).getByText('T1')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify the first one fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/components/Charts.test.jsx`
Expected: The new "with rotateLabels" test FAILS (no `rotateLabels` prop exists yet, so labels still render inside the SVG and `.trend-chart-labels-row` is never found). The "without rotateLabels" test PASSES already (describes current behavior) — that's expected, it's a regression guard for Step 3, not a RED step of its own.

- [ ] **Step 3: Add the `rotateLabels` prop and the HTML label row**

In `frontend-react/src/components/Charts.jsx`, change the function signature (line 703) from:

```javascript
export function TrendBarLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh' }) {
```

to:

```javascript
export function TrendBarLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh', rotateLabels = false }) {
```

Change the X-axis label rendering block (near the end of the `<svg>`, currently):

```jsx
        {points.map((p) => (
          <text key={`x-label-${p.point.label}`} x={p.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {p.point.label}
          </text>
        ))}
      </svg>
```

to:

```jsx
        {!rotateLabels && points.map((p) => (
          <text key={`x-label-${p.point.label}`} x={p.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {p.point.label}
          </text>
        ))}
      </svg>
      {rotateLabels && (
        <div className="trend-chart-labels-row" style={{ width: `min(100%, var(--trend-chart-width))` }}>
          {points.map((p) => (
            <div key={`x-label-cell-${p.point.label}`} className="trend-chart-label-cell">
              <span className="trend-chart-label-rotated">{p.point.label}</span>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 4: Add the CSS**

In `frontend-react/src/styles/dashboard.css`, add this right after the `.combo-chart-legend-line` rule (around line 929):

```css
.trend-chart-labels-row {
  display: flex;
  margin-top: 6px;
}

.trend-chart-label-cell {
  flex: 1 1 0;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.trend-chart-label-rotated {
  display: inline-block;
  transform: rotate(-35deg);
  transform-origin: center top;
  white-space: nowrap;
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 4px;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/components/Charts.test.jsx`
Expected: PASS — all `TrendBarLineChart` tests, including both new ones.

- [ ] **Step 6: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 157/157 (155 baseline + 2 new).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/styles/dashboard.css frontend-react/src/components/Charts.test.jsx
git commit -m "feat(charts): add opt-in rotateLabels mode to TrendBarLineChart for long text labels"
```

---

### Task 5: Widen the broker-activity chart and shorten its labels

**Files:**
- Modify: `frontend-react/src/pages/admin/ReportsSection.jsx`
- Modify: `frontend-react/src/styles.css` (add new CSS after `.dashboard-charts-row`'s media block, around line 1493)
- Test: `frontend-react/src/pages/admin/ReportsSection.test.jsx`

**Interfaces:**
- Consumes: `TrendBarLineChart`'s `rotateLabels` prop from Task 4 — must run after Task 4.
- Produces: `export function shortName(name)` — was module-private, exported for direct unit testing (same pattern as `buildManagedTypeData` in the prior Nhóm 1 plan).

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/pages/admin/ReportsSection.test.jsx`, add `shortName` to the import (currently `import ReportsSection from './ReportsSection.jsx';`):

```javascript
import ReportsSection, { shortName } from './ReportsSection.jsx';
```

Add these tests anywhere after the imports:

```javascript
test('shortName uses initials of all but the last word, plus the full last word', () => {
  expect(shortName('Trần Hoàng Long')).toBe('T.H.Long');
  expect(shortName('Nguyễn Văn Toàn')).toBe('N.V.Toàn');
  expect(shortName('Trần Mỹ Linh')).toBe('T.M.Linh');
});

test('shortName returns a single-word name as-is, with no dots added', () => {
  expect(shortName('Toàn')).toBe('Toàn');
});

test('broker-activity chart spans 2 of the 3 grid columns and uses rotated labels', () => {
  const activityData = {
    users: [],
    brokers: [{ id: 'b1', fullName: 'Nguyễn Văn A', status: 'ACTIVE' }],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', broker: { id: 'b1' } },
    ],
    viewings: [],
  };
  const { container } = render(<ReportsSection data={activityData} loading={false} />);

  expect(container.querySelector('.dashboard-chart-span-2')).toBeInTheDocument();
  expect(container.querySelector('.trend-chart-labels-row')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/admin/ReportsSection.test.jsx`
Expected: FAIL — `shortName` isn't exported yet (import resolves to `undefined`), and neither `.dashboard-chart-span-2` nor `.trend-chart-labels-row` exist in the rendered output yet.

- [ ] **Step 3: Rewrite `shortName` and export it**

In `frontend-react/src/pages/admin/ReportsSection.jsx`, change (lines 198-201):

```javascript
function shortName(name) {
  const parts = String(name || 'MG').trim().split(/\s+/);
  return parts.slice(-2).join(' ') || name;
}
```

to:

```javascript
export function shortName(name) {
  const parts = String(name || 'MG').trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || name;
  const initials = parts.slice(0, -1).map((part) => part[0].toUpperCase()).join('.');
  return `${initials}.${parts[parts.length - 1]}`;
}
```

- [ ] **Step 4: Widen the chart and enable rotated labels**

In `frontend-react/src/pages/admin/ReportsSection.jsx`, change:

```jsx
      <div className="dashboard-charts-row">
        <TrendBarLineChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
      </div>
```

to:

```jsx
      <div className="dashboard-charts-row">
        <div className="dashboard-chart-span-2">
          <TrendBarLineChart
            title="Top môi giới theo hoạt động"
            subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
            data={topBrokerData}
            currentLabel="Tin đăng"
            previousLabel="Lịch hẹn xác nhận"
            rotateLabels
          />
        </div>
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
      </div>
```

- [ ] **Step 5: Add the CSS class**

In `frontend-react/src/styles.css`, add this right after `.dashboard-charts-row`'s media block (around line 1493):

```css
.dashboard-chart-span-2 {
  grid-column: span 2;
}

@media (max-width: 1024px) {
  .dashboard-chart-span-2 { grid-column: span 1; }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/admin/ReportsSection.test.jsx`
Expected: PASS — all tests, including the 3 new ones.

- [ ] **Step 7: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 160/160 (157 baseline + 3 new).

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/pages/admin/ReportsSection.jsx frontend-react/src/styles.css frontend-react/src/pages/admin/ReportsSection.test.jsx
git commit -m "fix(admin): widen the Top môi giới chart into the empty grid column and shorten its labels"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: 160/160 (153 baseline + 2 Task 1 + 0 Task 2 + 0 Task 3 + 2 Task 4 + 3 Task 5).

Manual check (once committed — no browser automation available in this environment, per every prior batch this session): admin Tổng quan — switching between "Tất cả"/"7 ngày"/"30 ngày"/"Quý này" now visibly changes the "Tổng số tin đăng" KPI value and the "Log hoạt động hệ thống" widget's entries; the 12-month chart stays constant as designed. The live-activity row no longer has an empty column. Trang Nhật ký — switching date presets now shows different record counts instead of the same number every time (since mock data timestamps are anchored to real time). Admin Báo cáo — "Top môi giới theo hoạt động" chart is visibly wider (2/3 of its row instead of 1/3), its broker-name labels are tilted ~35° and shortened (e.g. "T.H.Long"), and no longer overlap each other.
