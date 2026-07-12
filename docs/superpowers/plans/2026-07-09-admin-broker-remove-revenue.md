# Bỏ hoa hồng/doanh thu khỏi Admin & Broker Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xóa toàn bộ hoa hồng/doanh thu giả lập khỏi Broker Dashboard và Admin Dashboard, thay bằng số liệu hoạt động thật (số tin đăng + số lịch hẹn đã xác nhận theo tháng).

**Architecture:** Xóa hẳn trang "Hoa hồng & Doanh thu" của broker (route + sidebar). Đổi các KPI/chart hoa hồng-doanh thu còn lại (broker Tổng quan, admin Tổng quan, admin Báo cáo & Thống kê) sang số liệu hoạt động thật tính từ `listings`/`properties` và `viewings` đã có sẵn trong dữ liệu — không thêm field/API mới, chỉ đổi công thức tính trong các hàm builder hiện có (hoặc hàm mới cùng file).

**Tech Stack:** React 19, Vitest + Testing Library, `lucide-react` icon (`CalendarCheck` đã có sẵn trong `Icon.jsx`), `ThreeDGroupedBarChart` (component sẵn có trong `Charts.jsx`, không đổi loại biểu đồ — việc 3D→2D thuộc nhóm khác).

## Global Constraints

- UI text: Tiếng Việt. Code/comment: Tiếng Anh. Commit message: Tiếng Anh, conventional commits.
- Không `inline style`, không hard-code `#hex` trong JSX — chỉ CSS token.
- Không thêm feature/refactor ngoài phạm vi spec `docs/superpowers/specs/2026-07-09-admin-broker-remove-revenue-design.md`.
- **Không dùng `git checkout`/`git restore`/`git reset --hard`** trên bất kỳ file nào trong plan này — luôn `Read` trước khi `Edit`.
- Không được thêm bất cứ nội dung nào liên quan doanh thu/lợi nhuận mới (kể cả khi "tiện thể" hiển thị số tiền ước tính).
- Sau mỗi task: chạy `cd frontend-react && npx vitest run --environment jsdom <file test liên quan>` trước khi commit. Chạy toàn bộ `npm test -- --run` ở task cuối.
- Mỗi task tự chứa một commit riêng theo conventional commits (`refactor:`).

---

### Task 1: Xóa trang "Hoa hồng & Doanh thu" của broker

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (sidebar item dòng 34, khối JSX `section === 'revenue'` dòng 810-819, case `revenue` trong `brokerTitle`/`brokerSubtitle` dòng ~1274/1287)
- Modify: `frontend-react/src/routes/index.jsx` (hàm `BrokerRevenueRoute` dòng 30-32, entry `'/broker/revenue': BrokerRevenueRoute` dòng 71)
- Test: `frontend-react/src/App.test.jsx` (thêm 1 test khẳng định route `/broker/revenue` không còn tồn tại — không có test nào hiện tại tham chiếu route này nên không có gì để xóa, chỉ thêm mới)

**Interfaces:**
- Consumes: không phụ thuộc task khác.
- Produces: `BROKER_SIDEBAR_ITEMS` không còn phần tử `href: '#/broker/revenue'`; `routes` trong `routes/index.jsx` không còn key `'/broker/revenue'`. Task 2 (sửa cùng file `BrokerDashboard.jsx`) build trên state file sau task này.

- [ ] **Step 1: Đọc lại `BrokerDashboard.jsx` và `routes/index.jsx` để lấy đúng nội dung hiện tại**

```
Read frontend-react/src/pages/BrokerDashboard.jsx
Read frontend-react/src/routes/index.jsx
```

- [ ] **Step 2: Viết test khẳng định route `/broker/revenue` không tồn tại (RED)**

Thêm vào cuối `frontend-react/src/App.test.jsx`:

```javascript
test('the revenue route no longer resolves to a dedicated broker page', () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/revenue';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Bảng điều khiển' }).length).toBeGreaterThan(0);
});
```

