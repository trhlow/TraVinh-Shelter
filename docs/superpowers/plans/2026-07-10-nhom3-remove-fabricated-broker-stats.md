# Nhóm 3 — Remove fabricated broker-dashboard stats and the leads funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every fabricated/synthetic number from the broker dashboard (view counts, contact counts, lead counts, the customer-conversion funnel) and replace with an honest state — nothing left standing in for real data that doesn't exist.

**Architecture:** 5 tasks, run strictly in order — they all touch overlapping regions of the same file (`BrokerDashboard.jsx`) or have a hard dependency (Task 2 can only delete `ThreeDFunnelChart` once Task 1 removes its only caller; Task 4 can only delete `listingViews`/`listingContacts` once Tasks 1 and 3 have removed their other callers). Each task still leaves the app in a fully working, testable state — this is sequencing for safety, not because the tasks are conceptually coupled.

**Tech Stack:** React 19, Vitest + Testing Library.

## Global Constraints

- Conventional commits, English commit messages, no `Co-Authored-By` trailer.
- Frontend tests: `cd frontend-react && npm test -- --run`. Baseline before this plan: 160/160.
- No hard-coded `#hex` colors, no new inline styles introduced by any task in this plan.
- Locate every block to edit by its exact content, not by the line numbers written below — earlier tasks in this plan shift later line numbers.
- Do NOT touch `.dashboard-broker-list`/`.dashboard-broker-row` CSS (`styles.css`) — verified shared with admin `ReportsSection.jsx`'s broker-performance panel. Only `LeadPreview`'s JSX usage of them goes away (Task 1), not the CSS.

---

### Task 1: Remove the "Khách hàng tiềm năng" page

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/routes/index.jsx`
- Test: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:** None — no other task depends on `LeadPreview`/`buildLeadFunnelData`/the `leads` section existing. Task 2 depends on this task having removed `ThreeDFunnelChart`'s only call site.

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, add these 2 tests after the existing `'buildManagedTypeData...'` test:

```javascript
test('broker sidebar no longer has a Khách hàng tiềm năng nav item', async () => {
  render(<BrokerDashboard session={session} section="dashboard" currentPath="/broker/dashboard" />);
  await screen.findByRole('button', { name: '7 ngày' });
  expect(screen.queryByRole('link', { name: 'Khách hàng tiềm năng' })).not.toBeInTheDocument();
});

test('navigating the old /broker/leads route falls back to the dashboard title, not the removed funnel page', async () => {
  render(<BrokerDashboard session={session} section="leads" currentPath="/broker/leads" />);
  // The page's <h1> renders brokerTitle(section) unconditionally (not gated by section),
  // unlike the date-range filter button, which only exists when section === 'dashboard' —
  // await the heading, not '7 ngày', or this would hang for a non-dashboard section.
  await screen.findByRole('heading', { name: 'Bảng điều khiển' });
  expect(screen.queryByText('Phễu khách hàng tiềm năng')).not.toBeInTheDocument();
  expect(screen.queryByText('Lead mới cần xử lý')).not.toBeInTheDocument();
});
```

(The second test passes `section="leads"` directly — since `brokerTitle`/`brokerSubtitle` will no longer have a `leads` key after this task, and the JSX block gated on `section === 'leads'` will be gone, the component falls back to its default title/subtitle (`'Bảng điều khiển'`) and renders nothing for that section — proving the removal, not just that the route table changed.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: FAIL — the sidebar still has the "Khách hàng tiềm năng" link, and `section="leads"` still renders the funnel + "Lead mới cần xử lý" panel.

- [ ] **Step 3: Remove the sidebar nav item**

In `frontend-react/src/pages/BrokerDashboard.jsx`, change:

```javascript
const BROKER_SIDEBAR_ITEMS = [
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Tổng quan' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
  { href: '#/broker/leads', icon: 'Users', label: 'Khách hàng tiềm năng' },
  { href: '#/broker/viewings', icon: 'Calendar', label: 'Lịch hẹn' },
  { href: '#/broker/settings', icon: 'Settings', label: 'Cài đặt' },
];
```

to:

```javascript
const BROKER_SIDEBAR_ITEMS = [
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Tổng quan' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
  { href: '#/broker/viewings', icon: 'Calendar', label: 'Lịch hẹn' },
  { href: '#/broker/settings', icon: 'Settings', label: 'Cài đặt' },
];
```

- [ ] **Step 4: Remove the `ThreeDFunnelChart` import (no longer used in this file after Step 5)**

Change:

```javascript
import {
  buildDailySeries, buildWardData, ThreeDDonutChart, ThreeDFunnelChart, TrendBarLineChart, WardBarChart,
} from '../components/Charts.jsx';
```

to:

```javascript
import {
  buildDailySeries, buildWardData, ThreeDDonutChart, TrendBarLineChart, WardBarChart,
} from '../components/Charts.jsx';
```

- [ ] **Step 5: Remove the `leads` section JSX block**

Delete this block entirely:

```jsx
          {section === 'leads' && (
            <div className="dashboard-live-row">
              <ThreeDFunnelChart
                title="Phễu khách hàng tiềm năng"
                subtitle="Theo dõi khách từ lead mới đến giao dịch thành công"
                data={leadFunnelData}
              />
              <DashboardPanel title="Lead mới cần xử lý" count={`${dashboardStats.leads} lead`}>
                <LeadPreview listings={rangedListings} />
              </DashboardPanel>
            </div>
          )}

