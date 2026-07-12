import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrokerDashboard, { propertyPayload } from './BrokerDashboard.jsx';

describe('propertyPayload — area from length × width', () => {
  const base = {
    categorySlug: 'dat', transaction: 'sale', ward: 'phuong-tra-vinh',
    length: '5', width: '20', bedrooms: '', bathrooms: '', description: '', amenities: [],
    lat: '', lng: '',
    coverUrl: '', title: 'Lô đất test', address: 'Test', price: '1000000000',
  };

  test('computes area as length × width', () => {
    const payload = propertyPayload(base);
    expect(payload.attributes.length).toBe(5);
    expect(payload.attributes.width).toBe(20);
    expect(payload.attributes.area).toBe(100);
  });

  test('area is null when length or width is missing', () => {
    const payload = propertyPayload({ ...base, width: '' });
    expect(payload.attributes.area).toBeNull();
  });

  test('drops bedrooms/bathrooms attributes for Đất', () => {
    const payload = propertyPayload({ ...base, bedrooms: '3', bathrooms: '2' });
    expect('bedrooms' in payload.attributes).toBe(false);
    expect('bathrooms' in payload.attributes).toBe(false);
  });

  test('keeps bedrooms/bathrooms attributes for Nhà', () => {
    const payload = propertyPayload({ ...base, categorySlug: 'nha', bedrooms: '3', bathrooms: '2' });
    expect(payload.attributes.bedrooms).toBe(3);
    expect(payload.attributes.bathrooms).toBe(2);
  });

  test('stores valid map coordinates as numbers', () => {
    const payload = propertyPayload({ ...base, lat: '9.9345', lng: '106.3456' });
    expect(payload.attributes.lat).toBe(9.9345);
    expect(payload.attributes.lng).toBe(106.3456);
  });

  test('drops out-of-range map coordinates', () => {
    const payload = propertyPayload({ ...base, lat: '91', lng: '106.3456' });
    expect(payload.attributes.lat).toBeNull();
    expect(payload.attributes.lng).toBe(106.3456);
  });
});

// ── Rendered form ────────────────────────────────────────────────────────────
vi.mock('../services/api.js', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({
    id: 'broker-id', fullName: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'broker@congtinland.vn', avatarUrl: '',
  }),
  fetchBrokerDashboard: vi.fn().mockResolvedValue({ activeListings: 0, totalListings: 0, pendingLeads: 0, listings: [] }),
  fetchBrokerViewings: vi.fn().mockResolvedValue([]),
  changePassword: vi.fn(),
  createProperty: vi.fn(),
  deleteProperty: vi.fn(),
  uploadCurrentUserAvatar: vi.fn(),
  uploadPropertyImage: vi.fn(),
  updateCurrentProfile: vi.fn(),
  updateProperty: vi.fn(),
  updatePropertyStatus: vi.fn(),
  updateBrokerViewingStatus: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id',
  }));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); window.localStorage.clear(); vi.unstubAllGlobals(); });

const session = { token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id' };

describe('Listing form — field visibility', () => {
  test('always shows Chiều dài / Chiều rộng, never Diện tích (m²)', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Chiều dài (m)')).toBeInTheDocument();
    expect(screen.getByText('Chiều rộng (m)')).toBeInTheDocument();
    expect(screen.queryByText('Diện tích (m²)')).not.toBeInTheDocument();
  });

  test('renames Phòng tắm to Nhà vệ sinh', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Nhà vệ sinh')).toBeInTheDocument();
    expect(screen.queryByText('Phòng tắm')).not.toBeInTheDocument();
  });

  test('shows Phòng ngủ / Nhà vệ sinh for the default (Trọ) category', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Phòng ngủ')).toBeInTheDocument();
    expect(screen.getByText('Nhà vệ sinh')).toBeInTheDocument();
  });

  test('shows latitude and longitude inputs with the Maps coordinate hint', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByLabelText('Vĩ độ (lat)')).toBeInTheDocument();
    expect(screen.getByLabelText('Kinh độ (lng)')).toBeInTheDocument();
    expect(screen.getByText('Nhấn giữ trên ứng dụng Google Maps để lấy tọa độ.')).toBeInTheDocument();
  });

  test('hides Phòng ngủ / Nhà vệ sinh when category is Đất', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    await userEvent.selectOptions(within(categoryField).getByRole('combobox'), 'Đất');
    expect(screen.queryByText('Phòng ngủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà vệ sinh')).not.toBeInTheDocument();
  });
});
