# Admin Custom Rebuild (đen-tím) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace react-admin `/admin` with a custom broker-style dashboard (fixed đen-tím theme) adding filters, drill-down, heatmap, quick actions, notifications, CSV export, audit log; light broker upgrades (date filter + CSV).

**Architecture:** Resurrect the pre-migration `AdminDashboard.jsx` (available at `git show a06e6dc^:frontend-react/src/pages/AdminDashboard.jsx`) as a modular `pages/admin/` shell + 6 section files. A `.admin-theme` CSS class redefines the semantic tokens (fixed dark purple) so every existing widget/chart recolors itself. Shared primitives (`DataTable`, `DateRangeFilter`, `NotificationBell`, `HeatmapChart`, `exportCsv`, `dateRange`) are built TDD-first, then sections assemble them. Finally react-admin/MUI is removed.

**Tech Stack:** React 19, Vite, Vitest + Testing Library (jsdom), CSS custom properties, lucide-react (via `components/ui/Icon.jsx`), Playwright (smoke only).

## Global Constraints

- UI text **Tiếng Việt**, code/comments **English**, commits **English conventional commits**, **no Co-Authored-By**.
- No external UI libraries; no `#hex` in JSX — CSS tokens only. Dynamic chart values (heights, palette colors) may use inline `style` — that is the established idiom in `Charts.jsx`.
- Test command: `cd frontend-react && npx vitest run --environment jsdom <file>` (the `--environment jsdom` flag is required when running vitest directly).
- Full suite: `cd frontend-react && npm test -- --run`. Suite currently passes 49/49 — keep it green after every task.
- Branch: `feat/admin-custom-rebuild` (already created, based on `feat/dashboard-live-charts`).
- Existing exports you may consume without recreating: `buildWardData`, `useLiveSeries`, `LiveLineChart`, `WardBarChart`, `DonutChart`, `GaugeChart` (`components/Charts.jsx`); `StatCard`, `DashboardPanel`, `StatusBadge`, `StateBlock`, `LoadingRows` (`components/DashboardWidgets.jsx`); `ViewingsPanel` (`components/dashboard/ViewingsPanel.jsx`); `WARDS`, `CATEGORIES`, `wardLabel`, `categoryLabel` (`data/locations.js`); all admin api functions in `services/api.js` (`fetchAdminUsers/Brokers/Properties/Viewings`, `createBroker`, `updateUserStatus`, `updateAdminPropertyStatus`, `updateViewingStatus`).

---

### Task 1: CSV export utility

**Files:**
- Create: `frontend-react/src/utils/exportCsv.js`
- Test: `frontend-react/src/utils/exportCsv.test.js`

**Interfaces:**
- Produces: `toCsvString(rows, columns)` → string (no BOM). `columns: [{ key, label, format?: (value, row) => string }]`.
- Produces: `downloadCsv(filename, rows, columns)` → triggers browser download (BOM prefixed).

- [ ] **Step 1: Write the failing test**

```js
// frontend-react/src/utils/exportCsv.test.js
import { describe, expect, test, vi } from 'vitest';
import { toCsvString, downloadCsv } from './exportCsv.js';

const columns = [
  { key: 'title', label: 'Tiêu đề' },
  { key: 'price', label: 'Giá', format: (value) => `${value} VND` },
];

test('toCsvString renders header row from labels and data rows in column order', () => {
  const csv = toCsvString([{ title: 'Nhà A', price: 100 }], columns);
  expect(csv).toBe('Tiêu đề,Giá\r\nNhà A,100 VND');
});

test('toCsvString escapes commas, quotes, and newlines', () => {
  const csv = toCsvString([{ title: 'Nhà "to", đẹp\nmới', price: 1 }], columns);
  expect(csv.split('\r\n')[1]).toBe('"Nhà ""to"", đẹp\nmới",1 VND');
});

test('toCsvString renders null/undefined as empty string', () => {
  const csv = toCsvString([{ title: null, price: 2 }], columns);
  expect(csv.split('\r\n')[1]).toBe(',2 VND');
});

test('downloadCsv creates an object URL with BOM and clicks an anchor', () => {
  const createObjectURL = vi.fn(() => 'blob:mock');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  downloadCsv('bao-cao.csv', [{ title: 'A', price: 3 }], columns);

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob.type).toBe('text/csv;charset=utf-8');
  expect(click).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  click.mockRestore();
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/utils/exportCsv.test.js`
Expected: FAIL — `Failed to resolve import "./exportCsv.js"`.

- [ ] **Step 3: Write minimal implementation**

