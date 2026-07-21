# Dashboard Chart Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dated 3D-toggle donut / boxy-bar chart language across all 3 dashboard pages (broker, admin overview, admin reports) with a 2026 modern visual system (gradient line chart, monochrome horizontal-bar breakdown, bar-sparkline KPI cards, ranking list, ward×category matrix) approved through 5 rounds of visual-companion mockup iteration.

**Architecture:** 5 new chart components in `components/Charts.jsx` replace 4 old ones (`TrendBarLineChart`, `ThreeDDonutChart`, `WardBarChart`, `CategoryBarChart`) at every call site across 3 page files; `StatCard` gets a new rendering branch (only active when a `series` prop is passed) for the bar-sparkline KPI treatment. Admin Overview also gets a layout restructure (2-column hero cluster) per the approved wireframe; broker dashboard and admin reports keep their existing row/column structure and only swap which component renders in each slot. 10 already-dead chart components are deleted last, once no file references the components they're nested inside.

**Tech Stack:** React 19, Vite 8, CSS custom properties, Vitest + Testing Library.

## Global Constraints

- No hard-coded `#hex` in JSX; colors only via `var(--color-*)` or `color-mix(in srgb, var(--color-*), ...)` — this file already uses inline `style={{...}}` for computed SVG/CSS values (an established exception for genuinely dynamic values), continue that pattern, don't introduce new categories of inline style.
- `npm test -- --run` (from `frontend-react/`) must stay green throughout — count changes as old component tests are replaced by new ones; never let it decrease from a broken/skipped test.
- Vietnamese UI text, English code/identifiers, conventional commit messages, no AI attribution trailer.
- TDD for every new component: write the test first, watch it fail for the right reason, then implement.
- Design spec this plan implements: `docs/superpowers/specs/2026-07-18-dashboard-chart-redesign-design.md`.
- Every new component must handle its own empty/all-zero data case honestly (no misleading chart geometry) — this was the Important finding from the *previous* plan's final review (`ThreeDDonutChart`'s conic-gradient collapsing to a solid ring at `total===0`); don't reintroduce that class of bug in the new components.

---

### Task 1: `TrendLineChart` component

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: `ChartTooltip`, `TRACK_COLOR`, `COMBO_CHART_PLOT`, `TREND_LEFT_MARGIN`/`TREND_COLUMN_UNIT_WIDTH`/`TREND_RIGHT_MARGIN`/`TREND_PX_PER_UNIT` (all already defined earlier in `Charts.jsx`, unchanged), `Icon` (already imported at top of the file).
- Produces: `export function TrendLineChart({ title, subtitle, data, currentLabel, previousLabel })` — `data: [{ label, current, previous }]`. Later tasks (6, 7, 8) import this by name.

- [ ] **Step 1: Write the failing tests**

Add to `frontend-react/src/components/Charts.test.jsx`, right after the last existing `TrendBarLineChart` test (the file currently ends its `TrendBarLineChart` section around line 530 with the "renders in-SVG text labels" test — add these new tests immediately after that section, before the file ends). Also add `TrendLineChart` to the import list at the top of the file (alongside the existing `TrendBarLineChart` import — both can coexist during this task; `TrendBarLineChart` is only deleted in Task 9):

```jsx
// ── TrendLineChart ────────────────────────────────────────

test('TrendLineChart renders title, subtitle, and a line ending on the last data point', () => {
  const data = [
    { label: '12/07', current: 2, previous: 5 },
    { label: '13/07', current: 8, previous: 1 },
  ];
  render(<TrendLineChart title="Xu hướng" subtitle="Theo ngày" data={data} currentLabel="Tin đăng" previousLabel="Lịch hẹn" />);

  expect(screen.getByRole('heading', { name: 'Xu hướng' })).toBeInTheDocument();
  expect(screen.getByText('Theo ngày')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '12/07: Tin đăng 2, Lịch hẹn 5' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '13/07: Tin đăng 8, Lịch hẹn 1' })).toBeInTheDocument();
});

test('TrendLineChart shows the primary line, an area fill, and a secondary line only when previous data exists', () => {
  const withPrevious = [
    { label: 'T1', current: 3, previous: 1 },
    { label: 'T2', current: 5, previous: 2 },
  ];
  const { container: withContainer } = render(<TrendLineChart title="A" data={withPrevious} />);
  expect(withContainer.querySelectorAll('path')).toHaveLength(3); // area fill + primary line + secondary line

  const noPrevious = [
    { label: 'T1', current: 3, previous: 0 },
    { label: 'T2', current: 5, previous: 0 },
  ];
  const { container: withoutContainer } = render(<TrendLineChart title="B" data={noPrevious} />);
  expect(withoutContainer.querySelectorAll('path')).toHaveLength(2); // area fill + primary line only
  expect(screen.queryByText('So sánh')).not.toBeInTheDocument();
});

test('TrendLineChart tooltip lists both series at the hovered point', () => {
  const data = [
    { label: 'T1', current: 2, previous: 5 },
    { label: 'T2', current: 8, previous: 1 },
  ];
  render(<TrendLineChart title="A" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />);

  const t1 = screen.getByRole('img', { name: 'T1: Bài đăng 2, Lịch hẹn 5' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.mouseEnter(t1);
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('Bài đăng');
  expect(tooltip).toHaveTextContent('2');
  expect(tooltip).toHaveTextContent('Lịch hẹn');
  expect(tooltip).toHaveTextContent('5');

  fireEvent.mouseLeave(t1);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('TrendLineChart shows an empty state when every point is entirely zero', () => {
  const data = [{ label: 'T1', current: 0, previous: 0 }, { label: 'T2', current: 0, previous: 0 }];
  render(<TrendLineChart title="A" data={data} />);
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
});

test('TrendLineChart thins date labels when there are many data points, but always keeps the last label', () => {
  const data = Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1}`, current: 1, previous: 0 }));
  const { container } = render(<TrendLineChart title="A" data={data} />);
  const labelTexts = Array.from(container.querySelectorAll('.trend-line-svg text')).map((node) => node.textContent);
  expect(labelTexts.length).toBeLessThan(31);
  expect(labelTexts).toContain('31');
});

test('TrendLineChart renders every date label when there are few data points', () => {
  const data = Array.from({ length: 5 }, (_, index) => ({ label: `${index + 1}`, current: 1, previous: 0 }));
  const { container } = render(<TrendLineChart title="A" data={data} />);
  const labelTexts = Array.from(container.querySelectorAll('.trend-line-svg text')).map((node) => node.textContent);
  expect(labelTexts).toEqual(['1', '2', '3', '4', '5']);
});
```

Update the import line near the top of `Charts.test.jsx` (currently `TrendBarLineChart, ThreeDDonutChart` among others) to also import `TrendLineChart`:

```jsx
import {
  buildDailySeries, buildMonthlySeries, buildWardData, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart, TrendBarLineChart, ThreeDDonutChart, TrendLineChart,
} from './Charts.jsx';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "TrendLineChart"`
Expected: FAIL — `TrendLineChart is not a function` / not exported.

- [ ] **Step 3: Implement `TrendLineChart`**

Add to `frontend-react/src/components/Charts.jsx`, right after the closing brace of `TrendBarLineChart` (currently ends at line 995, right before the `GaugeChart` doc comment):

```jsx
const TREND_LABEL_DENSITY_THRESHOLD = 10;

