# Combo cột + đường 2 trục cho "Tin đăng theo phường" (pilot) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `WardBarChart`'s internal rendering with an SVG dual-axis bar (count, left axis) + line (percent, right axis) combo chart, in the textbook-chart style the user asked for, without changing the component's public props or its call site.

**Architecture:** A single SVG (`viewBox="0 0 100 50"`) draws bars, a connecting line with point markers, tick labels on both axes, italic value labels, and ward names on the X axis — all positioned from one shared coordinate system so the line always lines up exactly over each bar's column. A horizontal legend row sits below the SVG. The existing `.chart-panel` container and `CHART_PALETTE` tokens are reused; no new colors, no new dependencies.

**Tech Stack:** React 19 (JSX-as-SVG, the same pattern already used by `DonutChart`/`GaugeChart`/`ThreeDAreaChart` in this file), Vitest + Testing Library.

## Global Constraints

- Public interface of `WardBarChart` does not change: `{ title, data, onSelectWard }` in, same JSX call site (`BrokerDashboard.jsx:527`) untouched.
- `data` shape stays `[{ code, label, count, pct }]` (from `buildWardData` — not modified).
- No hard-coded `#hex` colors — only `CHART_PALETTE`/`TRACK_COLOR` (existing CSS-variable-backed constants already in `Charts.jsx`).
- SVG presentation attributes (`fill`, `stroke`, `fontSize`, `textAnchor`, etc. set directly as JSX props, not via a `style={{}}` object) are the established pattern in this file (see `DonutChart`, `GaugeChart`) and are not "inline style" under the project's no-inline-style rule — this plan follows that existing precedent, it does not introduce a new exception.
- `aria-label` on clickable ward columns must stay in the exact format `"${ward.label}: ${ward.count} tin"` (e.g. `"Phường Trà Vinh: 1 tin"`) — unchanged from the current implementation, so click-driven tests and any future drill-down feature keep working.
- Ward names on the X axis are shortened by stripping the `"Phường "` prefix (`ward.label.replace('Phường ', '')`) — the same pattern `ReportsSection.jsx`'s `distributionData` already uses. The `aria-label` above keeps the *full* label — only the visible X-axis text is shortened.
- Run frontend tests with `cd frontend-react && npm test -- --run` (whole suite) or `npx vitest run <file>` (single file).

---