```

- [ ] **Step 6: Remove the `leadFunnelData` memo**

Delete this line:

```javascript
  const leadFunnelData = useMemo(() => buildLeadFunnelData(dashboardStats.leads, viewings.length), [dashboardStats.leads, viewings.length]);
```

- [ ] **Step 7: Remove `LeadPreview` and `buildLeadFunnelData`**

Delete this function entirely:

```javascript
function LeadPreview({ listings }) {
  const rows = listings.slice(0, 5).map((listing) => ({
    id: listing.id,
    title: listing.title,
    contacts: listingContacts(listing),
    views: listingViews(listing),
  }));
  if (rows.length === 0) return <StateBlock icon="Users" title="Chưa có lead mới" description="Lead sẽ được ghi nhận khi khách liên hệ tin đăng." />;
  return (
    <div className="dashboard-broker-list">
      {rows.map((row) => (
        <div className="dashboard-broker-row" key={row.id}>
          <div>
            <div className="dashboard-table-name">{row.title}</div>
            <div className="dashboard-table-sub">{row.views} lượt xem · {row.contacts} liên hệ</div>
          </div>
          <a className="btn btn-ghost btn-sm" href="#/broker/properties">Xử lý</a>
        </div>
      ))}
    </div>
  );
}
```

And this function entirely:

```javascript
function buildLeadFunnelData(leads, viewingCount) {
  const leadCount = Math.max(leads, 1);
  return [
    { label: 'Lead', value: leadCount, color: 'var(--chart-1)' },
    { label: 'Liên hệ', value: Math.max(1, Math.round(leadCount * 0.72)), color: 'var(--chart-4)' },
    { label: 'Hẹn xem nhà', value: Math.max(viewingCount, Math.round(leadCount * 0.42)), color: 'var(--chart-3)' },
    { label: 'Chốt giao dịch', value: Math.max(1, Math.round(leadCount * 0.18)), color: 'var(--chart-5)' },
  ];
}
```

- [ ] **Step 8: Remove `leads` from the title/subtitle maps**

Change:

```javascript
function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    properties: 'Tin đăng của tôi',
    leads: 'Khách hàng tiềm năng',
    viewings: 'Lịch hẹn xem',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}