```js
// frontend-react/src/utils/exportCsv.js
function escapeCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvString(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const lines = rows.map((row) => columns
    .map((column) => escapeCell(column.format ? column.format(row[column.key], row) : row[column.key]))
    .join(','));
  return [header, ...lines].join('\r\n');
}

// BOM so Excel opens Vietnamese text as UTF-8 instead of mojibake.
export function downloadCsv(filename, rows, columns) {
  const blob = new Blob([`﻿${toCsvString(rows, columns)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/utils/exportCsv.test.js`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/utils/exportCsv.js frontend-react/src/utils/exportCsv.test.js
git commit -m "feat(admin): add CSV export utility with UTF-8 BOM"
```

---

### Task 2: Date-range utility

**Files:**
- Create: `frontend-react/src/utils/dateRange.js`
- Test: `frontend-react/src/utils/dateRange.test.js`

**Interfaces:**
- Produces: `DATE_PRESETS` = `[{ id: 'all'|'7d'|'30d'|'quarter'|'custom', label }]`.
- Produces: `resolveDateRange(presetId, custom = {}, now = new Date())` → `{ from: Date|null, to: Date|null }` (`custom` = `{ from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }`).
- Produces: `isInRange(value, range)` → boolean (`value` date-like; missing `value` counts as in-range only when range is unbounded both sides).
- Produces: `previousRange(range)` → same-length window right before `range`, or `null` if range unbounded.
- Produces: `percentDelta(current, previous)` → rounded percent number, or `null` when `previous` is 0/nullish.

- [ ] **Step 1: Write the failing test**

```js
// frontend-react/src/utils/dateRange.test.js
import { expect, test } from 'vitest';
import { DATE_PRESETS, resolveDateRange, isInRange, previousRange, percentDelta } from './dateRange.js';

const NOW = new Date('2026-07-03T12:00:00Z');

test('presets include all/7d/30d/quarter/custom in order', () => {
  expect(DATE_PRESETS.map((preset) => preset.id)).toEqual(['all', '7d', '30d', 'quarter', 'custom']);
});

test('resolveDateRange all → unbounded', () => {
  expect(resolveDateRange('all', {}, NOW)).toEqual({ from: null, to: null });
});

test('resolveDateRange 7d → from 7 days ago to now', () => {
  const range = resolveDateRange('7d', {}, NOW);
  expect(range.to.toISOString()).toBe(NOW.toISOString());
  expect(range.from.toISOString()).toBe(new Date('2026-06-26T12:00:00Z').toISOString());
});

test('resolveDateRange quarter → start of current quarter', () => {
  const range = resolveDateRange('quarter', {}, NOW);
  expect(range.from.getMonth()).toBe(6); // July = quarter 3 starts month index 6
  expect(range.from.getDate()).toBe(1);
});

test('resolveDateRange custom parses from/to strings, to is end-of-day', () => {
  const range = resolveDateRange('custom', { from: '2026-01-01', to: '2026-01-31' }, NOW);
  expect(range.from.getFullYear()).toBe(2026);
  expect(range.to.getHours()).toBe(23);
});

test('isInRange checks bounds and treats missing value as out-of-range when bounded', () => {
  const range = resolveDateRange('7d', {}, NOW);
  expect(isInRange('2026-07-01T00:00:00Z', range)).toBe(true);
  expect(isInRange('2026-06-01T00:00:00Z', range)).toBe(false);
  expect(isInRange(null, range)).toBe(false);
  expect(isInRange(null, { from: null, to: null })).toBe(true);
});

test('previousRange returns the adjacent earlier window of equal length', () => {
  const range = resolveDateRange('7d', {}, NOW);
  const prev = previousRange(range);
  expect(prev.to.toISOString()).toBe(range.from.toISOString());
  expect(prev.from.toISOString()).toBe(new Date('2026-06-19T12:00:00Z').toISOString());
  expect(previousRange({ from: null, to: null })).toBe(null);
});

test('percentDelta rounds and guards divide-by-zero', () => {
  expect(percentDelta(12, 10)).toBe(20);
  expect(percentDelta(8, 10)).toBe(-20);
  expect(percentDelta(5, 0)).toBe(null);
  expect(percentDelta(5, null)).toBe(null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/utils/dateRange.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// frontend-react/src/utils/dateRange.js
const DAY_MS = 24 * 60 * 60 * 1000;

export const DATE_PRESETS = [
  { id: 'all', label: 'Tất cả' },
  { id: '7d', label: '7 ngày' },
  { id: '30d', label: '30 ngày' },
  { id: 'quarter', label: 'Quý này' },
  { id: 'custom', label: 'Tùy chọn' },
];

export function resolveDateRange(presetId, custom = {}, now = new Date()) {
  if (presetId === '7d') return { from: new Date(now.getTime() - 7 * DAY_MS), to: now };
  if (presetId === '30d') return { from: new Date(now.getTime() - 30 * DAY_MS), to: now };
  if (presetId === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return { from: new Date(now.getFullYear(), quarterStartMonth, 1), to: now };
  }
  if (presetId === 'custom') {
    const from = custom.from ? new Date(`${custom.from}T00:00:00`) : null;
    const to = custom.to ? new Date(`${custom.to}T23:59:59.999`) : null;
    return { from, to };
  }
  return { from: null, to: null };
}

export function isInRange(value, range) {
  const bounded = Boolean(range.from || range.to);
  if (!value) return !bounded;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return !bounded;
  if (range.from && time < range.from.getTime()) return false;
  if (range.to && time > range.to.getTime()) return false;
  return true;
}

export function previousRange(range) {
  if (!range.from || !range.to) return null;
  const length = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - length), to: new Date(range.from.getTime()) };
}

export function percentDelta(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/utils/dateRange.test.js`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/utils/dateRange.js frontend-react/src/utils/dateRange.test.js
git commit -m "feat(admin): add date-range presets and period-delta helpers"
```

---

### Task 3: HeatmapChart (ward × category)

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (append new exports)
- Test: `frontend-react/src/components/Charts.test.jsx` (append tests)
- Modify: `frontend-react/src/styles/dashboard.css` (append `.heatmap-*` styles)

**Interfaces:**
- Consumes: `WARDS`, `CATEGORIES` from `data/locations.js` (already imported in Charts.jsx: `WARDS`; add `CATEGORIES`).
- Produces: `buildHeatmapData(items, getWardCode, getCategorySlug)` → `{ rows: [{ code, label, cells: [{ category, categoryLabel, count }] }], max }` — always 4 wards × 3 categories.
- Produces: `HeatmapChart({ title, data, onSelectCell })` — `onSelectCell({ ward, category })` fired on cell click.

- [ ] **Step 1: Append failing tests to `Charts.test.jsx`**

```jsx
// append to frontend-react/src/components/Charts.test.jsx
import { buildHeatmapData, HeatmapChart } from './Charts.jsx'; // merge into existing import line
import { fireEvent } from '@testing-library/react';           // merge into existing import line

test('buildHeatmapData always yields 4 wards x 3 categories with counts and max', () => {
  const items = [
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-long-duc', category: 'dat' },
  ];
  const data = buildHeatmapData(items, (item) => item.ward, (item) => item.category);

  expect(data.rows).toHaveLength(4);
  expect(data.rows[0].cells).toHaveLength(3);
  const traVinhTro = data.rows.find((row) => row.code === 'phuong-tra-vinh').cells
    .find((cell) => cell.category === 'tro');
  expect(traVinhTro.count).toBe(2);
  expect(data.max).toBe(2);
});

test('HeatmapChart renders labels and fires onSelectCell with ward + category', () => {
  const items = [{ ward: 'phuong-hoa-thuan', category: 'nha' }];
  const data = buildHeatmapData(items, (item) => item.ward, (item) => item.category);
  const onSelectCell = vi.fn();
  render(<HeatmapChart title="Mật độ tin theo phường" data={data} onSelectCell={onSelectCell} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin theo phường' })).toBeInTheDocument();
  expect(screen.getByText('Phường Hòa Thuận')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Phường Hòa Thuận · Nhà: 1 tin' }));
  expect(onSelectCell).toHaveBeenCalledWith({ ward: 'phuong-hoa-thuan', category: 'nha' });
});
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx`
Expected: FAIL — `buildHeatmapData` is not exported.

- [ ] **Step 3: Implement in `Charts.jsx`**

Change the locations import to `import { CATEGORIES, WARDS } from '../data/locations.js';` and append:

```jsx
// Ward × category matrix; full grid always renders so density is comparable between loads.
export function buildHeatmapData(items, getWardCode, getCategorySlug) {
  let max = 1;
  const rows = WARDS.filter((ward) => ward.code !== 'all').map((ward) => ({
    code: ward.code,
    label: ward.label,
    cells: CATEGORIES.map((category) => {
      const count = items.filter((item) => (
        getWardCode(item) === ward.code && getCategorySlug(item) === category.slug
      )).length;
      if (count > max) max = count;
      return { category: category.slug, categoryLabel: category.label, count };
    }),
  }));
  return { rows, max };
}

/**
 * HeatmapChart — ward rows × category columns; cell opacity scales with count.
 * Cells are buttons so the admin can drill down into the matching property list.
 */
export function HeatmapChart({ title, data, onSelectCell }) {
  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="heatmap-grid">
        <span className="heatmap-corner" />
        {CATEGORIES.map((category) => (
          <span className="heatmap-col-label" key={category.slug}>{category.label}</span>
        ))}
        {data.rows.map((row) => (
          <Fragment key={row.code}>
            <span className="heatmap-row-label">{row.label}</span>
            {row.cells.map((cell) => (
              <button
                type="button"
                className="heatmap-cell"
                key={cell.category}
                aria-label={`${row.label} · ${cell.categoryLabel}: ${cell.count} tin`}
                onClick={() => onSelectCell?.({ ward: row.code, category: cell.category })}
              >
                <span
                  className="heatmap-cell-fill"
                  style={{ opacity: cell.count === 0 ? 0.06 : 0.15 + 0.85 * (cell.count / data.max) }}
                />
                <span className="heatmap-cell-count">{cell.count}</span>
              </button>
            ))}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
```

Also change the react import at the top of `Charts.jsx` to `import { Fragment, useEffect, useState } from 'react';`

- [ ] **Step 4: Append CSS to `styles/dashboard.css`**

```css
/* ── Heatmap (ward × category) ─────────────────────────── */
.heatmap-grid {
  display: grid;
  grid-template-columns: minmax(110px, auto) repeat(3, 1fr);
  gap: 6px;
  align-items: center;
}

.heatmap-col-label,
.heatmap-row-label {
  font-size: 13px;
  color: var(--color-muted);
  text-align: center;
}

.heatmap-row-label { text-align: left; }

.heatmap-cell {
  position: relative;
  height: 44px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  padding: 0;
}

.heatmap-cell-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--color-primary);
  pointer-events: none;
}

.heatmap-cell-count {
  position: relative;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 5: Run tests, expect green**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx`
Expected: all pass (previous 8 + new 2).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat(admin): add ward-by-category heatmap chart"
```

---

### Task 4: Admin notification aggregation

**Files:**
- Create: `frontend-react/src/utils/adminNotifications.js`
- Test: `frontend-react/src/utils/adminNotifications.test.js`

**Interfaces:**
- Produces: `buildAdminNotifications({ properties = [], viewings = [], users = [] })` → `[{ id, icon, text, href, tone }]`. Order: pending posts, pending viewings, locked accounts. Empty array when nothing needs attention.

- [ ] **Step 1: Write the failing test**

```js
// frontend-react/src/utils/adminNotifications.test.js
import { expect, test } from 'vitest';
import { buildAdminNotifications } from './adminNotifications.js';

test('collects pending posts, pending viewings, and locked accounts', () => {
  const items = buildAdminNotifications({
    properties: [{ rawStatus: 'PENDING' }, { rawStatus: 'AVAILABLE' }, { rawStatus: 'PENDING' }],
    viewings: [{ status: 'PENDING' }, { status: 'CONFIRMED' }],
    users: [{ status: 'LOCKED' }, { status: 'ACTIVE' }],
  });

  expect(items).toEqual([
    { id: 'pending-posts', icon: 'Clock', text: '2 tin chờ duyệt', href: '#/admin/properties?status=PENDING', tone: 'warning' },
    { id: 'pending-viewings', icon: 'Calendar', text: '1 lịch hẹn chờ xác nhận', href: '#/admin/viewings', tone: 'warning' },
    { id: 'locked-accounts', icon: 'Lock', text: '1 tài khoản đang bị khóa', href: '#/admin/accounts', tone: 'muted' },
  ]);
});

test('returns empty array when nothing needs attention', () => {
  expect(buildAdminNotifications({ properties: [{ rawStatus: 'AVAILABLE' }], viewings: [], users: [] })).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/utils/adminNotifications.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```js
// frontend-react/src/utils/adminNotifications.js
export function buildAdminNotifications({ properties = [], viewings = [], users = [] }) {
  const items = [];
  const pendingPosts = properties.filter((property) => property.rawStatus === 'PENDING').length;
  const pendingViewings = viewings.filter((viewing) => viewing.status === 'PENDING').length;
  const lockedAccounts = users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length;

  if (pendingPosts > 0) {
    items.push({ id: 'pending-posts', icon: 'Clock', text: `${pendingPosts} tin chờ duyệt`, href: '#/admin/properties?status=PENDING', tone: 'warning' });
  }
  if (pendingViewings > 0) {
    items.push({ id: 'pending-viewings', icon: 'Calendar', text: `${pendingViewings} lịch hẹn chờ xác nhận`, href: '#/admin/viewings', tone: 'warning' });
  }
  if (lockedAccounts > 0) {
    items.push({ id: 'locked-accounts', icon: 'Lock', text: `${lockedAccounts} tài khoản đang bị khóa`, href: '#/admin/accounts', tone: 'muted' });
  }
  return items;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/utils/adminNotifications.test.js`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/utils/adminNotifications.js frontend-react/src/utils/adminNotifications.test.js
git commit -m "feat(admin): aggregate admin notifications from live data"
```

---

### Task 5: Đen-tím theme tokens + new component CSS

**Files:**
- Modify: `frontend-react/src/styles.css` (append `.admin-theme` block after the `[data-theme="dark"]` block)
- Modify: `frontend-react/src/styles/dashboard.css` (append `.data-table-*`, `.date-range-*`, `.notif-*`, `.admin-quick-actions` styles)

No unit test (pure CSS) — verified visually in Task 12's smoke test. Components in Tasks 6–8 reference these class names.

- [ ] **Step 1: Append to `styles.css`**

```css
/* ── Admin area: fixed đen-tím theme ─────────────────────
 * Intentional exception (see .claude/rules/design.md): /admin is always dark
 * with a purple accent, regardless of the site light/dark toggle. Components
 * keep referencing semantic tokens — only the values change inside this scope. */
.admin-theme {
  --color-canvas: #141218;
  --color-surface-soft: #1e1a28;
  --color-surface-strong: #262130;
  --color-ink: #f2f0f7;
  --color-body: #d6d1e0;
  --color-muted: #a29bb8;
  --color-muted-soft: #736c8a;
  --color-primary: #8b5cf6;
  --color-primary-active: #7c3aed;
  --color-primary-disabled: #3b2a63;
  --color-on-primary: #ffffff;
  --color-hairline: #332d40;
  --color-hairline-soft: #2a2536;
  --color-border-strong: #4c4560;
  --color-success: #4ade80;
  --color-success-bg: #14532d;
  --color-warning: #fbbf24;
  --color-warning-bg: #78350f;
  --color-error: #f87171;
  --color-error-bg: #7f1d1d;
  --color-sidebar-bg: #0f0d14;
  --shadow-card: rgba(255, 255, 255, 0.06) 0 0 0 1px,
                 rgba(0, 0, 0, 0.4) 0 2px 6px 0,
                 rgba(0, 0, 0, 0.5) 0 4px 8px 0;
  --chart-1: #a78bfa;
  background: var(--color-canvas);
  color: var(--color-body);
}
```

- [ ] **Step 2: Append to `styles/dashboard.css`**

```css
/* ── DataTable ─────────────────────────────────────────── */
.data-table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.data-table-search { flex: 1 1 220px; max-width: 320px; }

.data-table-sort-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.data-table-pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--color-muted);
}

.data-table-pager .btn[disabled] { opacity: 0.4; cursor: default; }

/* ── DateRangeFilter ───────────────────────────────────── */
.date-range-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.date-range-pill {
  border: 1px solid var(--color-hairline);
  background: transparent;
  color: var(--color-body);
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.date-range-pill.is-active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
}

.date-range-custom { display: flex; align-items: center; gap: 6px; }
.date-range-custom .input { padding: 6px 10px; font-size: 13px; }

/* ── NotificationBell ──────────────────────────────────── */
.notif-bell { position: relative; }

.notif-bell-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-hairline);
  background: transparent;
  color: var(--color-body);
  cursor: pointer;
}

.notif-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  background: var(--color-error);
  color: var(--color-on-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

.notif-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 300px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 8px;
  z-index: 40;
}

.notif-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-sm);
  color: var(--color-body);
  text-decoration: none;
  font-size: 14px;
}

.notif-item:hover { background: var(--color-surface-soft); }

.notif-empty {
  padding: 16px 10px;
  font-size: 13px;
  color: var(--color-muted);
  text-align: center;
}

/* ── Admin quick actions + filter bar ──────────────────── */
.admin-quick-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.admin-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  background: var(--color-surface-soft);
  margin-bottom: 24px;
}

.admin-filter-bar .input { width: auto; }

.admin-topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}
```

- [ ] **Step 3: Verify suite still green and commit**

Run: `cd frontend-react && npm test -- --run` → all pass (CSS only).

```bash
git add frontend-react/src/styles.css frontend-react/src/styles/dashboard.css
git commit -m "feat(admin): den-tim admin theme tokens and dashboard component styles"
```

---

### Task 6: Mock data enrichment + audit log API

**Files:**
- Modify: `frontend-react/src/services/mockData.js`
- Modify: `frontend-react/src/services/api.js` (append `fetchAdminAuditLogs`)
- Test: `frontend-react/src/services/adminAudit.test.js`

**Interfaces:**
- Produces: `MOCK_AUDIT_LOGS` export in `mockData.js`: `[{ id, action, actorEmail, targetLabel, detail, createdAt }]`, `action ∈ CREATE_BROKER | LOCK_USER | UNLOCK_USER | UPDATE_PROPERTY_STATUS | HIDE_PROPERTY`.
- Produces: `fetchAdminAuditLogs(token)` in `api.js` → mock: newest-first array; real API: `[]` (backend has no audit endpoint yet — UI shows an explanatory empty state).
- Modifies: `MOCK_PROPERTIES` becomes ~24 items with `createdAt` spread over ~6 months and rotated ward/category/status.

- [ ] **Step 1: Write the failing test**

```js
// frontend-react/src/services/adminAudit.test.js
import { expect, test } from 'vitest';
import { MOCK_AUDIT_LOGS, MOCK_PROPERTIES } from './mockData.js';
import { fetchAdminAuditLogs } from './api.js';

test('mock properties span multiple months for date filtering', () => {
  expect(MOCK_PROPERTIES.length).toBeGreaterThanOrEqual(20);
  const months = new Set(MOCK_PROPERTIES.map((property) => property.createdAt.slice(0, 7)));
  expect(months.size).toBeGreaterThanOrEqual(4);
});

test('every mock property keeps a real ward and category', () => {
  MOCK_PROPERTIES.forEach((property) => {
    expect(['phuong-tra-vinh', 'phuong-long-duc', 'phuong-nguyet-hoa', 'phuong-hoa-thuan']).toContain(property.ward);
    expect(['tro', 'nha', 'dat']).toContain(property.category);
  });
});

test('fetchAdminAuditLogs returns newest-first audit entries in mock mode', async () => {
  const logs = await fetchAdminAuditLogs('test-token');
  expect(logs.length).toBeGreaterThanOrEqual(10);
  expect(logs[0].action).toBeTruthy();
  const times = logs.map((log) => new Date(log.createdAt).getTime());
  expect([...times].sort((a, b) => b - a)).toEqual(times);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/services/adminAudit.test.js`
Expected: FAIL — `MOCK_AUDIT_LOGS` not exported / months < 4.

- [ ] **Step 3: Implement mockData changes**

In `mockData.js`, the current admin-field mapping is (around line 239):

```js
export const MOCK_PROPERTIES = RAW_MOCK_PROPERTIES.map((item, index) => ({
  ...
  createdAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
  ...
}));
```

Replace it with a variant generator. Keep whatever per-item fields the current mapping adds (read the existing block first and preserve them); the change is: clone each raw item 3×, rotate ward/category/status, and spread `createdAt` back from 2026-07-01:

```js
const DAY_MS = 24 * 60 * 60 * 1000;
const WARD_CYCLE = ['phuong-tra-vinh', 'phuong-long-duc', 'phuong-nguyet-hoa', 'phuong-hoa-thuan'];
const CATEGORY_CYCLE = ['tro', 'nha', 'dat'];
const STATUS_CYCLE = ['AVAILABLE', 'AVAILABLE', 'PENDING', 'AVAILABLE', 'RENTED', 'SOLD', 'AVAILABLE', 'HIDDEN'];
const MOCK_NOW = Date.UTC(2026, 6, 1); // fixed so tests stay deterministic

// 3 variants per raw item (~24 listings) spread over ~6 months so the admin
// date filter, heatmap, and drill-down have believable density.
export const MOCK_PROPERTIES = RAW_MOCK_PROPERTIES.flatMap((item, rawIndex) => (
  [0, 1, 2].map((variant) => {
    const index = rawIndex * 3 + variant;
    return {
      ...item,
      id: variant === 0 ? item.id : `${item.id}-v${variant}`,
      title: variant === 0 ? item.title : `${item.title} (khu ${variant + 1})`,
      ward: WARD_CYCLE[index % WARD_CYCLE.length],
      category: CATEGORY_CYCLE[index % CATEGORY_CYCLE.length],
      rawStatus: STATUS_CYCLE[index % STATUS_CYCLE.length],
      statusLabel: statusLabelOf(STATUS_CYCLE[index % STATUS_CYCLE.length]),
      createdAt: new Date(MOCK_NOW - index * 8 * DAY_MS).toISOString(),
      // …keep the other fields the old mapping added (broker, priceLabel, …)
    };
  })
));

function statusLabelOf(status) {
  return {
    AVAILABLE: 'Đang hiển thị',
    PENDING: 'Chờ duyệt',
    RENTED: 'Đã thuê',
    SOLD: 'Đã bán',
    HIDDEN: 'Đã ẩn',
  }[status] || status;
}

export const MOCK_AUDIT_LOGS = [
  ['CREATE_BROKER', 'Trần Mỹ Linh', 'Cấp tài khoản môi giới mới'],
  ['UPDATE_PROPERTY_STATUS', 'Nhà mới đường Nguyễn Đáng', 'AVAILABLE → RENTED'],
  ['LOCK_USER', 'Phạm Quốc Huy', 'Khóa do vi phạm quy định đăng tin'],
  ['UPDATE_PROPERTY_STATUS', 'Đất vườn Long Đức', 'PENDING → AVAILABLE'],
  ['HIDE_PROPERTY', 'Phòng trọ Hòa Thuận', 'Gỡ khỏi trang công khai'],
  ['UNLOCK_USER', 'Phạm Quốc Huy', 'Mở khóa sau khi xác minh'],
  ['CREATE_BROKER', 'Võ Hoàng Nam', 'Cấp tài khoản môi giới mới'],
  ['UPDATE_PROPERTY_STATUS', 'Nhà phố khu dân cư Phú Gia', 'AVAILABLE → SOLD'],
  ['UPDATE_PROPERTY_STATUS', 'Nhà trọ Điện Biên Phủ', 'PENDING → AVAILABLE'],
  ['HIDE_PROPERTY', 'Đất nền mặt tiền Quốc lộ 53', 'Gỡ theo yêu cầu môi giới'],
  ['LOCK_USER', 'Lê Minh Khang', 'Khóa tạm thời theo yêu cầu'],
  ['UNLOCK_USER', 'Lê Minh Khang', 'Mở khóa sau 24 giờ'],
].map(([action, targetLabel, detail], index) => ({
  id: `audit-${index + 1}`,
  action,
  actorEmail: 'admin@congtinland.vn',
  targetLabel,
  detail,
  createdAt: new Date(MOCK_NOW - index * 5 * DAY_MS - 7200000).toISOString(),
}));
```

**Important:** open the existing `MOCK_PROPERTIES` mapping first and carry over every field it currently sets (e.g. `broker`, `rawStatus` mapping, price fields) — the snippet above only shows the fields that change. `BROKER_DASHBOARD` (below it) must keep working; if it slices `MOCK_PROPERTIES`, leave that logic untouched.

- [ ] **Step 4: Append to `api.js`**

```js
export async function fetchAdminAuditLogs(token) {
  if (USE_MOCK_API) {
    return delay([...MOCK_AUDIT_LOGS].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), 120);
  }
  // Backend has the AuditLog entity but no write-path or endpoint yet — the UI
  // shows an explanatory empty state until that lands.
  return [];
}
```

Add `MOCK_AUDIT_LOGS` to the existing `mockData.js` import at the top of `api.js`.

- [ ] **Step 5: Run tests — new file AND full suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/services/adminAudit.test.js` → 3 passed.
Run: `cd frontend-react && npm test -- --run` → all pass. If a test asserted specific mock property counts/titles, fix the assertion to match the enriched data (behavior-preserving updates only).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/services/mockData.js frontend-react/src/services/api.js frontend-react/src/services/adminAudit.test.js
git commit -m "feat(admin): enrich mock listings across 6 months and add audit log API"
```

---

### Task 7: DataTable component

**Files:**
- Create: `frontend-react/src/components/dashboard/DataTable.jsx`
- Test: `frontend-react/src/components/dashboard/DataTable.test.jsx`

**Interfaces:**
- Consumes: `downloadCsv` (Task 1), `LoadingRows`, `StateBlock` from `DashboardWidgets.jsx`, `Icon` from `components/ui/Icon.jsx`.
- Produces: `DataTable({ columns, rows, searchKeys, searchPlaceholder, pageSize = 10, exportFilename, loading, emptyTitle, emptyDescription, toolbar })` — `columns: [{ key, label, sortable = true, render?: (row) => node, csv?: (row) => string }]`. Search + sort + client pagination + "Xuất CSV" button exporting the **filtered** row set.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/components/dashboard/DataTable.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DataTable from './DataTable.jsx';

vi.mock('../../utils/exportCsv.js', () => ({ downloadCsv: vi.fn() }));
import { downloadCsv } from '../../utils/exportCsv.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const columns = [
  { key: 'name', label: 'Tên' },
  { key: 'age', label: 'Tuổi' },
];
const rows = Array.from({ length: 12 }, (_, index) => ({ id: index, name: `Người ${index}`, age: 20 + index }));

test('renders rows and paginates at pageSize', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} pageSize={10} exportFilename="x.csv" />);
  expect(screen.getByText('Người 0')).toBeInTheDocument();
  expect(screen.queryByText('Người 11')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByText('Người 11')).toBeInTheDocument();
});

test('search filters rows across searchKeys', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} exportFilename="x.csv" />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Người 11' } });
  expect(screen.getByText('Người 11')).toBeInTheDocument();
  expect(screen.queryByText('Người 0')).not.toBeInTheDocument();
});

test('clicking a column header toggles sort direction', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} pageSize={12} exportFilename="x.csv" />);
  fireEvent.click(screen.getByRole('button', { name: /Tuổi/ }));
  let cells = screen.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent);
  expect(cells[0]).toBe('20');
  fireEvent.click(screen.getByRole('button', { name: /Tuổi/ }));
  cells = screen.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent);
  expect(cells[0]).toBe('31');
});

