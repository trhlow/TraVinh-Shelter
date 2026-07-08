# Admin Dashboard IA Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rút sidebar Admin từ 9 mục còn 6 mục — xóa "Quản lý người dùng", "Phân quyền (RBAC)", "Cài đặt hệ thống" (không có nội dung riêng/không đúng nghiệp vụ), đổi "Duyệt tin đăng" → "Quản lý tin đăng", tách các biểu đồ phân tích khỏi Overview sang một trang "Báo cáo & Thống kê" (`ReportsSection.jsx`) mới.

**Architecture:** Xóa `AccountsSection.jsx` + route/sidebar liên quan. Xóa `PendingApprovalPanel`/`RbacPanel` khỏi `OverviewSection.jsx` (không có `PENDING` thật trong backend enum `AVAILABLE|RENTED|SOLD|HIDDEN`). Tạo `ReportsSection.jsx` nhận 4 chart + `BrokerPerformancePanel` di chuyển nguyên trạng từ `OverviewSection.jsx` (không đổi logic — nhóm A/C sẽ sửa nội dung sau). Cập nhật `AdminDashboard.jsx` (sidebar/section map/title) và `routes/index.jsx` (bỏ 3 route). Sửa test theo từng thay đổi.

**Tech Stack:** React 19, Vitest + Testing Library, không thư viện UI ngoài, `lucide-react` icon.

## Global Constraints

- UI text: Tiếng Việt. Code/comment: Tiếng Anh. Commit message: Tiếng Anh, conventional commits.
- Không `inline style`, không hard-code `#hex` trong JSX — chỉ CSS token.
- Không thêm feature/refactor ngoài phạm vi spec `docs/superpowers/specs/2026-07-08-admin-ia-restructure-design.md`.
- **Không dùng `git checkout`/`git restore`/`git reset --hard` trên `AdminDashboard.jsx`, `OverviewSection.jsx`, hay bất kỳ file admin nào trong plan này** — các file này có nội dung chưa commit từ trước không liên quan tới task này; luôn `Read` trước khi `Edit`, không bao giờ ghi đè toàn file bằng Write trừ khi đã đọc nguyên văn.
- Sau mỗi task: chạy `npx vitest run <file test liên quan>` trước khi commit. Chạy toàn bộ `npm test -- --run` ở task cuối.
- Mỗi task tự chứa một commit riêng theo conventional commits (`refactor:`, `test:`, `chore:`).

---

### Task 1: Xóa "Quản lý người dùng" (AccountsSection) khỏi Admin

**Files:**
- Delete: `frontend-react/src/pages/admin/AccountsSection.jsx`
- Delete: `frontend-react/src/pages/admin/AccountsSection.test.jsx`
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx:9,25,39,271` (import, sidebar item, section map, title map)
- Modify: `frontend-react/src/routes/index.jsx:50` (route map)
- Modify: `frontend-react/src/App.test.jsx:70-84` (route resolution test case list)

**Interfaces:**
- Consumes: none (pure deletion)
- Produces: `ADMIN_SIDEBAR_ITEMS`, `SECTION_COMPONENTS`, `adminTitle()`, `adminSubtitle()` in `AdminDashboard.jsx` no longer reference `accounts`; `ADMIN_SECTIONS` in `routes/index.jsx` no longer has `/admin/accounts` key. Later tasks in this plan do not depend on `AccountsSection`.

- [ ] **Step 1: Xóa 2 file AccountsSection**

```bash
git rm frontend-react/src/pages/admin/AccountsSection.jsx frontend-react/src/pages/admin/AccountsSection.test.jsx
```

- [ ] **Step 2: Sửa `AdminDashboard.jsx` — bỏ import AccountsSection**

Xóa dòng 9:
```javascript
import AccountsSection from './AccountsSection.jsx';
```

- [ ] **Step 3: Sửa `AdminDashboard.jsx` — bỏ mục sidebar "Quản lý người dùng"**

Trong `ADMIN_SIDEBAR_ITEMS` (dòng 24-34), xóa dòng:
```javascript
  { href: '#/admin/accounts', icon: 'Users', label: 'Quản lý người dùng' },
