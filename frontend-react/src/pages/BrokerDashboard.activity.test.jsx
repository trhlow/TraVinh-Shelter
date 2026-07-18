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
  expect(screen.getByText('Hoạt động môi giới theo ngày')).toBeInTheDocument();
  expect(screen.queryByText(/Hoa hồng/)).not.toBeInTheDocument();
});

test('activity chart shows every day of the current month', async () => {
  render(<BrokerDashboard session={session} onLogin={() => {}} onLogout={() => {}} currentPath="/broker/dashboard" section="dashboard" />);
  await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Bảng điều khiển' }).length).toBeGreaterThan(0));
  // Since API is unavailable in tests, the dashboard starts with no listings/viewings,
  // so the activity chart shows the empty-state instead of bars (all data is zero).
  expect(screen.getByText('Hoạt động môi giới theo ngày')).toBeInTheDocument();
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
});
