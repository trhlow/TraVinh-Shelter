# Combo-chart rollout, Phase 2: single-axis TrendBarLineChart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 4 remaining live usages of `ThreeDGroupedBarChart` with a new single-axis combo bar+line component (`TrendBarLineChart`), then delete `ThreeDGroupedBarChart` and its exclusive CSS.

**Architecture:** `TrendBarLineChart` renders `current` as bars and `previous` as a connecting line+dots, both scaled to one shared left axis (`axisMax` = real max across both series — no fixed 0-100 range, unlike the pilot/Phase 1's percent axis). It reuses `COMBO_CHART_PLOT`/`COMBO_CHART_TICK_PERCENTS`/`comboChartTickY`/`CHART_PALETTE`/`TRACK_COLOR` from `Charts.jsx` and the existing `.combo-svg`/`.combo-bar`/`.combo-chart-legend*` CSS — no new CSS needed. When every `previous` value is falsy (the "Tăng trưởng người dùng mới" case), the line/dots/second legend item are omitted entirely and only bars render. Task 1 builds and tests the component in isolation; Task 2 swaps the 4 call sites; Task 3 deletes the now-dead `ThreeDGroupedBarChart` function and its exclusive CSS.

**Tech Stack:** React 19 (JSX-as-SVG), Vitest + Testing Library.

## Global Constraints

- No new CSS — reuse `.combo-svg`, `.combo-bar`, `.combo-chart-legend`, `.combo-chart-legend-item`, `.combo-chart-legend-swatch`, `.combo-chart-legend-line`, `.chart3d-header`, `.chart3d-subtitle`, `.chart-panel`, `.chart-title` (all already defined in `frontend-react/src/styles/dashboard.css`).
- `TrendBarLineChart` must accept the exact same props `ThreeDGroupedBarChart` currently receives at all 4 call sites: `{ title, subtitle, data, currentLabel, previousLabel }` (data shape: `[{label, current, previous}]`). Do not rename any of these props.
- The chart's outer SVG must carry `role="img"` and `aria-label={title}` — 4 existing page-level tests (`BrokerDashboard.activity.test.jsx:26`, `OverviewSection.test.jsx:50`, `ReportsSection.test.jsx:61`, `ReportsSection.test.jsx:69`) locate the chart via `screen.getByRole('img', { name: '<title>' })` then read month labels from inside it with `within(stage).getAllByText(/^T\d{1,2}$/)`.
- No hard-coded `#hex` colors — only `CHART_PALETTE`/`TRACK_COLOR`/CSS variables, consistent with the rest of `Charts.jsx`.
- No `inline style` except the existing pattern already used elsewhere in this file for `backgroundColor` swatches (`style={{ backgroundColor: ... }}` on legend swatch/line spans) — this matches `WardBarChart`/`CategoryBarChart` exactly, not a new exception.
- Run frontend tests with `cd frontend-react && npm test -- --run` (whole suite) or `npx vitest run <file>` (single file). Baseline before this plan: 143/143 passing.

---

### Task 1: Add `TrendBarLineChart` component and its unit tests

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (add `TrendBarLineChart` function after `CategoryBarChart`, i.e. after line 721, before the `GaugeChart` JSDoc comment at line 723)
- Modify: `frontend-react/src/components/Charts.test.jsx` (add new tests after the `CategoryBarChart` tests, i.e. after line 285)

**Interfaces:**
- Consumes: `COMBO_CHART_PLOT`, `COMBO_CHART_TICK_PERCENTS`, `comboChartTickY`, `CHART_PALETTE`, `TRACK_COLOR` (all module-level in `Charts.jsx`, already defined at lines 5-9 and 524-530).
- Produces: `export function TrendBarLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh' })` — used by Task 2's page-level swaps.

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/components/Charts.test.jsx`, add this import to the existing import block at the top of the file (replace the current import statement):

```javascript
import {
  buildDailySeries, buildMonthlySeries, buildWardData, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart, TrendBarLineChart,
} from './Charts.jsx';
```

Then add this block after the `CategoryBarChart scales bar height...` test (after line 285, i.e. at the end of the file):

```javascript

// ── TrendBarLineChart ─────────────────────────────────────

test('TrendBarLineChart renders title, subtitle, and one bar per data point scaled to the real combined max', () => {
  const data = [
    { label: 'T1', current: 2, previous: 5 },
    { label: 'T2', current: 8, previous: 1 },
  ];
  const { container } = render(
    <TrendBarLineChart title="Hoạt động" subtitle="Theo tháng" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />,
  );

  expect(screen.getByRole('heading', { name: 'Hoạt động' })).toBeInTheDocument();
  expect(screen.getByText('Theo tháng')).toBeInTheDocument();

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // axisMax = max(2,5,8,1,1) = 8; plot height = 38-6 = 32
  // T1 current=2 -> 2/8*32=8; T2 current=8 -> 8/8*32=32
  expect(heights).toEqual([8, 32]);

  const dots = Array.from(container.querySelectorAll('circle'));
  const dotYs = dots.map((dot) => Number(dot.getAttribute('cy')));
  // T1 previous=5 -> y=38-5/8*32=18; T2 previous=1 -> y=38-1/8*32=34
  expect(dotYs).toEqual([18, 34]);

  expect(container.querySelector('.combo-chart-legend')).toHaveTextContent('Bài đăng');
  expect(container.querySelector('.combo-chart-legend')).toHaveTextContent('Lịch hẹn');
});

test('TrendBarLineChart exposes role=img with the title as its accessible name, and month labels are findable inside it', () => {
  const data = [
    { label: 'T5', current: 3, previous: 1 },
    { label: 'T6', current: 4, previous: 2 },
  ];
  render(<TrendBarLineChart title="Hoạt động môi giới theo tháng" data={data} />);

  const stage = screen.getByRole('img', { name: 'Hoạt động môi giới theo tháng' });
  expect(within(stage).getAllByText(/^T\d{1,2}$/)).toHaveLength(2);
});

test('TrendBarLineChart hides the line and second legend item when every previous value is 0', () => {
  const data = [
    { label: 'T1', current: 3, previous: 0 },
    { label: 'T2', current: 5, previous: 0 },
  ];
  const { container } = render(
    <TrendBarLineChart title="Test" data={data} currentLabel="Người dùng mới" previousLabel="Kỳ trước" />,
  );

  expect(container.querySelectorAll('circle')).toHaveLength(0);
  expect(container.querySelector('path[d]')).not.toBeInTheDocument();

  const legendItems = Array.from(container.querySelectorAll('.combo-chart-legend-item'));
  expect(legendItems).toHaveLength(1);
  expect(legendItems[0]).toHaveTextContent('Người dùng mới');

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // axisMax = max(3,0,5,0,1) = 5; plot height 32; T1: 3/5*32=19.2; T2: 5/5*32=32
  expect(heights[0]).toBeCloseTo(19.2);
  expect(heights[1]).toBe(32);
});
```

Also add `within` to the Testing Library import at the top of the file (it currently imports `cleanup, fireEvent, render, screen` — add `within`):

```javascript
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — `TrendBarLineChart` is not exported from `Charts.jsx` yet, so the import fails and all 3 new tests error out.

- [ ] **Step 3: Implement `TrendBarLineChart`**

In `frontend-react/src/components/Charts.jsx`, insert this function after the closing brace of `CategoryBarChart` (after line 721, before the `GaugeChart` JSDoc comment):

```javascript

/**
 * TrendBarLineChart — combo bar (current, left axis) + line (previous, same
 * left axis) for series where both values share one unit (e.g. two kinds of
 * counts). Unlike WardBarChart/CategoryBarChart's fixed 0-100 percent right
 * axis, this axis auto-scales to the real max of both series combined. When
 * every `previous` value is 0 (no real comparison data), the line, its dots,
 * and its legend entry are omitted — only bars render.
 */
export function TrendBarLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh' }) {
  const { left, right, top, bottom } = COMBO_CHART_PLOT;
  const hasPrevious = data.some((point) => point.previous);
  const axisMax = Math.max(...data.flatMap((point) => [point.current || 0, point.previous || 0]), 1);
  const columnWidth = (right - left) / data.length;
  const barWidth = columnWidth * 0.4;
  const barColor = CHART_PALETTE[0];
  const lineColor = CHART_PALETTE[4];

  const points = data.map((point, index) => {
    const columnCenterX = left + columnWidth * (index + 0.5);
    const barTopY = bottom - ((point.current || 0) / axisMax) * (bottom - top);
    const lineY = bottom - ((point.previous || 0) / axisMax) * (bottom - top);
    return {
      point,
      columnCenterX,
      barLeftX: columnCenterX - barWidth / 2,
      barTopY,
      barHeight: bottom - barTopY,
      lineY,
    };
  });

  const linePath = `M${points.map((p) => `${p.columnCenterX},${p.lineY}`).join(' L')}`;
  const ticks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: Math.round((axisMax * pct) / 100),
  }));

  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <svg className="combo-svg" viewBox="0 0 100 50" preserveAspectRatio="none" role="img" aria-label={title}>
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />

        {ticks.map((tick) => (
          <text key={`left-${tick.y}`} x={left - 1.5} y={tick.y + 1} textAnchor="end" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}

        {points.map((p) => (
          <rect className="combo-bar" key={p.point.label} x={p.barLeftX} y={p.barTopY} width={barWidth} height={p.barHeight} fill={barColor} />
        ))}

        {hasPrevious && <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.6" />}
        {hasPrevious && points.map((p) => (
          <circle key={`dot-${p.point.label}`} cx={p.columnCenterX} cy={p.lineY} r="1" fill={lineColor} />
        ))}

        {points.map((p) => (
          <text key={`x-label-${p.point.label}`} x={p.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {p.point.label}
          </text>
        ))}
      </svg>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-swatch" style={{ backgroundColor: barColor }} />
          {currentLabel}
        </span>
        {hasPrevious && (
          <span className="combo-chart-legend-item">
            <span className="combo-chart-legend-line" style={{ backgroundColor: lineColor }} />
            {previousLabel}
          </span>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — all tests, including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "feat(charts): add single-axis TrendBarLineChart combo bar+line component"
```

---

### Task 2: Swap the 4 call sites from `ThreeDGroupedBarChart` to `TrendBarLineChart`

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx:3,506-512`
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx:2,115-121`
- Modify: `frontend-react/src/pages/admin/ReportsSection.jsx:2-8,70-76,92-98`

**Interfaces:**
- Consumes: `TrendBarLineChart` from Task 1 (`frontend-react/src/components/Charts.jsx`), props `{ title, subtitle, data, currentLabel, previousLabel }`.

- [ ] **Step 1: Swap `BrokerDashboard.jsx`**

In `frontend-react/src/pages/BrokerDashboard.jsx`, change the import at line 3:

```javascript
  buildDailySeries, buildWardData, ThreeDDonutChart, ThreeDFunnelChart, ThreeDGroupedBarChart, WardBarChart,
```

to:

```javascript
  buildDailySeries, buildWardData, ThreeDDonutChart, ThreeDFunnelChart, TrendBarLineChart, WardBarChart,
```

Then change the JSX at lines 506-512 from:

```javascript
                <ThreeDGroupedBarChart
                  title="Hoạt động môi giới theo tháng"
                  subtitle="Số bài đăng mới và lịch hẹn đã xác nhận theo từng tháng, tính từ khi có dữ liệu thực tế"
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
```

to:

```javascript
                <TrendBarLineChart
                  title="Hoạt động môi giới theo tháng"
                  subtitle="Số bài đăng mới và lịch hẹn đã xác nhận theo từng tháng, tính từ khi có dữ liệu thực tế"
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
```

- [ ] **Step 2: Swap `OverviewSection.jsx`**

In `frontend-react/src/pages/admin/OverviewSection.jsx`, change the import at line 2:

```javascript
import { buildDailySeries, ThreeDGroupedBarChart } from '../../components/Charts.jsx';
```

to:

```javascript
import { buildDailySeries, TrendBarLineChart } from '../../components/Charts.jsx';
```

Then change the JSX at lines 115-121 from:

```javascript
        <ThreeDGroupedBarChart
          title="Hoạt động hệ thống theo tháng"
          subtitle="Tin đăng mới và lịch hẹn đã xác nhận, tính từ khi có dữ liệu thực tế"
          data={systemActivityData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
```

to:

```javascript
        <TrendBarLineChart
          title="Hoạt động hệ thống theo tháng"
          subtitle="Tin đăng mới và lịch hẹn đã xác nhận, tính từ khi có dữ liệu thực tế"
          data={systemActivityData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
```

- [ ] **Step 3: Swap both usages in `ReportsSection.jsx`**

In `frontend-react/src/pages/admin/ReportsSection.jsx`, change the import at lines 2-8:

```javascript
import {
  buildCategoryDensityData,
  buildWardData,
  CategoryBarChart,
  ThreeDDonutChart,
  ThreeDGroupedBarChart,
} from '../../components/Charts.jsx';
```

to:

```javascript
import {
  buildCategoryDensityData,
  buildWardData,
  CategoryBarChart,
  ThreeDDonutChart,
  TrendBarLineChart,
} from '../../components/Charts.jsx';
```

Then change the JSX at lines 70-76 from:

```javascript
        <ThreeDGroupedBarChart
          title="Tăng trưởng người dùng mới"
          subtitle="Tính từ khi có dữ liệu thực tế"
          data={userGrowthData}
          currentLabel="Người dùng mới"
          previousLabel="Kỳ trước"
        />
```

to:

```javascript
        <TrendBarLineChart
          title="Tăng trưởng người dùng mới"
          subtitle="Tính từ khi có dữ liệu thực tế"
          data={userGrowthData}
          currentLabel="Người dùng mới"
          previousLabel="Kỳ trước"
        />
```

And change the JSX at lines 92-98 from:

```javascript
        <ThreeDGroupedBarChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
```

to:

```javascript
        <TrendBarLineChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
```

- [ ] **Step 4: Run the affected page-level test files**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/pages/BrokerDashboard.activity.test.jsx src/pages/admin/OverviewSection.test.jsx src/pages/admin/ReportsSection.test.jsx`
Expected: PASS — these tests locate the chart via `getByRole('img', { name: '<title>' })`, which `TrendBarLineChart`'s `<svg role="img" aria-label={title}>` satisfies identically to the old `ThreeDGroupedBarChart`'s `.chart3d-bar-stage`.

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 143 existing + 3 new from Task 1 = 146/146.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/ReportsSection.jsx
git commit -m "refactor(charts): switch monthly/broker activity charts to TrendBarLineChart"
```

---

### Task 3: Delete `ThreeDGroupedBarChart` and its exclusive CSS

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (delete the `ThreeDGroupedBarChart` function at lines 173-212)
- Modify: `frontend-react/src/styles/dashboard.css` (delete lines 76-193, and the media-query override at lines 366-368)

**Interfaces:**
- No interfaces produced — this is pure deletion of now-dead code. Grep-verified in Task 2's completion that no file references `ThreeDGroupedBarChart` anymore.

- [ ] **Step 1: Confirm no remaining references**

Run: `cd "d:/TraVinh Shelter/frontend-react" && grep -rn "ThreeDGroupedBarChart" src/`
Expected: only one match — the function's own definition in `src/components/Charts.jsx` (the export line and its closing brace). If any other file still references it, stop and re-check Task 2's edits before proceeding.

- [ ] **Step 2: Delete the `ThreeDGroupedBarChart` function**

In `frontend-react/src/components/Charts.jsx`, delete this entire function (currently at lines 173-212, directly after `formatChartNumber` and before `conicGradientFor`):

```javascript
export function ThreeDGroupedBarChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh', valueSuffix = '' }) {
  const [mode, setMode] = useState('3d');
  const max = Math.max(...data.flatMap((item) => [item.current || 0, item.previous || 0]), 1);

  return (
    <ThreeDChartPanel title={title} subtitle={subtitle} mode={mode} onModeChange={setMode}>
      <div className="chart3d-bar-legend">
        <span><i className="chart3d-legend-dot chart3d-current-dot" />{currentLabel}</span>
        <span><i className="chart3d-legend-dot chart3d-previous-dot" />{previousLabel}</span>
      </div>
      <div className="chart3d-bar-stage" role="img" aria-label={title}>
        {data.map((item) => (
          <div className="chart3d-bar-group" key={item.label}>
            <div className="chart3d-bar-stack">
              <span
                className="chart3d-bar chart3d-bar-previous"
                style={{
                  '--bar-h': Math.max(6, ((item.previous || 0) / max) * 100),
                  '--bar-color': 'var(--chart-6)',
                }}
              >
                <span className="chart3d-bar-value">{formatChartNumber(item.previous || 0, valueSuffix)}</span>
              </span>
              <span
                className="chart3d-bar chart3d-bar-current"
                style={{
                  '--bar-h': Math.max(6, ((item.current || 0) / max) * 100),
                  '--bar-color': item.color || 'var(--chart-1)',
                }}
              >
                <span className="chart3d-bar-value">{formatChartNumber(item.current || 0, valueSuffix)}</span>
              </span>
            </div>
            <span className="chart3d-axis-label">{item.label}</span>
          </div>
        ))}
      </div>
    </ThreeDChartPanel>
  );
}

```

(Leave `formatChartNumber` itself in place — it's still used by `ThreeDDonutChart` and `ThreeDFunnelChart`.)

- [ ] **Step 3: Delete the exclusive CSS**

In `frontend-react/src/styles/dashboard.css`, delete lines 76-193 (from `.chart3d-bar-legend {` through the end of the `.chart3d-axis-label {}` block, i.e. everything between `.chart-mode-btn.is-active {}` and `.chart3d-donut-layout {}`):

```css
.chart3d-bar-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 0 0 14px;
}

.chart3d-bar-legend span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--color-muted);
}

.chart3d-legend-dot {
  width: 11px;
  height: 11px;
  border-radius: 3px;
}

.chart3d-current-dot { background: var(--chart-1); }
.chart3d-previous-dot { background: var(--chart-6); }

.chart3d-bar-stage {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(46px, 1fr);
  gap: 12px;
  min-height: 230px;
  overflow-x: auto;
  padding: 22px 6px 0;
  border-radius: 14px;
  background:
    linear-gradient(to top, var(--color-hairline-soft) 1px, transparent 1px) 0 0 / 100% 25%,
    linear-gradient(180deg, rgb(255 255 255 / 0.7), transparent 48%);
}

.chart3d-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 46px;
}

.chart3d-bar-stack {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  height: 170px;
  width: 100%;
}

.chart3d-bar {
  --bar-h: 20;
  --bar-color: var(--chart-1);
  position: relative;
  display: block;
  width: 18px;
  height: calc(var(--bar-h) * 1%);
  min-height: 10px;
  border-radius: 7px 7px 3px 3px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.34), rgb(255 255 255 / 0) 42%),
    var(--bar-color);
  box-shadow: inset 0 -10px 14px -12px rgb(0 0 0 / 0.46);
}

.chart3d-panel.is-3d .chart3d-bar::before,
.chart3d-panel.is-3d .chart3d-bar::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.chart3d-panel.is-3d .chart3d-bar::before {
  left: 5px;
  right: -7px;
  top: -7px;
  height: 8px;
  border-radius: 7px 7px 2px 2px;
  background: color-mix(in srgb, var(--bar-color), #fff 24%);
  transform: skewX(-42deg);
  transform-origin: left bottom;
}

.chart3d-panel.is-3d .chart3d-bar::after {
  right: -8px;
  top: -1px;
  width: 8px;
  height: 100%;
  border-radius: 0 5px 3px 0;
  background: color-mix(in srgb, var(--bar-color), #000 18%);
  transform: skewY(-42deg);
  transform-origin: left top;
}

.chart3d-bar-value {
  position: absolute;
  left: 50%;
  top: -24px;
  transform: translateX(-50%);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-ink);
  white-space: nowrap;
}

.chart3d-axis-label {
  min-height: 32px;
  font-size: 12px;
  line-height: 1.25;
  text-align: center;
  color: var(--color-muted);
}

```

Then delete this block from inside the `@media (max-width: 760px)` rule (currently at lines 366-368):

```css
  .chart3d-bar-stage {
    grid-auto-columns: minmax(58px, 1fr);
  }

```

(Leave the rest of that media query — `.chart3d-header { flex-direction: column; }` and `.chart3d-donut-layout { grid-template-columns: 1fr; }` — untouched; both are still used by live components.)

- [ ] **Step 4: Run the full suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 146/146 (no tests removed or added in this task, pure deletion of unused code).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/styles/dashboard.css
git commit -m "chore(charts): remove dead ThreeDGroupedBarChart and its exclusive CSS"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: 146/146 passing (143 baseline + 3 new `TrendBarLineChart` tests).

Manually check in a browser once committed: run `cd frontend-react && npm run dev`, log in as a broker and check the broker dashboard's "Hoạt động môi giới theo tháng" chart, then log in as admin and check "Hoạt động hệ thống theo tháng", "Tăng trưởng người dùng mới" (should show bars only, no line — previous is always 0), and "Top môi giới theo hoạt động" (X-axis = broker names). Confirm bars and (where applicable) the connecting line both render correctly scaled to one shared axis, and that `ThreeDDonutChart`/`ThreeDFunnelChart`/`ThreeDAreaChart` elsewhere on the same pages still render with their 2D/3D toggle intact (unaffected by this plan).
