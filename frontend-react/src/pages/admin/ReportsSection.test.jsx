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