### Task 1: Rewrite `WardBarChart` as a dual-axis bar+line combo

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (rewrite the `WardBarChart` function, lines 524-555 in the current file — everything from the `/** WardBarChart ... */` JSDoc comment through the function's closing `}`)
- Modify: `frontend-react/src/components/Charts.test.jsx` (update 1 existing test, add 1 new test; leave the click test unchanged)
- Modify: `frontend-react/src/styles/dashboard.css` (add legend + SVG sizing CSS; the existing `.ward-bar-*` classes become dead after this task — see Step 7)

**Interfaces:**
- Consumes: `CHART_PALETTE` (array of 6 CSS-variable strings, already defined at the top of `Charts.jsx`), `TRACK_COLOR` (`'var(--color-hairline)'`, already defined), `CATEGORIES`/`WARDS` are NOT needed by this function (unchanged from current).
- Produces: `WardBarChart({ title, data, onSelectWard })` — same exported name and props as before. No new exports.

- [ ] **Step 1: Update the existing "renders a column" test to match the shortened X-axis labels**

The current test at `frontend-react/src/components/Charts.test.jsx` (in the `// ── WardBarChart ──────────────────────────────────────────` section) reads:

```javascript
test('WardBarChart renders a column with count, name, and percent per ward', () => {
  const data = buildWardData([{ ward: 'phuong-hoa-thuan' }], (item) => item.ward);
  render(<WardBarChart title="Tin đăng theo phường" data={data} />);

  expect(screen.getByRole('heading', { name: 'Tin đăng theo phường' })).toBeInTheDocument();
  expect(screen.getByText('Phường Hòa Thuận')).toBeInTheDocument();
  expect(screen.getByText('Phường Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});
```

Replace it with (X-axis ward names are now shortened, dropping the `"Phường "` prefix, per this plan's Global Constraints):

```javascript
test('WardBarChart renders a column with count, name, and percent per ward', () => {
  const data = buildWardData([{ ward: 'phuong-hoa-thuan' }], (item) => item.ward);
  render(<WardBarChart title="Tin đăng theo phường" data={data} />);

  expect(screen.getByRole('heading', { name: 'Tin đăng theo phường' })).toBeInTheDocument();
  expect(screen.getByText('Hòa Thuận')).toBeInTheDocument();
  expect(screen.getByText('Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});
```

Leave the second existing test (`'WardBarChart columns are clickable when onSelectWard is provided'`) exactly as-is — it asserts on the `aria-label`, which this plan does not change:

```javascript
test('WardBarChart columns are clickable when onSelectWard is provided', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  const onSelectWard = vi.fn();
  render(<WardBarChart title="Theo phường" data={data} onSelectWard={onSelectWard} />);
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh: 1 tin' }));
  expect(onSelectWard).toHaveBeenCalledWith('phuong-tra-vinh');
});
```

Then add a new test right after it, verifying both series (count and percent) render together for the same ward:

```javascript
test('WardBarChart shows both the count value and the percent value for the same ward', () => {
  const items = [
    { ward: 'phuong-nguyet-hoa' },
    { ward: 'phuong-nguyet-hoa' },
    { ward: 'phuong-nguyet-hoa' },
  ];
  const data = buildWardData(items, (item) => item.ward);
  const { container } = render(<WardBarChart title="Test" data={data} />);
  const valueLabels = Array.from(container.querySelectorAll('.ward-combo-value-label')).map((node) => node.textContent);
  expect(valueLabels).toContain('3');
  expect(valueLabels).toContain('100%');
});
```

(This test queries by the `.ward-combo-value-label` class — added to the bar/line value `<text>` elements in Step 3 — rather than by plain text, because an axis tick can coincidentally show the same number as a value label, e.g. the left axis's top tick equals the max count. Querying by class avoids that ambiguity instead of relying on `getByText`, which throws if more than one match exists.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — `'WardBarChart renders a column...'` fails because the current implementation still renders `"Phường Hòa Thuận"`/`"Phường Trà Vinh"` (full labels), not the shortened text; the new test fails because `.ward-combo-value-label` doesn't exist yet.

- [ ] **Step 3: Rewrite `WardBarChart`**

In `frontend-react/src/components/Charts.jsx`, replace the entire `WardBarChart` function (and its preceding JSDoc comment) with:

```javascript
const WARD_COMBO_TICK_PERCENTS = [0, 25, 50, 75, 100];
const WARD_COMBO_PLOT = { left: 10, right: 90, top: 6, bottom: 38 };

function wardComboTickY(pct) {
  const { top, bottom } = WARD_COMBO_PLOT;
  return bottom - (pct / 100) * (bottom - top);
}

/**
 * WardBarChart — combo bar (count, left axis) + line (percent, right axis)
 * per ward, one shared SVG coordinate system so the line always lines up
 * over each bar. Expects `data` from buildWardData so all 4 wards always
 * render.
 */
export function WardBarChart({ title, data, onSelectWard }) {
  const { left, right, top, bottom } = WARD_COMBO_PLOT;
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
  const leftTicks = WARD_COMBO_TICK_PERCENTS.map((pct) => ({
    y: wardComboTickY(pct),
    value: Math.round((leftMax * pct) / 100),
  }));
  const rightTicks = WARD_COMBO_TICK_PERCENTS.map((pct) => ({
    y: wardComboTickY(pct),
    value: pct,
  }));

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <svg className="ward-combo-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
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
              className="ward-combo-bar-group"
              onClick={() => onSelectWard(point.ward.code)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectWard(point.ward.code);
              }}
            >
              <rect x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
            </g>
          ) : (
            <rect key={point.ward.code} x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
          )
        ))}

        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.6" />
        {points.map((point) => (
          <circle key={`dot-${point.ward.code}`} cx={point.columnCenterX} cy={point.lineY} r="1" fill={lineColor} />
        ))}

        {points.map((point) => (
          <text
            key={`bar-label-${point.ward.code}`}
            className="ward-combo-value-label"
            x={point.columnCenterX}
            y={point.barTopY - 1.5}
            textAnchor="middle"
            fontSize="3.2"
            fontStyle="italic"
            fill="var(--color-ink)"
          >
            {point.ward.count}
          </text>
        ))}
        {points.map((point) => (
          <text
            key={`line-label-${point.ward.code}`}
            className="ward-combo-value-label"
            x={point.columnCenterX}
            y={point.lineY - 2}
            textAnchor="middle"
            fontSize="3.2"
            fontStyle="italic"
            fill="var(--color-ink)"
          >
            {`${point.ward.pct}%`}
          </text>
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

(`CHART_PALETTE[4]` — `--chart-5`, an orange/brown tone — is used for the line instead of `CHART_PALETTE[1]`, because `--chart-2` resolves to `var(--color-success)`, a dark green nearly identical to `--chart-1`'s dark green in both light and dark theme — that pairing would fail the "rõ khác biệt" (clearly distinct) requirement from the design spec. `--chart-5` gives real visual separation from the bar color while still only using existing chart-palette tokens, no new hex values.)

The `style={{ backgroundColor: ... }}` on the two legend swatch `<span>` elements assigns a CSS-variable-backed JS value (`barColor`/`lineColor`, both strings like `'var(--chart-1)'`) to a plain HTML element outside the SVG — this is the same pattern already used for legend dots in this file's existing `Legend` component (`style={{ backgroundColor: item.color }}` at the top of `Charts.jsx`), not a new exception to the no-inline-style rule.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — all `WardBarChart` tests, plus every other test in the file (unrelated components untouched).

- [ ] **Step 5: Add legend + SVG sizing CSS**

In `frontend-react/src/styles/dashboard.css`, add after the existing `.ward-bar-pct` rule (around line 1068-ish, at the end of the `.ward-bar-*` block):

```css
.ward-combo-svg {
  display: block;
  width: 100%;
  height: 220px;
}

.combo-chart-legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 12px;
}

.combo-chart-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-body);
}