test('export button downloads the filtered set, not just the current page', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} pageSize={5} exportFilename="danh-sach.csv" />);
  fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));
  expect(downloadCsv).toHaveBeenCalledWith('danh-sach.csv', expect.arrayContaining([rows[11]]), columns);
});

test('shows empty state when no rows match', () => {
  render(<DataTable columns={columns} rows={[]} searchKeys={['name']} exportFilename="x.csv" emptyTitle="Trống" emptyDescription="Không có dữ liệu." />);
  expect(screen.getByText('Trống')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/dashboard/DataTable.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend-react/src/components/dashboard/DataTable.jsx
import { useMemo, useState } from 'react';
import { downloadCsv } from '../../utils/exportCsv.js';
import { LoadingRows, StateBlock } from '../DashboardWidgets.jsx';
import Icon from '../ui/Icon.jsx';

/**
 * Generic admin/broker table: client-side search, sort, pagination, CSV export.
 * columns: [{ key, label, sortable = true, render?: (row) => node, csv?: (row) => string }]
 */
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = 'Tìm kiếm...',
  pageSize = 10,
  exportFilename = 'du-lieu.csv',
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Thử đổi từ khóa hoặc bộ lọc.',
  toolbar = null,
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = !needle ? rows : rows.filter((row) => (
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(needle))
    ));
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const left = a[sortKey];
        const right = b[sortKey];
        const compared = typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left ?? '').localeCompare(String(right ?? ''), 'vi');
        return sortDir === 'asc' ? compared : -compared;
      });
    }
    return result;
  }, [rows, query, searchKeys, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) return <LoadingRows rows={5} />;

  return (
    <div>
      <div className="data-table-toolbar">
        <input
          className="input data-table-search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); }}
        />
        {toolbar}
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => downloadCsv(exportFilename, filtered, columns)}>
          <Icon name="Download" size={14} className="icon-muted" />
          Xuất CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <StateBlock title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.sortable === false ? column.label : (
                        <button className="data-table-sort-btn" type="button" onClick={() => toggleSort(column.key)}>
                          {column.label}
                          {sortKey === column.key && <Icon name={sortDir === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={13} />}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="data-table-pager">
              <button className="btn btn-ghost btn-sm" type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Trang trước</button>
              <span>Trang {currentPage + 1}/{pageCount}</span>
              <button className="btn btn-ghost btn-sm" type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Trang sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/dashboard/DataTable.test.jsx`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/dashboard/DataTable.jsx frontend-react/src/components/dashboard/DataTable.test.jsx
git commit -m "feat(admin): shared DataTable with search, sort, paging, CSV export"
```

---

### Task 8: DateRangeFilter component

**Files:**
- Create: `frontend-react/src/components/dashboard/DateRangeFilter.jsx`
- Test: `frontend-react/src/components/dashboard/DateRangeFilter.test.jsx`

**Interfaces:**
- Consumes: `DATE_PRESETS`, `resolveDateRange` (Task 2).
- Produces: `DateRangeFilter({ preset, custom, onChange })` — controlled; `onChange(presetId, custom, resolvedRange)`. Custom date inputs appear only when `preset === 'custom'`.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/components/dashboard/DateRangeFilter.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DateRangeFilter from './DateRangeFilter.jsx';

afterEach(cleanup);

test('renders preset pills and reports resolved range on click', () => {
  const onChange = vi.fn();
  render(<DateRangeFilter preset="all" custom={{}} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));
  const [presetId, custom, range] = onChange.mock.calls[0];
  expect(presetId).toBe('7d');
  expect(custom).toEqual({});
  expect(range.from).toBeInstanceOf(Date);
});

test('custom preset shows from/to inputs and reports edits', () => {
  const onChange = vi.fn();
  render(<DateRangeFilter preset="custom" custom={{ from: '2026-01-01', to: '' }} onChange={onChange} />);
  const inputs = screen.getAllByLabelText(/Từ ngày|Đến ngày/);
  expect(inputs).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-02-01' } });
  const [presetId, custom] = onChange.mock.calls[0];
  expect(presetId).toBe('custom');
  expect(custom).toEqual({ from: '2026-01-01', to: '2026-02-01' });
});

test('active pill is highlighted', () => {
  render(<DateRangeFilter preset="30d" custom={{}} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: '30 ngày' })).toHaveClass('is-active');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/dashboard/DateRangeFilter.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend-react/src/components/dashboard/DateRangeFilter.jsx
import { DATE_PRESETS, resolveDateRange } from '../../utils/dateRange.js';

// Controlled preset pills + optional custom from/to inputs.
// onChange(presetId, custom, resolvedRange)
export default function DateRangeFilter({ preset = 'all', custom = {}, onChange }) {
  const emit = (nextPreset, nextCustom) => {
    onChange(nextPreset, nextCustom, resolveDateRange(nextPreset, nextCustom));
  };

  return (
    <div className="date-range-filter">
      {DATE_PRESETS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`date-range-pill ${preset === item.id ? 'is-active' : ''}`}
          onClick={() => emit(item.id, custom)}
        >
          {item.label}
        </button>
      ))}
      {preset === 'custom' && (
        <div className="date-range-custom">
          <label className="dashboard-table-sub" htmlFor="date-range-from">Từ ngày</label>
          <input
            id="date-range-from"
            className="input"
            type="date"
            value={custom.from || ''}
            onChange={(event) => emit('custom', { ...custom, from: event.target.value })}
          />
          <label className="dashboard-table-sub" htmlFor="date-range-to">Đến ngày</label>
          <input
            id="date-range-to"
            className="input"
            type="date"
            value={custom.to || ''}
            onChange={(event) => emit('custom', { ...custom, to: event.target.value })}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/dashboard/DateRangeFilter.test.jsx`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/dashboard/DateRangeFilter.jsx frontend-react/src/components/dashboard/DateRangeFilter.test.jsx
git commit -m "feat(admin): date-range filter component with presets and custom bounds"
```

---

### Task 9: NotificationBell component

**Files:**
- Create: `frontend-react/src/components/dashboard/NotificationBell.jsx`
- Test: `frontend-react/src/components/dashboard/NotificationBell.test.jsx`

**Interfaces:**
- Consumes: notification items shaped by Task 4 (`{ id, icon, text, href, tone }`), `Icon`.
- Produces: `NotificationBell({ notifications })` — badge with count, dropdown toggles on click, items are `<a href>` links; empty state text "Không có thông báo mới.".

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/components/dashboard/NotificationBell.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NotificationBell from './NotificationBell.jsx';

afterEach(cleanup);

const items = [
  { id: 'pending-posts', icon: 'Clock', text: '2 tin chờ duyệt', href: '#/admin/properties?status=PENDING', tone: 'warning' },
];

test('shows badge count and opens dropdown with linked items', () => {
  render(<NotificationBell notifications={items} />);
  expect(screen.getByText('1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }));
  const link = screen.getByRole('link', { name: /2 tin chờ duyệt/ });
  expect(link).toHaveAttribute('href', '#/admin/properties?status=PENDING');
});

test('renders no badge and an empty message when there are no notifications', () => {
  render(<NotificationBell notifications={[]} />);
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }));
  expect(screen.getByText('Không có thông báo mới.')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/dashboard/NotificationBell.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend-react/src/components/dashboard/NotificationBell.jsx
import { useState } from 'react';
import Icon from '../ui/Icon.jsx';

export default function NotificationBell({ notifications = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="notif-bell">
      <button className="notif-bell-btn" type="button" aria-label="Thông báo" onClick={() => setOpen((current) => !current)}>
        <Icon name="Bell" size={18} />
        {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          {notifications.length === 0 ? (
            <p className="notif-empty">Không có thông báo mới.</p>
          ) : notifications.map((item) => (
            <a className="notif-item" key={item.id} href={item.href} onClick={() => setOpen(false)}>
              <Icon name={item.icon} size={16} className={item.tone === 'warning' ? 'icon-accent' : 'icon-muted'} />
              {item.text}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/dashboard/NotificationBell.test.jsx`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/dashboard/NotificationBell.jsx frontend-react/src/components/dashboard/NotificationBell.test.jsx
git commit -m "feat(admin): notification bell with badge and dropdown"
```

---

### Task 10: Admin shell, sections scaffold, routes

This task resurrects the old dashboard as the new shell and gets `/#/admin/*` rendering end-to-end with **Overview carried over as-is** (fancy overview lands in Task 11). Section files for brokers/accounts/properties/viewings/audit are created in Tasks 12–14; here they start as the old inline JSX moved into files.

**Files:**
- Create: `frontend-react/src/pages/admin/AdminDashboard.jsx`
- Create: `frontend-react/src/pages/admin/OverviewSection.jsx` (initial = current `admin-ra/dashboard/OverviewDashboard.jsx` content, adapted)
- Create: `frontend-react/src/pages/admin/BrokersSection.jsx`, `PropertiesSection.jsx`, `ViewingsSection.jsx` (ported from old file: `git show a06e6dc^:frontend-react/src/pages/AdminDashboard.jsx`)
- Modify: `frontend-react/src/routes/index.jsx`
- Modify: `frontend-react/src/App.test.jsx` (two admin tests)

**Interfaces:**
- Produces: `AdminDashboard({ session, onLogin, onLogout, currentPath, section, queryParams })` default export.
- Produces: section components receive `{ session, data: { users, brokers, properties, viewings }, loading, saving, actions, queryParams }` where `actions = { reload, toggleUserStatus, changePropertyStatus, createBrokerAccount }`.
- Produces: route map — `#/admin/overview|brokers|accounts|properties|viewings|audit` → sections `overview|brokers|accounts|properties|viewings|audit`; bare `#/admin` → `overview`.

- [ ] **Step 1: Extract the old dashboard for reference**

Run: `git show a06e6dc^:frontend-react/src/pages/AdminDashboard.jsx > /tmp/old-admin.jsx` (or scratchpad). Port from it as described below — do not re-add the file at its old path.

- [ ] **Step 2: Write the shell**

```jsx
// frontend-react/src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../../components/BrandLogo.jsx';
import Icon from '../../components/ui/Icon.jsx';
import NotificationBell from '../../components/dashboard/NotificationBell.jsx';
import { buildAdminNotifications } from '../../utils/adminNotifications.js';
import LoginPage from '../LoginPage.jsx';
import OverviewSection from './OverviewSection.jsx';
import BrokersSection from './BrokersSection.jsx';
import AccountsSection from './AccountsSection.jsx';
import PropertiesSection from './PropertiesSection.jsx';
import ViewingsSection from './ViewingsSection.jsx';
import AuditLogSection from './AuditLogSection.jsx';
import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  fetchAdminViewings,
  updateAdminPropertyStatus,
  updateUserStatus,
} from '../../services/api.js';

const ADMIN_SIDEBAR_ITEMS = [
  { href: '#/admin/overview', icon: 'BarChart3', label: 'Tổng quan' },
  { href: '#/admin/brokers', icon: 'IdCard', label: 'Môi giới' },
  { href: '#/admin/accounts', icon: 'Users', label: 'Tài khoản' },
  { href: '#/admin/properties', icon: 'Building', label: 'Bài đăng' },
  { href: '#/admin/viewings', icon: 'Calendar', label: 'Lịch hẹn xem' },
  { href: '#/admin/audit', icon: 'ScrollText', label: 'Nhật ký' },
];

const SECTION_COMPONENTS = {
  overview: OverviewSection,
  brokers: BrokersSection,
  accounts: AccountsSection,
  properties: PropertiesSection,
  viewings: ViewingsSection,
  audit: AuditLogSection,
};

// Mock fetchers return flat arrays; the real API returns PagedResponse — flatten both.
function toArray(result) {
  if (Array.isArray(result)) return result;
  return result?.content ?? [];
}

export default function AdminDashboard({ session, onLogin, onLogout, currentPath = '/admin/overview', section = 'overview', queryParams = {} }) {
  const [users, setUsers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token || session.role !== 'ADMIN') return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    loadAll(session.token)
      .then((data) => { if (alive) applyData(data); })
      .catch((exception) => { if (alive) setError(exception.message || 'Không tải được dashboard admin.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session]);

  function applyData({ nextUsers, nextBrokers, nextProperties, nextViewings }) {
    setUsers(nextUsers);
    setBrokers(nextBrokers);
    setProperties(nextProperties);
    setViewings(nextViewings);
  }

  async function reload() {
    applyData(await loadAll(session.token));
  }

  async function runAction(work, successMessage) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(successMessage);
      await reload();
    } catch (exception) {
      setError(exception.message || 'Thao tác thất bại.');
    } finally {
      setSaving(false);
    }
  }

  const actions = {
    reload,
    toggleUserStatus: (user) => runAction(
      () => updateUserStatus(session.token, user.id, user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'),
      'Đã cập nhật trạng thái tài khoản.',
    ),
    changePropertyStatus: (propertyId, status) => runAction(
      () => updateAdminPropertyStatus(session.token, propertyId, status),
      status === 'HIDDEN' ? 'Đã gỡ bài đăng khỏi trang công khai.' : 'Đã cập nhật trạng thái bài đăng.',
    ),
    createBrokerAccount: (payload) => runAction(
      () => createBroker(session.token, payload),
      'Đã cấp tài khoản môi giới.',
    ),
  };

  const notifications = useMemo(
    () => buildAdminNotifications({ properties, viewings, users }),
    [properties, viewings, users],
  );

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'ADMIN') {
    return (
      <div className="dashboard-shell admin-theme">
        <AdminSidebar currentPath={currentPath} onLogout={onLogout} session={session} />
        <div className="dashboard-content">
          <div className="dashboard-main">
            <h1 className="dashboard-page-title">Không có quyền admin</h1>
            <p>Chỉ admin mới được cấp tài khoản môi giới và kiểm tra toàn bộ hệ thống.</p>
          </div>
        </div>
      </div>
    );
  }

  const Section = SECTION_COMPONENTS[section] || OverviewSection;

  return (
    <div className="dashboard-shell admin-theme">
      <AdminSidebar currentPath={currentPath} onLogout={onLogout} session={session} />
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <span className="dashboard-topbar-title">{adminTitle(section)}</span>
          <div className="admin-topbar-actions">
            <NotificationBell notifications={notifications} />
          </div>
        </div>
        <div className="dashboard-main">
          <h1 className="dashboard-page-title">{adminTitle(section)}</h1>
          {notice && <div className="alert dashboard-notice">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <Section
            session={session}
            data={{ users, brokers, properties, viewings }}
            loading={loading}
            saving={saving}
            actions={actions}
            queryParams={queryParams}
          />
        </div>
      </div>
    </div>
  );
}

function AdminSidebar({ currentPath, onLogout, session }) {
  const pathname = currentPath.split('?')[0];
  const activePath = pathname.startsWith('/') ? `#${pathname}` : pathname;
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <a href="#/"><BrandLogo /></a>
      </div>
      <nav className="dashboard-sidebar-nav">
        {ADMIN_SIDEBAR_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-item ${activePath === item.href || (item.href === '#/admin/overview' && activePath === '#/admin') ? 'is-active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </a>
        ))}
        <a href="#/" className="sidebar-item">
          <Icon name="Home" size={18} />
          Trang chủ
        </a>
      </nav>
      {session && (
        <div className="dashboard-sidebar-footer">
          <div className="dashboard-sidebar-user">
            <Icon name="User" size={16} className="icon-muted" />
            <span className="dashboard-sidebar-email">{session.email}</span>
          </div>
          <button className="sidebar-item dashboard-sidebar-logout" type="button" onClick={onLogout}>
            <Icon name="LogOut" size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </aside>
  );
}

async function loadAll(token) {
  const [nextUsers, nextBrokers, nextProperties, nextViewings] = await Promise.all([
    fetchAdminUsers(token, { size: 1000 }),
    fetchAdminBrokers(token, { size: 1000 }),
    fetchAdminProperties(token, { size: 1000 }),
    fetchAdminViewings(token, { size: 1000 }),
  ]);
  return {
    nextUsers: toArray(nextUsers),
    nextBrokers: toArray(nextBrokers),
    nextProperties: toArray(nextProperties),
    nextViewings: toArray(nextViewings),
  };
}

function adminTitle(section) {
  return {
    overview: 'Tổng quan',
    brokers: 'Môi giới',
    accounts: 'Tài khoản',
    properties: 'Bài đăng',
    viewings: 'Lịch hẹn xem',
    audit: 'Nhật ký hoạt động',
  }[section] || 'Tổng quan';
}
```

- [ ] **Step 3: Scaffold sections**

For this task the goal is compile + route. Create:

- `OverviewSection.jsx`: copy the body of `admin-ra/dashboard/OverviewDashboard.jsx` (stat cards, live row, charts row, panels row) but change it to consume `data`/`loading` props instead of fetching itself, and delete the `CHART_COLORS` hex constants (use `withColors` default palette by omitting `color`). Signature: `export default function OverviewSection({ data, loading })` with `const { users, brokers, properties } = data;`.
- `BrokersSection.jsx`: the old file's `section === 'brokers'` JSX + `EMPTY_BROKER` form state + `FormField`, `BrokerTable` helpers. Calls `actions.createBrokerAccount(brokerForm)` and `actions.toggleUserStatus(broker)`. (Will be table-ified in Task 12.)
- `PropertiesSection.jsx`: old `section === 'properties'` JSX + `PropertyTable`, status select, hide button, using `actions.changePropertyStatus`. Keep the old `window.confirm` before hiding. (Table-ified in Task 13.)
- `ViewingsSection.jsx`: old `section === 'viewings'` JSX wrapping `ViewingsPanel` with `data.viewings`.
- `AccountsSection.jsx` and `AuditLogSection.jsx`: temporary placeholders rendering `<StateBlock title="Đang xây dựng" description="Sẽ hoàn thiện trong task sau." />` (replaced in Tasks 12/14).

Port helper functions the sections need from the old file into the section that uses them (`userStatusLabel`, `propertyStatusTone`, `isAvailableProperty`, `isPendingProperty`, `formatDate`).

- [ ] **Step 4: Rewire routes**

In `routes/index.jsx`: remove `import AdminApp from '../admin-ra/AdminApp.jsx';`, add `import AdminDashboard from '../pages/admin/AdminDashboard.jsx';`, and replace the admin branch of `resolveRoute` with:

```jsx
const ADMIN_SECTIONS = {
  '/admin': 'overview',
  '/admin/overview': 'overview',
  '/admin/brokers': 'brokers',
  '/admin/accounts': 'accounts',
  '/admin/properties': 'properties',
  '/admin/viewings': 'viewings',
  '/admin/audit': 'audit',
};

// inside resolveRoute:
if (pathname.startsWith('/admin')) {
  const section = ADMIN_SECTIONS[pathname] || 'overview';
  return { Page: AdminDashboard, params: { section, queryParams } };
}
```

- [ ] **Step 5: Update `App.test.jsx`**

Replace the two admin tests (currently lines 70–88; also drop the `import AdminApp ...` on line 6):

```jsx
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

test('resolves every admin sub-path to the custom admin dashboard with a section', () => {
  const cases = [
    ['/admin', 'overview'],
    ['/admin/brokers', 'brokers'],
    ['/admin/accounts', 'accounts'],
    ['/admin/properties', 'properties'],
    ['/admin/viewings', 'viewings'],
    ['/admin/audit', 'audit'],
  ];
  for (const [path, section] of cases) {
    const resolved = resolveRoute(path);
    expect(resolved.Page).toBe(AdminDashboard);
    expect(resolved.params.section).toBe(section);
  }
});

test('mounts the admin overview dashboard for an admin session', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'admin@congtinland.vn',
    role: 'ADMIN',
    userId: 'admin-id',
  }));
  window.location.hash = '#/admin';
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Tổng quan' }, { timeout: 5000 })).toBeInTheDocument();
});
```

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: all pass. `admin-ra/` tests still run against the untouched folder — fine until Task 15 deletes them.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/admin frontend-react/src/routes/index.jsx frontend-react/src/App.test.jsx
git commit -m "feat(admin): custom admin shell with den-tim theme replaces react-admin routing"
```

---

### Task 11: OverviewSection — filters, KPI deltas, heatmap, quick actions, drill-down

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`
- Test: `frontend-react/src/pages/admin/OverviewSection.test.jsx`

**Interfaces:**
- Consumes: `DateRangeFilter`, `resolveDateRange`/`isInRange`/`previousRange`/`percentDelta`, `buildWardData`, `buildHeatmapData`, `HeatmapChart`, `LiveLineChart`, `WardBarChart`, `DonutChart`, `GaugeChart`, `StatCard`, `DashboardPanel`, `downloadCsv`, `WARDS`, `CATEGORIES`, `categoryLabel`.
- Produces: drill-down navigation — sets `window.location.hash` to `#/admin/properties?ward=<code>` (ward bar) or `#/admin/properties?ward=<code>&category=<slug>` (heatmap cell).

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/pages/admin/OverviewSection.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import OverviewSection from './OverviewSection.jsx';

beforeEach(() => {
  window.location.hash = '#/admin/overview';
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const data = {
  users: [{ id: 'u1', role: 'ADMIN', status: 'ACTIVE' }],
  brokers: [{ id: 'b1', status: 'ACTIVE' }],
  properties: [
    { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', priceLabel: '1 tỷ' },
    { id: 'p2', title: 'B', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'PENDING', createdAt: '2026-01-15T00:00:00Z', priceLabel: '2 tỷ' },
  ],
  viewings: [{ id: 'v1', status: 'PENDING', requestedAt: '2026-06-29T00:00:00Z' }],
};

test('renders KPI cards, filter bar, and quick actions', () => {
  render(<OverviewSection data={data} loading={false} />);
  expect(screen.getByText('Bài đăng mới')).toBeInTheDocument();
  expect(screen.getByText('Lịch hẹn chờ')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Cấp tài khoản môi giới/ })).toHaveAttribute('href', '#/admin/brokers');
  expect(screen.getByRole('link', { name: /Duyệt tin chờ \(1\)/ })).toHaveAttribute('href', '#/admin/properties?status=PENDING');
});

test('ward filter narrows the data set feeding the charts', () => {
  render(<OverviewSection data={data} loading={false} />);
  fireEvent.change(screen.getByLabelText('Lọc theo phường'), { target: { value: 'phuong-tra-vinh' } });
  // Only 1 property remains AVAILABLE in Trà Vinh; the KPI value updates.
  const kpi = screen.getByText('Đang hiển thị').closest('.stat-card') || screen.getByText('Đang hiển thị').parentElement;
  expect(kpi.textContent).toContain('1');
});

test('heatmap cell click drills into the filtered property list', () => {
  render(<OverviewSection data={data} loading={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh · Trọ: 1 tin' }));
  expect(window.location.hash).toBe('#/admin/properties?ward=phuong-tra-vinh&category=tro');
});
```

Note: if the `StatCard` DOM structure makes the second test brittle, assert instead on `screen.getByText('Đang hiển thị').closest('div')` content or add a `data-testid` — keep the behavior assertion (value reacts to the ward filter).

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: FAIL — no filter bar/quick actions in the scaffolded section.

- [ ] **Step 3: Implement `OverviewSection.jsx`**

```jsx
// frontend-react/src/pages/admin/OverviewSection.jsx
import { useMemo, useState } from 'react';
import {
  buildHeatmapData, buildWardData, DonutChart, GaugeChart, HeatmapChart, LiveLineChart, WardBarChart,
} from '../../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES, categoryLabel } from '../../data/locations.js';
import { isInRange, previousRange, percentDelta, resolveDateRange } from '../../utils/dateRange.js';
import { downloadCsv } from '../../utils/exportCsv.js';

export default function OverviewSection({ data, loading }) {
  const { users, brokers, properties, viewings } = data;
  const [preset, setPreset] = useState('all');
  const [custom, setCustom] = useState({});
  const [ward, setWard] = useState('all');
  const [category, setCategory] = useState('all');

  const range = useMemo(() => resolveDateRange(preset, custom), [preset, custom]);

  const filteredProperties = useMemo(() => properties.filter((property) => (
    isInRange(property.createdAt, range)
    && (ward === 'all' || property.ward === ward)
    && (category === 'all' || property.category === category)
  )), [properties, range, ward, category]);

  const prevRange = useMemo(() => previousRange(range), [range]);
  const prevProperties = useMemo(() => (prevRange ? properties.filter((property) => (
    isInRange(property.createdAt, prevRange)
    && (ward === 'all' || property.ward === ward)
    && (category === 'all' || property.category === category)
  )) : null), [properties, prevRange, ward, category]);

  const pendingViewings = useMemo(
    () => viewings.filter((viewing) => viewing.status === 'PENDING' && isInRange(viewing.requestedAt, range)),
    [viewings, range],
  );
  const pendingPosts = useMemo(
    () => properties.filter((property) => property.rawStatus === 'PENDING').length,
    [properties],
  );

  const visibleCount = filteredProperties.filter((property) => property.rawStatus === 'AVAILABLE').length;
  const kpis = [
    { icon: 'Building', title: 'Bài đăng mới', value: filteredProperties.length, tone: 'navy', delta: prevProperties ? percentDelta(filteredProperties.length, prevProperties.length) : null },
    { icon: 'Eye', title: 'Đang hiển thị', value: visibleCount, tone: 'green', delta: prevProperties ? percentDelta(visibleCount, prevProperties.filter((property) => property.rawStatus === 'AVAILABLE').length) : null },
    { icon: 'IdCard', title: 'Môi giới', value: brokers.length, tone: 'orange', delta: null },
    { icon: 'Calendar', title: 'Lịch hẹn chờ', value: pendingViewings.length, tone: 'navy', delta: null },
  ];

  const wardData = useMemo(() => buildWardData(filteredProperties, (property) => property.ward), [filteredProperties]);
  const heatmapData = useMemo(
    () => buildHeatmapData(filteredProperties, (property) => property.ward, (property) => property.category),
    [filteredProperties],
  );
  const roleChart = useMemo(() => ([
    { label: 'Môi giới', value: brokers.length },
    { label: 'Admin', value: users.filter((user) => user.role === 'ADMIN').length },
  ]), [users, brokers]);
  const visiblePercent = filteredProperties.length > 0 ? Math.round((visibleCount / filteredProperties.length) * 100) : 0;

  const recentProperties = useMemo(() => (
    [...filteredProperties].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
  ), [filteredProperties]);

  const drillTo = (params) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#/admin/properties?${query}`;
  };

  const exportOverview = () => {
    downloadCsv('bao-cao-tong-quan.csv', kpis.map((kpi) => ({ metric: kpi.title, value: kpi.value })), [
      { key: 'metric', label: 'Chỉ số' },
      { key: 'value', label: 'Giá trị' },
    ]);
  };

  return (
    <>
      <div className="admin-quick-actions" style={undefined}>
        <a className="btn btn-primary btn-sm" href="#/admin/brokers">
          ＋ Cấp tài khoản môi giới
        </a>
        <a className="btn btn-ghost btn-sm" href="#/admin/properties?status=PENDING">
          Duyệt tin chờ ({pendingPosts})
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

      <div className="grid-4 dashboard-stats-row">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.title}
            icon={kpi.icon}
            title={kpi.title}
            value={kpi.value}
            tone={kpi.tone}
            trend={kpi.delta == null ? undefined : { value: `${kpi.delta >= 0 ? '+' : ''}${kpi.delta}%`, direction: kpi.delta >= 0 ? 'up' : 'down' }}
          />
        ))}
      </div>

      <div className="dashboard-live-row">
        <LiveLineChart
          title="Hoạt động hệ thống (thời gian thực)"
          baseValue={visibleCount * 12 + filteredProperties.length}
          unit="điểm hoạt động"
        />
        <WardBarChart title="BĐS theo khu vực Trà Vinh" data={wardData} onSelectWard={(code) => drillTo({ ward: code })} />
      </div>

      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
        <GaugeChart title="Tỷ lệ bài đăng hiển thị" value={visiblePercent} max={100} label="Đang hiển thị" />
      </div>

      <div className="dashboard-panels-row">
        <DashboardPanel title="Bài đăng mới trong hệ thống" count={`${recentProperties.length} tin mới nhất`}>
          {loading ? <LoadingRows rows={5} /> : recentProperties.length === 0 ? (
            <StateBlock title="Chưa có bài đăng" description="Bài đăng mới sẽ hiển thị tại đây." />
          ) : (
            <div className="dashboard-broker-list">
              {recentProperties.map((property) => (
                <div key={property.id} className="dashboard-broker-row">
                  <div>
                    <div className="dashboard-table-name">{property.title}</div>
                    <div className="dashboard-table-sub">{categoryLabel(property.category)} · {property.priceLabel}</div>
                  </div>
                  <StatusBadge tone={property.rawStatus === 'AVAILABLE' ? 'success' : 'muted'}>
                    {property.statusLabel || property.rawStatus}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
        <DashboardPanel title="Tình trạng hệ thống" count="Từ API hiện có">
          <div className="dashboard-system-lines">
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Môi giới được cấp</span><span className="dashboard-system-line-value">{brokers.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tin chờ duyệt</span><span className="dashboard-system-line-value">{pendingPosts}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Lịch hẹn chờ</span><span className="dashboard-system-line-value">{pendingViewings.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tài khoản bị khóa</span><span className="dashboard-system-line-value">{users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length}</span></div>
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}
```

Remove the stray `style={undefined}` when writing the real file (shown here only to flag: **no inline styles**).

Also extend `WardBarChart` in `Charts.jsx` with an optional `onSelectWard`: wrap each column in a `<button type="button" className="ward-bar-col" aria-label={
`${ward.label}: ${ward.count} tin`} onClick={() => onSelectWard?.(ward.code)}>` when `onSelectWard` is provided, keeping the current `<div>` rendering when it is not. Add a Charts test:

```jsx
test('WardBarChart columns are clickable when onSelectWard is provided', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  const onSelectWard = vi.fn();
  render(<WardBarChart title="Theo phường" data={data} onSelectWard={onSelectWard} />);
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh: 1 tin' }));
  expect(onSelectWard).toHaveBeenCalledWith('phuong-tra-vinh');
});
```

- [ ] **Step 4: Run tests**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx src/components/Charts.test.jsx`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/OverviewSection.test.jsx frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat(admin): overview with filters, KPI deltas, heatmap drill-down, quick actions"
```

---

### Task 12: AccountsSection (with ADMIN lock guard) + BrokersSection table-ification

**Files:**
- Create: `frontend-react/src/pages/admin/AccountsSection.jsx` (replace placeholder)
- Modify: `frontend-react/src/pages/admin/BrokersSection.jsx`
- Test: `frontend-react/src/pages/admin/AccountsSection.test.jsx`

**Interfaces:**
- Consumes: `DataTable` (Task 7), `actions.toggleUserStatus`, `data.users`.
- Produces: named export `AccountStatusToggle({ user, saving, onToggle })` — renders `StatusBadge` "Quản trị viên" (no button) for ADMIN rows; otherwise a Khóa/Mở khóa button.

- [ ] **Step 1: Write the failing test (port of the react-admin guard test)**

```jsx
// frontend-react/src/pages/admin/AccountsSection.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AccountsSection, { AccountStatusToggle } from './AccountsSection.jsx';

afterEach(cleanup);

test('admin rows show a protected label instead of a lock button', () => {
  render(<AccountStatusToggle user={{ id: 1, role: 'ADMIN', status: 'ACTIVE' }} saving={false} onToggle={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Khóa' })).not.toBeInTheDocument();
  expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
});

test('non-admin active rows keep the lock button and fire onToggle', () => {
  const onToggle = vi.fn();
  const user = { id: 2, role: 'USER', status: 'ACTIVE' };
  render(<AccountStatusToggle user={user} saving={false} onToggle={onToggle} />);
  fireEvent.click(screen.getByRole('button', { name: 'Khóa' }));
  expect(onToggle).toHaveBeenCalledWith(user);
});

test('locked broker rows show the unlock button', () => {
  render(<AccountStatusToggle user={{ id: 3, role: 'BROKER', status: 'LOCKED' }} saving={false} onToggle={() => {}} />);
  expect(screen.getByRole('button', { name: 'Mở khóa' })).toBeInTheDocument();
});

test('AccountsSection renders the account table from data.users', () => {
  render(
    <AccountsSection
      data={{ users: [{ id: 'u1', fullName: 'Anh Tú', email: 'tu@x.vn', role: 'BROKER', status: 'ACTIVE' }], brokers: [], properties: [], viewings: [] }}
      loading={false}
      saving={false}
      actions={{ toggleUserStatus: vi.fn() }}
      queryParams={{}}
    />,
  );
  expect(screen.getByText('Anh Tú')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Khóa' })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/AccountsSection.test.jsx`
Expected: FAIL — placeholder has no `AccountStatusToggle`.

- [ ] **Step 3: Implement `AccountsSection.jsx`**

```jsx
// frontend-react/src/pages/admin/AccountsSection.jsx
import { DashboardPanel, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';
import Icon from '../../components/ui/Icon.jsx';

const ROLE_LABELS = { ADMIN: 'Quản trị viên', BROKER: 'Môi giới', USER: 'Người dùng' };

// The system has a single admin — locking it would lose access permanently.
export function AccountStatusToggle({ user, saving, onToggle }) {
  if (user.role === 'ADMIN') {
    return <StatusBadge tone="muted">Quản trị viên</StatusBadge>;
  }
  const locked = user.status !== 'ACTIVE';
  return (
    <button className="btn btn-ghost btn-sm" type="button" disabled={saving} onClick={() => onToggle(user)}>
      <Icon name={locked ? 'Eye' : 'EyeOff'} size={14} className="icon-muted" />
      {locked ? 'Mở khóa' : 'Khóa'}
    </button>
  );
}

export default function AccountsSection({ data, loading, saving, actions }) {
  const columns = [
    { key: 'fullName', label: 'Họ tên', render: (user) => user.fullName || user.username },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Vai trò', render: (user) => ROLE_LABELS[user.role] || user.role },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (user) => (
        <StatusBadge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>
          {user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
        </StatusBadge>
      ),
      csv: (user) => (user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      sortable: false,
      render: (user) => <AccountStatusToggle user={user} saving={saving} onToggle={actions.toggleUserStatus} />,
      csv: () => '',
    },
  ];

  return (
    <DashboardPanel title="Tài khoản hệ thống" count={`${data.users.length} tài khoản`}>
      <DataTable
        columns={columns}
        rows={data.users}
        searchKeys={['fullName', 'username', 'email']}
        searchPlaceholder="Tìm tên, email..."
        exportFilename="tai-khoan.csv"
        loading={loading}
        emptyTitle="Chưa có tài khoản"
        emptyDescription="Tài khoản đăng ký sẽ hiển thị tại đây."
      />
    </DashboardPanel>
  );
}
```

Note: `DataTable` CSV export uses `column.csv` when present — extend `DataTable`'s `downloadCsv` call to map columns to `{ key, label, format: column.csv ? (value, row) => column.csv(row) : undefined }` if not already done in Task 7 (adjust Task 7 impl accordingly; keep its tests green).

- [ ] **Step 4: Table-ify `BrokersSection.jsx`**

Replace the old `BrokerTable` list with `DataTable` (same columns pattern as accounts: Họ tên / SĐT / Email / Trạng thái / Thao tác using `AccountStatusToggle` imported from `./AccountsSection.jsx`), keep the create-broker `<form>` from the old file on the left (`dashboard-profile-grid` layout), submitting `actions.createBrokerAccount(brokerForm)` and clearing the form on success. `exportFilename="moi-gioi.csv"`, `searchKeys={['fullName', 'username', 'email', 'phone']}`.

- [ ] **Step 5: Run tests + full suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/AccountsSection.test.jsx` → 4 passed.
Run: `cd frontend-react && npm test -- --run` → all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/admin/AccountsSection.jsx frontend-react/src/pages/admin/AccountsSection.test.jsx frontend-react/src/pages/admin/BrokersSection.jsx frontend-react/src/components/dashboard/DataTable.jsx
git commit -m "feat(admin): accounts and brokers tables with admin self-lock guard"
```

---

### Task 13: PropertiesSection (drill-down target) + ViewingsSection

**Files:**
- Modify: `frontend-react/src/pages/admin/PropertiesSection.jsx`
- Modify: `frontend-react/src/pages/admin/ViewingsSection.jsx`
- Test: `frontend-react/src/pages/admin/PropertiesSection.test.jsx`

**Interfaces:**
- Consumes: `queryParams` (`{ ward?, category?, status? }`) from the shell (Task 10), `DataTable`, `actions.changePropertyStatus`, `updateViewingStatus` API, `WARDS`, `CATEGORIES`, `wardLabel`, `categoryLabel`.
- Produces: property table with initial filters seeded from `queryParams`; status select per row (AVAILABLE/PENDING/RENTED/SOLD/HIDDEN); hide button with `window.confirm`.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/pages/admin/PropertiesSection.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PropertiesSection from './PropertiesSection.jsx';

afterEach(cleanup);

const properties = [
  { id: 'p1', title: 'Trọ Trà Vinh', address: 'TV', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị', priceLabel: '1tr', createdAt: '2026-06-01T00:00:00Z' },
  { id: 'p2', title: 'Nhà Long Đức', address: 'LD', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'PENDING', statusLabel: 'Chờ duyệt', priceLabel: '2 tỷ', createdAt: '2026-06-02T00:00:00Z' },
];

function renderSection(queryParams = {}) {
  return render(
    <PropertiesSection
      data={{ users: [], brokers: [], properties, viewings: [] }}
      loading={false}
      saving={false}
      actions={{ changePropertyStatus: vi.fn() }}
      queryParams={queryParams}
    />,
  );
}

test('renders all properties without filters', () => {
  renderSection();
  expect(screen.getByText('Trọ Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
});

test('seeds ward + category filters from drill-down query params', () => {
  renderSection({ ward: 'phuong-tra-vinh', category: 'tro' });
  expect(screen.getByText('Trọ Trà Vinh')).toBeInTheDocument();
  expect(screen.queryByText('Nhà Long Đức')).not.toBeInTheDocument();
});

test('seeds status filter from quick-action query param', () => {
  renderSection({ status: 'PENDING' });
  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
  expect(screen.queryByText('Trọ Trà Vinh')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/PropertiesSection.test.jsx`
Expected: FAIL (scaffold ignores queryParams).

- [ ] **Step 3: Implement `PropertiesSection.jsx`**

```jsx
// frontend-react/src/pages/admin/PropertiesSection.jsx
import { useMemo, useState } from 'react';
import { DashboardPanel, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { CATEGORIES, WARDS, categoryLabel, wardLabel } from '../../data/locations.js';

const STATUS_OPTIONS = [
  { id: 'AVAILABLE', label: 'Đang hiển thị' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'RENTED', label: 'Đã thuê' },
  { id: 'SOLD', label: 'Đã bán' },
  { id: 'HIDDEN', label: 'Đã gỡ / tạm ẩn' },
];

function statusTone(status) {
  if (status === 'AVAILABLE') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'SOLD' || status === 'RENTED') return 'info';
  return 'muted';
}

export default function PropertiesSection({ data, loading, saving, actions, queryParams }) {
  const [ward, setWard] = useState(queryParams.ward || 'all');
  const [category, setCategory] = useState(queryParams.category || 'all');
  const [status, setStatus] = useState(queryParams.status || 'all');

  const filtered = useMemo(() => data.properties.filter((property) => (
    (ward === 'all' || property.ward === ward)
    && (category === 'all' || property.category === category)
    && (status === 'all' || property.rawStatus === status)
  )), [data.properties, ward, category, status]);

  const columns = [
    { key: 'title', label: 'Bài đăng', render: (property) => (
      <a className="dashboard-table-name" href={`#/property/${property.id}`}>{property.title}</a>
    ) },
    { key: 'ward', label: 'Phường', render: (property) => wardLabel(property.ward), csv: (property) => wardLabel(property.ward) },
    { key: 'category', label: 'Danh mục', render: (property) => categoryLabel(property.category), csv: (property) => categoryLabel(property.category) },
    { key: 'priceLabel', label: 'Giá' },
    { key: 'rawStatus', label: 'Trạng thái', render: (property) => (
      <StatusBadge tone={statusTone(property.rawStatus)}>{property.statusLabel || property.rawStatus}</StatusBadge>
    ), csv: (property) => property.statusLabel || property.rawStatus },
    { key: 'createdAt', label: 'Ngày tạo', render: (property) => formatDate(property.createdAt) },
    { key: 'actions', label: 'Thao tác', sortable: false, csv: () => '', render: (property) => (
      <div className="dashboard-property-actions">
        <select
          className="input"
          value={property.rawStatus}
          disabled={saving}
          onChange={(event) => actions.changePropertyStatus(property.id, event.target.value)}
        >
          {STATUS_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Gỡ bài đăng"
          disabled={saving || property.rawStatus === 'HIDDEN'}
          onClick={() => {
            if (window.confirm('Gỡ bài đăng này khỏi trang công khai?')) {
              actions.changePropertyStatus(property.id, 'HIDDEN');
            }
          }}
        >
          <Icon name="EyeOff" size={16} className="icon-muted" />
        </button>
      </div>
    ) },
  ];

  const filterToolbar = (
    <>
      <select className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
        {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
      <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">Tất cả danh mục</option>
        {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
      </select>
      <select className="input" aria-label="Lọc theo trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="all">Tất cả trạng thái</option>
        {STATUS_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </>
  );

  return (
    <DashboardPanel title="Bài đăng từ môi giới" count={`${filtered.length}/${data.properties.length} tin đăng`}>
      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={['title', 'address', 'priceLabel']}
        searchPlaceholder="Tìm tin, địa chỉ..."
        exportFilename="bai-dang.csv"
        loading={loading}
        toolbar={filterToolbar}
        emptyTitle="Không có bài đăng phù hợp"
        emptyDescription="Thử đổi từ khóa hoặc bộ lọc trạng thái."
      />
    </DashboardPanel>
  );
}

function formatDate(value) {
  if (!value) return 'Đang cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(date);
}
```

- [ ] **Step 4: ViewingsSection**

Keep `ViewingsPanel` (already renders viewing rows) and add a CSV export button in the panel `action` slot:

```jsx
// frontend-react/src/pages/admin/ViewingsSection.jsx
import { DashboardPanel } from '../../components/DashboardWidgets.jsx';
import ViewingsPanel from '../../components/dashboard/ViewingsPanel.jsx';
import { downloadCsv } from '../../utils/exportCsv.js';

const VIEWING_COLUMNS = [
  { key: 'roomLabel', label: 'Phòng / tin' },
  { key: 'visitorName', label: 'Khách hẹn' },
  { key: 'visitorPhone', label: 'Số điện thoại' },
  { key: 'requestedAt', label: 'Thời gian hẹn' },
  { key: 'status', label: 'Trạng thái' },
];

export default function ViewingsSection({ data, loading }) {
  return (
    <DashboardPanel
      title="Lịch hẹn xem"
      count={loading ? 'Đang tải' : `${data.viewings.length} yêu cầu`}
      action={(
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => downloadCsv('lich-hen.csv', data.viewings, VIEWING_COLUMNS)}>
          Xuất CSV
        </button>
      )}
    >
      <ViewingsPanel viewings={data.viewings} loading={loading} />
    </DashboardPanel>
  );
}
```

(Check `ViewingsPanel`'s props signature before wiring — if it supports `onUpdateStatus`, pass a handler that calls `updateViewingStatus(session.token, id, status)` then `actions.reload()`; if not, leave read-only as the old admin page did.)

- [ ] **Step 5: Run tests + full suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/PropertiesSection.test.jsx` → 3 passed.
Run: `cd frontend-react && npm test -- --run` → all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/admin/PropertiesSection.jsx frontend-react/src/pages/admin/PropertiesSection.test.jsx frontend-react/src/pages/admin/ViewingsSection.jsx
git commit -m "feat(admin): property table with drill-down filters and viewings CSV export"
```

---

### Task 14: AuditLogSection

**Files:**
- Modify: `frontend-react/src/pages/admin/AuditLogSection.jsx` (replace placeholder)
- Test: `frontend-react/src/pages/admin/AuditLogSection.test.jsx`

**Interfaces:**
- Consumes: `fetchAdminAuditLogs` (Task 6), `DataTable`, `DateRangeFilter`, `isInRange`, `resolveDateRange`.
- Produces: audit table (Thời gian / Hành động / Đối tượng / Chi tiết) with action-type select + date filter; empty state text "Backend chưa ghi nhật ký — dữ liệu sẽ xuất hiện khi bật ghi log." when the fetch returns `[]`.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/pages/admin/AuditLogSection.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../services/api.js', () => ({
  fetchAdminAuditLogs: vi.fn(),
}));
import { fetchAdminAuditLogs } from '../../services/api.js';
import AuditLogSection from './AuditLogSection.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const baseProps = {
  session: { token: 't' },
  data: { users: [], brokers: [], properties: [], viewings: [] },
  loading: false,
  saving: false,
  actions: {},
  queryParams: {},
};

test('renders audit entries with Vietnamese action labels', async () => {
  fetchAdminAuditLogs.mockResolvedValue([
    { id: 'a1', action: 'LOCK_USER', actorEmail: 'admin@x.vn', targetLabel: 'Phạm Quốc Huy', detail: 'Khóa do vi phạm', createdAt: '2026-06-30T08:00:00Z' },
  ]);
  render(<AuditLogSection {...baseProps} />);
  await waitFor(() => expect(screen.getByText('Phạm Quốc Huy')).toBeInTheDocument());
  expect(screen.getByText('Khóa tài khoản')).toBeInTheDocument();
});

test('shows backend-not-logging empty state when fetch returns []', async () => {
  fetchAdminAuditLogs.mockResolvedValue([]);
  render(<AuditLogSection {...baseProps} />);
  await waitFor(() => expect(screen.getByText(/Backend chưa ghi nhật ký/)).toBeInTheDocument());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/AuditLogSection.test.jsx`
Expected: FAIL (placeholder).

- [ ] **Step 3: Implement**

```jsx
// frontend-react/src/pages/admin/AuditLogSection.jsx
import { useEffect, useMemo, useState } from 'react';
import { DashboardPanel } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { fetchAdminAuditLogs } from '../../services/api.js';
import { isInRange, resolveDateRange } from '../../utils/dateRange.js';

const ACTION_LABELS = {
  CREATE_BROKER: 'Cấp tài khoản môi giới',
  LOCK_USER: 'Khóa tài khoản',
  UNLOCK_USER: 'Mở khóa tài khoản',
  UPDATE_PROPERTY_STATUS: 'Đổi trạng thái bài đăng',
  HIDE_PROPERTY: 'Gỡ bài đăng',
};

export default function AuditLogSection({ session }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('all');
  const [custom, setCustom] = useState({});
  const [action, setAction] = useState('all');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAdminAuditLogs(session.token)
      .then((items) => { if (alive) setLogs(Array.isArray(items) ? items : []); })
      .catch(() => { if (alive) setLogs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session]);

  const range = useMemo(() => resolveDateRange(preset, custom), [preset, custom]);
  const filtered = useMemo(() => logs.filter((log) => (
    isInRange(log.createdAt, range) && (action === 'all' || log.action === action)
  )), [logs, range, action]);

  const columns = [
    { key: 'createdAt', label: 'Thời gian', render: (log) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.createdAt)) },
    { key: 'action', label: 'Hành động', render: (log) => ACTION_LABELS[log.action] || log.action, csv: (log) => ACTION_LABELS[log.action] || log.action },
    { key: 'targetLabel', label: 'Đối tượng' },
    { key: 'detail', label: 'Chi tiết' },
  ];

  const toolbar = (
    <>
      <DateRangeFilter preset={preset} custom={custom} onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }} />
      <select className="input" aria-label="Lọc theo hành động" value={action} onChange={(event) => setAction(event.target.value)}>
        <option value="all">Tất cả hành động</option>
        {Object.entries(ACTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </>
  );

  return (
    <DashboardPanel title="Nhật ký hoạt động" count={loading ? 'Đang tải' : `${filtered.length} bản ghi`}>
      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={['targetLabel', 'detail', 'actorEmail']}
        searchPlaceholder="Tìm đối tượng, chi tiết..."
        exportFilename="nhat-ky.csv"
        loading={loading}
        toolbar={toolbar}
        emptyTitle="Chưa có nhật ký"
        emptyDescription="Backend chưa ghi nhật ký — dữ liệu sẽ xuất hiện khi bật ghi log."
      />
    </DashboardPanel>
  );
}
```

- [ ] **Step 4: Run tests + full suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/AuditLogSection.test.jsx` → 2 passed.
Run: `cd frontend-react && npm test -- --run` → all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/admin/AuditLogSection.jsx frontend-react/src/pages/admin/AuditLogSection.test.jsx
git commit -m "feat(admin): audit log screen with date and action filters"
```

---

### Task 15: Broker upgrades — date filter + CSV export

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Test: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:**
- Consumes: `DateRangeFilter`, `isInRange`, `resolveDateRange`, `downloadCsv`.
- Produces: broker overview stats/charts computed from date-filtered listings; "Xuất CSV" button in the "Tin đăng của tôi" section header exporting the broker's listings.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/pages/BrokerDashboard.filter.test.jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import BrokerDashboard from './BrokerDashboard.jsx';

beforeEach(() => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id',
  }));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); window.localStorage.clear(); vi.unstubAllGlobals(); });

const session = { token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id' };

test('broker overview shows the date-range filter', async () => {
  render(<BrokerDashboard session={session} section="dashboard" currentPath="/broker/dashboard" />);
  expect(await screen.findByRole('button', { name: '7 ngày' })).toBeInTheDocument();
});

test('broker properties section has a CSV export button', async () => {
  render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
  expect(await screen.findByRole('button', { name: /Xuất CSV/ })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: FAIL.

- [ ] **Step 3: Implement in `BrokerDashboard.jsx`**

1. Imports: add `DateRangeFilter` (`../components/dashboard/DateRangeFilter.jsx`), `isInRange`, `resolveDateRange` (`../utils/dateRange.js`), `downloadCsv` (`../utils/exportCsv.js`).
2. State near the other hooks: `const [rangePreset, setRangePreset] = useState('all');` and `const [rangeCustom, setRangeCustom] = useState({});`
3. Derive `const listingRange = useMemo(() => resolveDateRange(rangePreset, rangeCustom), [rangePreset, rangeCustom]);` and `const rangedListings = useMemo(() => listings.filter((listing) => isInRange(listing.createdAt, listingRange)), [listings, listingRange]);`
   Feed `rangedListings` (instead of `listings`) into `dashboardStats`, `statusChart`, `categoryChart`, `wardChart`, and `RecentListings` in the dashboard section **only** (leave the properties management section on the unfiltered `listings`). Listings without `createdAt` stay visible under the default 'all' preset (that is `isInRange`'s contract).
4. Render inside `section === 'dashboard'`, directly above the stats row:

```jsx
<div className="admin-filter-bar">
  <DateRangeFilter
    preset={rangePreset}
    custom={rangeCustom}
    onChange={(nextPreset, nextCustom) => { setRangePreset(nextPreset); setRangeCustom(nextCustom); }}
  />
</div>
```

5. In the `section === 'properties'` header area (near the "Đăng tin mới" button), add:

```jsx
<button
  className="btn btn-ghost btn-sm"
  type="button"
  onClick={() => downloadCsv('tin-dang-cua-toi.csv', listings, [
    { key: 'title', label: 'Tiêu đề' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'priceLabel', label: 'Giá' },
    { key: 'statusLabel', label: 'Trạng thái' },
    { key: 'createdAt', label: 'Ngày tạo' },
  ])}
>
  Xuất CSV
</button>
```

- [ ] **Step 4: Run tests + full suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx` → 2 passed.
Run: `cd frontend-react && npm test -- --run` → all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "feat(broker): date-range filter on overview and CSV export for listings"
```

---

### Task 16: Remove react-admin, update docs, full verification

**Files:**
- Delete: `frontend-react/src/admin-ra/` (entire folder, including `resources/statusControls.test.jsx`)
- Modify: `frontend-react/package.json` (remove deps)
- Modify: `.claude/rules/design.md` (replace the `/admin` MUI exception)
- Modify: `.claude/CLAUDE.md` (Recent Work)

- [ ] **Step 1: Delete the react-admin tree and deps**

```bash
git rm -r frontend-react/src/admin-ra
cd frontend-react && npm uninstall react-admin @mui/material @emotion/react @emotion/styled
```

Then grep to confirm nothing still imports them: `grep -rn "admin-ra\|@mui\|react-admin\|ra-core\|ra-i18n" frontend-react/src` → expect no matches.

- [ ] **Step 2: Update `.claude/rules/design.md`**

Replace the blockquote exception (currently "Ngoại lệ `/admin`: khu vực quản trị `/admin/*` (react-admin) dùng Material UI...") with:

```markdown
> **Ngoại lệ `/admin`**: khu vực quản trị dùng theme **đen-tím cố định** qua class `.admin-theme`
> (scope-level override các token semantic: canvas `#141218`, accent tím `#8b5cf6`...), không đổi
> theo toggle sáng/tối của site. Component bên trong vẫn chỉ tham chiếu token semantic — không
> if/else theme, không hex trong JSX. Ngoại lệ có chủ đích, chỉ giới hạn trong `/admin`.
```

- [ ] **Step 3: Update `.claude/CLAUDE.md` Recent Work**

Replace the dashboard-upgrade note with a short line: admin rebuilt custom (đen-tím, `pages/admin/`), react-admin removed, broker got date filter + CSV; spec at `docs/superpowers/specs/2026-07-03-admin-custom-rebuild-design.md`.

- [ ] **Step 4: Full test suite + build**

Run: `cd frontend-react && npm test -- --run` → all pass (admin-ra tests are gone; new suite covers the custom admin).
Run: `cd frontend-react && npm run build` → build succeeds (catches any lingering react-admin import).

- [ ] **Step 5: Playwright smoke (mock mode)**

Start `VITE_USE_MOCK_API=true npm run dev` (kill any orphaned vite on the port first — check `netstat -ano | grep :5173`). Adapt the previous session's scratchpad script pattern (`chromium` from `frontend-react`'s playwright, login as `admin@congtinland.vn` / any password) and verify:

1. `#/admin` → đen-tím overview: KPI row, live chart ticking, ward chart, heatmap, quick actions, notification bell with badge; **stays dark when site theme is light**.
2. Preset "7 ngày" changes KPI numbers; ward select narrows charts.
3. Heatmap cell click lands on `#/admin/properties?ward=...&category=...` with the table pre-filtered.
4. `#/admin/accounts` → admin row shows "Quản trị viên" (no Khóa button); a broker row can toggle.
5. `#/admin/audit` → 12 mock entries, action filter works.
6. "Xuất CSV" on properties table triggers a download event.
7. `#/broker/dashboard` → date pills render (theme still đỏ); `#/broker/properties` → Xuất CSV button.
8. Screenshots of admin overview + accounts + audit and broker overview; visually check purple accent and contrast.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(admin): remove react-admin and MUI, document den-tim admin exception"
```

---

## Self-Review Notes (already applied)

- Spec §1–§7 each map to tasks: kiến trúc (10), theme (5), overview/wireframe (11), quản lý + CSV + quick actions (7, 11–13), thông báo + audit (4, 9, 14), broker (15), mock data + cleanup (6, 16).
- `column.csv` accessor contract introduced in Task 12 requires the small DataTable adjustment noted there — implementer must keep Task 7's tests green.
- Heatmap uses `Fragment` — the React import change in Task 3 is required.
- `WardBarChart` gains optional `onSelectWard` in Task 11 without breaking Task 2-era tests (prop optional).
