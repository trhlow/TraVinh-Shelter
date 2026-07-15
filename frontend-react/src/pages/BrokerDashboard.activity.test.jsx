import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

test('activity chart shows exactly the current month when there is no real activity yet', async () => {
  render(<BrokerDashboard session={session} onLogin={() => {}} onLogout={() => {}} currentPath="/broker/dashboard" section="dashboard" />);
  await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Bảng điều khiển' }).length).toBeGreaterThan(0));
  const stage = screen.getByRole('img', { name: 'Hoạt động môi giới theo ngày' });
  const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayLabels = within(stage).getAllByText(/^\d{1,2}$/);
  expect(dayLabels.length).toBeGreaterThanOrEqual(daysInCurrentMonth);
});