(Route không khớp `routes` object sẽ rơi về `HomePage` theo `resolveRoute()` — nhưng vì `/broker/revenue` sẽ không còn trong `routes` sau Step 4, và hash không bắt đầu bằng `/admin` hay `/property/`, nó rơi về `routes[pathname] ?? HomePage` = `HomePage`. Vì vậy assertion đúng phải là trang chủ, không phải "Bảng điều khiển". Sửa lại:)

```javascript
test('the revenue route no longer resolves to a dedicated broker page', () => {
  window.location.hash = '#/broker/revenue';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Tin nổi bật' })).toBeInTheDocument();
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL (route hiện vẫn tồn tại)**

```bash
cd frontend-react && npx vitest run --environment jsdom src/App.test.jsx -t "revenue route"
```
Expected: FAIL — vẫn hiện "Bảng điều khiển" vì route `/broker/revenue` còn tồn tại.

- [ ] **Step 4: Xóa route trong `routes/index.jsx`**

Xóa hàm:
```javascript
function BrokerRevenueRoute(props) {
  return <BrokerDashboard {...props} section="revenue" currentPath="/broker/revenue" />;
}
```

Xóa dòng trong object `routes`:
```javascript
  '/broker/revenue': BrokerRevenueRoute,
```

- [ ] **Step 5: Xóa sidebar item trong `BrokerDashboard.jsx`**

Trong `BROKER_SIDEBAR_ITEMS`, xóa dòng:
```javascript
  { href: '#/broker/revenue', icon: 'DollarSign', label: 'Hoa hồng & Doanh thu' },
```

- [ ] **Step 6: Xóa khối JSX `section === 'revenue'`**

Xóa toàn bộ khối:
```jsx
          {section === 'revenue' && (
            <ThreeDGroupedBarChart
              title="Hoa hồng & Doanh thu"
              subtitle="Doanh thu hoa hồng theo từng tháng trong năm"
              data={commissionChartData}
              currentLabel="Năm nay"
              previousLabel="Năm trước"
              valueSuffix="tr"
            />
          )}
```

- [ ] **Step 7: Xóa case `revenue` khỏi `brokerTitle()` và `brokerSubtitle()`**

Trong `brokerTitle()`, xóa dòng:
```javascript
    revenue: 'Hoa hồng & Doanh thu',
```

Trong `brokerSubtitle()`, xóa dòng:
```javascript
    revenue: 'Ước tính hoa hồng theo tháng và so sánh với kỳ trước.',
```

- [ ] **Step 8: Chạy lại test, xác nhận PASS**

```bash
cd frontend-react && npx vitest run --environment jsdom src/App.test.jsx
```
Expected: PASS toàn bộ file.

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/routes/index.jsx frontend-react/src/App.test.jsx
git commit -m "refactor(broker): remove Hoa hồng & Doanh thu page — no commission concept in this project"
```

---

### Task 2: Đổi KPI + chart hoa hồng trong Tổng quan broker sang hoạt động thật

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (KPI card dòng ~500, chart block dòng ~503-511, biến `commissionChartData`/`commissionThisMonth` dòng ~189-193, hàm `buildCommissionSeries` dòng ~1163-1178)

**Interfaces:**
- Consumes: state `viewings` (đã có sẵn ở dòng 74, shape `{ id, status, propertyId, requestedAt, createdAt, ... }`), state `listings`/`stats.listings` (đã có sẵn dòng 85, shape có `createdAt`).
- Produces: hàm mới `buildActivitySeries(listings, viewings)` trả về mảng 12 phần tử `{ label: 'T1'..'T12', current: <số tin đăng tháng đó>, previous: <số lịch hẹn CONFIRMED tháng đó> }`. Biến `activityChartData`, `confirmedViewingsThisMonth` thay cho `commissionChartData`/`commissionThisMonth`. Không có task nào khác trong plan này phụ thuộc các tên này (Task 3/4 độc lập, ở file khác).

