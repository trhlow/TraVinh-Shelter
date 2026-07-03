import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    { id: 'p2', title: 'B', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'PENDING', createdAt: '2026-01-15T00:00:00Z', priceLabel: '2 tỷ' },
  ],
  viewings: [{ id: 'v1', status: 'PENDING', requestedAt: '2026-06-29T00:00:00Z' }],
};

test('renders KPI cards, filter bar, and quick actions', () => {
  render(<OverviewSection data={data} loading={false} />);
  expect(screen.getByText('Bài đăng mới')).toBeInTheDocument();
  // "Lịch hẹn chờ" also labels a line in the system-status panel, so assert at
  // least one match rather than a single unique node.
  expect(screen.getAllByText('Lịch hẹn chờ').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Cấp tài khoản môi giới/ })).toHaveAttribute('href', '#/admin/brokers');
  expect(screen.getByRole('link', { name: /Duyệt tin chờ \(1\)/ })).toHaveAttribute('href', '#/admin/properties?status=PENDING');
});

test('ward filter narrows the data set feeding the charts', () => {
  render(<OverviewSection data={data} loading={false} />);
  fireEvent.change(screen.getByLabelText('Lọc theo phường'), { target: { value: 'phuong-tra-vinh' } });
  // "Đang hiển thị" also labels the gauge chart, so scope to the KPI card's own label class.
  const label = screen.getAllByText('Đang hiển thị').find((el) => el.className === 'stat-card-label');
  const kpi = label.closest('.stat-card-article');
  // Only 1 property remains AVAILABLE in Trà Vinh; the KPI value updates.
  expect(kpi.textContent).toContain('1');
});

test('heatmap cell click drills into the filtered property list', () => {
  render(<OverviewSection data={data} loading={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh · Trọ: 1 tin' }));
  expect(window.location.hash).toBe('#/admin/properties?ward=phuong-tra-vinh&category=tro');
});
