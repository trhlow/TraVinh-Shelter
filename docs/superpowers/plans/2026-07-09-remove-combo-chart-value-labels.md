# Remove overlapping combo-chart value labels — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the italic value labels (bar count, line percent) from `WardBarChart` and `CategoryBarChart` — they visually overlap when a bar is tall and its line point lands nearby (worst at 100%/0%). Users read values off the left/right axis ticks instead, which already auto-scale to the real data.

**Architecture:** Delete the 4 `<ComboValueLabel>` call sites (2 per component), then delete the now-dead `ComboValueLabel` component itself. No other rendering changes — axes, ticks, bars, line, dots, legend, and click behavior are untouched. 2 existing tests that queried `.combo-value-label` text content are rewritten to verify the same underlying claim (both the count series and the percent series are correctly encoded) via the real SVG attributes (`<rect height>`, `<circle cy>`) instead, since there's no longer any text to read.

**Tech Stack:** React 19 (JSX-as-SVG), Vitest + Testing Library.

## Global Constraints

- No changes to axes, ticks, bar/line/dot rendering, legend, or click behavior — only the value-label removal.
- `WardBarChart`/`CategoryBarChart` public props and `aria-label` format stay unchanged.
- No hard-coded `#hex` colors (not touched by this change, but verify none are introduced).
- Run frontend tests with `cd frontend-react && npm test -- --run` (whole suite) or `npx vitest run <file>` (single file). Baseline before this plan: 143/143 passing.

---

### Task 1: Remove value labels from both combo charts

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx` (delete `ComboValueLabel` function at lines 532-538; delete the 2 `<ComboValueLabel>` map blocks in `WardBarChart` at lines 625-634; delete the 2 `<ComboValueLabel>` map blocks in `CategoryBarChart` at lines 723-732; update `CategoryBarChart`'s JSDoc comment at lines 656-662)
- Modify: `frontend-react/src/components/Charts.test.jsx` (rewrite the test at lines 60-71 and the test at lines 233-250)

**Interfaces:**
- No signature changes anywhere. `WardBarChart({title, data, onSelectWard})` and `CategoryBarChart({title, data})` keep their exact current props.

- [ ] **Step 1: Rewrite the 2 affected tests first**

In `frontend-react/src/components/Charts.test.jsx`, replace the test at lines 60-71 (`'WardBarChart shows both the count value and the percent value for the same ward'`):

```javascript
test('WardBarChart draws both the count bar and the percent line for the same ward', () => {
  const items = [
    { ward: 'phuong-nguyet-hoa' },
    { ward: 'phuong-nguyet-hoa' },
    { ward: 'phuong-nguyet-hoa' },
  ];
  const data = buildWardData(items, (item) => item.ward);
  const { container } = render(<WardBarChart title="Test" data={data} />);

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // data is always in WARDS order (Trà Vinh, Long Đức, Nguyệt Hóa, Hòa Thuận);
  // only Nguyệt Hóa has listings (count=3=leftMax) -> its bar spans the full plot height (38-6=32)
  expect(heights).toEqual([0, 0, 32, 0]);

  const dots = Array.from(container.querySelectorAll('circle'));
  const dotYs = dots.map((dot) => Number(dot.getAttribute('cy')));
  // only Nguyệt Hóa has pct=100% -> its line point sits at the very top (y=6); the rest sit at
  // the bottom (y=38, pct=0%)
  expect(dotYs).toEqual([38, 38, 6, 38]);

  expect(container.querySelectorAll('.combo-value-label')).toHaveLength(0);
});
```

Replace the test at lines 233-250 (`'CategoryBarChart renders title and one column per category with count and percent'`):

```javascript
test('CategoryBarChart renders title, category labels, and encodes both count and percent per bar', () => {
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

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // data is always in CATEGORIES order (Trọ, Nhà, Đất): counts 4/1/0 of leftMax=4
  // -> bar heights scale to 32/8/0 (plot height 38-6=32)
  expect(heights).toEqual([32, 8, 0]);

  const dots = Array.from(container.querySelectorAll('circle'));
  const dotYs = dots.map((dot) => Number(dot.getAttribute('cy')));
  // percents 80/20/0 map onto the fixed 0-100 right axis (top 6, bottom 38)
  expect(dotYs[0]).toBeCloseTo(12.4);
  expect(dotYs[1]).toBeCloseTo(31.6);
  expect(dotYs[2]).toBe(38);

  expect(container.querySelectorAll('.combo-value-label')).toHaveLength(0);
});
```

Leave the test `'CategoryBarChart scales bar height to the real max, not a fixed range'` (lines 252-262) untouched — it already queries `.combo-bar`, unaffected by this change.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — both rewritten tests fail on their final assertion (`expect(container.querySelectorAll('.combo-value-label')).toHaveLength(0)`), because the current implementation still renders 6-8 `<ComboValueLabel>` elements per chart. The `heights`/`dotYs` assertions above that line are expected to already pass even before Step 3-5's changes — they check bar/line geometry, which the label removal doesn't affect — so only the final `.combo-value-label` assertion is the actual RED signal for this task.

- [ ] **Step 3: Delete the 4 `<ComboValueLabel>` call sites**

In `frontend-react/src/components/Charts.jsx`, inside `WardBarChart`, delete these 2 blocks (currently right after the `<circle>` map and right before the X-axis label map):

```javascript
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
```

Inside `CategoryBarChart`, delete these 2 blocks (same position — right after the `<circle>` map, right before the X-axis label map):

```javascript
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
```

- [ ] **Step 4: Delete the now-dead `ComboValueLabel` component**

In `frontend-react/src/components/Charts.jsx`, delete this function entirely (it has no remaining callers after Step 3):

```javascript
function ComboValueLabel({ x, y, children }) {
  return (
    <text className="combo-value-label" x={x} y={y} textAnchor="middle" fontSize="3.2" fontStyle="italic" fill="var(--color-ink)">
      {children}
    </text>
  );
}
```

- [ ] **Step 5: Update `CategoryBarChart`'s JSDoc comment**

Replace the comment directly above `export function CategoryBarChart({ title, data }) {`:

```javascript
/**
 * CategoryBarChart — combo bar (count, left axis) + line (percent, right
 * axis) per property category (Trọ/Nhà/Đất) for a single ward. Shares its
 * coordinate system and label rendering with WardBarChart via
 * COMBO_CHART_PLOT/comboChartTickY/ComboValueLabel, so the two charts stay
 * visually and behaviorally consistent.
 */
```

with:

```javascript
/**
 * CategoryBarChart — combo bar (count, left axis) + line (percent, right
 * axis) per property category (Trọ/Nhà/Đất) for a single ward. Shares its
 * coordinate system with WardBarChart via COMBO_CHART_PLOT/comboChartTickY,
 * so the two charts stay visually and behaviorally consistent.
 */
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — all tests, including the 2 rewritten ones.

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 143/143 (2 tests rewritten in place, no tests added or removed).

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "fix(charts): remove overlapping value labels from combo bar+line charts"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: all tests pass (baseline 143/143 before and after this plan).

Manually check in a browser once committed: run `cd frontend-react && npm run dev`, open both the broker dashboard's "Tin đăng theo phường" and the admin "Báo cáo & Thống kê" page's 4 "Mật độ tin — Phường ..." mini charts. Confirm no italic numbers render on the bars or line points anymore, and that the left/right axis tick numbers are still legible and correctly reflect the data — this directly addresses the user-reported overlap bug, so a visual confirmation matters more than usual for this fix.