- [ ] **Step 1: Đọc lại `BrokerDashboard.jsx` sau Task 1 để lấy đúng nội dung/số dòng hiện tại**

```
Read frontend-react/src/pages/BrokerDashboard.jsx
```

- [ ] **Step 2: Cập nhật test render Tổng quan broker (RED) — nếu chưa có, thêm assertion cho tên KPI/chart mới**

Không có file test riêng cho `BrokerDashboard.jsx` (đã xác nhận `BrokerDashboard.filter.test.jsx` không đụng phần này và không có test khác). Thêm test mới `frontend-react/src/pages/BrokerDashboard.activity.test.jsx`:

```javascript
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import BrokerDashboard from './BrokerDashboard.jsx';

beforeEach(() => {
  window.location.hash = '#/broker/dashboard';
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API unavailable in unit test'))));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const session = { token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id' };

test('shows activity KPI and chart instead of commission on the broker overview', async () => {
  render(<BrokerDashboard session={session} onLogin={() => {}} onLogout={() => {}} currentPath="/broker/dashboard" section="dashboard" />);
  await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Bảng điều khiển' }).length).toBeGreaterThan(0));
  expect(screen.getByText('Lịch hẹn xác nhận tháng này')).toBeInTheDocument();
  expect(screen.getByText('Hoạt động môi giới theo tháng')).toBeInTheDocument();
  expect(screen.queryByText(/Hoa hồng/)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

```bash
cd frontend-react && npx vitest run --environment jsdom src/pages/BrokerDashboard.activity.test.jsx
```
Expected: FAIL — vẫn hiện "Hoa hồng dự kiến tháng này"/"Hoa hồng theo tháng", không có "Lịch hẹn xác nhận tháng này".

- [ ] **Step 4: Thay `commissionChartData`/`commissionThisMonth` bằng `activityChartData`/`confirmedViewingsThisMonth`**

Đổi:
```javascript
  const commissionChartData = useMemo(() => buildCommissionSeries(listings), [listings]);
  const commissionThisMonth = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return Math.round(commissionChartData[currentMonth]?.current || 0);
  }, [commissionChartData]);
```
thành:
```javascript
  const activityChartData = useMemo(() => buildActivitySeries(listings, viewings), [listings, viewings]);
  const confirmedViewingsThisMonth = useMemo(() => {
    const now = new Date();
    return viewings.filter((viewing) => (
      viewing.status === 'CONFIRMED' && sameCalendarMonth(viewing.requestedAt || viewing.createdAt, now)
    )).length;
  }, [viewings]);
```

- [ ] **Step 5: Đổi KPI card**

Đổi:
```jsx
                <StatCard icon="DollarSign" title="Hoa hồng dự kiến tháng này" value={`${commissionThisMonth} tr`} tone="navy" />
```
thành:
```jsx
                <StatCard icon="CalendarCheck" title="Lịch hẹn xác nhận tháng này" value={confirmedViewingsThisMonth} tone="navy" />
```

- [ ] **Step 6: Đổi chart trong `dashboard-live-row`**

Đổi:
```jsx
                <ThreeDGroupedBarChart
                  title="Hoa hồng theo tháng"
                  subtitle="So sánh năm nay với cùng kỳ năm trước · đơn vị triệu đồng"
                  data={commissionChartData}
                  currentLabel="Năm nay"
                  previousLabel="Năm trước"
                  valueSuffix="tr"
                />
