# Dashboard Chart + Social Links Frontend Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa biểu đồ hoạt động tính theo tháng dương lịch (thay vì cửa sổ trượt 30 ngày) với tooltip theo ngày, và bổ sung link mạng xã hội (broker profile, property detail, footer) — toàn bộ chỉ ở frontend.

**Architecture:** 5 thay đổi độc lập trong `frontend-react/src/`: (1) hàm mới `buildMonthlySeries` + tooltip trong `Charts.jsx`, áp dụng ở 2 dashboard; (2) 3 field social vào `BrokerDashboard.jsx` profile form + mock API; (3) gộp CSS/JSX nút gọi+Zalo trong `PropertyDetailPage.jsx`; (4) khôi phục icon Facebook+TikTok trong `MainLayout.jsx` footer.

**Tech Stack:** React 19, Vitest + Testing Library, CSS custom properties (không dùng thư viện chart/UI ngoài).

## Global Constraints

- Không sửa backend (Java) — theo yêu cầu "chỉ sửa frontend"; backend đã hỗ trợ sẵn `zaloUrl`/`facebookUrl`/`tiktokUrl`.
- Không hard-code `#hex` trong JSX/CSS mới — chỉ dùng CSS custom property (token đã có: `--color-zalo`, `--color-facebook`; cần thêm `--color-tiktok`).
- Chỉ dùng `lucide-react` cho icon; TikTok không có trong lucide → dùng lại SVG vẽ tay từ commit `96c28f2` (đã revert).
- Không `inline style` (trừ style động đã có sẵn trong file, ví dụ set width/opacity theo data — giữ nguyên convention hiện tại của Charts.jsx).
- Chạy `cd frontend-react && npm test -- --run` phải pass trước khi coi bất kỳ task nào là xong.
- Border radius / màu / spacing theo token trong `.claude/rules/design.md` (`--radius-md`, `--color-canvas`, `--color-hairline`, v.v.) — không tạo giá trị mới tùy tiện.

---

### Task 1: `buildMonthlySeries` — bucket theo tháng dương lịch

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx:190-211` (thêm hàm mới ngay sau `buildDailySeries`, không sửa `buildDailySeries`)
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Produces: `buildMonthlySeries(items: Array<T>, getDate: (item: T) => string | null, referenceDate: Date = new Date()): Array<{ date: string, count: number }>` — export mới từ `Charts.jsx`, dùng chung `dayKey()` đã có (dòng 183-188).

- [ ] **Step 1: Viết test thất bại cho `buildMonthlySeries`**

Thêm vào cuối phần "── buildDailySeries ──" trong `frontend-react/src/components/Charts.test.jsx` (sau dòng 80, trước comment `// ── TrendAreaChart ──`):

```js
// ── buildMonthlySeries ────────────────────────────────────

test('buildMonthlySeries returns one bucket per day of the reference month', () => {
  const series = buildMonthlySeries([], () => null, new Date('2026-07-15T00:00:00'));
  expect(series).toHaveLength(31); // July has 31 days
  expect(series[0].date).toBe('2026-07-01');
  expect(series[30].date).toBe('2026-07-31');
  series.forEach((bucket) => expect(bucket.count).toBe(0));
});

test('buildMonthlySeries handles a 28-day February', () => {
  const series = buildMonthlySeries([], () => null, new Date('2026-02-10T00:00:00'));
  expect(series).toHaveLength(28);
  expect(series[27].date).toBe('2026-02-28');
});

test('buildMonthlySeries counts items into the bucket matching their exact day', () => {
  const items = [
    { createdAt: '2026-07-05T10:00:00' },
    { createdAt: '2026-07-05T22:00:00' },
    { createdAt: '2026-07-20T00:00:00' },
  ];
  const series = buildMonthlySeries(items, (item) => item.createdAt, new Date('2026-07-25T00:00:00'));
  expect(series.find((bucket) => bucket.date === '2026-07-05').count).toBe(2);
  expect(series.find((bucket) => bucket.date === '2026-07-20').count).toBe(1);
});

test('buildMonthlySeries ignores items outside the reference month', () => {
  const items = [{ createdAt: '2026-06-30T00:00:00' }, { createdAt: '2026-08-01T00:00:00' }];
  const series = buildMonthlySeries(items, (item) => item.createdAt, new Date('2026-07-15T00:00:00'));
  const total = series.reduce((sum, bucket) => sum + bucket.count, 0);
  expect(total).toBe(0);
});

test('buildMonthlySeries leaves future days in the current month at 0', () => {
  // referenceDate = "today" = July 7 — days 8..31 have no items and must read 0
  const items = [{ createdAt: '2026-07-07T00:00:00' }];
  const series = buildMonthlySeries(items, (item) => item.createdAt, new Date('2026-07-07T00:00:00'));
  const futureDays = series.filter((bucket) => bucket.date > '2026-07-07');
  expect(futureDays.length).toBe(24);
  futureDays.forEach((bucket) => expect(bucket.count).toBe(0));
});
```