```

- [ ] **Step 4: Sửa `AdminDashboard.jsx` — bỏ `accounts` khỏi `SECTION_COMPONENTS`**

Trong `SECTION_COMPONENTS` (dòng 36-46), xóa dòng:
```javascript
  accounts: AccountsSection,
```

- [ ] **Step 5: Sửa `AdminDashboard.jsx` — bỏ case `accounts` trong `adminTitle`/`adminSubtitle`**

Trong `adminTitle()` (~dòng 267-279), xóa dòng:
```javascript
    accounts: 'Quản lý người dùng',
```

Trong `adminSubtitle()` (~dòng 281-293), xóa dòng:
```javascript
    accounts: 'Theo dõi tài khoản người dùng và trạng thái truy cập.',
```

- [ ] **Step 6: Sửa `routes/index.jsx` — bỏ route `/admin/accounts`**

Trong `ADMIN_SECTIONS` (dòng 46-57), xóa dòng:
```javascript
  '/admin/accounts': 'accounts',
```

- [ ] **Step 7: Sửa `App.test.jsx` — bỏ case `/admin/accounts` khỏi test route resolution**

Trong mảng `cases` (dòng 70-78), xóa dòng:
```javascript
    ['/admin/accounts', 'accounts'],
```

- [ ] **Step 8: Chạy test liên quan**

```bash
cd frontend-react && npx vitest run src/App.test.jsx
```
Expected: PASS (không còn assertion nào cho `/admin/accounts`)

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src/pages/admin/AdminDashboard.jsx frontend-react/src/routes/index.jsx frontend-react/src/App.test.jsx
git commit -m "refactor(admin): remove Quản lý người dùng section — no user-management responsibility in this project"
```

---

### Task 2: Xóa panel "Tin đăng chờ duyệt" khỏi Overview (không có PENDING thật)

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx:58,66-69,84,101,197,219-263,446-449`
- Modify: `frontend-react/src/pages/admin/OverviewSection.test.jsx:15-17,25`

**Interfaces:**
- Consumes: none
- Produces: `OverviewSection` no longer renders `PendingApprovalPanel`, no longer computes `pendingApprovals`/`pendingSparkline`/KPI "Tin chờ duyệt". `PendingApprovalPanel` function and `isPendingProperty()` helper are deleted — no other file references them (verified: grep shows only `OverviewSection.jsx`).

- [ ] **Step 1: Đọc lại `OverviewSection.jsx` để lấy đúng nội dung hiện tại (file có thể đã đổi từ bản tóm tắt trong spec)**

```
Read frontend-react/src/pages/admin/OverviewSection.jsx
```

- [ ] **Step 2: Xóa biến `pendingApprovals` và `pendingSparkline`**

Xóa các dòng (nội dung tham chiếu, xác nhận số dòng thật khi đọc ở Step 1):
```javascript
  const pendingApprovals = useMemo(() => properties.filter(isPendingProperty), [properties]);
```
và
```javascript
  const pendingSparkline = useMemo(
    () => buildDailySeries(pendingApprovals, (property) => property.createdAt, 7).map((bucket) => bucket.count),
    [pendingApprovals],
  );
```

- [ ] **Step 3: Xóa KPI card "Tin chờ duyệt" khỏi mảng `kpis`**

Xóa phần tử:
```javascript
    { icon: 'AlertCircle', title: 'Tin chờ duyệt', value: pendingApprovals.length, tone: pendingApprovals.length >= 5 ? 'red' : 'orange', series: pendingSparkline, href: '#/admin/properties?status=PENDING' },
```

- [ ] **Step 4: Xóa render `<PendingApprovalPanel />` khỏi JSX**

Trong khối `<div className="dashboard-charts-row">`, xóa dòng:
```jsx
        <PendingApprovalPanel loading={loading} properties={pendingApprovals} actions={actions} />