```

to:

```javascript
function brokerTitle(section) {
  return {
    dashboard: 'Bảng điều khiển',
    properties: 'Tin đăng của tôi',
    viewings: 'Lịch hẹn xem',
    settings: 'Cài đặt',
  }[section] || 'Bảng điều khiển';
}
```

Change:

```javascript
function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    leads: 'Theo dõi phễu chuyển đổi khách hàng từ lead mới đến giao dịch.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    settings: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}
```

to:

```javascript
function brokerSubtitle(section, monthLabel) {
  return {
    dashboard: `Hiệu suất tin đăng và khách hàng quan tâm trong tháng ${monthLabel}.`,
    properties: 'Tạo, chỉnh sửa và theo dõi trạng thái tin bất động sản.',
    viewings: 'Theo dõi yêu cầu xem nhà và cập nhật lịch hẹn.',
    settings: 'Quản lý thông tin liên hệ hiển thị trên các tin đăng.',
  }[section] || 'Tổng quan hoạt động môi giới.';
}
```

- [ ] **Step 9: Remove the route**

In `frontend-react/src/routes/index.jsx`, delete this function:

```javascript
function BrokerLeadsRoute(props) {
  return <BrokerDashboard {...props} section="leads" currentPath="/broker/leads" />;
}
```

and delete this line from the `routes` object:

```javascript
  '/broker/leads': BrokerLeadsRoute,
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: PASS — all tests in this file, including the 2 new ones.

- [ ] **Step 11: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 162/162 (160 baseline + 2 new).

- [ ] **Step 12: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/routes/index.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "chore(broker): remove the Khách hàng tiềm năng page — funnel had no real backing data"
```

---

### Task 2: Delete the now-unused `ThreeDFunnelChart` component and its CSS

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx`
- Modify: `frontend-react/src/styles/dashboard.css`

**Interfaces:** Consumes: Task 1 having removed `ThreeDFunnelChart`'s only call site.

- [ ] **Step 1: Confirm zero remaining callers**

Run: `cd "d:/TraVinh Shelter/frontend-react" && grep -rn "ThreeDFunnelChart" src/`
Expected: only the definition itself in `src/components/Charts.jsx` (the `export function ThreeDFunnelChart` line and its closing brace) — no import or JSX usage anywhere else. If anything else references it, STOP and report — do not delete a component still in use.

- [ ] **Step 2: Delete the component**

In `frontend-react/src/components/Charts.jsx`, delete this function entirely:

```javascript
export function ThreeDFunnelChart({ title, subtitle, data }) {
  const [mode, setMode] = useState('3d');
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <ThreeDChartPanel title={title} subtitle={subtitle} mode={mode} onModeChange={setMode}>
      <div className="chart3d-funnel" role="img" aria-label={title}>
        {data.map((item, index) => {
          const width = Math.max(34, (item.value / max) * 100);
          return (
            <div className="chart3d-funnel-row" key={item.label}>
              <span
                className="chart3d-funnel-segment"
                style={{
                  width: `${width}%`,
                  '--segment-color': item.color || CHART_PALETTE[index % CHART_PALETTE.length],
                }}
              >
                <span className="chart3d-funnel-label">{item.label}</span>
                <span className="chart3d-funnel-value">{formatChartNumber(item.value)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </ThreeDChartPanel>
  );
}
```

- [ ] **Step 3: Delete its exclusive CSS**

In `frontend-react/src/styles/dashboard.css`, delete this whole block (confirmed exclusive to `ThreeDFunnelChart` — no other component uses any `.chart3d-funnel*` class):

```css
.chart3d-funnel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0 2px;
}

.chart3d-funnel-row {
  width: 100%;
  display: flex;
  justify-content: center;
}

.chart3d-funnel-segment {
  --segment-color: var(--chart-1);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  min-height: 48px;
  padding: 0 24px;
  clip-path: polygon(7% 0, 93% 0, 100% 100%, 0% 100%);
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.28), transparent 45%),
    var(--segment-color);
  color: var(--color-on-primary);
  box-shadow: inset 0 -12px 20px -18px rgb(0 0 0 / 0.7);
}

.chart3d-panel.is-3d .chart3d-funnel-segment::after {
  content: "";
  position: absolute;
  left: 8%;
  right: 8%;
  bottom: -8px;
  height: 8px;
  clip-path: polygon(0 0, 100% 0, 94% 100%, 6% 100%);
  background: color-mix(in srgb, var(--segment-color), #000 22%);
}

.chart3d-funnel-label,
.chart3d-funnel-value {
  position: relative;
  z-index: 1;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.chart3d-funnel-value {
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 162/162 (no tests reference this component or its CSS classes; no test added or removed by this task).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/styles/dashboard.css
git commit -m "chore(charts): delete ThreeDFunnelChart, now fully unused"
```