Cập nhật dòng import ở đầu file (dòng 4-6) để thêm `buildMonthlySeries`:

```js
import {
  buildDailySeries, buildHeatmapData, buildMonthlySeries, buildWardData, HeatmapChart, Sparkline, TrendAreaChart, WardBarChart,
} from './Charts.jsx';
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx`
Expected: FAIL — `buildMonthlySeries is not a function` (hoặc `undefined`).

- [ ] **Step 3: Implement `buildMonthlySeries`**

Trong `frontend-react/src/components/Charts.jsx`, thêm ngay sau hàm `buildDailySeries` (sau dòng 211, trước `function formatShortDate`):

```js
// Buckets items into one entry per calendar day of `referenceDate`'s month (1st → last
// day), so the monthly activity chart reflects a real calendar month instead of a
// trailing window. Days with no matching item — past or future — read 0 naturally.
export function buildMonthlySeries(items, getDate, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    buckets.push({ date: dayKey(new Date(year, month, day)), count: 0 });
  }
  const indexByDate = new Map(buckets.map((bucket, index) => [bucket.date, index]));
  items.forEach((item) => {
    const raw = getDate(item);
    if (!raw) return;
    const day = new Date(raw);
    if (Number.isNaN(day.getTime())) return;
    const index = indexByDate.get(dayKey(day));
    if (index !== undefined) buckets[index].count += 1;
  });
  return buckets;
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — toàn bộ test trong file, gồm 5 test mới.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx
git commit -m "feat(charts): add buildMonthlySeries for calendar-month activity buckets"
```

---

### Task 2: `TrendAreaChart` — chấm tròn + tooltip theo ngày, tiêu đề động

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx:230-260` (component `TrendAreaChart`)
- Modify: `frontend-react/src/styles/dashboard.css:562-614` (thêm CSS marker + tooltip)
- Test: `frontend-react/src/components/Charts.test.jsx`

**Interfaces:**
- Consumes: `buildMonthlySeries` (Task 1) — `series: Array<{ date: string, count: number }>`.
- Produces: `TrendAreaChart({ title, series, unit })` — behavior không đổi về props, chỉ thêm tương tác hover nội bộ. Không export thêm gì mới.

- [ ] **Step 1: Viết test thất bại cho tooltip hover**

Thêm vào cuối phần "── TrendAreaChart ──" trong `Charts.test.jsx` (sau test hiện tại dòng 84-95):

```js
test('TrendAreaChart renders a dot marker per data point', () => {
  const series = buildMonthlySeries(
    [{ createdAt: '2026-07-05T00:00:00' }],
    (item) => item.createdAt,
    new Date('2026-07-05T00:00:00'),
  );
  const { container } = render(<TrendAreaChart title="Test" series={series} unit="tin" />);
  expect(container.querySelectorAll('.trend-chart-dot')).toHaveLength(series.length);
});

