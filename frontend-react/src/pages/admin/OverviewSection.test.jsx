import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import OverviewSection from './OverviewSection.jsx';

beforeEach(() => {
  window.location.hash = '#/admin/overview';
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const data = {
  users: [{ id: 'u1', role: 'ADMIN', status: 'ACTIVE' }],
  brokers: [{ id: 'b1', status: 'ACTIVE' }],
  properties: [
    { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-30T00:00:00Z', priceLabel: '1 tỷ' },
    { id: 'p2', title: 'B', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'AVAILABLE', createdAt: '2026-01-15T00:00:00Z', priceLabel: '2 tỷ' },
  ],
  viewings: [{ id: 'v1', status: 'PENDING', requestedAt: '2026-06-29T00:00:00Z' }],
};

test('renders KPI cards, filter bar, and quick actions', () => {
  render(<OverviewSection data={data} loading={false} />);
  expect(screen.getByText('Tổng số người dùng')).toBeInTheDocument();
  // "Lịch hẹn chờ" also labels a line in the system-status panel, so assert at
  // least one match rather than a single unique node.
  expect(screen.getAllByText('Lịch hẹn chờ').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Cấp tài khoản môi giới/ })).toHaveAttribute('href', '#/admin/brokers');
});

test('renders monthly activity chart and system status panel', () => {
  render(<OverviewSection data={data} loading={false} />);
  expect(screen.getByText('Hoạt động hệ thống theo tháng')).toBeInTheDocument();
  expect(screen.getByText('Tình trạng hệ thống')).toBeInTheDocument();
  expect(screen.queryByText('Doanh thu tháng này')).not.toBeInTheDocument();
});

test('renders a category-breakdown donut beside the system activity chart', () => {
  const mixedCategoryData = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2026-06-01T00:00:00Z' },
      { id: 'p2', title: 'B', ward: 'phuong-tra-vinh', category: 'nha', rawStatus: 'AVAILABLE', createdAt: '2026-06-02T00:00:00Z' },
      { id: 'p3', title: 'C', ward: 'phuong-tra-vinh', category: 'nha', rawStatus: 'AVAILABLE', createdAt: '2026-06-03T00:00:00Z' },
      { id: 'p4', title: 'D', ward: 'phuong-tra-vinh', category: 'dat', rawStatus: 'AVAILABLE', createdAt: '2026-06-04T00:00:00Z' },
    ],
    viewings: [],
  };
  render(<OverviewSection data={mixedCategoryData} loading={false} />);

  expect(screen.getByText('Phân bổ theo danh mục')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Nhà: 2, \d+%/ })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Trọ: 1, \d+%/ })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /Đất: 1, \d+%/ })).toBeInTheDocument();
});

test('system activity chart trims months before the platform had any real data', () => {
  const now = new Date();
  const recentOnly = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'A', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: now.toISOString() },
    ],
    viewings: [],
  };
  render(<OverviewSection data={recentOnly} loading={false} />);
  const stage = screen.getByRole('img', { name: 'Hoạt động hệ thống theo tháng' });
  const monthLabels = within(stage).getAllByText(/^T\d{1,2}$/);
  expect(monthLabels).toHaveLength(1);
});

test('Tổng số tin đăng KPI value narrows when a date preset excludes older listings', () => {
  const now = new Date();
  const mixedAgeData = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'Mới', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: now.toISOString() },
      { id: 'p2', title: 'Cũ', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2020-01-01T00:00:00Z' },
    ],
    viewings: [],
  };
  render(<OverviewSection data={mixedAgeData} loading={false} />);

  // Scope to the KPI link itself — "Tổng bài đăng" in the system-status panel below
  // legitimately keeps showing the unfiltered total ('2') by design, so an unscoped
  // screen.getByText('2') would still pass even if the KPI value itself were still buggy.
  const kpiLink = () => screen.getByRole('link', { name: /Tổng số tin đăng/ });

  // 'Tất cả' (default preset) counts both listings.
  expect(within(kpiLink()).getByText('2')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));

  // narrowed to the last 7 days: only the just-created listing counts, the 2020 one is excluded.
  expect(within(kpiLink()).getByText('1')).toBeInTheDocument();
  expect(within(kpiLink()).queryByText('2')).not.toBeInTheDocument();
});

test('audit widget only shows properties/viewings inside the selected date range', () => {
  const now = new Date();
  const mixedAgeData = {
    users: [],
    brokers: [],
    properties: [
      { id: 'p1', title: 'Tin mới trong tuần', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: 'p2', title: 'Tin rất cũ', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z' },
    ],
    viewings: [],
  };
  render(<OverviewSection data={mixedAgeData} loading={false} />);

  fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));

  expect(screen.getByText(/Tin mới trong tuần/)).toBeInTheDocument();
  expect(screen.queryByText(/Tin rất cũ/)).not.toBeInTheDocument();
});