---

### Task 3: Remove the 2 fabricated StatCards from the broker overview

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Test: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:** Consumes: Task 1 (the file must already have no `leads` section referencing `dashboardStats.leads`). Produces: `dashboardStats` no longer has `estimatedViews`/`leads` fields — Task 4 depends on this (it deletes the `listingViews`/`listingContacts` functions those fields called).

- [ ] **Step 1: Write the failing test**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, add this test after the 2 tests added in Task 1:

```javascript
test('broker overview stat row shows only the 2 real KPIs, no fabricated Lượt xem/Leads cards', async () => {
  render(<BrokerDashboard session={session} section="dashboard" currentPath="/broker/dashboard" />);
  await screen.findByText('Tin đăng đang hoạt động');

  expect(screen.queryByText('Lượt xem trong tuần')).not.toBeInTheDocument();
  expect(screen.queryByText('Leads mới')).not.toBeInTheDocument();
  expect(screen.getByText('Tin đăng đang hoạt động')).toBeInTheDocument();
  expect(screen.getByText('Lịch hẹn xác nhận tháng này')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: FAIL — "Lượt xem trong tuần" and "Leads mới" are both still present.

- [ ] **Step 3: Remove the 2 StatCards and shrink the grid**

Change:

```jsx
              <div className="grid-4 dashboard-stats-row">
                <StatCard icon="Building" title="Tin đăng đang hoạt động" value={dashboardStats.activeListings} tone="navy" trend={trendFor(activeListingsDelta)} series={activeListingsSparkline} />
                <StatCard icon="Eye" title="Lượt xem trong tuần" value={dashboardStats.estimatedViews} tone="green" trend={trendFor(totalListingsDelta)} series={totalListingsSparkline} />
                <StatCard icon="Users" title="Leads mới" value={dashboardStats.leads} tone="orange" trend={trendFor(leadsDelta)} series={totalListingsSparkline} />
                <StatCard icon="CalendarCheck" title="Lịch hẹn xác nhận tháng này" value={confirmedViewingsThisMonth} tone="navy" />
              </div>
```

to:

```jsx
              <div className="grid-2 dashboard-stats-row">
                <StatCard icon="Building" title="Tin đăng đang hoạt động" value={dashboardStats.activeListings} tone="navy" trend={trendFor(activeListingsDelta)} series={activeListingsSparkline} />
                <StatCard icon="CalendarCheck" title="Lịch hẹn xác nhận tháng này" value={confirmedViewingsThisMonth} tone="navy" />
              </div>
```

- [ ] **Step 4: Remove `estimatedViews` and `leads` from `dashboardStats`**

Change:

```javascript
  const dashboardStats = useMemo(() => {
    // Fallback to server-wide stats only when the range is unbounded ("all") — data
    // has not loaded yet. A bounded range that legitimately matches nothing must
    // show 0, not silently un-filter to the unfiltered totals.
    const unbounded = !listingRange.from && !listingRange.to;
    const totalListings = rangedListings.length || (unbounded ? stats.totalListings : 0) || 0;
    const activeListings = rangedListings.filter(isAvailableListing).length || (unbounded ? stats.activeListings : 0) || 0;
    const pendingListings = rangedListings.filter(isPendingListing).length;
    const estimatedViews = rangedListings.reduce((sum, listing) => sum + listingViews(listing), 0);
    return {
      totalListings,
      activeListings,
      pendingListings,
      estimatedViews,
      leads: stats.pendingLeads || Math.max(0, totalListings * 2),
    };
  }, [rangedListings, stats, listingRange]);
