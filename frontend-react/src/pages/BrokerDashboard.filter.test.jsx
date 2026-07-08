import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// Hermetic: BrokerDashboard must not hit the real network / mock-API branch in api.js.
// Mock every named export BrokerDashboard destructures from '../services/api.js' so the
// test only exercises the component's own date-range/KPI logic.
vi.mock('../services/api.js', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({
    id: 'broker-id', fullName: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'broker@congtinland.vn', avatarUrl: '',
  }),
  fetchBrokerDashboard: vi.fn().mockResolvedValue({
    activeListings: 2,
    totalListings: 2,
    pendingLeads: 3,
    listings: [
      {
        id: 'l1', title: 'Nhà phố Long Đức', address: 'Phường Long Đức, TP. Trà Vinh',
        ward: 'phuong-long-duc', category: 'nha', rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị',
        priceLabel: '2 tỷ', createdAt: '2026-06-15T00:00:00Z',
      },
      {
        id: 'l2', title: 'Đất nền Trà Vinh', address: 'Phường Trà Vinh, TP. Trà Vinh',
        ward: 'phuong-tra-vinh', category: 'dat', rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị',
        priceLabel: '1,5 tỷ', createdAt: '2026-07-01T00:00:00Z',
      },
    ],
  }),
  fetchBrokerViewings: vi.fn().mockResolvedValue([]),
  changePassword: vi.fn(),
  createProperty: vi.fn(),
  deleteProperty: vi.fn(),
  uploadCurrentUserAvatar: vi.fn(),
  uploadPropertyImage: vi.fn(),
  updateCurrentProfile: vi.fn().mockResolvedValue({ fullName: 'Nguyễn Văn Toàn', phone: '0912345678', avatarUrl: '' }),
  updateProperty: vi.fn(),
  updatePropertyStatus: vi.fn(),
  updateBrokerViewingStatus: vi.fn(),
}));

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

  const label = screen.getAllByText('Tin đăng đang hoạt động').find((el) => el.className === 'stat-card-label');
  const kpi = label.closest('.stat-card-article, .stat-card-link');
  // Mocked stats.totalListings is 2 and both mocked listings have 2026 createdAt dates, so
  // a custom 2020 range must exclude them entirely. Pre-fix code fell back to stats.totalListings
  // (2) whenever the bounded range produced an empty rangedListings array; this only proves the
  // fix if the mocked data can actually produce that empty-vs-fallback distinction, which it does.
  expect(kpi.querySelector('.stat-card-value')).toHaveTextContent('0');
});

test('profile form has Zalo, Facebook, and TikTok fields and submits them', async () => {
  const { updateCurrentProfile } = await import('../services/api.js');
  render(<BrokerDashboard session={session} section="profile" currentPath="/broker/profile" />);

  const zaloInput = await screen.findByLabelText('Zalo');
  const facebookInput = screen.getByLabelText('Facebook');
  const tiktokInput = screen.getByLabelText('TikTok');
  expect(zaloInput).toBeInTheDocument();
  expect(tiktokInput).toBeInTheDocument();

  fireEvent.change(facebookInput, { target: { value: 'https://facebook.com/broker.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

  await vi.waitFor(() => {
    expect(updateCurrentProfile).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ facebookUrl: 'https://facebook.com/broker.test' }),
    );
  });
});