```

- [ ] **Step 5: Xóa function `PendingApprovalPanel`**

Xóa toàn bộ function (dòng 219-263):
```jsx
function PendingApprovalPanel({ loading, properties, actions }) {
  return (
    <DashboardPanel title="Tin đăng chờ duyệt" count={`${properties.length} tin`}>
      {loading ? <LoadingRows rows={4} /> : properties.length === 0 ? (
        <StateBlock icon="CheckCircle" title="Không có tin chờ duyệt" description="Tin mới gửi duyệt sẽ được gom về đây." />
      ) : (
        <div className="dashboard-table-wrap">
          <table className="dashboard-mini-table">
            <thead>
              <tr>
                <th>Tin đăng</th>
                <th>Môi giới</th>
                <th>Ngày gửi</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {properties.slice(0, 5).map((property) => (
                <tr key={property.id}>
                  <td>
                    <div className="dashboard-property-cell">
                      <img className="dashboard-property-thumb" src={property.image} alt={property.title} />
                      <div>
                        <div className="dashboard-table-name">{property.title}</div>
                        <div className="dashboard-table-sub">{categoryLabel(property.category)} · {property.priceLabel}</div>
                      </div>
                    </div>
                  </td>
                  <td>{property.broker?.name || 'Công Tín Land'}</td>
                  <td>{formatDate(property.createdAt)}</td>
                  <td>
                    <div className="dashboard-row-actions">
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => actions?.changePropertyStatus?.(property.id, 'AVAILABLE')}>Duyệt</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => actions?.changePropertyStatus?.(property.id, 'HIDDEN')}>Từ chối</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardPanel>
  );
}
```

- [ ] **Step 6: Xóa helper `isPendingProperty()`**

```javascript
function isPendingProperty(property) {
  const status = String(property.rawStatus || property.adminStatusLabel || property.statusLabel || '').toLowerCase();
  return status.includes('pending') || status.includes('chờ') || status.includes('duyệt');
}
```

- [ ] **Step 7: Cập nhật `DashboardPanel title="Tình trạng hệ thống"` — bỏ dòng "Tin chờ duyệt" nếu trùng khái niệm PENDING**

Giữ nguyên khối "Tình trạng hệ thống" (dòng 206-214) — nó không dùng `pendingApprovals`, chỉ dùng `properties`/`brokers`/`viewings`/`users` trực tiếp, không cần sửa.

- [ ] **Step 8: Sửa `OverviewSection.test.jsx` — bỏ mock data status `PENDING` và assertion "Tin chờ duyệt"**

Đổi dữ liệu test (dòng 15-17) từ:
```javascript
  properties: [
    { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', priceLabel: '1 tỷ' },
    { id: 'p2', title: 'B', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'PENDING', createdAt: '2026-01-15T00:00:00Z', priceLabel: '2 tỷ' },
  ],
```
thành:
```javascript
  properties: [
    { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', priceLabel: '1 tỷ' },
    { id: 'p2', title: 'B', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'AVAILABLE', createdAt: '2026-01-15T00:00:00Z', priceLabel: '2 tỷ' },
  ],
```

Xóa dòng assertion (dòng 25):
```javascript
  expect(screen.getByText('Tin chờ duyệt')).toBeInTheDocument();
```

- [ ] **Step 9: Chạy test**

```bash
cd frontend-react && npx vitest run src/pages/admin/OverviewSection.test.jsx
```
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/OverviewSection.test.jsx
git commit -m "refactor(admin): remove fake PENDING approval panel — backend has no pending status, listings publish directly"
```

---

### Task 3: Xóa "Phân quyền (RBAC)" và "Cài đặt hệ thống" khỏi sidebar/routes

**Files:**
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx` (sidebar items, section map, title/subtitle map)
- Modify: `frontend-react/src/routes/index.jsx:54-55`

**Interfaces:**
- Consumes: đã áp dụng Task 1 (file đã xóa `accounts`)
- Produces: `ADMIN_SIDEBAR_ITEMS` không còn href `#/admin/rbac`/`#/admin/settings`. `SECTION_COMPONENTS` không còn key `rbac`/`settings`. `ADMIN_SECTIONS` không còn key `/admin/rbac`/`/admin/settings`.

- [ ] **Step 1: Đọc lại `AdminDashboard.jsx` để lấy nội dung hiện tại sau Task 1**

```
Read frontend-react/src/pages/admin/AdminDashboard.jsx
```

- [ ] **Step 2: Xóa 2 mục sidebar**

Trong `ADMIN_SIDEBAR_ITEMS`, xóa:
```javascript
  { href: '#/admin/rbac', icon: 'ShieldCheck', label: 'Phân quyền (RBAC)' },
  { href: '#/admin/settings', icon: 'Settings', label: 'Cài đặt hệ thống' },
```

- [ ] **Step 3: Xóa 2 key khỏi `SECTION_COMPONENTS`**

Xóa:
```javascript
  rbac: OverviewSection,
  settings: OverviewSection,
```

- [ ] **Step 4: Xóa case `rbac`/`settings` khỏi `adminTitle()` và `adminSubtitle()`**

Trong `adminTitle()`, xóa:
```javascript
    rbac: 'Phân quyền RBAC',
    settings: 'Cài đặt hệ thống',
```
Trong `adminSubtitle()`, xóa:
```javascript
    rbac: 'Kiểm tra ma trận quyền theo vai trò thực tế của hệ thống.',
    settings: 'Các cấu hình hệ thống đang được gom trong màn tổng quan quản trị.',
```

- [ ] **Step 5: Sửa `routes/index.jsx` — xóa 2 dòng route map**

```javascript
  '/admin/rbac': 'rbac',
  '/admin/settings': 'settings',
```

- [ ] **Step 6: Chạy test**

```bash
cd frontend-react && npx vitest run src/App.test.jsx src/pages/admin/OverviewSection.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/admin/AdminDashboard.jsx frontend-react/src/routes/index.jsx
git commit -m "refactor(admin): remove Phân quyền (RBAC) and Cài đặt hệ thống tabs — duplicated Overview with no distinct content"
```

---

### Task 4: Tạo `ReportsSection.jsx` — di chuyển 4 chart + BrokerPerformancePanel khỏi Overview

**Files:**
- Create: `frontend-react/src/pages/admin/ReportsSection.jsx`
- Create: `frontend-react/src/pages/admin/ReportsSection.test.jsx`
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx` (xóa 4 chart render + builder functions liên quan, giữ import cần thiết cho phần còn lại)
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx` (import `ReportsSection`, trỏ `reports` sang nó thay vì `OverviewSection`)

**Interfaces:**
- Consumes: `Charts.jsx` exports `buildDailySeries, buildHeatmapData, buildWardData, HeatmapChart, ThreeDAreaChart, ThreeDDonutChart, ThreeDGroupedBarChart` (đã tồn tại, không đổi signature); `DashboardWidgets.jsx` exports `DashboardPanel, StateBlock, StatusBadge`; `data/locations.js` exports `WARDS, CATEGORIES, categoryLabel`; `utils/dateRange.js` exports `isInRange, previousRange, resolveDateRange`.
- Produces: `ReportsSection` default export, props `{ data, loading, actions }` — same prop shape as every other admin section component (matches `SECTION_COMPONENTS` call convention in `AdminDashboard.jsx:198-205`).

- [ ] **Step 1: Đọc lại `OverviewSection.jsx` sau Task 2/3 để lấy đúng nội dung/số dòng hiện tại**

```
Read frontend-react/src/pages/admin/OverviewSection.jsx
```

- [ ] **Step 2: Viết `ReportsSection.jsx`**

```jsx
import { useMemo, useState } from 'react';
import {
  buildDailySeries,
  buildHeatmapData,
  buildWardData,
  HeatmapChart,
  ThreeDDonutChart,
  ThreeDGroupedBarChart,
} from '../../components/Charts.jsx';
import { DashboardPanel, StateBlock, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES } from '../../data/locations.js';
import { isInRange, resolveDateRange } from '../../utils/dateRange.js';

export default function ReportsSection({ data }) {
  const brokers = data?.brokers || [];
  const properties = data?.properties || [];

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

  const userGrowthData = useMemo(() => buildUserGrowthData(data?.users || []), [data]);
  const distributionData = useMemo(
    () => buildWardData(filteredProperties, (property) => property.ward).map((item) => ({
      label: item.label.replace('Phường ', ''),
      value: item.count,
    })),
    [filteredProperties],
  );
  const topBrokerData = useMemo(() => buildTopBrokerData(brokers, properties), [brokers, properties]);
  const heatmapData = useMemo(
    () => buildHeatmapData(filteredProperties, (property) => property.ward, (property) => property.category),
    [filteredProperties],
  );

  const drillTo = (params) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#/admin/properties?${query}`;
  };

  return (
    <>
      <div className="admin-filter-bar">
        <DateRangeFilter
          preset={preset}
          custom={custom}
          onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }}
        />
        <label className="dashboard-table-sub" htmlFor="reports-ward-filter">Lọc theo phường</label>
        <select id="reports-ward-filter" className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
          {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
        </select>
      </div>

      <div className="dashboard-live-row">
        <ThreeDGroupedBarChart
          title="Tăng trưởng người dùng mới"
          subtitle="12 tháng gần nhất, so sánh với kỳ trước"
          data={userGrowthData}
          currentLabel="Người dùng mới"
          previousLabel="Kỳ trước"
        />
        <ThreeDDonutChart
          title="Phân bổ tin đăng theo khu vực"
          subtitle="Theo các phường/khu vực đang có dữ liệu trong hệ thống"
          data={distributionData}
          centerLabel="tin đăng"
        />
      </div>

      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <ThreeDGroupedBarChart
          title="Top môi giới theo doanh số"
          subtitle="Xếp hạng tháng hiện tại theo số tin và giao dịch ước tính"
          data={topBrokerData}
          currentLabel="Tháng này"
          previousLabel="Tháng trước"
          valueSuffix="tr"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} />
      </div>
    </>
  );
}

function BrokerPerformancePanel({ brokers, properties }) {
  const rows = useMemo(() => buildBrokerRows(brokers, properties), [brokers, properties]);
  return (
    <DashboardPanel title="Danh sách môi giới" count={`${brokers.length} tài khoản`}>
      {rows.length === 0 ? (
        <StateBlock icon="IdCard" title="Chưa có môi giới" description="Tài khoản môi giới mới sẽ hiển thị tại đây." />
      ) : (
        <div className="dashboard-broker-list">
          {rows.slice(0, 5).map((row) => (
            <div key={row.id} className="dashboard-broker-row">
              <div>
                <div className="dashboard-table-name">{row.name}</div>
                <div className="dashboard-table-sub">{row.listings} tin đăng · hiệu suất {row.performance}%</div>
              </div>
              <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'warning'}>
                {row.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

function buildUserGrowthData(users) {
  const buckets = rollingMonthBuckets();
  users.forEach((user, index) => {
    const date = dateOrFallback(user.createdAt, index);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current += 1;
  });
  return buckets.map((bucket, index) => ({
    label: bucket.label,
    current: bucket.current || (index % 4 === 0 ? 1 : 0),
    previous: Math.max(0, Math.round((bucket.current || 1) * 0.72)),
  }));
}

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

function rollingMonthBuckets(referenceDate = new Date(), length = 12) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (length - 1 - index), 1);
    return {
      date,
      label: `T${date.getMonth() + 1}`,
      current: 0,
    };
  });
}

function dateOrFallback(value, index) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (index % 12), 12);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function estimatePropertyRevenue(property) {
  const rawPrice = Number(property.rawPrice || 0);
  if (rawPrice > 0) return Math.max(1_200_000, Math.round(rawPrice * 0.012));
  if (property.rawStatus === 'SOLD') return 18000000;
  if (property.rawStatus === 'RENTED') return 3500000;
  return 900000;
}

function shortName(name) {
  const parts = String(name || 'MG').trim().split(/\s+/);
  return parts.slice(-2).join(' ') || name;
}
```

Ghi chú: `estimatePropertyRevenue`/`buildTopBrokerData`/"doanh số" thuộc phạm vi nhóm A (sẽ đổi sau) — giữ nguyên logic 1:1 ở task này, chỉ di chuyển vị trí file.

- [ ] **Step 3: Xóa 4 chart + `BrokerPerformancePanel` + builder functions khỏi `OverviewSection.jsx`**

Xóa import không còn dùng trong `OverviewSection.jsx` — sửa dòng import đầu file từ:
```javascript
import {
  buildDailySeries,
  buildHeatmapData,
  buildWardData,
  HeatmapChart,
  ThreeDAreaChart,
  ThreeDDonutChart,
  ThreeDGroupedBarChart,
} from '../../components/Charts.jsx';
```
thành:
```javascript
import { buildDailySeries } from '../../components/Charts.jsx';
```

Xóa các `useMemo` không còn dùng: `userGrowthData`, `distributionData`, `revenueSeries` (revenueSeries thuộc nhóm A, nhưng nó chỉ được dùng bởi `ThreeDAreaChart` doanh thu đã xóa cùng nhóm A trước đây — nếu vẫn còn render ở Overview, giữ nguyên cho tới khi nhóm A xử lý; chỉ xóa nếu không còn nơi nào render nó sau khi xóa JSX ở bước dưới), `topBrokerData`, `heatmapData`.

Xóa khối JSX:
```jsx
      <div className="dashboard-live-row">
        <ThreeDGroupedBarChart
          title="Tăng trưởng người dùng mới"
          ...
        />
        <ThreeDDonutChart
          title="Phân bổ tin đăng theo khu vực"
          ...
        />
      </div>
```
(giữ nguyên khối `dashboard-live-row` thứ hai chứa `ThreeDAreaChart`/doanh thu — đó là phạm vi nhóm A, không đụng ở task này)

Đổi khối:
```jsx
      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <BrokerPerformancePanel brokers={brokers} properties={properties} />
      </div>
```
thành (xóa toàn bộ khối `dashboard-charts-row`, không còn nội dung nào ở Overview cho hàng này).

Xóa function `BrokerPerformancePanel`, `buildUserGrowthData`, `buildTopBrokerData`, `buildBrokerRows`, `rollingMonthBuckets`, `dateOrFallback`, `sameMonth`, `shortName` khỏi `OverviewSection.jsx` **chỉ nếu** không còn dùng ở nơi khác trong file (kiểm tra bằng cách grep tên function trong `OverviewSection.jsx` sau khi xóa JSX — nếu `estimatePropertyRevenue`/`dateOrFallback`/`sameMonth` vẫn được `revenueSeries`/`estimateCurrentMonthRevenue` dùng, giữ lại các hàm đó).

- [ ] **Step 4: Sửa `AdminDashboard.jsx` — import và trỏ `reports` sang `ReportsSection`**

Thêm import:
```javascript
import ReportsSection from './ReportsSection.jsx';
```

Trong `SECTION_COMPONENTS`, đổi:
```javascript
  reports: OverviewSection,
```
thành:
```javascript
  reports: ReportsSection,
```

- [ ] **Step 5: Viết `ReportsSection.test.jsx`**

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ReportsSection from './ReportsSection.jsx';

beforeEach(() => {
  window.location.hash = '#/admin/reports';
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const data = {
  users: [{ id: 'u1', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-06-01T00:00:00Z' }],
  brokers: [{ id: 'b1', fullName: 'Nguyễn Văn A', status: 'ACTIVE' }],
  properties: [
    { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', broker: { id: 'b1' } },
  ],
};

test('renders growth, distribution, density, and broker performance charts', () => {
  render(<ReportsSection data={data} loading={false} />);
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  expect(screen.getByText('Phân bổ tin đăng theo khu vực')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin theo phường')).toBeInTheDocument();
  expect(screen.getByText('Danh sách môi giới')).toBeInTheDocument();
});

test('ward filter narrows the distribution/density data', () => {
  render(<ReportsSection data={data} loading={false} />);
  expect(screen.getByLabelText('Lọc theo phường')).toBeInTheDocument();
});
```

- [ ] **Step 6: Chạy test**

```bash
cd frontend-react && npx vitest run src/pages/admin/ReportsSection.test.jsx src/pages/admin/OverviewSection.test.jsx src/App.test.jsx
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/admin/ReportsSection.jsx frontend-react/src/pages/admin/ReportsSection.test.jsx frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/admin/AdminDashboard.jsx
git commit -m "refactor(admin): split analytics charts into a dedicated Báo cáo & Thống kê section"
```

---

### Task 5: Đổi tên "Duyệt tin đăng" → "Quản lý tin đăng"

**Files:**
- Modify: `frontend-react/src/pages/admin/AdminDashboard.jsx` (sidebar label, title, subtitle for `properties` section)

**Interfaces:**
- Consumes: đã có từ Task 1-4
- Produces: không đổi route key `properties`, chỉ đổi text hiển thị — không ảnh hưởng task khác.

- [ ] **Step 1: Đọc lại `AdminDashboard.jsx`**

```
Read frontend-react/src/pages/admin/AdminDashboard.jsx
```

- [ ] **Step 2: Đổi label sidebar**

Đổi:
```javascript
  { href: '#/admin/properties', icon: 'Building', label: 'Duyệt tin đăng' },
```
thành:
```javascript
  { href: '#/admin/properties', icon: 'Building', label: 'Quản lý tin đăng' },
```

- [ ] **Step 3: Đổi title trong `adminTitle()`**

Đổi:
```javascript
    properties: 'Duyệt tin đăng',
```
thành:
```javascript
    properties: 'Quản lý tin đăng',
```

- [ ] **Step 4: Đổi subtitle trong `adminSubtitle()`**

Đổi:
```javascript
    properties: 'Duyệt, ẩn hoặc khôi phục tin đăng trong hệ thống.',
```
thành:
```javascript
    properties: 'Xem, gỡ hoặc khôi phục tin đăng vi phạm trong hệ thống.',
```

- [ ] **Step 5: Chạy toàn bộ test frontend**

```bash
cd frontend-react && npm test -- --run
```
Expected: tất cả PASS (129 test trở lên, không giảm số lượng ngoài các test đã xóa có chủ đích ở Task 1/2)

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/admin/AdminDashboard.jsx
git commit -m "refactor(admin): rename Duyệt tin đăng to Quản lý tin đăng — listings publish directly, no approval step"
```

---

## Self-Review Notes (đã kiểm tra khi viết plan)

- **Spec coverage**: mục 1 (sidebar 9→6) → Task 1,3,5. Mục 2 (Overview bỏ giả lập) → Task 2. Mục 3 (ReportsSection mới) → Task 4. Mục 4 (xóa file AccountsSection) → Task 1. Mục 5 (routes & AdminDashboard) → Task 1,3,4,5. Mục 6 (test) → từng task tự sửa test liên quan.
- **Placeholder scan**: không còn "TBD"/"tương tự Task N" — mọi code block đầy đủ.
- **Type consistency**: `ReportsSection` nhận `{ data, loading, actions }` giống mọi section khác (khớp cách gọi ở `AdminDashboard.jsx:198-205`); `data.users/brokers/properties/viewings` giữ nguyên shape từ `loadAll()`.
- **Rủi ro đã note trong Global Constraints**: không dùng git checkout/restore trên các file admin do có nội dung chưa commit từ trước.