```

to:

```javascript
  const dashboardStats = useMemo(() => {
    // Fallback to server-wide stats only when the range is unbounded ("all") — data
    // has not loaded yet. A bounded range that legitimately matches nothing must
    // show 0, not silently un-filter to the unfiltered totals.
    const unbounded = !listingRange.from && !listingRange.to;
    const totalListings = rangedListings.length || (unbounded ? stats.totalListings : 0) || 0;
    const activeListings = rangedListings.filter(isAvailableListing).length || (unbounded ? stats.activeListings : 0) || 0;
    const pendingListings = rangedListings.filter(isPendingListing).length;
    return {
      totalListings,
      activeListings,
      pendingListings,
    };
  }, [rangedListings, stats, listingRange]);
```

- [ ] **Step 5: Remove the memos that only fed the deleted cards**

Delete this line:

```javascript
  const totalListingsDelta = prevRangedListings ? percentDelta(dashboardStats.totalListings, prevRangedListings.length) : null;
```

Delete these lines:

```javascript
  const leadsDelta = prevRangedListings
    ? percentDelta(dashboardStats.leads, Math.max(0, prevRangedListings.length * 2))
    : null;
```

Delete this block:

```javascript
  const totalListingsSparkline = useMemo(
    () => buildDailySeries(rangedListings, (listing) => listing.createdAt, 7).map((bucket) => bucket.count),
    [rangedListings],
  );
```

Keep `activeListingsDelta` and `activeListingsSparkline` exactly as they are — they still feed the real "Tin đăng đang hoạt động" card.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: PASS — all tests in this file.

- [ ] **Step 7: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 163/163 (162 baseline + 1 new).

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "fix(broker): remove fabricated Lượt xem/Leads stat cards, keep only real KPIs"
```

---

### Task 4: Remove fabricated per-listing view/contact counts

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Test: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:** Consumes: Task 1 (removed `LeadPreview`'s calls to `listingViews`/`listingContacts`) and Task 3 (removed `dashboardStats`'s call to `listingViews`) — after both, this task's callers (`RecentListings`, `ListingRow`) are the only remaining ones, so it's safe to delete the two helper functions here.

- [ ] **Step 1: Write the failing test**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, add this test after the test added in Task 3:

```javascript
test('recent listings table no longer shows fabricated Lượt xem/Liên hệ columns', async () => {
  render(<BrokerDashboard session={session} section="dashboard" currentPath="/broker/dashboard" />);
  await screen.findByText('Nhà phố Long Đức');

  expect(screen.queryByText('Lượt xem')).not.toBeInTheDocument();
  expect(screen.queryByText('Liên hệ')).not.toBeInTheDocument();
  expect(screen.getByText('Bất động sản')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: FAIL — the "Lượt xem"/"Liên hệ" column headers are still present.

- [ ] **Step 3: Remove the 2 columns from `RecentListings`**

Change:

```jsx
        <thead>
          <tr>
            <th>Bất động sản</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Lượt xem</th>
            <th>Liên hệ</th>
            <th>Thao tác</th>
          </tr>
        </thead>
```

to:

```jsx
        <thead>
          <tr>
            <th>Bất động sản</th>
            <th>Loại</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
```

Change:

```jsx
              <td>{categoryLabel(listing.category)}</td>
              <td><StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge></td>
              <td><span className="dashboard-table-name">{listingViews(listing)}</span></td>
              <td><span className="dashboard-table-name">{listingContacts(listing)}</span></td>
              <td>
```

to:

```jsx
              <td>{categoryLabel(listing.category)}</td>
              <td><StatusBadge tone={listingStatusTone(listing)}>{listing.statusLabel}</StatusBadge></td>
              <td>
```

- [ ] **Step 4: Remove the fake views line from `ListingRow`**

Change:

```jsx
        <div className="dashboard-listing-meta">
          <span>{listing.area || 0}m²</span>
          <span>{listingViews(listing)} lượt xem</span>
        </div>
```

to:

```jsx
        <div className="dashboard-listing-meta">
          <span>{listing.area || 0}m²</span>
        </div>
```

- [ ] **Step 5: Delete the now-fully-unused helper functions**

Run: `cd "d:/TraVinh Shelter/frontend-react" && grep -n "listingViews(\|listingContacts(" src/pages/BrokerDashboard.jsx`
Expected: only the 2 function definitions themselves remain — no more call sites.

Delete these 2 functions entirely:

```javascript
function listingViews(listing) {
  return Math.max(32, String(listing.title || '').length * 3);
}

