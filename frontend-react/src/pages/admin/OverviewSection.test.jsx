import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
