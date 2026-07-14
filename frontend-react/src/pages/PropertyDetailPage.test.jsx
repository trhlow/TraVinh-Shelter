import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

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

test('renders a Facebook link below phone when broker.facebook is set', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, broker: { ...baseProperty.broker, facebook: 'https://facebook.com/broker.test' } });
  render(<PropertyDetailPage propertyId="p-1" />);
  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  const link = within(contactCard).getByRole('link', { name: /Facebook/i });
  expect(link).toHaveAttribute('href', 'https://facebook.com/broker.test');
});

test('does not render a Facebook link when broker.facebook is missing', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  expect(within(contactCard).queryByRole('link', { name: /Facebook/i })).not.toBeInTheDocument();
});

test('renders a TikTok link in the contact card when broker.tiktok is set', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, broker: { ...baseProperty.broker, tiktok: 'https://tiktok.com/@broker.test' } });
  render(<PropertyDetailPage propertyId="p-1" />);
  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  const link = within(contactCard).getByRole('link', { name: /TikTok/i });
  expect(link).toHaveAttribute('href', 'https://tiktok.com/@broker.test');
});

test('does not render a TikTok link when broker.tiktok is missing', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  expect(within(contactCard).queryByRole('link', { name: /TikTok/i })).not.toBeInTheDocument();
});

test('uses "Nhà vệ sinh" instead of "Phòng tắm" for the bathroom spec label', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);
  expect(screen.getByText('Nhà vệ sinh')).toBeInTheDocument();
  expect(screen.queryByText('Phòng tắm')).not.toBeInTheDocument();
});

test('renders the phone call button and no Zalo link', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findAllByText(baseProperty.title);

  const brokerNameEl = await screen.findByText(baseProperty.broker.name);
  const contactCard = brokerNameEl.closest('.contact-card');
  const phoneLink = within(contactCard).getByRole('link', { name: /Gọi ngay/i });
  expect(phoneLink.closest('.contact-phone-zalo')).not.toBeNull();
  expect(within(contactCard).queryByRole('link', { name: /Chat Zalo|Zalo/i })).not.toBeInTheDocument();
});

test('renders a Google Map only when valid coordinates are available', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, lat: 9.9345, lng: 106.3456 });
  render(<PropertyDetailPage propertyId="p-1" />);

  const map = await screen.findByTitle('Bản đồ vị trí bất động sản');
  expect(map).toHaveAttribute('src', expect.stringContaining('9.9345%2C106.3456'));
});

test('does not render a Google Map without coordinates', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);

  await screen.findAllByText(baseProperty.title);
  expect(screen.queryByTitle('Bản đồ vị trí bất động sản')).not.toBeInTheDocument();
});
