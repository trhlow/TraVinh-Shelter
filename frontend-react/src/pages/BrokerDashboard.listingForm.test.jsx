import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrokerDashboard, { propertyPayload } from './BrokerDashboard.jsx';
import { fetchBrokerDashboard } from '../services/api.js';

const { capturedHandlersRef } = vi.hoisted(() => ({
  capturedHandlersRef: { current: null },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ position }) => <div data-testid="map-marker" data-lat={position?.[0]} data-lng={position?.[1]} />,
  useMap: () => ({ setView: vi.fn() }),
  useMapEvents: (handlers) => { capturedHandlersRef.current = handlers; return null; },
}));

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));

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

describe('propertyPayload — rooms (dãy trọ)', () => {
  const base = {
    categorySlug: 'tro', transaction: 'rent', ward: 'phuong-tra-vinh',
    length: '', width: '', bedrooms: '', bathrooms: '', description: '', amenities: [],
    lat: '', lng: '', coverUrl: '', title: 'Dãy trọ test', address: 'Test', price: '1500000',
  };

  test('attaches attributes.rooms when category is tro and at least one valid room', () => {
    const payload = propertyPayload({ ...base, rooms: [{ label: 'P.01', price: '1500000', available: true }] });
    expect(payload.attributes.rooms).toEqual([{ label: 'P.01', price: 1500000, available: true }]);
  });

  test('filters out rooms with empty label', () => {
    const payload = propertyPayload({
      ...base,
      rooms: [{ label: '  ', price: '1000000', available: true }, { label: 'P.02', price: '1000000', available: true }],
    });
    expect(payload.attributes.rooms).toEqual([{ label: 'P.02', price: 1000000, available: true }]);
  });

  test('coerces empty/invalid price to 0', () => {
    const payload = propertyPayload({ ...base, rooms: [{ label: 'P.01', price: '', available: true }] });
    expect(payload.attributes.rooms[0].price).toBe(0);
  });

  test('omits attributes.rooms when list is empty after filtering', () => {
    const payload = propertyPayload({ ...base, rooms: [{ label: '   ', price: '1000000', available: true }] });
    expect('rooms' in payload.attributes).toBe(false);
  });

  test('omits attributes.rooms when category is not tro, even if rooms has data', () => {
    const payload = propertyPayload({ ...base, categorySlug: 'nha', rooms: [{ label: 'P.01', price: '1000000', available: true }] });
    expect('rooms' in payload.attributes).toBe(false);
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
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
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

  test('shows the LocationPicker map with its confirmation hint, no lat/lng number inputs', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByLabelText('Tìm địa chỉ trên bản đồ')).toBeInTheDocument();
    expect(screen.getByText('Bấm vào bản đồ để chọn đúng vị trí thực tế của bất động sản.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vĩ độ (lat)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kinh độ (lng)')).not.toBeInTheDocument();
  });

  test('a new listing starts with no map position selected', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByLabelText('Tìm địa chỉ trên bản đồ');
    expect(screen.queryByText(/^Đã chọn:/)).not.toBeInTheDocument();
  });

  test('clicking the map updates the displayed coordinates in the form', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByLabelText('Tìm địa chỉ trên bản đồ');
    capturedHandlersRef.current.click({ latlng: { lat: 9.927833, lng: 106.339167 } });
    expect(await screen.findByText('Đã chọn: 9.927833, 106.339167')).toBeInTheDocument();
  });

  test('editing a listing with a saved position preloads it on the map', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-with-coords', title: 'Nhà có tọa độ', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1 tỷ', area: 100, category: 'nha', rooms: [],
        lat: 9.927833, lng: 106.339167,
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    expect(await screen.findByText('Đã chọn: 9.927833, 106.339167')).toBeInTheDocument();
  });

  test('category select offers Trọ, Nhà, Đất and defaults to Trọ, enabled', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    const select = within(categoryField).getByRole('combobox');
    expect(select).not.toBeDisabled();
    expect(select).toHaveValue('tro');
    expect(within(categoryField).getAllByRole('option').map((option) => option.textContent)).toEqual(['Trọ', 'Nhà', 'Đất']);
  });

  test('hides Phòng ngủ / Nhà vệ sinh when category is changed to Đất', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    await userEvent.selectOptions(within(categoryField).getByRole('combobox'), 'Đất');
    expect(screen.queryByText('Phòng ngủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà vệ sinh')).not.toBeInTheDocument();
  });

  test('hides the room list (dãy trọ) when category is changed to Nhà', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Danh sách phòng trong dãy trọ')).toBeInTheDocument();
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    await userEvent.selectOptions(within(categoryField).getByRole('combobox'), 'Nhà');
    expect(screen.queryByText('Danh sách phòng trong dãy trọ')).not.toBeInTheDocument();
  });

  test('editing an existing Đất listing loads its category and hides Phòng ngủ / Nhà vệ sinh', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-dat-1', title: 'Lô đất cũ', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1 tỷ', area: 100, category: 'dat', rooms: [],
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    expect(within(categoryField).getByRole('combobox')).toHaveValue('dat');
    expect(screen.queryByText('Phòng ngủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà vệ sinh')).not.toBeInTheDocument();
  });
});

describe('Listing form — room list (dãy trọ)', () => {
  test('shows empty-state hint when no rooms yet', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText(/Chưa có phòng nào/)).toBeInTheDocument();
  });

  test('Thêm nhanh generates N rooms with zero-padded, continuing labels', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByText(/Chưa có phòng nào/);
    await userEvent.clear(screen.getByLabelText('Số lượng phòng thêm nhanh'));
    await userEvent.type(screen.getByLabelText('Số lượng phòng thêm nhanh'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm nhanh' }));
    expect(screen.getByLabelText('Tên phòng 1')).toHaveValue('P.01');
    expect(screen.getByLabelText('Tên phòng 2')).toHaveValue('P.02');
    expect(screen.getByLabelText('Tên phòng 3')).toHaveValue('P.03');
  });

  test('+ Thêm 1 phòng adds one empty row; delete removes it', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByText(/Chưa có phòng nào/);
    await userEvent.click(screen.getByRole('button', { name: 'Thêm 1 phòng' }));
    expect(screen.getByLabelText('Tên phòng 1')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Xóa phòng 1'));
    expect(screen.queryByLabelText('Tên phòng 1')).not.toBeInTheDocument();
  });

  test('editing an existing tro listing prefills room rows', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-tro-1', title: 'Dãy trọ ABC', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1,5 triệu/tháng', area: 20, category: 'tro',
        rooms: [{ label: 'P.01', price: 1500000, available: true }],
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    expect(await screen.findByLabelText('Tên phòng 1')).toHaveValue('P.01');
    expect(screen.getByLabelText('Giá phòng 1')).toHaveValue(1500000);
  });
});
