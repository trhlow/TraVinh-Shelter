# Combo-chart rollout, Phase 1: CategoryBarChart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the shared tick/label-rendering logic out of `WardBarChart` into reusable helpers, then rewrite `CategoryBarChart` as the same dual-axis bar+line combo chart style, and delete the now-fully-dead `.ward-bar-*` CSS.

**Architecture:** Task 1 is a pure refactor of `WardBarChart` (rename `WARD_*`/`ward-combo-*` identifiers to generic `COMBO_*`/`combo-*` names, extract the duplicated value-label JSX into a small internal `ComboValueLabel` component) with zero behavior change — existing tests keep passing throughout except one selector update. Task 2 rewrites `CategoryBarChart` to use those now-shared helpers for the same bar(count, left axis)+line(percent, right axis) rendering `WardBarChart` already has, then deletes the old `.ward-bar-*` CSS since `CategoryBarChart` was its last consumer.

**Tech Stack:** React 19 (JSX-as-SVG), Vitest + Testing Library.

## Global Constraints

- No new files — all changes stay in `frontend-react/src/components/Charts.jsx`, `frontend-react/src/components/Charts.test.jsx`, and `frontend-react/src/styles/dashboard.css` (per spec: helpers extracted in-file, not a new module, since both consumers already live in `Charts.jsx`).
- No hard-coded `#hex` colors — only `CHART_PALETTE`/`TRACK_COLOR`.
- `CategoryBarChart`'s public props stay `{ title, data }` — no click/`onSelectWard`-equivalent feature added (not requested, YAGNI).
- `WardBarChart`'s public props and `aria-label` format stay unchanged — this plan only renames internal identifiers/CSS classes, not behavior.
- `CategoryBarChart`'s X-axis labels are NOT shortened (`item.label` used as-is — "Trọ"/"Nhà"/"Đất" have no prefix to strip, unlike `WardBarChart`'s `"Phường "` stripping).
- Run frontend tests with `cd frontend-react && npm test -- --run` (whole suite) or `npx vitest run <file>` (single file). Baseline before this plan: 143/143 passing.

---

