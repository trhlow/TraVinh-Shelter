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
        facebook: 'https://facebook.com/toan.congtinland',
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

test('renders Facebook and TikTok links next to "Xem tất cả", and no Zalo link', async () => {
  render(<BrokersPage />);
  const viewAll = await screen.findByText('Xem tất cả');
  const footer = viewAll.closest('.broker-card-footer');
  expect(within(footer).getByLabelText('Facebook')).toHaveAttribute('href', 'https://facebook.com/toan.congtinland');
  expect(within(footer).getByLabelText('TikTok')).toHaveAttribute('href', 'https://tiktok.com/@toan.congtinland');
  expect(within(footer).queryByLabelText('Zalo')).not.toBeInTheDocument();
});
