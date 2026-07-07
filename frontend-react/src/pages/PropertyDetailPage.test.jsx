import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchPropertyDetail: vi.fn(),
  fetchPropertyMedia: vi.fn().mockResolvedValue([]),
  createViewing: vi.fn().mockResolvedValue({ id: 'mock-viewing-1', status: 'PENDING' }),
}));

import { fetchPropertyDetail } from '../services/api.js';
import PropertyDetailPage from './PropertyDetailPage.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const baseProperty = {
  title: 'Nhà phố test', address: 'Test address', priceLabel: '1 tỷ', statusLabel: 'Đang bán',
  category: 'nha', area: 100, bedrooms: 3, bathrooms: 2, direction: 'Đông',
  description: 'Mô tả test',
  broker: { name: 'Broker Test', phone: '0901234567', email: 'broker@test.vn', avatarUrl: '' },
};

test('renders a Facebook link below phone and Zalo when broker.facebook is set', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, broker: { ...baseProperty.broker, facebook: 'https://facebook.com/broker.test' } });
  render(<PropertyDetailPage propertyId="p-1" />);
  const link = await screen.findByRole('link', { name: /Facebook/i });
  expect(link).toHaveAttribute('href', 'https://facebook.com/broker.test');
});

test('does not render a Facebook link when broker.facebook is missing', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);
  expect(screen.queryByRole('link', { name: /Facebook/i })).not.toBeInTheDocument();
});

test('uses "Nhà vệ sinh" instead of "Phòng tắm" for the bathroom spec label', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);
  expect(screen.getByText('Nhà vệ sinh')).toBeInTheDocument();
  expect(screen.queryByText('Phòng tắm')).not.toBeInTheDocument();
});

test('phone and Zalo live inside one merged contact box', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);

  const phoneLink = screen.getByRole('link', { name: /Gọi ngay/i });
  const zaloLink = screen.getByRole('link', { name: /Chat Zalo|Zalo/i });
  expect(phoneLink.closest('.contact-phone-zalo')).toBe(zaloLink.closest('.contact-phone-zalo'));
  expect(phoneLink.closest('.contact-phone-zalo')).not.toBeNull();
});