function listingContacts(listing) {
  return Math.max(1, Math.round(listingViews(listing) / 18));
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npx vitest run --environment jsdom src/pages/BrokerDashboard.filter.test.jsx`
Expected: PASS — all tests in this file.

- [ ] **Step 7: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 164/164 (163 baseline + 1 new).

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "fix(broker): remove fabricated per-listing view/contact counts"
```

---

### Task 5: Remove the fabrication at its source (API layer + mock data)

**Files:**
- Modify: `frontend-react/src/services/api.js`
- Modify: `frontend-react/src/services/mockData.js`
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:** None — no other task depends on the `pendingLeads`/`conversion` fields existing.

- [ ] **Step 1: Remove `pendingLeads` from the real-backend API path**

In `frontend-react/src/services/api.js`, change:

```javascript
export async function fetchBrokerDashboard(token) {
  if (USE_MOCK_API) {
    return delay({ ...BROKER_DASHBOARD, listings: MOCK_PROPERTIES }, 80);
  }
  const response = await request('/properties/mine?size=100', { token });
  const listings = normalizePagedProperties(response);
  return {
    activeListings: listings.filter((item) => item.rawStatus === 'AVAILABLE').length,
    totalListings: listings.length,
    pendingLeads: Math.max(0, listings.length * 2),
    listings,
  };
}
```

to:

```javascript
export async function fetchBrokerDashboard(token) {
  if (USE_MOCK_API) {
    return delay({ ...BROKER_DASHBOARD, listings: MOCK_PROPERTIES }, 80);
  }
  const response = await request('/properties/mine?size=100', { token });
  const listings = normalizePagedProperties(response);
  return {
    activeListings: listings.filter((item) => item.rawStatus === 'AVAILABLE').length,
    totalListings: listings.length,
    listings,
  };
}
```

- [ ] **Step 2: Remove the fabricated fields from mock data**

In `frontend-react/src/services/mockData.js`, change:

```javascript
export const BROKER_DASHBOARD = {
  activeListings: 18,
  pendingLeads: 7,
  conversion: '22%',
};
```

to:

```javascript
export const BROKER_DASHBOARD = {
  activeListings: 18,
};
```

- [ ] **Step 3: Remove `pendingLeads` from the component's initial state**

In `frontend-react/src/pages/BrokerDashboard.jsx`, change:

```javascript
  const [stats, setStats] = useState({ activeListings: 0, totalListings: 0, pendingLeads: 0, listings: [] });
```

to:

```javascript
  const [stats, setStats] = useState({ activeListings: 0, totalListings: 0, listings: [] });
```

- [ ] **Step 4: Clean up the stale test fixture**

In `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, change:

```javascript
  fetchBrokerDashboard: vi.fn().mockResolvedValue({
    activeListings: 2,
    totalListings: 2,
    pendingLeads: 3,
    listings: [
```

to:

```javascript
  fetchBrokerDashboard: vi.fn().mockResolvedValue({
    activeListings: 2,
    totalListings: 2,
    listings: [
```

- [ ] **Step 5: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 164/164 (no tests added or removed by this task — pure data-shape cleanup, already covered by Tasks 1/3's tests which never asserted on `pendingLeads` directly).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/services/api.js frontend-react/src/services/mockData.js frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "chore(broker): remove fabricated pendingLeads/conversion fields at the data source"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: 164/164 (160 baseline + 2 Task 1 + 0 Task 2 + 1 Task 3 + 1 Task 4 + 0 Task 5).

Manual check (once committed — no browser automation available in this environment, per every prior batch this session): broker dashboard sidebar has no "Khách hàng tiềm năng" item; broker overview shows only 2 stat cards ("Tin đăng đang hoạt động", "Lịch hẹn xác nhận tháng này"); the "Tin đăng gần đây" table on the overview has no "Lượt xem"/"Liên hệ" columns; the "Tin đăng của tôi" page's listing cards no longer show a fake "lượt xem" line; navigating to the old `#/broker/leads` hash no longer shows a funnel or lead list.