### Task 1: Extract shared combo-chart helpers, refactor `WardBarChart` to use them

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (replace `WARD_COMBO_TICK_PERCENTS`/`WARD_COMBO_PLOT`/`wardComboTickY`/the `WardBarChart` function — currently lines 524-664 in the current file, starting at the `const WARD_COMBO_TICK_PERCENTS = ...` line through the end of `WardBarChart`'s closing `}`)
- Modify: `frontend-react/src/components/Charts.test.jsx` (update 1 selector in the existing `WardBarChart` test at line 68)
- Modify: `frontend-react/src/styles/dashboard.css` (rename 2 CSS class names)

**Interfaces:**
- Produces (for Task 2 to consume): `COMBO_CHART_TICK_PERCENTS` (array `[0,25,50,75,100]`), `COMBO_CHART_PLOT` (object `{left:10, right:90, top:6, bottom:38}`), `comboChartTickY(pct)` (function, returns Y coordinate for a tick percent), `ComboValueLabel({x, y, children})` (internal React component, not exported — both are module-scope identifiers usable by any function later in the same file, including `CategoryBarChart`).
- `WardBarChart({ title, data, onSelectWard })` — same exported signature as before.

- [ ] **Step 1: Update the one test that queries the old class name**

In `frontend-react/src/components/Charts.test.jsx`, in the test `'WardBarChart shows both the count value and the percent value for the same ward'` (line 60-71), change line 68 from:

```javascript
  const valueLabels = Array.from(container.querySelectorAll('.ward-combo-value-label')).map((node) => node.textContent);
```

to:

```javascript
  const valueLabels = Array.from(container.querySelectorAll('.combo-value-label')).map((node) => node.textContent);
```

- [ ] **Step 2: Run tests to verify this one fails, others still pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — only `'WardBarChart shows both the count value...'` fails (queries a class that doesn't exist yet); the other 2 `WardBarChart` tests and all `CategoryBarChart`/other tests still PASS (this task doesn't touch `CategoryBarChart` yet).

- [ ] **Step 3: Replace the constants, add `ComboValueLabel`, refactor `WardBarChart`**

In `frontend-react/src/components/Charts.jsx`, replace everything from the `const WARD_COMBO_TICK_PERCENTS = ...` line through the end of the `WardBarChart` function's closing `}` with:

```javascript
const COMBO_CHART_TICK_PERCENTS = [0, 25, 50, 75, 100];
const COMBO_CHART_PLOT = { left: 10, right: 90, top: 6, bottom: 38 };

function comboChartTickY(pct) {
  const { top, bottom } = COMBO_CHART_PLOT;
  return bottom - (pct / 100) * (bottom - top);
}

function ComboValueLabel({ x, y, children }) {
  return (
    <text className="combo-value-label" x={x} y={y} textAnchor="middle" fontSize="3.2" fontStyle="italic" fill="var(--color-ink)">
      {children}
    </text>
  );
}

/**
 * WardBarChart — combo bar (count, left axis) + line (percent, right axis)
 * per ward, one shared SVG coordinate system so the line always lines up
 * over each bar. Expects `data` from buildWardData so all 4 wards always
 * render.
 */
export function WardBarChart({ title, data, onSelectWard }) {
  const { left, right, top, bottom } = COMBO_CHART_PLOT;
  const leftMax = Math.max(...data.map((ward) => ward.count), 1);
  const columnWidth = (right - left) / data.length;
  const barWidth = columnWidth * 0.4;
  const barColor = CHART_PALETTE[0];
  const lineColor = CHART_PALETTE[4];

  const points = data.map((ward, index) => {
    const columnCenterX = left + columnWidth * (index + 0.5);
    const barTopY = bottom - (ward.count / leftMax) * (bottom - top);
    const lineY = bottom - (ward.pct / 100) * (bottom - top);
    return {
      ward,
      columnCenterX,
      barLeftX: columnCenterX - barWidth / 2,
      barTopY,
      barHeight: bottom - barTopY,
      lineY,
    };
  });

  const linePath = `M${points.map((point) => `${point.columnCenterX},${point.lineY}`).join(' L')}`;
  const leftTicks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: Math.round((leftMax * pct) / 100),
  }));
  const rightTicks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: pct,
  }));

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <svg className="combo-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={right} y1={top} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />

        {leftTicks.map((tick) => (
          <text key={`left-${tick.y}`} x={left - 1.5} y={tick.y + 1} textAnchor="end" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}
        {rightTicks.map((tick) => (
          <text key={`right-${tick.y}`} x={right + 1.5} y={tick.y + 1} textAnchor="start" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}

        {points.map((point) => (
          onSelectWard ? (
            <g
              key={point.ward.code}
              role="button"
              tabIndex={0}
              aria-label={`${point.ward.label}: ${point.ward.count} tin`}
              className="combo-bar-group"
              onClick={() => onSelectWard(point.ward.code)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectWard(point.ward.code);
                }
              }}
            >
              <rect className="combo-bar" x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
            </g>
          ) : (
            <rect className="combo-bar" key={point.ward.code} x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
          )
        ))}

        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.6" />
        {points.map((point) => (
          <circle key={`dot-${point.ward.code}`} cx={point.columnCenterX} cy={point.lineY} r="1" fill={lineColor} />
        ))}

        {points.map((point) => (
          <ComboValueLabel key={`bar-label-${point.ward.code}`} x={point.columnCenterX} y={point.barTopY - 1.5}>
            {point.ward.count}
          </ComboValueLabel>
        ))}
        {points.map((point) => (
          <ComboValueLabel key={`line-label-${point.ward.code}`} x={point.columnCenterX} y={point.lineY - 2}>
            {`${point.ward.pct}%`}
          </ComboValueLabel>
        ))}

        {points.map((point) => (
          <text key={`x-label-${point.ward.code}`} x={point.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {point.ward.label.replace('Phường ', '')}
          </text>
        ))}
      </svg>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-swatch" style={{ backgroundColor: barColor }} />
          Số tin đăng
        </span>
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-line" style={{ backgroundColor: lineColor }} />
          Tỉ lệ (%)
        </span>
      </div>
    </section>
  );
}
```

(Changes from the current code: `WARD_COMBO_TICK_PERCENTS`→`COMBO_CHART_TICK_PERCENTS`, `WARD_COMBO_PLOT`→`COMBO_CHART_PLOT`, `wardComboTickY`→`comboChartTickY`; new `ComboValueLabel` component replaces the 2 near-identical `<text className="ward-combo-value-label" ...>` blocks; `ward-combo-svg`→`combo-svg`, `ward-combo-bar-group`→`combo-bar-group`; both `<rect>` variants gain `className="combo-bar"` — new, needed so Task 2's height-scaling test can select bars reliably. No other logic changes — same math, same props, same `aria-label`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — all `WardBarChart` tests, all other tests in the file unaffected.

- [ ] **Step 5: Rename the 2 CSS classes**

In `frontend-react/src/styles/dashboard.css`, rename:
- `.ward-combo-svg` (currently at line ~1073) → `.combo-svg`
- `.ward-combo-bar-group` and `.ward-combo-bar-group:focus-visible` (currently at lines ~1108-1115) → `.combo-bar-group` and `.combo-bar-group:focus-visible`

Do not touch `.combo-chart-legend*` (already generically named, unchanged) or the `.ward-bar-*` block above them (still in use by `CategoryBarChart` until Task 2).

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 143/143 (pure rename/refactor, no new or removed tests in this task).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "refactor(charts): extract shared combo-chart helpers from WardBarChart"
```

---

### Task 2: Rewrite `CategoryBarChart` as a combo chart, delete dead `.ward-bar-*` CSS

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (replace the `CategoryBarChart` function — currently lines 666-698)
- Modify: `frontend-react/src/components/Charts.test.jsx` (update 2 of the 5 existing `CategoryBarChart` tests)
- Modify: `frontend-react/src/styles/dashboard.css` (delete the now-dead `.ward-bar-*` rule block)

**Interfaces:**
- Consumes (from Task 1): `COMBO_CHART_TICK_PERCENTS`, `COMBO_CHART_PLOT`, `comboChartTickY(pct)`, `ComboValueLabel({x, y, children})`, `CHART_PALETTE`, `TRACK_COLOR` — all already in scope in the same file, no import needed.
- Produces: `CategoryBarChart({ title, data })` — same exported signature and `data` shape (`[{slug, label, count, pct}]`) as before. No new exports.

- [ ] **Step 1: Update the 2 affected tests**

In `frontend-react/src/components/Charts.test.jsx`, replace the test `'CategoryBarChart renders title and one column per category with count and percent'` (lines 233-249) with:

```javascript
test('CategoryBarChart renders title and one column per category with count and percent', () => {
  const data = buildCategoryDensityData([
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
  ], 'phuong-tra-vinh');
  const { container } = render(<CategoryBarChart title="Mật độ tin — Phường Trà Vinh" data={data} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin — Phường Trà Vinh' })).toBeInTheDocument();
  expect(screen.getByText('Trọ')).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();
  const valueLabels = Array.from(container.querySelectorAll('.combo-value-label')).map((node) => node.textContent);
  expect(valueLabels).toContain('4'); // tro count
  expect(valueLabels).toContain('80%'); // 4/5
});
```

(Switched from `screen.getByText('4')`/`screen.getByText('80%')` to a `.combo-value-label`-scoped query for the count, because after this task's rewrite, the left axis renders its own tick numbers — with this test's data, `leftMax = 4` and the tick set is `[0, 1, 2, 3, 4]`, so a bare `getByText('4')` would match both the axis tick and the bar's value label and throw a "multiple elements found" error. `'80%'` has no such collision since right-axis ticks render plain numbers without a `%` suffix, but it's moved into the same class-scoped check for consistency.)

Replace the test `'CategoryBarChart scales bar height to the real max, not a fixed range'` (lines 251-260) with:

```javascript
test('CategoryBarChart scales bar height to the real max, not a fixed range', () => {
  const highVolume = buildCategoryDensityData(
    Array.from({ length: 7 }, () => ({ ward: 'phuong-tra-vinh', category: 'tro' })),
    'phuong-tra-vinh',
  );
  const { container } = render(<CategoryBarChart title="Test" data={highVolume} />);
  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // max count (7, all in "tro") must render at the full plot height (bottom 38 - top 6 = 32)
  expect(Math.max(...heights)).toBe(32);
});
```

(The old test checked a CSS `height: 100%` on a `.ward-bar-fill` div — that rendering approach no longer exists. The new assertion checks the SVG `<rect>`'s `height` attribute directly: with all 7 items in the "tro" category, `leftMax = 7`, and the "tro" bar's count equals `leftMax`, so its bar must span the chart's full plot height, `COMBO_CHART_PLOT.bottom - COMBO_CHART_PLOT.top = 38 - 6 = 32`.)

Leave the 3 `buildCategoryDensityData` tests (lines 197-231) untouched — they test the builder function only, not rendering.

- [ ] **Step 2: Run tests to verify the 2 updated tests fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — the 2 updated `CategoryBarChart` tests fail (old implementation still renders `.ward-bar-fill`/plain text, not `.combo-value-label`/`.combo-bar`); the 3 `buildCategoryDensityData` tests and all `WardBarChart` tests still PASS.

- [ ] **Step 3: Rewrite `CategoryBarChart`**

In `frontend-react/src/components/Charts.jsx`, replace the entire `CategoryBarChart` function (and its preceding JSDoc comment) with:

```javascript
/**
 * CategoryBarChart — combo bar (count, left axis) + line (percent, right
 * axis) per property category (Trọ/Nhà/Đất) for a single ward. Shares its
 * coordinate system and label rendering with WardBarChart via
 * COMBO_CHART_PLOT/comboChartTickY/ComboValueLabel, so the two charts stay
 * visually and behaviorally consistent.
 */
export function CategoryBarChart({ title, data }) {
  const { left, right, top, bottom } = COMBO_CHART_PLOT;
  const leftMax = Math.max(...data.map((item) => item.count), 1);
  const columnWidth = (right - left) / data.length;
  const barWidth = columnWidth * 0.4;
  const barColor = CHART_PALETTE[0];
  const lineColor = CHART_PALETTE[4];

  const points = data.map((item, index) => {
    const columnCenterX = left + columnWidth * (index + 0.5);
    const barTopY = bottom - (item.count / leftMax) * (bottom - top);
    const lineY = bottom - (item.pct / 100) * (bottom - top);
    return {
      item,
      columnCenterX,
      barLeftX: columnCenterX - barWidth / 2,
      barTopY,
      barHeight: bottom - barTopY,
      lineY,
    };
  });

  const linePath = `M${points.map((point) => `${point.columnCenterX},${point.lineY}`).join(' L')}`;
  const leftTicks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: Math.round((leftMax * pct) / 100),
  }));
  const rightTicks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: pct,
  }));

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <svg className="combo-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={right} y1={top} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />

        {leftTicks.map((tick) => (
          <text key={`left-${tick.y}`} x={left - 1.5} y={tick.y + 1} textAnchor="end" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}
        {rightTicks.map((tick) => (
          <text key={`right-${tick.y}`} x={right + 1.5} y={tick.y + 1} textAnchor="start" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}

        {points.map((point) => (
          <rect className="combo-bar" key={point.item.slug} x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
        ))}

        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.6" />
        {points.map((point) => (
          <circle key={`dot-${point.item.slug}`} cx={point.columnCenterX} cy={point.lineY} r="1" fill={lineColor} />
        ))}

        {points.map((point) => (
          <ComboValueLabel key={`bar-label-${point.item.slug}`} x={point.columnCenterX} y={point.barTopY - 1.5}>
            {point.item.count}
          </ComboValueLabel>
        ))}
        {points.map((point) => (
          <ComboValueLabel key={`line-label-${point.item.slug}`} x={point.columnCenterX} y={point.lineY - 2}>
            {`${point.item.pct}%`}
          </ComboValueLabel>
        ))}

        {points.map((point) => (
          <text key={`x-label-${point.item.slug}`} x={point.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {point.item.label}
          </text>
        ))}
      </svg>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-swatch" style={{ backgroundColor: barColor }} />
          Số tin đăng
        </span>
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-line" style={{ backgroundColor: lineColor }} />
          Tỉ lệ (%)
        </span>
      </div>
    </section>
  );
}
```

(Note: unlike `WardBarChart`, the X-axis label is `point.item.label` with no `.replace('Phường ', '')` — category labels like "Trọ"/"Nhà"/"Đất" have no prefix to strip. Also no `onSelectWard`-equivalent click feature — not part of `CategoryBarChart`'s existing props, not added here.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — all `CategoryBarChart` and `WardBarChart` tests, plus every other test in the file.

- [ ] **Step 5: Confirm nothing else still uses `.ward-bar-*`, then delete the dead CSS**

Run:

```bash
grep -rn "ward-bar-" "d:/TraVinh Shelter/frontend-react/src" --include=*.jsx --include=*.js
```

Expected: zero matches (Task 2 Step 3 was the last place that rendered these classes).

In `frontend-react/src/styles/dashboard.css`, delete the entire block from the section comment through the last `.ward-bar-pct` rule — this is the following contiguous text (including the leading section-header comment and the blank line right after it):

```css
/* ── Ward bar chart (column + count + name + percent) ──── */
.ward-bar-cols {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.ward-bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.ward-bar-cols button.ward-bar-col {
  padding: 0;
}

.ward-bar-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
  font-variant-numeric: tabular-nums;
}

.ward-bar-track {
  display: flex;
  align-items: flex-end;
  width: 100%;
  max-width: 48px;
  height: 120px;
  background: var(--color-surface-soft);
  border-radius: var(--radius-sm);
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.08);
}

.ward-bar-fill {
  width: 100%;
  border-radius: var(--radius-xs) var(--radius-xs) 0 0;
  background-image: linear-gradient(180deg, rgb(255 255 255 / 0.35) 0%, rgb(255 255 255 / 0) 40%);
  background-blend-mode: overlay;
  box-shadow: inset 0 -6px 10px -6px rgb(0 0 0 / 0.25);
  transition: height 0.3s ease;
}

.ward-bar-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--color-body);
}

