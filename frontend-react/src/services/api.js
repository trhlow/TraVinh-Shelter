import { searchProperties } from '../data/templateData.js';
import { BROKER_DASHBOARD, MOCK_PROPERTIES } from './mockData.js';
import { buildPropertyQuery, filterProperties } from './propertyFilters.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export async function fetchProperties(filters) {
  if (USE_MOCK_API) {
    return delay(filterProperties(MOCK_PROPERTIES, filters));
  }
  const query = buildPropertyQuery(filters);
  const response = await request(`/properties${query ? `?${query}` : ''}`);
  return normalizePagedProperties(response);
}

export async function fetchPropertyDetail(propertyId) {
  if (USE_MOCK_API || !propertyId) {
    const items = await fetchProperties({});
    return items[0] ?? null;
  }
  const response = await request(`/properties/${propertyId}`);
  return normalizeProperty(response, 0);
}

export async function fetchCategories() {
  if (USE_MOCK_API) {
    return delay([
      { id: 1, name: 'Trọ', slug: 'tro' },
      { id: 2, name: 'Nhà', slug: 'nha' },
      { id: 3, name: 'Đất', slug: 'dat' },
    ], 80);
  }
  return request('/categories');
}

export async function fetchBrokerDashboard() {
  if (USE_MOCK_API) {
    return delay(BROKER_DASHBOARD, 80);
  }
  const listings = await fetchProperties({ status: 'all' });
  return {
    activeListings: listings.length,
    pendingLeads: Math.max(7, listings.length * 3),
    appointments: Math.max(4, Math.ceil(listings.length / 2)),
    conversion: listings.length ? '22%' : '0%',
    listings,
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with ${response.status}`);
  }
  return response.json();
}

function normalizePagedProperties(response) {
  const content = Array.isArray(response.content) ? response.content : [];
  return content.map(normalizeProperty);
}

function normalizeProperty(item, index = 0) {
  const attributes = item.attributes || {};
  const fallback = searchProperties[index % searchProperties.length];
  const price = Number(item.price || 0);
  return {
    id: item.id,
    title: item.title,
    address: item.address,
    ward: attributes.ward || 'all',
    category: item.category?.slug || 'nha',
    transaction: attributes.transaction || (item.category?.slug === 'tro' ? 'rent' : 'sale'),
    price: price / 1_000_000_000,
    priceLabel: formatPrice(price, item.category?.slug),
    statusLabel: item.status === 'AVAILABLE' ? 'Đang bán' : item.status,
    status: item.status === 'AVAILABLE' ? 'Đang bán' : item.status,
    area: Number(attributes.area || 0),
    size: attributes.size || (attributes.area ? `${attributes.area}m²` : 'Đang cập nhật'),
    bedrooms: Number(attributes.bedrooms || 0),
    bathrooms: Number(attributes.bathrooms || 0),
    direction: attributes.direction || 'Đang cập nhật',
    legal: attributes.legal || 'Đang cập nhật',
    image: attributes.image || fallback?.image || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
    description: attributes.description || 'Thông tin chi tiết đang được cập nhật.',
    createdAt: item.createdAt,
    broker: {
      name: item.broker?.fullName || 'Môi giới Tra Vinh Realty',
      phone: item.broker?.phone || '02943999888',
      email: item.broker?.email || 'support@travinhrealty.vn',
      rating: 'Đã xác minh',
      responseTime: '15 phút',
    },
  };
}

function formatPrice(price, categorySlug) {
  if (!Number.isFinite(price) || price <= 0) return 'Liên hệ';
  if (categorySlug === 'tro' || price < 100_000_000) {
    return `${(price / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Triệu / tháng`;
  }
  if (price >= 1_000_000_000) {
    return `${(price / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} Tỷ`;
  }
  return `${Math.round(price / 1_000_000).toLocaleString('vi-VN')} Triệu`;
}

function delay(value, ms = 180) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}
