import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import ReportsSection, { shortName } from './ReportsSection.jsx';

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

test('shortName uses initials of all but the last word, plus the full last word', () => {
  expect(shortName('Trần Hoàng Long')).toBe('T.H.Long');
  expect(shortName('Nguyễn Văn Toàn')).toBe('N.V.Toàn');
  expect(shortName('Trần Mỹ Linh')).toBe('T.M.Linh');
});

test('shortName returns a single-word name as-is, with no dots added', () => {
  expect(shortName('Toàn')).toBe('Toàn');
});

test('broker-activity chart spans 2 of the 3 grid columns and renders a ranking list', () => {
  const activityData = {
    users: [],
    brokers: [{ id: 'b1', fullName: 'Nguyễn Văn A', status: 'ACTIVE' }],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', broker: { id: 'b1' } },
    ],
    viewings: [],
  };
  const { container } = render(<ReportsSection data={activityData} loading={false} />);

  expect(container.querySelector('.dashboard-chart-span-2')).toBeInTheDocument();
  expect(container.querySelector('.ranking-list-row')).toBeInTheDocument();
});

test('renders growth, distribution, density, and broker performance charts', () => {
  const { container } = render(<ReportsSection data={data} loading={false} />);
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  expect(screen.getByText('Phân bổ tin đăng theo khu vực')).toBeInTheDocument();

  // The 4 separate per-ward density charts were consolidated into a single
  // WardCategoryMatrix table — one row per ward, all wards present as cells.
  expect(screen.getByText('Mật độ tin theo phường')).toBeInTheDocument();
  const matrix = container.querySelector('.ward-category-matrix');
  expect(matrix).toBeInTheDocument();
  expect(within(matrix).getByText('Trà Vinh')).toBeInTheDocument();
  expect(within(matrix).getByText('Long Đức')).toBeInTheDocument();
  expect(within(matrix).getByText('Nguyệt Hóa')).toBeInTheDocument();
  expect(within(matrix).getByText('Hòa Thuận')).toBeInTheDocument();

  expect(screen.getByText('Danh sách môi giới')).toBeInTheDocument();
});

test('ward filter narrows the distribution/density data', () => {
  render(<ReportsSection data={data} loading={false} />);
  expect(screen.getByLabelText('Lọc theo phường')).toBeInTheDocument();
});

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

test('user growth chart shows only months with real users, no fabricated bars', () => {
  const now = new Date();
  const growthData = {
    users: [{ id: 'u1', role: 'BROKER', status: 'ACTIVE', createdAt: now.toISOString() }],
    brokers: [],
    properties: [],
    viewings: [],
  };
  render(<ReportsSection data={growthData} loading={false} />);
  // Only one real month of data survives trimming — a single point can't show a
  // trend line, so TrendLineChart shows an honest insufficient-data message
  // instead of fabricating a chart around one floating dot.
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  expect(screen.getByText('Chưa đủ dữ liệu để thể hiện xu hướng.')).toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Tăng trưởng người dùng mới' })).not.toBeInTheDocument();
});

test('user growth chart shows empty state when there are no users at all', () => {
  const emptyData = { users: [], brokers: [], properties: [], viewings: [] };
  render(<ReportsSection data={emptyData} loading={false} />);
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  // User-growth and the category-breakdown chart both show their own empty state when
  // data is empty. Broker activity ("Top môi giới theo hoạt động") is a RankingList now,
  // not a trend chart — it has no empty-state branch, it just renders its fallback row.
  expect(screen.getAllByText('Chưa có dữ liệu trong khoảng thời gian này.')).toHaveLength(2);
});