export function TrendLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh' }) {
  const { top, bottom } = COMBO_CHART_PLOT;
  const [hovered, setHovered] = useState(null);
  const gradientId = useId();
  const left = TREND_LEFT_MARGIN;
  const viewBoxWidth = TREND_LEFT_MARGIN + data.length * TREND_COLUMN_UNIT_WIDTH + TREND_RIGHT_MARGIN;
  const right = viewBoxWidth - TREND_RIGHT_MARGIN;
  const idealWidthPx = viewBoxWidth * TREND_PX_PER_UNIT;
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

  const axisMax = Math.max(...data.flatMap((point) => [point.current || 0, point.previous || 0]), 1);
  const columnWidth = (right - left) / data.length;
  const primaryColor = 'var(--color-primary)';
  const secondaryColor = 'color-mix(in srgb, var(--color-primary), transparent 55%)';

  const points = data.map((point, index) => {
    const x = left + columnWidth * (index + 0.5);
    return {
      point,
      x,
      currentY: bottom - ((point.current || 0) / axisMax) * (bottom - top),
      previousY: bottom - ((point.previous || 0) / axisMax) * (bottom - top),
    };
  });

  const currentLinePath = `M${points.map((p) => `${p.x},${p.currentY}`).join(' L')}`;
  const areaPath = `${currentLinePath} L${points[points.length - 1].x},${bottom} L${points[0].x},${bottom} Z`;
  const previousLinePath = `M${points.map((p) => `${p.x},${p.previousY}`).join(' L')}`;
  const lastPoint = points[points.length - 1];

  // Never render a <text> per point once there are more than TREND_LABEL_DENSITY_THRESHOLD
  // points (e.g. a 28-31-day month) — a mobile-width chart can't fit that many labels
  // without overlap. Keep every Nth label plus the last one always.
  const labelStep = data.length > TREND_LABEL_DENSITY_THRESHOLD
    ? Math.ceil(data.length / TREND_LABEL_DENSITY_THRESHOLD)
    : 1;
  const visibleLabelPoints = points.filter((_, index) => index % labelStep === 0 || index === points.length - 1);

  const hoveredPoint = hovered != null ? points[hovered] : null;
  const tooltipRows = hoveredPoint ? [
    { label: currentLabel, value: hoveredPoint.point.current || 0, color: primaryColor },
    ...(hasPrevious ? [{ label: previousLabel, value: hoveredPoint.point.previous || 0, color: secondaryColor }] : []),
  ] : [];

  return (
    <section className="chart-panel" style={{ '--trend-chart-width': `${idealWidthPx}px` }}>
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="chart-hover-wrap">
        <svg className="trend-line-svg" viewBox={`0 0 ${viewBoxWidth} 50`} preserveAspectRatio="none" role="img" aria-label={title}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          {hasPrevious && <path d={previousLinePath} fill="none" stroke={secondaryColor} strokeWidth="1" />}
          <path d={currentLinePath} fill="none" stroke={primaryColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={lastPoint.x} cy={lastPoint.currentY} r="1.4" fill="var(--color-canvas)" stroke={primaryColor} strokeWidth="1" />
          {hoveredPoint && hoveredPoint !== lastPoint && (
            <circle cx={hoveredPoint.x} cy={hoveredPoint.currentY} r="1.4" fill="var(--color-canvas)" stroke={primaryColor} strokeWidth="1" />
          )}
          {points.map((p, index) => (
            <rect
              key={p.point.label}
              role="img"
              tabIndex={0}
              aria-label={hasPrevious
                ? `${p.point.label}: ${currentLabel} ${p.point.current || 0}, ${previousLabel} ${p.point.previous || 0}`
                : `${p.point.label}: ${p.point.current || 0}`}
              className="trend-line-hit"
              x={left + columnWidth * index}
              y={top}
              width={columnWidth}
              height={bottom - top}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered((current) => (current === index ? null : current))}
            />
          ))}
          {visibleLabelPoints.map((p) => (
            <text key={`x-label-${p.point.label}`} x={p.x} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
              {p.point.label}
            </text>
          ))}
        </svg>
        {hoveredPoint && (
          <ChartTooltip
            leftPct={(hoveredPoint.x / viewBoxWidth) * 100}
            topPct={(Math.min(hoveredPoint.currentY, hoveredPoint.previousY) / 50) * 100}
            rows={tooltipRows}
          />
        )}
      </div>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-line" style={{ backgroundColor: primaryColor }} />
          {currentLabel}
        </span>
        {hasPrevious && (
          <span className="combo-chart-legend-item">
            <span className="combo-chart-legend-line" style={{ backgroundColor: secondaryColor }} />
            {previousLabel}
          </span>
        )}
      </div>
    </section>
  );
}
```

Update the top-of-file import (line 1) to add `useId`:

```jsx
import { useId, useState } from 'react';
```

- [ ] **Step 4: Add CSS for `.trend-line-svg`/`.trend-line-hit`**

Add to `frontend-react/src/styles/dashboard.css`, near the existing `.trend-chart-svg` rules (search for that class to find the right neighborhood):

```css
.trend-line-svg {
  display: block;
  width: min(100%, var(--trend-chart-width));
  height: 220px;
}

.trend-line-hit {
  cursor: pointer;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "TrendLineChart"`
Expected: all 6 new tests pass.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: pass count increases by 6 from baseline (confirm current baseline first with `git stash && npm test -- --run && git stash pop` if unsure, or just confirm no failures — exact baseline number isn't load-bearing here since Task 9 will also change counts significantly).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat: add TrendLineChart component

Gradient-filled line chart replacing TrendBarLineChart's bar+line
combo — thinner secondary series line instead of a second bar,
in-SVG date labels sharing the same x-coordinates as the data points,
and responsive date-label thinning for charts with many points."
```

---

### Task 2: `CategoryBreakdown` component

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: `Icon` (already imported).
- Produces: `export function CategoryBreakdown({ title, subtitle, data, totalLabel })` — `data: [{ label, value }]`. Later tasks (6, 7, 8) import this by name.

- [ ] **Step 1: Write the failing tests**

Add to `Charts.test.jsx`, after the `TrendLineChart` tests from Task 1. Add `CategoryBreakdown` to the same import statement updated in Task 1.

```jsx
// ── CategoryBreakdown ─────────────────────────────────────

test('CategoryBreakdown renders each row with its value and computed percent, plus a total line', () => {
  const data = [{ label: 'Nhà', value: 12 }, { label: 'Đất', value: 10 }, { label: 'Trọ', value: 2 }];
  render(<CategoryBreakdown title="Phân bổ theo danh mục" data={data} totalLabel="Tổng cộng" />);

  expect(screen.getByRole('heading', { name: 'Phân bổ theo danh mục' })).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('· 50%')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();
  expect(screen.getByText('· 42%')).toBeInTheDocument();
  expect(screen.getByText('Tổng cộng')).toBeInTheDocument();
  expect(screen.getByText('24')).toBeInTheDocument();
});

test('CategoryBreakdown gives each row a distinct shade of the same primary color, not a multi-hue palette', () => {
  const data = [{ label: 'A', value: 3 }, { label: 'B', value: 2 }, { label: 'C', value: 1 }];
  const { container } = render(<CategoryBreakdown title="X" data={data} />);
  const fills = Array.from(container.querySelectorAll('.category-breakdown-fill')).map((el) => el.style.backgroundColor);
  expect(fills).toHaveLength(3);
  expect(new Set(fills).size).toBe(3); // all distinct
  fills.forEach((fill) => expect(fill).toContain('color-mix'));
});

test('CategoryBreakdown shows an empty state instead of a misleading full bar when every value is zero', () => {
  const data = [{ label: 'A', value: 0 }, { label: 'B', value: 0 }];
  render(<CategoryBreakdown title="X" data={data} />);
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
  expect(screen.queryByText('A')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "CategoryBreakdown"`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement `CategoryBreakdown`**

Add to `Charts.jsx`, after `TrendLineChart` (from Task 1):

```jsx
export function CategoryBreakdown({ title, subtitle, data, totalLabel = 'Tổng cộng' }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const isEmpty = total === 0;

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

  // Every row already carries its own text label, so identity doesn't depend on hue —
  // one shade ramp of --color-primary is used instead of the multi-hue CHART_PALETTE
  // (a distinct hue per row was read as "this category is flagged/different" rather
  // than "this is just the Nth row").
  const rows = data.map((item, index) => ({
    ...item,
    pct: Math.round((item.value / total) * 100),
    color: `color-mix(in srgb, var(--color-primary), white ${index * 22}%)`,
  }));

  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="category-breakdown-rows">
        {rows.map((row) => (
          <div className="category-breakdown-row" key={row.label}>
            <div className="category-breakdown-row-top">
              <span className="category-breakdown-label">{row.label}</span>
              <span className="category-breakdown-value">
                <b>{row.value}</b> <span className="category-breakdown-pct">· {row.pct}%</span>
              </span>
            </div>
            <div className="category-breakdown-track">
              <div className="category-breakdown-fill" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="category-breakdown-total">
        <span>{totalLabel}</span>
        <span className="category-breakdown-total-value">{total}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add CSS**

Add to `dashboard.css`:

```css
.category-breakdown-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-breakdown-row-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13.5px;
  margin-bottom: 5px;
}