.ward-bar-pct {
  font-size: 12px;
  color: var(--color-muted);
}
```

Delete exactly this block, leaving the `.combo-svg` rule (formerly `.ward-combo-svg`, renamed in Task 1) as the next rule after the deletion point.

- [ ] **Step 6: Run the full suite once more**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 143/143 (CSS-only deletion in this step, no test depends on the removed selectors).

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat(admin): redraw ward-density mini charts as dual-axis bar+line combos"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: all tests pass (baseline 143/143 before this plan; still 143/143 after — 2 tests had their assertions changed in place, no tests added or removed).

Manually check in a browser once both tasks are committed: run `cd frontend-react && npm run dev`, log in as an admin (`VITE_USE_MOCK_API=true` default — any email containing `admin` gets ADMIN role), open "Báo cáo & Thống kê" (Reports), and look at the 4 "Mật độ tin — Phường ..." mini charts. Confirm bars/line/labels/legend render the same visual style as the "Tin đăng theo phường" pilot chart already validated on the broker dashboard, and that labels are legible at the smaller mini-chart size (4 charts share a row, so each is narrower than the pilot's single full-width chart) — this is a new risk not present in the pilot, since `COMBO_CHART_PLOT`'s fixed `viewBox="0 0 100 50"` scales down more here.