test('TrendAreaChart shows a tooltip with date and count on hover', () => {
  const series = buildMonthlySeries(
    [{ createdAt: '2026-07-05T00:00:00' }, { createdAt: '2026-07-05T12:00:00' }],
    (item) => item.createdAt,
    new Date('2026-07-05T00:00:00'),
  );
  render(<TrendAreaChart title="Test" series={series} unit="tin" />);
  expect(screen.queryByTestId('trend-chart-tooltip')).not.toBeInTheDocument();

  const dots = screen.getAllByTestId('trend-chart-dot');
  fireEvent.mouseMove(dots[4]); // ngày 05/07 = index 4 (ngày 1..5)
  const tooltip = screen.getByTestId('trend-chart-tooltip');
  expect(tooltip).toHaveTextContent('05/07');
  expect(tooltip).toHaveTextContent('2');

  fireEvent.mouseLeave(dots[4]);
  expect(screen.queryByTestId('trend-chart-tooltip')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx -t "TrendAreaChart"`
Expected: FAIL — không tìm thấy `data-testid="trend-chart-dot"` (0 phần tử, không khớp `toHaveLength`).

- [ ] **Step 3: Implement dot markers + tooltip trong `TrendAreaChart`**

Thay toàn bộ hàm `TrendAreaChart` (dòng 230-260 hiện tại) trong `frontend-react/src/components/Charts.jsx` bằng:

```js
/**
 * TrendAreaChart — real daily activity (line + filled area), with a dot marker
 * per day and a hover tooltip showing the exact date + count for that day.
 * Expects `series`: [{ date: 'YYYY-MM-DD', count }], oldest first.
 */
export function TrendAreaChart({ title, series, unit }) {
  const width = 100;
  const height = 32;
  const counts = series.map((point) => point.count);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const linePath = `M${linePathFor(counts, width, height)}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const max = Math.max(...counts, 1);
  const min = Math.min(...counts, 0);
  const span = max - min || 1;
  const stepX = series.length > 1 ? width / (series.length - 1) : width;
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <section className="chart-panel trend-chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="trend-chart-value-row">
        <span className="trend-chart-value">{total}</span>
        {unit && <span className="trend-chart-unit">{unit}</span>}
      </div>
      <div className="trend-chart-svg-wrap">
        <svg className="trend-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="trend-chart-area" d={areaPath} />
          <path className="trend-chart-line" d={linePath} />
          {series.map((point, index) => (
            <circle
              key={point.date}
              data-testid="trend-chart-dot"
              className="trend-chart-dot"
              cx={index * stepX}
              cy={height - ((point.count - min) / span) * height}
              r={activeIndex === index ? 2.2 : 1.4}
              onMouseMove={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>
        {activeIndex !== null && (
          <div
            className="trend-chart-tooltip"
            data-testid="trend-chart-tooltip"
            style={{ left: `${(activeIndex / Math.max(1, series.length - 1)) * 100}%` }}
          >
            {formatShortDate(series[activeIndex].date)}: {series[activeIndex].count} {unit || ''}
          </div>
        )}
      </div>
      <div className="trend-chart-axis">
        <span>{formatShortDate(series[0]?.date)}</span>
        <span>{formatShortDate(series[series.length - 1]?.date)}</span>
      </div>
    </section>
  );
}
```

Thêm `useState` vào import React ở đầu `Charts.jsx` (dòng 1) — hiện tại chỉ import `Fragment`:

```js
import { Fragment, useState } from 'react';
```

- [ ] **Step 4: Thêm CSS cho dot + tooltip**

Trong `frontend-react/src/styles/dashboard.css`, ngay sau khối `.trend-chart-svg` (dòng 588-593), thêm:

```css
.trend-chart-svg-wrap {
  position: relative;
  margin-top: auto;
}

.trend-chart-svg-wrap .trend-chart-svg {
  margin-top: 0;
}

.trend-chart-dot {
  fill: var(--chart-1);
  cursor: pointer;
  transition: r 120ms ease;
}

.trend-chart-tooltip {
  position: absolute;
  top: -8px;
  transform: translate(-50%, -100%);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 12px;
  color: var(--color-ink);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: var(--shadow-card);
  z-index: 1;
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd frontend-react && npx vitest run src/components/Charts.test.jsx`
Expected: PASS — toàn bộ test trong file.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.test.jsx frontend-react/src/styles/dashboard.css
git commit -m "feat(charts): add per-day dot markers and hover tooltip to TrendAreaChart"
```

---

### Task 3: Áp dụng `buildMonthlySeries` vào 2 dashboard + tiêu đề động

**Files:**
- Modify: `frontend-react/src/pages/admin/OverviewSection.jsx:1-4, 60-64, 132-137`
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx:1-2, 175-178, 455-460`
- Test: `frontend-react/src/pages/admin/OverviewSection.test.jsx`, `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`

**Interfaces:**
- Consumes: `buildMonthlySeries(items, getDate, referenceDate)` từ Task 1.

- [ ] **Step 1: Kiểm tra test hiện tại có phụ thuộc tiêu đề "(30 ngày)" hay không**

Run: `cd frontend-react && npx vitest run src/pages/admin/OverviewSection.test.jsx src/pages/BrokerDashboard.filter.test.jsx -t "Hoạt động"`
Expected: không có test nào match (không test nào assert đúng title "(30 ngày)" — xác nhận an toàn để đổi). Nếu có test fail sau bước implement, quay lại đọc và cập nhật test đó ở Step 4.

- [ ] **Step 2: Cập nhật `OverviewSection.jsx`**

Đổi import (dòng 2-4):

```js
import {
  buildDailySeries, buildHeatmapData, buildMonthlySeries, buildWardData, DonutChart, GaugeChart, HeatmapChart, TrendAreaChart, WardBarChart,
} from '../../components/Charts.jsx';
```

Thay khối `activitySeries` (dòng 60-64):

```js
  const activityMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(new Date()),
    [],
  );
  const activitySeries = useMemo(() => {
    const propertySeries = buildMonthlySeries(properties, (property) => property.createdAt);
    const viewingSeries = buildMonthlySeries(viewings, (viewing) => viewing.createdAt);
    return propertySeries.map((bucket, index) => ({ date: bucket.date, count: bucket.count + viewingSeries[index].count }));
  }, [properties, viewings]);
```

Đổi title tại `TrendAreaChart` (dòng 133-137):

```jsx
        <TrendAreaChart
          title={`Hoạt động hệ thống (bài đăng + lịch hẹn, tháng ${activityMonthLabel})`}
          series={activitySeries}
          unit="lượt hoạt động"
        />
```

- [ ] **Step 3: Cập nhật `BrokerDashboard.jsx`**

Đổi import (dòng 2):

```js
import { buildDailySeries, buildMonthlySeries, buildWardData, DonutChart, GaugeChart, HorizontalBarChart, TrendAreaChart, WardBarChart } from '../components/Charts.jsx';
```

Thay `listingActivitySeries` (dòng 175-178):

```js
  const activityMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(new Date()),
    [],
  );
  const listingActivitySeries = useMemo(
    () => buildMonthlySeries(listings, (listing) => listing.createdAt),
    [listings],
  );
```

Đổi title tại `TrendAreaChart` (dòng 456-460):

```jsx
                <TrendAreaChart
                  title={`Hoạt động tin đăng (tháng ${activityMonthLabel})`}
                  series={listingActivitySeries}
                  unit="tin đăng"
                />
```

- [ ] **Step 4: Chạy toàn bộ test 2 file, xác nhận PASS**

Run: `cd frontend-react && npx vitest run src/pages/admin/OverviewSection.test.jsx src/pages/BrokerDashboard.filter.test.jsx src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS. Nếu fail vì assert title cũ "(30 ngày)", sửa test đó để match title mới động theo tháng hiện tại (dùng `new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(new Date())` trong test để build chuỗi mong đợi, tránh hard-code tháng).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/admin/OverviewSection.jsx frontend-react/src/pages/BrokerDashboard.jsx
git commit -m "fix(dashboard): switch activity trend chart to calendar-month buckets"
```

---

### Task 4: Broker profile — thêm Zalo/Facebook/TikTok

**Files:**
- Modify: `frontend-react/src/services/api.js:24-38` (mock `fetchCurrentUser`)
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx:58, 100, 222, 501-506, 772-806` (`profileForm` state, form fields, `ProfileSummary`)
- Test: `frontend-react/src/pages/BrokerDashboard.filter.test.jsx`, `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` (mock `fetchCurrentUser` — verify vẫn pass, không cần field mới vì optional)

**Interfaces:**
- Produces: `profileForm` state shape mở rộng thành `{ fullName, phone, zaloUrl, facebookUrl, tiktokUrl }`. `updateCurrentProfile(token, profileForm)` (đã tồn tại, không đổi signature) giờ gửi thêm 3 field này trong body.

- [ ] **Step 1: Viết test thất bại cho input Facebook trong form profile**

Thêm test mới vào `frontend-react/src/pages/BrokerDashboard.filter.test.jsx` (cuối file, cùng pattern với các test khác trong file — dùng cùng mock `services/api.js` đã khai báo ở đầu file):

```js
test('profile form has Zalo, Facebook, and TikTok fields and submits them', async () => {
  const { updateCurrentProfile } = await import('../services/api.js');
  render(<BrokerDashboard session={session} section="profile" currentPath="/broker/profile" />);

  const zaloInput = await screen.findByLabelText('Zalo');
  const facebookInput = screen.getByLabelText('Facebook');
  const tiktokInput = screen.getByLabelText('TikTok');
  expect(zaloInput).toBeInTheDocument();
  expect(tiktokInput).toBeInTheDocument();

  fireEvent.change(facebookInput, { target: { value: 'https://facebook.com/broker.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

  await vi.waitFor(() => {
    expect(updateCurrentProfile).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ facebookUrl: 'https://facebook.com/broker.test' }),
    );
  });
});
```

Dòng 35 của file (`updateCurrentProfile: vi.fn(),`) hiện **không có** `mockResolvedValue` — `saveProfile` trong `BrokerDashboard.jsx` (dòng 222-236) làm `let nextProfile = await updateCurrentProfile(...)` rồi `setAvatarPreview(nextProfile.avatarUrl || '')`, nên nếu mock trả về `undefined` sẽ throw `Cannot read properties of undefined` ngay khi test này submit form — chưa test nào khác submit form nên chưa lộ ra. Phải sửa dòng 35 thành:

```js
  updateCurrentProfile: vi.fn().mockResolvedValue({ fullName: 'Nguyễn Văn Toàn', phone: '0912345678', avatarUrl: '' }),
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.filter.test.jsx -t "Zalo, Facebook, and TikTok"`
Expected: FAIL — `findByLabelText('Zalo')` không tìm thấy (input chưa tồn tại).

- [ ] **Step 3: Cập nhật mock `fetchCurrentUser` trong `api.js`**

Trong `frontend-react/src/services/api.js`, sửa `fetchCurrentUser` (dòng 24-38):

```js
export async function fetchCurrentUser(token) {
  if (USE_MOCK_API) {
    return delay({
      id: 'mock-user',
      username: 'demo',
      fullName: 'Tài khoản demo',
      phone: '0901234567',
      email: 'demo@congtinland.vn',
      role: 'BROKER',
      status: 'ACTIVE',
      avatarUrl: '',
      zaloUrl: '',
      facebookUrl: '',
      tiktokUrl: '',
    }, 80);
  }
  return request('/users/me', { token });
}
```

- [ ] **Step 4: Mở rộng `profileForm` state trong `BrokerDashboard.jsx`**

Đổi khởi tạo state (dòng 58):

```js
  const [profileForm, setProfileForm] = useState({ fullName: '', phone: '', zaloUrl: '', facebookUrl: '', tiktokUrl: '' });
```

Đổi effect load profile (dòng 100):

```js
        setProfileForm({
          fullName: profileData.fullName || '',
          phone: profileData.phone || '',
          zaloUrl: profileData.zaloUrl || '',
          facebookUrl: profileData.facebookUrl || '',
          tiktokUrl: profileData.tiktokUrl || '',
        });
```

- [ ] **Step 5: Thêm 3 `FormField` vào form "Cập nhật hồ sơ môi giới"**

Trong `frontend-react/src/pages/BrokerDashboard.jsx`, ngay sau `FormField label="Số điện thoại"` (dòng 504-506), trước dòng `<button className="auth-btn" type="submit" ...>` (dòng 507), thêm:

```jsx
                <FormField label="Zalo">
                  <input className="input" type="url" aria-label="Zalo" placeholder="https://zalo.me/..." value={profileForm.zaloUrl} onChange={(event) => setProfileForm((current) => ({ ...current, zaloUrl: event.target.value }))} />
                </FormField>
                <FormField label="Facebook">
                  <input className="input" type="url" aria-label="Facebook" placeholder="https://facebook.com/..." value={profileForm.facebookUrl} onChange={(event) => setProfileForm((current) => ({ ...current, facebookUrl: event.target.value }))} />
                </FormField>
                <FormField label="TikTok">
                  <input className="input" type="url" aria-label="TikTok" placeholder="https://tiktok.com/@..." value={profileForm.tiktokUrl} onChange={(event) => setProfileForm((current) => ({ ...current, tiktokUrl: event.target.value }))} />
                </FormField>
```

`FormField` (dòng 890-897) hiện render `<label className="auth-field-label">{label}</label>` như một text riêng, không bọc `children` và không có `htmlFor`/`id` liên kết tới input. **Không sửa `FormField`** (dùng chung cho toàn bộ form listing khác — đổi cấu trúc nesting sẽ ảnh hưởng CSS của mọi field khác, rủi ro không cần thiết). Thay vào đó dùng `aria-label` trực tiếp trên 3 input mới (như trên) — `getByLabelText`/`findByLabelText` của Testing Library khớp cả `aria-label` lẫn `<label>` liên kết, nên test vẫn hoạt động mà không đổi component dùng chung.

- [ ] **Step 6: Hiển thị trong `ProfileSummary`**

Trong `frontend-react/src/pages/BrokerDashboard.jsx`, sửa `ProfileSummary` (dòng 772-797) — thêm dòng hiển thị sau `ProfileLine label="Số điện thoại"` (dòng 789):

```jsx
        <ProfileLine label="Số điện thoại" value={profile?.phone || profileForm.phone || 'Chưa cập nhật'} />
        {(profile?.facebookUrl || profileForm.facebookUrl) && (
          <ProfileLine label="Facebook" value={profile?.facebookUrl || profileForm.facebookUrl} />
        )}
        {(profile?.zaloUrl || profileForm.zaloUrl) && (
          <ProfileLine label="Zalo" value={profile?.zaloUrl || profileForm.zaloUrl} />
        )}
        {(profile?.tiktokUrl || profileForm.tiktokUrl) && (
          <ProfileLine label="TikTok" value={profile?.tiktokUrl || profileForm.tiktokUrl} />
        )}
```

- [ ] **Step 7: Chạy test, xác nhận PASS**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.filter.test.jsx src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS — bao gồm test mới ở Step 1.

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/services/api.js frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.filter.test.jsx
git commit -m "feat(broker): add Zalo/Facebook/TikTok fields to broker profile form"
```

---

### Task 5: Property Detail — gộp khung điện thoại + Zalo

**Files:**
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx:327-352`
- Modify: `frontend-react/src/styles.css:2138-2180`
- Test: `frontend-react/src/pages/PropertyDetailPage.test.jsx`

**Interfaces:**
- Consumes: `brokerPhone`, `brokerFacebook` đã có sẵn (dòng 134-135), không đổi.

- [ ] **Step 1: Xác nhận test hiện tại vẫn theo đúng hành vi mong đợi**

Đọc lại `frontend-react/src/pages/PropertyDetailPage.test.jsx` dòng 23-35 — 2 test hiện tại chỉ kiểm tra `role: 'link', name: /Facebook/i}` có/không tồn tại đúng href, không đụng cấu trúc phone/zalo. Không cần sửa test này trước, chỉ cần đảm bảo sau khi đổi JSX, 2 test này vẫn pass (verify ở Step 3).

- [ ] **Step 2: Viết test mới cho khung gộp phone+zalo**

Thêm vào cuối `frontend-react/src/pages/PropertyDetailPage.test.jsx`:

```js
test('phone and Zalo live inside one merged contact box', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);

  const phoneLink = screen.getByRole('link', { name: /Gọi ngay/i });
  const zaloLink = screen.getByRole('link', { name: /Chat Zalo|Zalo/i });
  expect(phoneLink.closest('.contact-phone-zalo')).toBe(zaloLink.closest('.contact-phone-zalo'));
  expect(phoneLink.closest('.contact-phone-zalo')).not.toBeNull();
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `cd frontend-react && npx vitest run src/pages/PropertyDetailPage.test.jsx -t "merged contact box"`
Expected: FAIL — `.contact-phone-zalo` không tồn tại (`closest` trả `null`).

- [ ] **Step 4: Sửa JSX trong `PropertyDetailPage.jsx`**

Thay khối `contact-buttons` (dòng 327-352) bằng:

```jsx
              <div className="contact-buttons">
                <div className="contact-phone-zalo">
                  <a href={`tel:${brokerPhone.replace(/\s+/g, '')}`} className="contact-phone-zalo-call">
                    <Icon name="Phone" size={18} />
                    Gọi ngay: {brokerPhone}
                  </a>
                  <a
                    href={`https://zalo.me/${brokerPhone.replace(/\D/g, '').replace(/^0/, '84')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-phone-zalo-zalo"
                    aria-label="Chat Zalo"
                  >
                    <Icon name="MessageCircle" size={18} />
                  </a>
                </div>
                {brokerFacebook && (
                  <a
                    href={brokerFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn-facebook"
                  >
                    <Icon name="Facebook" size={18} />
                    Facebook
                  </a>
                )}
              </div>
```

- [ ] **Step 5: Thay CSS `.contact-btn-zalo` bằng `.contact-phone-zalo*`**

Trong `frontend-react/src/styles.css`, thay khối `.contact-btn-zalo` / `.contact-btn-zalo:hover` (dòng 2144-2161) bằng:

```css
.contact-phone-zalo {
  display: flex;
  min-height: 44px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.contact-phone-zalo-call {
  flex: 1;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 160ms ease;
}

.contact-phone-zalo-call:hover {
  opacity: 0.9;
}

.contact-phone-zalo-zalo {
  width: 56px;
  flex-shrink: 0;
  background: var(--color-zalo);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid rgb(255 255 255 / 0.25);
  transition: opacity 160ms ease;
}

.contact-phone-zalo-zalo:hover {
  opacity: 0.9;
}
```

Giữ nguyên `.contact-btn-facebook` / `.contact-btn-facebook:hover` (dòng 2163-2180) — không đổi.

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `cd frontend-react && npx vitest run src/pages/PropertyDetailPage.test.jsx`
Expected: PASS — cả 3 test hiện tại (2 test Facebook cũ + test mới ở Step 2) và 1 test bathroom label không liên quan.

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/PropertyDetailPage.jsx frontend-react/src/pages/PropertyDetailPage.test.jsx frontend-react/src/styles.css
git commit -m "fix(property-detail): merge call and Zalo buttons into one contact box"
```

---

### Task 6: Footer — khôi phục icon Facebook + TikTok

**Files:**
- Modify: `frontend-react/src/layouts/MainLayout.jsx:1-3, 174-179` (thêm `TikTokIcon`, `FOOTER_SOCIALS`, JSX)
- Modify: `frontend-react/src/styles.css` (khôi phục `.footer-social-icons`/`.footer-social-icon`, thêm `--color-tiktok`)
- Test: `frontend-react/src/layouts/MainLayout.test.jsx`

**Interfaces:**
- Không có interface chia sẻ với task khác — độc lập hoàn toàn.

- [ ] **Step 1: Sửa test hiện tại (đang assert "không có Facebook/TikTok/Youtube") để phản ánh hành vi mới**

Test hiện tại ở `frontend-react/src/layouts/MainLayout.test.jsx` cố tình khẳng định 3 icon này **không** tồn tại (lý do gốc: link chết `href="#/"`). Yêu cầu bây giờ là khôi phục lại 2 trong 3 (Facebook + TikTok), bỏ Youtube. Thay toàn bộ nội dung file bằng:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Footer } from './MainLayout.jsx';

afterEach(() => cleanup());

test('footer renders Facebook and TikTok links but not Youtube', () => {
  render(<Footer />);
  expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
  expect(screen.getByLabelText('TikTok')).toBeInTheDocument();
  expect(screen.queryByLabelText('Youtube')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `cd frontend-react && npx vitest run src/layouts/MainLayout.test.jsx`
Expected: FAIL — `getByLabelText('Facebook')` không tìm thấy phần tử.

- [ ] **Step 3: Khôi phục `TikTokIcon` + `FOOTER_SOCIALS` + JSX trong `MainLayout.jsx`**

Trong `frontend-react/src/layouts/MainLayout.jsx`, ngay sau dòng import (dòng 1-2), thêm:

```jsx
// lucide-react has no TikTok mark — hand-drawn to match the surrounding
// lucide icons' size/stroke weight (currentColor so it themes automatically).
function TikTokIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

// TODO: thay href="#/" bằng URL Facebook/TikTok thật của Công Tín Land khi có.
const FOOTER_SOCIALS = [
  { label: 'Facebook', icon: 'Facebook' },
  { label: 'TikTok', icon: 'TikTok' },
];
```

Trong hàm `Footer()`, sửa khối "Công Tín Land" about column (dòng 174-179 hiện tại):

```jsx
          <div>
            <p className="footer-col-title">Công Tín Land</p>
            <p className="footer-about-text">
              Cổng thông tin bất động sản Trà Vinh, kết nối khách hàng với môi giới chuyên nghiệp.
            </p>
            <div className="footer-social-icons">
              {FOOTER_SOCIALS.map(({ label, icon }) => (
                <a
                  key={label}
                  href="#/"
                  aria-label={label}
                  className="footer-social-icon"
                >
                  {icon === 'TikTok' ? <TikTokIcon size={16} /> : <Icon name={icon} size={16} />}
                </a>
              ))}
            </div>
          </div>
```

- [ ] **Step 4: Khôi phục CSS + thêm token `--color-tiktok`**

Trong `frontend-react/src/styles.css`, thêm ngay sau dòng `--color-facebook: #1877f2;` (dòng 35):

```css
  --color-tiktok:           #000000;
```

(Token cố định giống `--color-zalo`/`--color-facebook` — brand màu bên thứ ba, không đổi theo theme. Chưa dùng trong CSS ở bước này vì icon dùng `currentColor`/`--color-ink` theo đúng pattern `.footer-social-icon` cũ, nhưng khai báo sẵn theo đúng convention "Token cố định" trong `design.md` để dùng nếu cần nhấn màu riêng sau này.)

Thêm lại khối đã bị gỡ, ngay trước `.footer-bottom` (tìm bằng cách grep `\.footer-bottom` trong `styles.css` — chèn ngay phía trên):

```css
.footer-social-icons {
  display: flex;
  gap: 12px;
}

.footer-social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  transition: color 160ms ease, border-color 160ms ease;
}

.footer-social-icon:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `cd frontend-react && npx vitest run src/layouts/MainLayout.test.jsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/layouts/MainLayout.jsx frontend-react/src/layouts/MainLayout.test.jsx frontend-react/src/styles.css
git commit -m "feat(footer): restore Facebook and TikTok social icons (drop Youtube)"
```

---

### Task 7: Verify toàn bộ + chạy thử trên dev server

**Files:** không tạo/sửa file — chỉ verify.

- [ ] **Step 1: Chạy toàn bộ test suite frontend**

Run: `cd frontend-react && npm test -- --run`
Expected: tất cả test PASS (bao gồm mọi file không liên quan trực tiếp — xác nhận không có regression).

- [ ] **Step 2: Chạy lint**

Run: `cd frontend-react && npm run lint`
Expected: không có lỗi mới.

- [ ] **Step 3: Chạy dev server, kiểm tra bằng mắt**

Run: `cd frontend-react && npm run dev` (nền), mở `http://localhost:5173`.

Kiểm tra thủ công:
1. `#/broker/dashboard` (đăng nhập broker) — biểu đồ "Hoạt động tin đăng (tháng M/YYYY)" hiện đúng tháng hiện tại, hover vào từng chấm hiện tooltip đúng ngày/số liệu.
2. `#/admin` (đăng nhập admin) — biểu đồ "Hoạt động hệ thống ... (tháng M/YYYY)" tương tự.
3. `#/broker/profile` — form có 3 ô Zalo/Facebook/TikTok, nhập rồi bấm "Lưu hồ sơ" không lỗi.
4. `#/property/:id` bất kỳ — khung "Gọi ngay" + icon Zalo nằm chung 1 khối, Facebook (nếu có) vẫn là nút riêng bên dưới.
5. Cuộn xuống footer trang chủ — thấy 2 icon tròn Facebook + TikTok, không có Youtube.

Dừng dev server sau khi kiểm tra xong (Ctrl+C hoặc kill process).

- [ ] **Step 4: Không commit gì thêm ở task này** (chỉ verify) — nếu phát hiện lỗi ở bước 3, quay lại task tương ứng để sửa và commit riêng.
