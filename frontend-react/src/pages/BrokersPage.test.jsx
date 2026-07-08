import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchProperties: vi.fn().mockResolvedValue([
    {
      id: 'p-1', title: 'Nhà phố test', address: 'Test', ward: 'phuong-tra-vinh', category: 'nha',
      rawStatus: 'SOLD', statusLabel: 'Đã bán', image: '',
      broker: {
        name: 'Nguyễn Văn Toàn', email: 'toan@congtinland.vn', avatarUrl: '',
        zalo: 'https://zalo.me/84912345678', facebook: 'https://facebook.com/toan.congtinland',
        tiktok: 'https://tiktok.com/@toan.congtinland',
      },
    },
  ]),
}));

import BrokersPage from './BrokersPage.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('does not render the broker\'s email/gmail account', async () => {
  render(<BrokersPage />);
  expect(await screen.findByText('Nguyễn Văn Toàn')).toBeInTheDocument();
  expect(screen.queryByText('toan@congtinland.vn')).not.toBeInTheDocument();
});

test('renders Zalo, Facebook, and TikTok links next to "Xem tất cả"', async () => {
  render(<BrokersPage />);
  const viewAll = await screen.findByText('Xem tất cả');
  const footer = viewAll.closest('.broker-card-footer');
  expect(within(footer).getByLabelText('Zalo')).toHaveAttribute('href', 'https://zalo.me/84912345678');
  expect(within(footer).getByLabelText('Facebook')).toHaveAttribute('href', 'https://facebook.com/toan.congtinland');
  expect(within(footer).getByLabelText('TikTok')).toHaveAttribute('href', 'https://tiktok.com/@toan.congtinland');
});