.combo-chart-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.combo-chart-legend-line {
  width: 16px;
  height: 3px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ward-combo-bar-group {
  cursor: pointer;
}

.ward-combo-bar-group:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 1px;
}
```

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — all tests green (baseline before this task: 142/142; expect 143/143 after adding 1 new test).

- [ ] **Step 7: Remove the now-dead `.ward-bar-*` CSS rules**

`WardBarChart` no longer renders any element with a `ward-bar-*` class (it now uses `ward-combo-*` and the SVG/legend classes added in Step 5). Grep to confirm nothing else in the codebase still uses these classes:

```bash
grep -rn "ward-bar-" "d:/TraVinh Shelter/frontend-react/src" --include=*.jsx --include=*.js
```

Expected: zero matches (the old `WardBarChart` JSX was the only place that ever rendered them, and it was fully replaced in Step 3).

In `frontend-react/src/styles/dashboard.css`, delete the `.ward-bar-cols`, `.ward-bar-col`, `.ward-bar-cols button.ward-bar-col`, `.ward-bar-count`, `.ward-bar-track`, `.ward-bar-fill`, `.ward-bar-name`, and `.ward-bar-pct` rule blocks (originally at lines 1015-1068-ish, per the file's line numbers before Step 5's additions shifted them down).

- [ ] **Step 8: Run the full suite once more**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 143/143 (CSS-only deletion, no test depends on the removed selectors existing).

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat(broker): redraw ward listings chart as a dual-axis bar+line combo"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: all tests pass (baseline 142/142 before this plan; 143/143 after — 1 new test added, 1 existing test's assertions updated in place, no tests removed).

Manually check in a browser once this task is committed: run `cd frontend-react && npm run dev`, log in as a broker (`VITE_USE_MOCK_API=true` default — any email containing `broker`), open the dashboard, and look at "Tin đăng theo phường". Confirm bars (left axis, "tin đăng") and the connecting line with dots (right axis, "%") both render inside the chart, value labels are legible, and the legend row below reads "Số tin đăng" / "Tỉ lệ (%)". This is a UI-visual change — the automated tests confirm the DOM structure and data are correct, but only a real browser render confirms it looks right, per this project's rule to verify UI changes in a browser before reporting done.