.category-breakdown-label {
  color: var(--color-body);
  font-weight: 600;
}

.category-breakdown-value {
  color: var(--color-ink);
}

.category-breakdown-pct {
  color: var(--color-muted);
  font-weight: 400;
}

.category-breakdown-track {
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-hairline);
  overflow: hidden;
}

.category-breakdown-fill {
  height: 100%;
  border-radius: var(--radius-full);
}

.category-breakdown-total {
  display: flex;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--color-muted);
  border-top: 1px solid var(--color-hairline);
  margin-top: 12px;
  padding-top: 10px;
}

.category-breakdown-total-value {
  color: var(--color-ink);
  font-weight: 700;
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "CategoryBreakdown"`
Expected: all 3 tests pass.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures, count up by 3 from Task 1's total.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat: add CategoryBreakdown component

Horizontal rounded-bar list replacing the 3D-toggle donut and the
4-category vertical bar charts. Monochrome color-mix ramp of
--color-primary instead of a multi-hue palette, since every row
already carries a text label — a distinct hue per row read as
'flagged/different' rather than 'just the Nth item'."
```

---

### Task 3: `MiniBarSparkline` + `StatCard` bar-sparkline branch

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/components/DashboardWidgets.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Test: `frontend-react/src/components/Charts.test.jsx`
- Test: `frontend-react/src/components/DashboardWidgets.test.jsx` (create if it doesn't already exist — check first)

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function MiniBarSparkline({ series, activeCount })` in `Charts.jsx`. `StatCard` gains 2 new optional props: `trendContext: string`, `seriesCaption: string`. Later tasks (6, 7) pass `series`/`trend`/`trendContext`/`seriesCaption` together on the 2 "hero" `StatCard` call sites.

- [ ] **Step 1: Check whether `DashboardWidgets.test.jsx` already exists**

Run: `cd frontend-react && ls src/components/DashboardWidgets.test.jsx 2>&1`
If it exists, read it first to match its existing style before adding to it. If it doesn't exist (likely, since no test file was found for this component during earlier research), create it fresh in Step 2 below with just the new test — do not attempt to backfill full coverage for the rest of `StatCard`/`DashboardPanel`/etc., that's out of scope for this task.

- [ ] **Step 2: Write the failing tests**

Add to `Charts.test.jsx` (new `MiniBarSparkline` section, near `Sparkline`'s existing tests):

```jsx
// ── MiniBarSparkline ──────────────────────────────────────

test('MiniBarSparkline renders one bar per value and marks the last activeCount bars active', () => {
  const { container } = render(<MiniBarSparkline series={[1, 2, 3, 4, 5]} activeCount={2} />);
  const bars = container.querySelectorAll('.mini-bar-sparkline-bar');
  expect(bars).toHaveLength(5);
  expect(Array.from(bars).filter((bar) => bar.classList.contains('is-active'))).toHaveLength(2);
  expect(bars[3]).toHaveClass('is-active');
  expect(bars[4]).toHaveClass('is-active');
  expect(bars[0]).not.toHaveClass('is-active');
});

test('MiniBarSparkline renders nothing for fewer than 2 points, matching Sparkline', () => {
  const { container } = render(<MiniBarSparkline series={[3]} />);
  expect(container).toBeEmptyDOMElement();
});
```

Add `MiniBarSparkline` to the same `Charts.jsx` import list in `Charts.test.jsx`.

Create or add to `frontend-react/src/components/DashboardWidgets.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StatCard } from './DashboardWidgets.jsx';

afterEach(() => cleanup());

test('StatCard without series renders the original icon-chip layout unchanged', () => {
  const { container } = render(
    <StatCard icon="Building" title="Tổng số người dùng" value={4} tone="navy" />,
  );
  expect(screen.getByText('Tổng số người dùng')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(container.querySelector('.kpi-icon-chip')).toBeInTheDocument();
  expect(container.querySelector('.stat-card-trend-block')).not.toBeInTheDocument();
});

test('StatCard with series renders the bar-sparkline hero layout, with trendContext and seriesCaption', () => {
  const { container } = render(
    <StatCard
      icon="Building"
      title="Tin đăng"
      value={24}
      tone="navy"
      trend={{ value: '▲ 12%', direction: 'up' }}
      trendContext="so với 7 ngày trước"
      series={[1, 2, 3, 4, 5, 6, 7]}
      seriesCaption="7 ngày gần nhất"
    />,
  );
  expect(screen.getByText('Tin đăng')).toBeInTheDocument();
  expect(screen.getByText('24')).toBeInTheDocument();
  expect(screen.getByText('▲ 12%')).toBeInTheDocument();
  expect(screen.getByText('so với 7 ngày trước')).toBeInTheDocument();
  expect(screen.getByText('7 ngày gần nhất')).toBeInTheDocument();
  expect(container.querySelector('.mini-bar-sparkline')).toBeInTheDocument();
  expect(container.querySelector('.kpi-icon-chip')).not.toBeInTheDocument();
});

test('StatCard with series but no trendContext/seriesCaption omits those lines without crashing', () => {
  render(<StatCard icon="Building" title="Tin đăng" value={24} series={[1, 2, 3]} />);
  expect(screen.getByText('Tin đăng')).toBeInTheDocument();
  expect(screen.getByText('24')).toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx src/components/DashboardWidgets.test.jsx -t "MiniBarSparkline|StatCard"`
Expected: FAIL — `MiniBarSparkline` not exported; `StatCard` doesn't accept `trendContext`/`seriesCaption` yet (tests fail on missing text/classes).

- [ ] **Step 4: Implement `MiniBarSparkline`**

Add to `Charts.jsx`, right after the existing `Sparkline` function (search for `export function Sparkline`):

```jsx
/**
 * MiniBarSparkline — bar-chart variant of Sparkline for a stat card's hero
 * layout. The last `activeCount` bars render in the brand accent color, the
 * rest in a muted track color — recent activity reads as more prominent
 * than older days.
 */
export function MiniBarSparkline({ series = [], activeCount = 2 }) {
  if (series.length < 2) return null;
  const max = Math.max(...series, 1);
  return (
    <div className="mini-bar-sparkline">
      {series.map((value, index) => {
        const isActive = index >= series.length - activeCount;
        return (
          <span
            key={index}
            className={`mini-bar-sparkline-bar${isActive ? ' is-active' : ''}`}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Add CSS for `MiniBarSparkline`**

Add to `dashboard.css`:

```css
.mini-bar-sparkline {
  display: flex;
  align-items: flex-end;
  gap: var(--space-1);
  height: 32px;
}

.mini-bar-sparkline-bar {
  flex: 1;
  background: var(--color-hairline);
  border-radius: 2px;
  transition: background-color 120ms ease;
}

.mini-bar-sparkline-bar.is-active {
  background: var(--color-primary);
}

.mini-bar-sparkline-bar:hover {
  background: color-mix(in srgb, var(--color-primary), transparent 30%);
}
```

- [ ] **Step 6: Update `StatCard` with the bar-sparkline branch**

In `frontend-react/src/components/DashboardWidgets.jsx`, replace the import line and the whole `StatCard` function:

```jsx
import Icon from './ui/Icon.jsx';
import { MiniBarSparkline } from './Charts.jsx';
```

```jsx
/**
 * StatCard — KPI tile.
 *
 * Props (all existing props preserved):
 *   icon   {string}   — Icon name (lucide-react key in ICON_MAP)
 *   title  {string}   — label above the value
 *   value  {string|number}
 *   meta   {string}   — optional sub-text below value
 *   tone   {'navy'|'orange'|'green'|'red'|'muted'}
 *   href   {string}   — if provided, renders as <a>
 *   trend  {{ value: string, direction: 'up'|'down' }}  — optional trend line
 *   series {number[]}  — when present, switches to the hero bar-sparkline
 *     layout (no icon chip, 2-line trend block, MiniBarSparkline, optional
 *     caption) instead of the plain icon-chip layout. Cards without series
 *     keep the exact original layout, unaffected.
 *   trendContext  {string} — optional 2nd line under the trend value (only
 *     used in the series/hero layout), e.g. "so với 7 ngày trước"
 *   seriesCaption {string} — optional caption under the mini-chart (only
 *     used in the series/hero layout), e.g. "7 ngày gần nhất"
 */
export function StatCard({ icon, title, value, meta, tone = 'navy', href, trend, series, trendContext, seriesCaption }) {
  const chipClass = CHIP_CLASS[tone] || CHIP_CLASS.navy;
  const hasSeries = series && series.length > 1;

  const content = hasSeries ? (
    <>
      <p className="stat-card-label">{title}</p>
      <p className="stat-card-number stat-card-value">{value}</p>
      {trend && (
        <div className="stat-card-trend-block">
          <span className={`stat-card-trend-line ${trend.direction === 'up' ? 'is-up' : 'is-down'}`}>
            <Icon name={trend.direction === 'up' ? 'TrendingUp' : 'TrendingDown'} size={14} strokeWidth={2.5} />
            {trend.value}
          </span>
          {trendContext && <span className="stat-card-trend-context">{trendContext}</span>}
        </div>
      )}
      <MiniBarSparkline series={series} />
      {seriesCaption && <p className="stat-card-series-caption">{seriesCaption}</p>}
    </>
  ) : (
    <>
      <div className="stat-card-top">
        <span className={`kpi-icon-chip ${chipClass}`}>
          <Icon name={icon} size={22} strokeWidth={1.75} />
        </span>
        {trend && (
          <span className={`kpi-trend ${trend.direction === 'up' ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
            <Icon
              name={trend.direction === 'up' ? 'TrendingUp' : 'TrendingDown'}
              size={12}
              strokeWidth={2.5}
            />
            {trend.value}
          </span>
        )}
      </div>
      <p className="stat-card-number stat-card-value">{value}</p>
      <p className="stat-card-label">{title}</p>
      {meta && <p className="stat-card-meta">{meta}</p>}
    </>
  );

  if (href) {
    return (
      <a className="stat-card-link" href={href}>
        {content}
      </a>
    );
  }
  return <article className="stat-card-article">{content}</article>;
}
```

(`Sparkline`'s own import is no longer used by `DashboardWidgets.jsx` after this change — this file's `import { Sparkline } from './Charts.jsx';` line is replaced by the `MiniBarSparkline` import above, not kept alongside it. Do not delete `Sparkline` from `Charts.jsx` itself — it's still exported and may have other consumers; confirm via grep in Task 9's dead-code sweep, not here.)

- [ ] **Step 7: Add CSS for the new `StatCard` hero layout**

Add to `dashboard.css`, near the existing `.stat-card-*` rules:

```css
.stat-card-trend-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}

.stat-card-trend-line {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 700;
  line-height: 1.3;
}

.stat-card-trend-line.is-up {
  color: var(--color-primary);
}

.stat-card-trend-line.is-down {
  color: var(--color-error);
}

.stat-card-trend-context {
  font-size: var(--text-caption);
  color: var(--color-muted);
}

.stat-card-series-caption {
  font-size: var(--text-badge);
  color: var(--color-muted);
  margin: var(--space-2) 0 0;
}
```

(Font sizes use the project's 6-value scale — `--text-sm` at weight 700 for the trend value rather than inventing a new 15px size, per design.md's "cần nhấn thì đổi weight, không đổi size." Spacing uses the 4px scale tokens throughout, no raw px on any margin/padding/gap.)

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx src/components/DashboardWidgets.test.jsx`
Expected: all tests in both files pass.

- [ ] **Step 9: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures.

- [ ] **Step 10: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/components/DashboardWidgets.jsx frontend-react/src/components/DashboardWidgets.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat: add MiniBarSparkline and a hero bar-sparkline layout to StatCard

StatCard's default (non-series) rendering is byte-for-byte unchanged —
the new layout only activates when a series prop is passed, currently
2 call sites (broker's active-listings card, admin's total-listings
card), wired in a later task."
```

---

### Task 4: `RankingList` component

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `export function RankingList({ title, subtitle, data, primaryLabel, secondaryLabel })` — `data: [{ label, current, previous }]`. Task 8 imports this by name to replace `TrendBarLineChart`/`TrendLineChart` for "Top môi giới theo hoạt động" (that data isn't a time series — see spec's "Bổ sung từ audit" section).

- [ ] **Step 1: Write the failing tests**

Add to `Charts.test.jsx`:

```jsx
// ── RankingList ───────────────────────────────────────────

test('RankingList renders numbered rows with both stat labels, in the given order', () => {
  const data = [
    { label: 'N.V.Toàn', current: 12, previous: 5 },
    { label: 'T.M.Linh', current: 8, previous: 3 },
  ];
  render(<RankingList title="Top môi giới" data={data} primaryLabel="tin đăng" secondaryLabel="lịch hẹn xác nhận" />);

  expect(screen.getByRole('heading', { name: 'Top môi giới' })).toBeInTheDocument();
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('1');
  expect(rows[0]).toHaveTextContent('N.V.Toàn');
  expect(rows[0]).toHaveTextContent('12 tin đăng');
  expect(rows[0]).toHaveTextContent('5 lịch hẹn xác nhận');
  expect(rows[1]).toHaveTextContent('2');
  expect(rows[1]).toHaveTextContent('T.M.Linh');
});

test('RankingList handles the single-row empty placeholder without crashing', () => {
  const data = [{ label: 'Chưa có', current: 0, previous: 0 }];
  render(<RankingList title="Top môi giới" data={data} primaryLabel="tin đăng" secondaryLabel="lịch hẹn" />);
  expect(screen.getByText('Chưa có')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "RankingList"`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement `RankingList`**

Add to `Charts.jsx`:

```jsx
/**
 * RankingList — numbered ranking, for categorical data with no time axis
 * (e.g. "top brokers by activity"). A line/bar trend chart is the wrong
 * form for this: there's no date/month per row, just a ranked comparison.
 */
export function RankingList({ title, subtitle, data, primaryLabel = 'Chỉ số 1', secondaryLabel = 'Chỉ số 2' }) {
  const maxCurrent = Math.max(...data.map((item) => item.current || 0), 1);
  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <ol className="ranking-list">
        {data.map((item, index) => (
          <li className="ranking-list-row" key={item.label}>
            <span className="ranking-list-rank">{index + 1}</span>
            <div className="ranking-list-body">
              <div className="ranking-list-top">
                <span className="ranking-list-name">{item.label}</span>
                <span className="ranking-list-stats">
                  {item.current || 0} {primaryLabel} · {item.previous || 0} {secondaryLabel}
                </span>
              </div>
              <div className="ranking-list-track">
                <div className="ranking-list-fill" style={{ width: `${Math.max(4, ((item.current || 0) / maxCurrent) * 100)}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 4: Add CSS**

Add to `dashboard.css`:

```css
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.ranking-list-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.ranking-list-rank {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  font-size: var(--text-caption);
  font-weight: 700;
  color: var(--color-muted);
}

.ranking-list-body {
  flex: 1;
  min-width: 0;
}

.ranking-list-top {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--text-caption);
  margin-bottom: var(--space-1);
}

.ranking-list-name {
  color: var(--color-ink);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ranking-list-stats {
  color: var(--color-muted);
  flex-shrink: 0;
}

.ranking-list-track {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-hairline);
  overflow: hidden;
}

.ranking-list-fill {
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-primary);
}
```

(Font sizes and margin/padding/gap values use the project's token scale — no raw px on any of them, matching the fix applied to Task 2's `CategoryBreakdown` CSS after review. `.ranking-list-rank`'s `width`/`height: 22px` are element dimensions, not margin/padding/gap/font-size, so they're outside the scale rule's scope — same treatment as existing dimension values elsewhere in `dashboard.css`, e.g. `.kpi-trend-sparkline`'s `width: 32px`.)

- [ ] **Step 5: Run tests, verify pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "RankingList"`
Expected: both tests pass.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat: add RankingList component

Numbered ranking list for categorical (non-time-series) data — used
to fix a real chart-type mismatch: 'Top môi giới theo hoạt động' was
being force-fit into a line/bar trend chart despite having no date
axis, just 6 ranked brokers."
```

---

### Task 5: `WardCategoryMatrix` component

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: `CATEGORIES` (already imported at top of `Charts.jsx`).
- Produces: `export function WardCategoryMatrix({ title, subtitle, wards })` — `wards: [{ code, label, data: [{slug, label, count, pct}] }]` (exact shape of the existing `wardDensityData` in `ReportsSection.jsx`, no data-layer changes needed). Task 8 imports this to replace the 4-card `dashboard-ward-density-row`.

- [ ] **Step 1: Write the failing tests**

Add to `Charts.test.jsx`:

```jsx
// ── WardCategoryMatrix ────────────────────────────────────

test('WardCategoryMatrix renders one row per ward with a column per category plus a total', () => {
  const wards = [
    {
      code: 'phuong-tra-vinh',
      label: 'Phường Trà Vinh',
      data: [
        { slug: 'tro', label: 'Trọ', count: 3, pct: 75 },
        { slug: 'nha', label: 'Nhà', count: 1, pct: 25 },
        { slug: 'dat', label: 'Đất', count: 0, pct: 0 },
      ],
    },
  ];
  render(<WardCategoryMatrix title="Mật độ tin theo phường" wards={wards} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin theo phường' })).toBeInTheDocument();
  const row = screen.getByText('Trà Vinh').closest('tr');
  expect(row).toHaveTextContent('Trà Vinh');
  expect(row).toHaveTextContent('3');
  expect(row).toHaveTextContent('1');
  expect(row).toHaveTextContent('0');
  expect(row).toHaveTextContent('4'); // total = 3+1+0
});

test('WardCategoryMatrix renders every ward as a real row even when every count is zero (honest, not misleading)', () => {
  const wards = [
    { code: 'w1', label: 'Phường A', data: [{ slug: 'tro', label: 'Trọ', count: 0, pct: 0 }, { slug: 'nha', label: 'Nhà', count: 0, pct: 0 }, { slug: 'dat', label: 'Đất', count: 0, pct: 0 }] },
  ];
  render(<WardCategoryMatrix title="X" wards={wards} />);
  const row = screen.getByText('A').closest('tr');
  expect(row).toHaveTextContent('0');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "WardCategoryMatrix"`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement `WardCategoryMatrix`**

Add to `Charts.jsx`:

```jsx
/**
 * WardCategoryMatrix — ward × category count table, replacing 4 separate
 * per-ward density charts. A table of real (possibly-zero) counts is always
 * honest — unlike a chart, there's no geometry that can misrepresent an
 * all-zero row, so this needs no separate empty-state branch.
 */
export function WardCategoryMatrix({ title, subtitle, wards }) {
  const rows = wards.map((ward) => {
    const counts = Object.fromEntries(ward.data.map((item) => [item.slug, item.count]));
    const total = ward.data.reduce((sum, item) => sum + item.count, 0);
    return { code: ward.code, label: ward.label.replace('Phường ', ''), counts, total };
  });
  const maxCount = Math.max(...rows.flatMap((row) => CATEGORIES.map((category) => row.counts[category.slug] || 0)), 1);

  function cellStyle(count) {
    if (!count) return undefined;
    const intensity = Math.round((count / maxCount) * 60);
    return { backgroundColor: `color-mix(in srgb, var(--color-primary), transparent ${100 - intensity}%)` };
  }

  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <table className="ward-category-matrix">
        <thead>
          <tr>
            <th>Phường</th>
            {CATEGORIES.map((category) => <th key={category.slug}>{category.label}</th>)}
            <th>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <td className="ward-category-matrix-label">{row.label}</td>
              {CATEGORIES.map((category) => (
                <td key={category.slug} style={cellStyle(row.counts[category.slug])}>
                  {row.counts[category.slug] || 0}
                </td>
              ))}
              <td className="ward-category-matrix-total">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 4: Add CSS**

Add to `dashboard.css`:

```css
.ward-category-matrix {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-caption);
}

.ward-category-matrix th {
  text-align: right;
  font-size: var(--text-badge);
  font-weight: 600;
  color: var(--color-muted);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-hairline);
}

.ward-category-matrix th:first-child {
  text-align: left;
}

.ward-category-matrix td {
  text-align: right;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-hairline);
  color: var(--color-body);
  font-variant-numeric: tabular-nums;
}

.ward-category-matrix td.ward-category-matrix-label {
  text-align: left;
  color: var(--color-ink);
  font-weight: 600;
}

.ward-category-matrix-total {
  color: var(--color-ink);
  font-weight: 700;
}
```

(`td.ward-category-matrix-label` — the JSX already applies `className="ward-category-matrix-label"` directly on the `<td>`, so this selector's higher specificity overrides the bare `.ward-category-matrix td` rule's `text-align: right` without needing `!important`, keeping this project's "0 `!important` in the stylesheet" discipline intact. Font sizes and padding use the token scale — no raw px — matching the fix applied to Task 2's CSS after review.)

- [ ] **Step 5: Run tests, verify pass**

Run: `cd frontend-react && npx vitest run --environment jsdom src/components/Charts.test.jsx -t "WardCategoryMatrix"`
Expected: both tests pass.

- [ ] **Step 6: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat: add WardCategoryMatrix component

Ward x category count table replacing 4 separate small bar-chart
cards — easier to scan as one table than 4 side-by-side charts, and
a table can show a genuinely honest all-zero row (no misleading chart
geometry the way a chart's empty case can be)."
```

---

### Task 6: Migrate Admin Overview (`OverviewSection.jsx`) — layout restructure + new components

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx`
- Modify: `frontend-react/src/styles.css`
- Modify: `frontend-react/src/pages/admin/OverviewSection.test.jsx`

**Interfaces:**
- Consumes: `TrendLineChart`, `CategoryBreakdown` (from Tasks 1-2); `StatCard` with `series`/`trendContext`/`seriesCaption` (from Task 3).
- Produces: nothing new for later tasks — this page's structure is not reused elsewhere.

- [ ] **Step 1: Update imports and the KPI array**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, replace the import line (currently line 2):

```jsx
import { buildDailySeries, CategoryBreakdown, TrendLineChart } from '../../components/Charts.jsx';
```

Replace the `kpis` array (currently lines 53-66) — remove "Tổng số tin đăng" from it (it moves to the hero card built in Step 3), leaving 3 entries:

```jsx
  const kpis = [
    { icon: 'Users', title: 'Tổng số người dùng', value: users.length, tone: 'navy' },
    { icon: 'IdCard', title: 'Môi giới hoạt động', value: activeBrokers, tone: 'green', href: '#/admin/brokers' },
    { icon: 'CalendarCheck', title: 'Lịch hẹn xác nhận tháng này', value: confirmedViewingsThisMonth, tone: 'green' },
  ];
```

The `exportOverview` function (unchanged) still references `kpis` for the CSV export — this now exports 3 rows instead of 4, since "Tổng số tin đăng" is no longer in that array. Add it back into the CSV export explicitly so the report doesn't silently lose that metric — replace `exportOverview`'s body (currently lines 80-85):

```jsx
  const exportOverview = () => {
    const rows = [...kpis, { title: 'Tổng số tin đăng', value: filteredProperties.length }];
    downloadCsv('bao-cao-tong-quan.csv', rows.map((kpi) => ({ metric: kpi.title, value: kpi.value })), [
      { key: 'metric', label: 'Chỉ số' },
      { key: 'value', label: 'Giá trị' },
    ]);
  };
```

- [ ] **Step 2: Change the KPI grid from `grid-4` to `grid-3`**

Replace (currently line 111):

```jsx
      <div className="grid-4 dashboard-stats-row">
```

with:

```jsx
      <div className="grid-3 dashboard-stats-row">
```

- [ ] **Step 3: Replace the chart+donut row with the new 2-column hero cluster**

Replace the whole block from the `<div className="dashboard-charts-row">` through its closing `</div>` (currently lines 126-142) — this is the "Hoạt động hệ thống theo tháng" + "Phân bổ theo danh mục" row:

```jsx
      <div className="dashboard-hero-row">
        <div className="dashboard-hero-col-narrow">
          <StatCard
            icon="Building"
            title="Tổng số tin đăng"
            value={filteredProperties.length}
            tone="navy"
            trend={prevProperties ? { value: `${percentDelta(filteredProperties.length, prevProperties.length) >= 0 ? '▲' : '▼'} ${Math.abs(percentDelta(filteredProperties.length, prevProperties.length))}%`, direction: percentDelta(filteredProperties.length, prevProperties.length) >= 0 ? 'up' : 'down' } : undefined}
            trendContext="so với kỳ trước"
            series={totalListingsSparkline}
            seriesCaption="7 ngày gần nhất"
          />
          <CategoryBreakdown
            title="Phân bổ theo danh mục"
            data={categoryDistributionData}
            totalLabel="Tổng cộng"
          />
        </div>
        <div className="dashboard-hero-col-wide">
          <TrendLineChart
            title="Hoạt động hệ thống theo tháng"
            subtitle="Tin đăng mới và lịch hẹn đã xác nhận, tính từ khi có dữ liệu thực tế"
            data={systemActivityData}
            currentLabel="Tin đăng"
            previousLabel="Lịch hẹn xác nhận"
          />
          <AuditTimeline items={recentAuditItems} />
        </div>
      </div>
```

(`percentDelta` is already imported at the top of this file, line 6 — no new import needed. The `trend`/`trendContext` computation duplicates `percentDelta(...)` twice inline for direction-sign formatting; this matches the existing codebase's own inline style for `kpi.trend` elsewhere in this same file rather than introducing a new helper for one call site.)

- [ ] **Step 4: Move "Tình trạng hệ thống" to its own full-width row below the hero cluster**

Replace the trailing `<div className="dashboard-panels-row">...</div>` block (currently lines 144-155, which held `AuditTimeline` + "Tình trạng hệ thống" side by side — `AuditTimeline` moved into the hero cluster's wide column in Step 3, so this block now needs to hold only "Tình trạng hệ thống", full-width):

```jsx
      <DashboardPanel title="Tình trạng hệ thống" count={`${filteredProperties.length} tin trong bộ lọc`}>
        <div className="dashboard-system-lines">
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tổng bài đăng</span><span className="dashboard-system-line-value">{properties.length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Bài đăng đang hiển thị</span><span className="dashboard-system-line-value">{visibleCount}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Môi giới được cấp</span><span className="dashboard-system-line-value">{brokers.length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Lịch hẹn chờ</span><span className="dashboard-system-line-value">{viewings.filter((viewing) => viewing.status === 'PENDING').length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tài khoản bị khóa</span><span className="dashboard-system-line-value">{users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length}</span></div>
        </div>
      </DashboardPanel>
```

(Content of "Tình trạng hệ thống" is byte-for-byte unchanged from before — only its wrapper changed from being the 2nd child of `dashboard-panels-row` to a standalone top-level panel.)

- [ ] **Step 5: Add `dashboard-hero-row` CSS**

Add to `frontend-react/src/styles.css`, near the other `dashboard-*-row` grid classes (search for `.dashboard-panels-row` to find the right neighborhood):

```css
.dashboard-hero-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 20px;
  margin-bottom: 24px;
}

.dashboard-hero-col-narrow,
.dashboard-hero-col-wide {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

@media (max-width: 1024px) {
  .dashboard-hero-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 6: Update the existing test for the removed "Tổng số tin đăng" KPI-row assertion**

Read `frontend-react/src/pages/admin/OverviewSection.test.jsx`'s test `'Tổng số tin đăng KPI value narrows when a date preset excludes older listings'` (queries `screen.getByRole('link', { name: /Tổng số tin đăng/ })`). This link still exists — it moved from the KPI grid into the new hero `StatCard`, and `StatCard` without `href` doesn't render as a link... check: does the hero `StatCard` call in Step 3 pass `href`? It does not (`filteredProperties.length` card has no `href` prop) — the *old* KPI array entry for "Tổng số tin đăng" had `href: '#/admin/properties'`, which is now dropped since it moved out of the KPI grid into the hero card. This breaks that test's `getByRole('link', ...)` query. Fix: add `href="#/admin/properties"` to the hero `StatCard` in Step 3 (edit Step 3's JSX to include it) so the link behavior is preserved, not silently dropped:

```jsx
          <StatCard
            icon="Building"
            title="Tổng số tin đăng"
            value={filteredProperties.length}
            tone="navy"
            href="#/admin/properties"
            trend={...}
            trendContext="so với kỳ trước"
            series={totalListingsSparkline}
            seriesCaption="7 ngày gần nhất"
          />
```

With `href` preserved, the existing test should still pass unmodified — run it to confirm in Step 8 before assuming.

- [ ] **Step 7: Update the test asserting `grid-5`/KPI count** (if any)

Read through `OverviewSection.test.jsx`'s test `'renders KPI cards, filter bar, and quick actions'` — it uses `getByText`/`getByRole` queries, not class-based ones, so it should be unaffected. No edit expected here — confirm by running tests in Step 8.

- [ ] **Step 8: Run the OverviewSection tests**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx`
Expected: all 6 existing tests pass. If the "Tổng số tin đăng" link test still fails after Step 6's fix, read the actual DOM output the test framework prints and adjust — this is the one place in this task where the exact fix depends on real test output, not knowable purely from static reading.

- [ ] **Step 9: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures.

- [ ] **Step 10: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/styles.css frontend-react/src/pages/admin/OverviewSection.test.jsx
git commit -m "feat: restructure admin overview into the approved hero-cluster layout

KPI row drops to 3 cards (grid-3); 'Tổng số tin đăng' becomes the
hero StatCard in a new 2-column cluster (narrow: hero KPI + category
breakdown, wide: trend chart + audit log), matching the approved
visual-companion mockup. 'Tình trạng hệ thống' moves to its own
full-width row below."
```

---

### Task 7: Migrate Broker Dashboard (`BrokerDashboard.jsx`) — reskin only

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`

**Interfaces:**
- Consumes: `TrendLineChart`, `CategoryBreakdown` (Tasks 1-2); `StatCard` with `series`/`trendContext`/`seriesCaption` (Task 3).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Update the import line**

Replace (currently lines 3-5):

```jsx
import {
  buildDailySeries, buildWardData, CategoryBreakdown, TrendLineChart,
} from '../components/Charts.jsx';
```

- [ ] **Step 2: Swap the hero `StatCard` to the new bar-sparkline treatment**

Replace (currently line 543):

```jsx
                <StatCard icon="Building" title="Tin đăng đang hoạt động" value={dashboardStats.activeListings} tone="navy" trend={trendFor(activeListingsDelta)} series={activeListingsSparkline} />
```

with:

```jsx
                <StatCard icon="Building" title="Tin đăng đang hoạt động" value={dashboardStats.activeListings} tone="navy" trend={trendFor(activeListingsDelta)} trendContext="so với kỳ trước" series={activeListingsSparkline} seriesCaption="7 ngày gần nhất" />
```

(`trendFor` is the existing local helper at line 198 — unchanged, still returns `{value, direction}` or `undefined`.)

- [ ] **Step 3: Swap `TrendBarLineChart` → `TrendLineChart` for the daily activity chart**

Replace (currently lines 549-555):

```jsx
                  <TrendLineChart
                    title="Hoạt động môi giới theo ngày"
                    subtitle={`Số bài đăng mới và lịch hẹn đã xác nhận theo từng ngày trong tháng ${activityMonthLabel}`}
                    data={activityChartData}
                    currentLabel="Bài đăng"
                    previousLabel="Lịch hẹn xác nhận"
                  />
```

- [ ] **Step 4: Swap `WardBarChart` → `CategoryBreakdown` for the ward chart, remapping `count`→`value`**

Replace (currently line 564):

```jsx
                  <CategoryBreakdown title="Tin đăng theo phường" data={wardChart.map((ward) => ({ label: ward.label.replace('Phường ', ''), value: ward.count }))} totalLabel="Tổng cộng" />
```

- [ ] **Step 5: Swap `ThreeDDonutChart` → `CategoryBreakdown` for the type breakdown**

Replace (currently lines 566-572):

```jsx
                <CategoryBreakdown
                  title="Loại hình BĐS đang quản lý"
                  subtitle="Trọ, nhà và đất đang quản lý"
                  data={managedTypeData}
                  totalLabel="Tổng cộng"
                />
```

(`managedTypeData` already returns `{label, value}` — no remapping needed here, unlike `wardChart`.)

- [ ] **Step 6: Update tests that reference the old component names or DOM structure**

Run the broker dashboard test files first to find what breaks, rather than guessing:

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/BrokerDashboard.test.jsx src/pages/BrokerDashboard.activity.test.jsx src/pages/BrokerDashboard.dailyActivity.test.jsx 2>&1 | head -100`

Read the failure output. Tests that query by visible text/role (chart titles, KPI values, "Chưa có dữ liệu..." empty state) should keep passing unchanged. Tests that assert specific old CSS classes (e.g. `.combo-bar`, `.chart3d-donut`) or old component internals will fail — fix each by updating the assertion to the new component's equivalent output (e.g. `.category-breakdown-row` instead of `.combo-bar-group`, `.trend-line-hit`/`.trend-line-svg` instead of `.combo-svg`). The exact set of breakages depends on real test output — do not guess blind; read the actual failure messages and fix each one to test the same underlying behavior against the new markup.

- [ ] **Step 7: Run the full broker dashboard test suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/BrokerDashboard.test.jsx src/pages/BrokerDashboard.activity.test.jsx src/pages/BrokerDashboard.dailyActivity.test.jsx`
Expected: all pass after Step 6's fixes.

- [ ] **Step 8: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures.

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.test.jsx frontend-react/src/pages/BrokerDashboard.activity.test.jsx frontend-react/src/pages/BrokerDashboard.dailyActivity.test.jsx
git commit -m "feat: reskin broker dashboard charts with the new component set

TrendBarLineChart -> TrendLineChart, WardBarChart -> CategoryBreakdown,
ThreeDDonutChart (type breakdown) -> CategoryBreakdown, hero StatCard
gets the bar-sparkline treatment. Row/column structure unchanged —
broker dashboard had no layout bugs, only the chart visuals changed."
```

---

### Task 8: Migrate Admin Reports (`ReportsSection.jsx`) — reskin + consolidate

**Files:**
- Modify: `frontend-react/src/pages/admin/ReportsSection.jsx`

**Interfaces:**
- Consumes: `TrendLineChart`, `CategoryBreakdown`, `RankingList`, `WardCategoryMatrix` (Tasks 1, 2, 4, 5).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Update the import line**

Replace (currently lines 2-8):

```jsx
import {
  buildCategoryDensityData,
  buildWardData,
  CategoryBreakdown,
  RankingList,
  TrendLineChart,
  WardCategoryMatrix,
} from '../../components/Charts.jsx';
```

- [ ] **Step 2: Swap the "Tăng trưởng người dùng mới" chart and the "Phân bổ tin đăng theo khu vực" donut**

Replace the `<div className="dashboard-live-row">...</div>` block (currently lines 69-83):

```jsx
      <div className="dashboard-live-row">
        <TrendLineChart
          title="Tăng trưởng người dùng mới"
          subtitle="Tính từ khi có dữ liệu thực tế"
          data={userGrowthData}
          currentLabel="Người dùng mới"
          previousLabel="Kỳ trước"
        />
        <CategoryBreakdown
          title="Phân bổ tin đăng theo khu vực"
          subtitle="Theo các phường/khu vực đang có dữ liệu trong hệ thống"
          data={distributionData}
          totalLabel="Tổng cộng"
        />
      </div>
```

(Only the 2 chart components inside changed — the `dashboard-live-row` wrapper itself is untouched, per the spec's "no layout changes to ReportsSection.jsx" decision.)

- [ ] **Step 3: Replace the 4-card ward-density row with 1 `WardCategoryMatrix`**

Replace the `<div className="dashboard-ward-density-row">...</div>` block (currently lines 85-89):

```jsx
      <WardCategoryMatrix title="Mật độ tin theo phường" subtitle="Số lượng tin đăng theo từng danh mục, theo phường" wards={wardDensityData} />
```

(This removes the `dashboard-ward-density-row` wrapper entirely — `wardDensityData` is passed directly to the new component, unchanged from how it's computed at line 42-49.)

- [ ] **Step 4: Swap "Top môi giới theo hoạt động" from a trend chart to `RankingList`**

Replace (currently lines 91-103):

```jsx
      <div className="dashboard-charts-row">
        <div className="dashboard-chart-span-2">
          <RankingList
            title="Top môi giới theo hoạt động"
            subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
            data={topBrokerData}
            primaryLabel="tin đăng"
            secondaryLabel="lịch hẹn xác nhận"
          />
        </div>
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
      </div>
```

(`topBrokerData`'s shape — `{label, current, previous}` — is unchanged; only the component consuming it changed. `rotateLabels` is dropped since `RankingList` has no such prop — it was only ever needed for `TrendBarLineChart`'s long broker-name x-axis labels, which don't exist in a vertical ranked list.)

- [ ] **Step 5: Update tests**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/ReportsSection.test.jsx 2>&1 | head -100`

Read the failure output and fix each broken assertion the same way as Task 7 Step 6 — update queries that referenced old component internals (`.combo-bar`, `.chart3d-donut-layout`, `.dashboard-ward-density-row`) to the new equivalents (`.category-breakdown-row`, `.ranking-list-row`, `.ward-category-matrix`). Do not guess the exact diff — read real test output first.

- [ ] **Step 6: Run the full ReportsSection test suite**

Run: `cd frontend-react && npx vitest run --environment jsdom src/pages/admin/ReportsSection.test.jsx`
Expected: all pass after Step 5's fixes.

- [ ] **Step 7: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures.

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/pages/admin/ReportsSection.jsx frontend-react/src/pages/admin/ReportsSection.test.jsx
git commit -m "feat: reskin admin reports charts, consolidate ward density into 1 table

TrendBarLineChart -> TrendLineChart (user growth), ThreeDDonutChart ->
CategoryBreakdown (ward distribution), 4 separate CategoryBarChart
density cards -> 1 WardCategoryMatrix table, 'Top môi giới theo hoạt
động' -> RankingList (it was never real time-series data — a line
chart was the wrong chart type for a 6-item ranking, independent of
visual styling)."
```

---

### Task 9: Delete dead chart code

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing — pure deletion, verified safe by grep before removing anything.

- [ ] **Step 1: Confirm every old component has zero remaining call sites**

Run: `cd frontend-react && for name in TrendBarLineChart ThreeDDonutChart WardBarChart CategoryBarChart DonutChart BarChart ThreeDAreaChart HorizontalBarChart TrendAreaChart GaugeChart; do echo "== $name =="; grep -rn "<$name" src/pages src/components --include="*.jsx" | grep -v "Charts.jsx:\|.test.jsx:"; done`
Expected: empty output for every name (Tasks 6-8 already removed the 4 real call sites; the other 6 were already dead before this plan started).

- [ ] **Step 2: Delete the 10 component functions and their now-unused support code from `Charts.jsx`**

Delete, in full: `DonutChart`, `BarChart`, `ChartModeToggle`, `ThreeDChartPanel`, `conicGradientFor`, `DONUT_HIT_R`/`DONUT_HIT_STROKE`, `donutSegments`, `ThreeDDonutChart`, `ThreeDAreaChart`, `HorizontalBarChart`, `TrendAreaChart` (the whole component, including its own `linePathFor`/`tooltipLeftPct` — **check first** whether those 2 helpers are still used by anything else before deleting them, since `linePathFor` is also used by `Sparkline` and `TrendAreaChart`'s own removal must not take `linePathFor` down with it if `Sparkline` still needs it), `WardBarChart`, `CategoryBarChart`, `TrendBarLineChart`, `GaugeChart`.

Run this check before deleting `linePathFor`/`tooltipLeftPct`/`formatShortDate`/`formatChartNumber`/`Legend`/`withColors`:

Run: `cd frontend-react && for name in linePathFor tooltipLeftPct formatShortDate formatChartNumber Legend withColors; do echo "== $name =="; grep -n "$name(" src/components/Charts.jsx; done`

Keep any helper that still has a caller after the 10 components above are gone (expected survivors: `linePathFor` — still used by `Sparkline`; `Legend`/`withColors`/`formatChartNumber` — only used by the now-deleted `DonutChart`/`ThreeDDonutChart`/`ThreeDAreaChart`, safe to delete; `formatShortDate` — only used by the now-deleted `TrendAreaChart`/`ThreeDAreaChart`, safe to delete; `tooltipLeftPct` — only used by the now-deleted `TrendAreaChart`, safe to delete). Confirm this against the actual grep output from this step, not from memory — the exact survivor set is what the grep says, not what this plan predicts.

Also delete now-unused constants if their only readers were in the deleted components: `TRACK_COLOR` (**check first** — still used by `WardBarChart`/`CategoryBarChart`/`TrendBarLineChart` before their deletion, but also check `TrendLineChart`/`CategoryBreakdown`/`RankingList`/`WardCategoryMatrix` from Tasks 1-5 don't reference it — if none of the new components use `TRACK_COLOR`, delete it too; if `TrendLineChart` still references it for its baseline `<line>`, keep it). `CHART_PALETTE` — **check first**: none of the 5 new components use `CHART_PALETTE` (they all use `var(--color-primary)`/`color-mix` directly per the spec's monochrome decision) — safe to delete once the last old-component reader is gone. Per the spec's explicit "Ngoài phạm vi" note, do **not** feel obligated to also delete the `--chart-1..6` CSS custom properties in `styles.css` — leaving unused tokens there is explicitly low-risk/low-value per the spec, skip it.

- [ ] **Step 3: Remove now-obsolete tests from `Charts.test.jsx`**

Delete every test block for the 10 removed components (search for `test('DonutChart`, `test('BarChart`, `test('ThreeDDonutChart`, `test('ThreeDAreaChart`, `test('HorizontalBarChart`, `test('TrendAreaChart`, `test('WardBarChart`, `test('CategoryBarChart`, `test('TrendBarLineChart`, `test('GaugeChart` to find every block). Update the top-of-file import statement to remove the deleted names, keeping only what's still exported and used by remaining tests (the 5 new components from Tasks 1-5, plus any surviving helpers confirmed in Step 2 — e.g. `Sparkline`, `buildWardData`, `buildCategoryDensityData`, `buildDailySeries`, `buildMonthlySeries` are all still exported and still have their own tests, keep those).

- [ ] **Step 4: Run the full suite**

Run: `cd frontend-react && npm test -- --run`
Expected: no failures, no import errors (an import of a since-deleted name would throw at module-load time, not just fail one test — treat any red here as a signal something in Step 2/3 was cut too aggressively).

- [ ] **Step 5: Build the project to catch any remaining reference the test suite doesn't exercise**

Run: `cd frontend-react && npm run build`
Expected: build succeeds with no errors (Vite's bundler will fail loudly on an import of a name that no longer exists, even in code paths tests don't cover).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "chore: remove 10 chart components superseded by the 2026 redesign

DonutChart, BarChart, ThreeDAreaChart, HorizontalBarChart,
TrendAreaChart, GaugeChart were already dead code before this plan.
ThreeDDonutChart, TrendBarLineChart, WardBarChart, CategoryBarChart
were replaced at every call site across Tasks 6-8. Verified via grep
+ full build that nothing still references any of them."
```

---

### Task 10: Visual verification — all 3 pages, light + dark

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Start the dev server**

Run (background): `cd frontend-react && npm run dev`
Expected: server on `http://localhost:5173`.

- [ ] **Step 2: Screenshot all 3 pages**

Using the project's established Puppeteer verification pattern (`puppeteer-core` + system Chrome, session seeded via `page.evaluateOnNewDocument` before first navigation), capture:
- `/#/admin/overview` — light and dark
- `/#/broker/dashboard` — light and dark
- `/#/admin/reports` — light and dark

- [ ] **Step 3: Check against the approved mockup and the spec's requirements**

For admin overview specifically, compare against `.superpowers/brainstorm/75627-1784365311/content/chart-combined-mockup-v5.html` (the approved final mockup) — confirm:
- Hero KPI card + category breakdown in the narrow left column, trend chart + audit log in the wide right column.
- Trend line's date labels align exactly under their data points (this was the exact bug the mockup process caught and fixed — verify the real component doesn't reintroduce it).
- Category breakdown bars are shades of the same green, not a rainbow of hues.
- No 3D-toggle button anywhere on any of the 3 pages.

For broker dashboard and admin reports, confirm:
- Row/column structure looks unchanged from before this plan (only the charts inside look different).
- `WardCategoryMatrix` (admin reports) renders as one table, not 4 separate cards.
- `RankingList` (admin reports, "Top môi giới theo hoạt động") renders as a numbered list, not a line chart.

- [ ] **Step 4: Report findings**

If any visual issue is found, fix it before considering this plan complete — this is the acceptance gate for the whole plan, per `verification-before-completion`.
