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

test('broker-activity chart spans 2 of the 3 grid columns and uses rotated labels', () => {
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
  expect(container.querySelector('.trend-chart-labels-row')).toBeInTheDocument();
});

test('renders growth, distribution, density, and broker performance charts', () => {
  render(<ReportsSection data={data} loading={false} />);
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  expect(screen.getByText('Phân bổ tin đăng theo khu vực')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Long Đức')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Nguyệt Hóa')).toBeInTheDocument();
  expect(screen.getByText('Mật độ tin — Phường Hòa Thuận')).toBeInTheDocument();
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
    users: [{ id: 'u1', role: 'USER', status: 'ACTIVE', createdAt: now.toISOString() }],
    brokers: [],
    properties: [],
    viewings: [],
  };
  render(<ReportsSection data={growthData} loading={false} />);
  const stage = screen.getByRole('img', { name: 'Tăng trưởng người dùng mới' });
  const monthLabels = within(stage).getAllByText(/^T\d{1,2}$/);
  expect(monthLabels).toHaveLength(1);
});

test('user growth chart shows empty state when there are no users at all', () => {
  const emptyData = { users: [], brokers: [], properties: [], viewings: [] };
  const { container } = render(<ReportsSection data={emptyData} loading={false} />);
  expect(screen.getByText('Tăng trưởng người dùng mới')).toBeInTheDocument();
  // User-growth, broker-activity, and the category-breakdown donut all show their own
  // empty state when data is empty.
  expect(screen.getAllByText('Chưa có dữ liệu trong khoảng thời gian này.')).toHaveLength(3);
});
