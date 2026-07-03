import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BrokerDashboard from './BrokerDashboard.jsx';

beforeEach(() => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id',
  }));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); window.localStorage.clear(); vi.unstubAllGlobals(); });

const session = { token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id' };

test('broker overview shows the date-range filter', async () => {
  render(<BrokerDashboard session={session} section="dashboard" currentPath="/broker/dashboard" />);
  expect(await screen.findByRole('button', { name: '7 ngày' })).toBeInTheDocument();
});

test('broker properties section has a CSV export button', async () => {
  render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
  expect(await screen.findByRole('button', { name: /Xuất CSV/ })).toBeInTheDocument();
});

test('KPI cards show 0 when the date filter excludes all listings, not the unfiltered totals', async () => {
  render(<BrokerDashboard session={session} section="dashboard" currentPath="/broker/dashboard" />);
  await screen.findByRole('button', { name: '7 ngày' });

  fireEvent.click(screen.getByRole('button', { name: 'Tùy chọn' }));
  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2020-01-01' } });
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2020-01-02' } });

  const label = screen.getAllByText('Tổng tin đăng').find((el) => el.className === 'stat-card-label');
  const kpi = label.closest('.stat-card-article, .stat-card-link');
  expect(kpi.querySelector('.stat-card-value')).toHaveTextContent('0');
});