```
thành:
```jsx
                <ThreeDGroupedBarChart
                  title="Hoạt động môi giới theo tháng"
                  subtitle="Số bài đăng mới và lịch hẹn đã xác nhận theo từng tháng trong năm"
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
```

- [ ] **Step 7: Thay hàm `buildCommissionSeries` bằng `buildActivitySeries` + helper `sameCalendarMonth`**

Xóa:
```javascript
function buildCommissionSeries(listings) {
  const monthCounts = Array.from({ length: 12 }, () => 0);
  listings.forEach((listing) => {
    const date = new Date(listing.createdAt || Date.now());
    if (!Number.isNaN(date.getTime())) monthCounts[date.getMonth()] += 1;
  });
  const base = Math.max(2, Math.ceil(listings.length / 8));
  return monthCounts.map((count, index) => {
    const current = (count + base + (index % 4)) * (2.6 + (index % 3) * 0.45);
    return {
      label: `T${index + 1}`,
      current: Math.round(current * 10) / 10,
      previous: Math.round(current * (0.72 + (index % 2) * 0.08) * 10) / 10,
    };
  });
}
```

Thay bằng:
```javascript
function buildActivitySeries(listings, viewings) {
  const postCounts = Array.from({ length: 12 }, () => 0);
  listings.forEach((listing) => {
    const date = new Date(listing.createdAt || Date.now());
    if (!Number.isNaN(date.getTime())) postCounts[date.getMonth()] += 1;
  });
  const confirmedCounts = Array.from({ length: 12 }, () => 0);
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const date = new Date(viewing.requestedAt || viewing.createdAt || Date.now());
    if (!Number.isNaN(date.getTime())) confirmedCounts[date.getMonth()] += 1;
  });
  return postCounts.map((count, index) => ({
    label: `T${index + 1}`,
    current: count,
    previous: confirmedCounts[index],
  }));
}

function sameCalendarMonth(value, reference) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
}
```

- [ ] **Step 8: Chạy test, xác nhận PASS**

```bash
cd frontend-react && npx vitest run --environment jsdom src/pages/BrokerDashboard.activity.test.jsx
```
Expected: PASS.

- [ ] **Step 9: Chạy toàn bộ test frontend để bắt regression**

```bash
cd frontend-react && npm test -- --run
```
Expected: tất cả PASS.

- [ ] **Step 10: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.activity.test.jsx
git commit -m "refactor(broker): replace commission KPI/chart with real monthly activity (listings + confirmed viewings)"
```

---

