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
  const stage = screen.getByRole('img', { name: 'Hoạt động môi giới theo ngày' });
  const daysInCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  // TrendBarLineChart also renders 5 Y-axis tick <text> labels in the same SVG (see
  // Charts.jsx COMBO_CHART_TICK_PERCENTS), and with no real activity yet their values
  // are small integers (0/1) that collide with the day-label regex /^\d{1,2}$/. Day
  // labels are the only <text> nodes positioned at y = COMBO_CHART_PLOT.bottom + 4 (38 +
  // 4 = "42"); tick labels sit at y = comboChartTickY(pct) + 1, which never equals 42.
  // Scoping the query to that y coordinate isolates exactly the day axis, so the count
  // can be asserted exactly instead of merely bounded.
  const dayLabels = Array.from(stage.querySelectorAll('text[y="42"]')).filter((el) => /^\d{1,2}$/.test(el.textContent));
  expect(dayLabels.length).toBe(daysInCurrentMonth);
});