### Task 3: Đổi KPI + chart doanh thu trong Tổng quan admin sang hoạt động thật

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx` (import dòng 2, biến `currentRevenue`/KPI dòng 36/55, `revenueSeries`/chart dòng 58/108-115, hàm `buildRevenueSeries`/`estimateCurrentMonthRevenue`/`estimatePropertyRevenue` dòng 152-167/219-236)
- Modify: `frontend-react/src/pages/admin/OverviewSection.test.jsx` (assertion dòng 32-36)

**Interfaces:**
- Consumes: `rollingMonthBuckets()`, `dateOrFallback()`, `sameMonth()` đã có sẵn trong file (không đổi signature).
- Produces: hàm mới `buildSystemActivitySeries(properties, viewings)` trả về mảng 12 phần tử `{ label, current: <số tin đăng tháng đó>, previous: <số lịch hẹn CONFIRMED tháng đó> }`. Biến `confirmedViewingsThisMonth` thay cho `currentRevenue`.

- [ ] **Step 1: Đọc lại `OverviewSection.jsx` để lấy đúng nội dung hiện tại**

```
Read frontend-react/src/pages/admin/OverviewSection.jsx
```

- [ ] **Step 2: Sửa test trước (RED) — đổi assertion sang tên chart mới**

Trong `frontend-react/src/pages/admin/OverviewSection.test.jsx`, đổi:
```javascript
test('renders revenue chart and system status panel', () => {
  render(<OverviewSection data={data} loading={false} />);
  expect(screen.getByText('Doanh thu giao dịch toàn hệ thống')).toBeInTheDocument();
  expect(screen.getByText('Tình trạng hệ thống')).toBeInTheDocument();
});
```
thành:
```javascript
test('renders monthly activity chart and system status panel', () => {
  render(<OverviewSection data={data} loading={false} />);
  expect(screen.getByText('Hoạt động hệ thống theo tháng')).toBeInTheDocument();
  expect(screen.getByText('Tình trạng hệ thống')).toBeInTheDocument();
  expect(screen.queryByText('Doanh thu tháng này')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

```bash
cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx
```
Expected: FAIL — chart vẫn tên "Doanh thu giao dịch toàn hệ thống", KPI "Doanh thu tháng này" vẫn còn.

- [ ] **Step 4: Đổi import — bỏ `ThreeDAreaChart`, thêm `ThreeDGroupedBarChart`**

Đổi:
```javascript
import { buildDailySeries, ThreeDAreaChart } from '../../components/Charts.jsx';
```
thành:
```javascript
import { buildDailySeries, ThreeDGroupedBarChart } from '../../components/Charts.jsx';
```

- [ ] **Step 5: Thay `currentRevenue` bằng `confirmedViewingsThisMonth`**

Đổi:
```javascript
  const currentRevenue = useMemo(() => estimateCurrentMonthRevenue(properties, viewings), [properties, viewings]);
```
thành:
```javascript
  const confirmedViewingsThisMonth = useMemo(() => {
    const now = new Date();
    return viewings.filter((viewing) => (
      viewing.status === 'CONFIRMED' && sameMonth(dateOrFallback(viewing.createdAt || viewing.requestedAt, 0), now)
    )).length;
  }, [viewings]);
```

- [ ] **Step 6: Đổi KPI "Doanh thu tháng này"**

Đổi:
```javascript
    { icon: 'DollarSign', title: 'Doanh thu tháng này', value: formatCurrencyLabel(currentRevenue), tone: 'green' },
```
thành:
```javascript
    { icon: 'CalendarCheck', title: 'Lịch hẹn xác nhận tháng này', value: confirmedViewingsThisMonth, tone: 'green' },
```

- [ ] **Step 7: Thay `revenueSeries` bằng `systemActivityData`**

Đổi:
```javascript
  const revenueSeries = useMemo(() => buildRevenueSeries(properties, viewings), [properties, viewings]);
```
thành:
```javascript
  const systemActivityData = useMemo(() => buildSystemActivitySeries(properties, viewings), [properties, viewings]);
```

- [ ] **Step 8: Đổi chart JSX**

Đổi:
```jsx
      <div className="dashboard-live-row">
        <ThreeDAreaChart
          title="Doanh thu giao dịch toàn hệ thống"
          subtitle="Ước tính theo tin đã chốt và lịch hẹn xác nhận"
          series={revenueSeries}
          unit="đ doanh thu"
        />
      </div>
```
thành:
```jsx
      <div className="dashboard-live-row">
        <ThreeDGroupedBarChart
          title="Hoạt động hệ thống theo tháng"
          subtitle="12 tháng gần nhất — tin đăng mới và lịch hẹn đã xác nhận"
          data={systemActivityData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
      </div>
```

- [ ] **Step 9: Thay `buildRevenueSeries`/`estimateCurrentMonthRevenue`/`estimatePropertyRevenue` bằng `buildSystemActivitySeries`**

Xóa 3 hàm:
```javascript
function buildRevenueSeries(properties, viewings) {
  const buckets = rollingMonthBuckets().map((bucket) => ({ date: bucket.date.toISOString().slice(0, 10), count: 0 }));
  properties.forEach((property) => {
    const date = dateOrFallback(property.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(new Date(item.date), date));
    if (bucket && ['SOLD', 'RENTED'].includes(property.rawStatus)) {
      bucket.count += estimatePropertyRevenue(property);
    }
  });
  viewings.forEach((viewing) => {
    const date = dateOrFallback(viewing.createdAt || viewing.requestedAt, 0);
    const bucket = buckets.find((item) => sameMonth(new Date(item.date), date));
    if (bucket && viewing.status === 'CONFIRMED') bucket.count += 800000;
  });
  return buckets;
}
```
```javascript
function estimateCurrentMonthRevenue(properties, viewings) {
  const now = new Date();
  const propertyRevenue = properties.reduce((sum, property) => (
    sameMonth(dateOrFallback(property.createdAt, 0), now) ? sum + estimatePropertyRevenue(property) : sum
  ), 0);
  const viewingRevenue = viewings.reduce((sum, viewing) => (
    sameMonth(dateOrFallback(viewing.createdAt || viewing.requestedAt, 0), now) && viewing.status === 'CONFIRMED' ? sum + 800000 : sum
  ), 0);
  return propertyRevenue + viewingRevenue;
}
```
```javascript
function estimatePropertyRevenue(property) {
  const rawPrice = Number(property.rawPrice || 0);
  if (rawPrice > 0) return Math.max(1_200_000, Math.round(rawPrice * 0.012));
  if (property.rawStatus === 'SOLD') return 18000000;
  if (property.rawStatus === 'RENTED') return 3500000;
  return 900000;
}
```

Thay bằng:
```javascript
function buildSystemActivitySeries(properties, viewings) {
  const buckets = rollingMonthBuckets();
  properties.forEach((property) => {
    const date = dateOrFallback(property.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current = (bucket.current || 0) + 1;
  });
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const date = dateOrFallback(viewing.requestedAt || viewing.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.previous = (bucket.previous || 0) + 1;
  });
  return buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: bucket.previous || 0,
  }));
}
```

- [ ] **Step 10: Kiểm tra `formatCurrencyLabel` còn được dùng không**

`formatCurrencyLabel` chỉ được dùng bởi KPI doanh thu vừa xóa ở Step 6. Grep xác nhận không còn lời gọi nào khác trong file, xóa hẳn hàm:
```javascript
function formatCurrencyLabel(value) {
  if (value >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} tr`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}
```

(Nếu grep cho thấy vẫn còn nơi khác gọi `formatCurrencyLabel` trong file, giữ lại hàm và bỏ qua bước xóa này — kiểm tra thực tế trước khi xóa.)

- [ ] **Step 11: Chạy test, xác nhận PASS**

```bash
cd frontend-react && npx vitest run --environment jsdom src/pages/admin/OverviewSection.test.jsx
```
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/OverviewSection.test.jsx
git commit -m "refactor(admin): replace revenue KPI/chart in Overview with real monthly activity"
```

---

### Task 4: Đổi "Top môi giới theo doanh số" sang xếp hạng theo hoạt động

**Files:**
- Modify: `frontend-react/src/pages/admin/ReportsSection.jsx` (destructure `viewings` dòng 14-16, `topBrokerData` dòng 39, chart JSX dòng 86-93, `BrokerPerformancePanel` gọi + định nghĩa dòng 94/100-101, `buildTopBrokerData` dòng 139-149, `buildBrokerRows` dòng 151-165, xóa `estimatePropertyRevenue` dòng 189-195)
- Test: `frontend-react/src/pages/admin/ReportsSection.test.jsx` (thêm assertion mới)

**Interfaces:**
- Consumes: không phụ thuộc Task 1-3 (file khác).
- Produces: `buildBrokerRows(brokers, properties, viewings)` — thêm tham số `viewings`, field trả về đổi từ `revenue` sang `confirmedViewings` + `activityScore`. `buildTopBrokerData(brokers, properties, viewings)` — thêm tham số `viewings`.

- [ ] **Step 1: Đọc lại `ReportsSection.jsx` để lấy đúng nội dung hiện tại**

```
Read frontend-react/src/pages/admin/ReportsSection.jsx
```

- [ ] **Step 2: Viết test trước (RED)**

Thêm vào `frontend-react/src/pages/admin/ReportsSection.test.jsx`, sau test cuối cùng hiện có:

```javascript
test('ranks brokers by activity, not revenue', () => {
  const activityData = {
    users: [],
    brokers: [{ id: 'b1', fullName: 'Nguyễn Văn A', status: 'ACTIVE' }],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', broker: { id: 'b1' } },
    ],
    viewings: [
      { id: 'v1', propertyId: 'p1', status: 'CONFIRMED', requestedAt: '2026-06-25T00:00:00Z' },
    ],
  };
  render(<ReportsSection data={activityData} loading={false} />);
  expect(screen.getByText('Top môi giới theo hoạt động')).toBeInTheDocument();
  expect(screen.queryByText('Top môi giới theo doanh số')).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

```bash
cd frontend-react && npx vitest run --environment jsdom src/pages/admin/ReportsSection.test.jsx
```
Expected: FAIL — chart vẫn tên "Top môi giới theo doanh số".

- [ ] **Step 4: Destructure `viewings` từ `data`**

Đổi:
```javascript
export default function ReportsSection({ data }) {
  const brokers = data?.brokers || [];
  const properties = data?.properties || [];
```
thành:
```javascript
export default function ReportsSection({ data }) {
  const brokers = data?.brokers || [];
  const properties = data?.properties || [];
  const viewings = data?.viewings || [];
```

- [ ] **Step 5: Cập nhật `topBrokerData` để truyền `viewings`**

Đổi:
```javascript
  const topBrokerData = useMemo(() => buildTopBrokerData(brokers, properties), [brokers, properties]);
```
thành:
```javascript
  const topBrokerData = useMemo(() => buildTopBrokerData(brokers, properties, viewings), [brokers, properties, viewings]);
```

- [ ] **Step 6: Đổi chart JSX**

Đổi:
```jsx
        <ThreeDGroupedBarChart
          title="Top môi giới theo doanh số"
          subtitle="Xếp hạng tháng hiện tại theo số tin và giao dịch ước tính"
          data={topBrokerData}
          currentLabel="Tháng này"
          previousLabel="Tháng trước"
          valueSuffix="tr"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} />
```
thành:
```jsx
        <ThreeDGroupedBarChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
```

- [ ] **Step 7: Cập nhật `BrokerPerformancePanel` để nhận và truyền `viewings`**

Đổi:
```javascript
function BrokerPerformancePanel({ brokers, properties }) {
  const rows = useMemo(() => buildBrokerRows(brokers, properties), [brokers, properties]);
```
thành:
```javascript
function BrokerPerformancePanel({ brokers, properties, viewings }) {
  const rows = useMemo(() => buildBrokerRows(brokers, properties, viewings), [brokers, properties, viewings]);
```

- [ ] **Step 8: Cập nhật `buildTopBrokerData`**

Đổi:
```javascript
function buildTopBrokerData(brokers, properties) {
  const rows = buildBrokerRows(brokers, properties).slice(0, 6);
  if (rows.length === 0) {
    return [{ label: 'Chưa có', current: 0, previous: 0 }];
  }
  return rows.map((row, index) => ({
    label: shortName(row.name),
    current: Math.max(1, Math.round(row.revenue / 1_000_000)),
    previous: Math.max(1, Math.round((row.revenue / 1_000_000) * (0.62 + index * 0.04))),
  }));
}
```
thành:
```javascript
function buildTopBrokerData(brokers, properties, viewings) {
  const rows = buildBrokerRows(brokers, properties, viewings).slice(0, 6);
  if (rows.length === 0) {
    return [{ label: 'Chưa có', current: 0, previous: 0 }];
  }
  return rows.map((row) => ({
    label: shortName(row.name),
    current: row.listings,
    previous: row.confirmedViewings,
  }));
}
```

- [ ] **Step 9: Cập nhật `buildBrokerRows`**

Đổi:
```javascript
function buildBrokerRows(brokers, properties) {
  return brokers.map((broker) => {
    const brokerProperties = properties.filter((property) => property.broker?.id === broker.id || property.broker?.email === broker.email);
    const closed = brokerProperties.filter((property) => ['SOLD', 'RENTED'].includes(property.rawStatus)).length;
    const revenue = brokerProperties.reduce((sum, property) => sum + estimatePropertyRevenue(property), 0);
    return {
      id: broker.id,
      name: broker.fullName || broker.username || broker.email || 'Môi giới',
      status: broker.status,
      listings: brokerProperties.length,
      performance: Math.min(100, Math.round((closed / Math.max(1, brokerProperties.length)) * 100)),
      revenue,
    };
  }).sort((a, b) => b.revenue - a.revenue || b.listings - a.listings);
}
```
thành:
```javascript
function buildBrokerRows(brokers, properties, viewings) {
  return brokers.map((broker) => {
    const brokerProperties = properties.filter((property) => property.broker?.id === broker.id || property.broker?.email === broker.email);
    const brokerPropertyIds = new Set(brokerProperties.map((property) => property.id));
    const closed = brokerProperties.filter((property) => ['SOLD', 'RENTED'].includes(property.rawStatus)).length;
    const confirmedViewings = viewings.filter((viewing) => (
      viewing.status === 'CONFIRMED' && brokerPropertyIds.has(viewing.propertyId)
    )).length;
    return {
      id: broker.id,
      name: broker.fullName || broker.username || broker.email || 'Môi giới',
      status: broker.status,
      listings: brokerProperties.length,
      performance: Math.min(100, Math.round((closed / Math.max(1, brokerProperties.length)) * 100)),
      confirmedViewings,
      activityScore: brokerProperties.length + confirmedViewings,
    };
  }).sort((a, b) => b.activityScore - a.activityScore || b.listings - a.listings);
}
```

- [ ] **Step 10: Xóa `estimatePropertyRevenue`**

Xóa:
```javascript
function estimatePropertyRevenue(property) {
  const rawPrice = Number(property.rawPrice || 0);
  if (rawPrice > 0) return Math.max(1_200_000, Math.round(rawPrice * 0.012));
  if (property.rawStatus === 'SOLD') return 18000000;
  if (property.rawStatus === 'RENTED') return 3500000;
  return 900000;
}
```

- [ ] **Step 11: Chạy test, xác nhận PASS**

```bash
cd frontend-react && npx vitest run --environment jsdom src/pages/admin/ReportsSection.test.jsx
```
Expected: PASS.

- [ ] **Step 12: Chạy toàn bộ test frontend**

```bash
cd frontend-react && npm test -- --run
```
Expected: tất cả PASS.

- [ ] **Step 13: Commit**

```bash
git add frontend-react/src/pages/admin/ReportsSection.jsx frontend-react/src/pages/admin/ReportsSection.test.jsx
git commit -m "refactor(admin): rank top brokers by activity (listings + confirmed viewings) instead of estimated revenue"
```

---

## Self-Review Notes (đã kiểm tra khi viết plan)

- **Spec coverage**: mục 1 (xóa trang broker revenue) → Task 1. Mục 2 (KPI+chart broker Tổng quan) → Task 2. Mục 3 (KPI+chart admin Tổng quan) → Task 3. Mục 4 (Top môi giới) → Task 4. Mục 5 (test) → mỗi task tự cập nhật test liên quan.
- **Placeholder scan**: không còn "TBD"/code thiếu — mọi block đầy đủ, kể cả nhánh sửa lại test ở Task 1 Step 2 (viết ra rồi tự sửa vì phát hiện assertion sai ngay trong lúc viết plan, để tránh implementer bối rối).
- **Type consistency**: `buildActivitySeries`/`buildSystemActivitySeries` đều trả `{label, current, previous}` khớp `ThreeDGroupedBarChart` (`data: [{current, previous}]`, đã xác nhận qua `Charts.jsx:173-176`). `buildBrokerRows` (Task 4) trả `activityScore`/`confirmedViewings` — chỉ dùng nội bộ trong `ReportsSection.jsx`, không xung đột tên với Task 2/3 (khác file).
- **Rủi ro đã note trong Global Constraints**: không dùng git checkout/restore; đọc file tươi trước khi sửa vì các file này (đặc biệt `BrokerDashboard.jsx`) đã qua nhiều lần sửa ở các nhóm trước.
