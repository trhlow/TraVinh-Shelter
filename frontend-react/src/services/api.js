import { BROKER_DASHBOARD, MOCK_PROPERTIES } from './mockData.js';
import { buildPropertyQuery, filterProperties } from './propertyFilters.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

export async function fetchProperties(filters) {
  if (USE_MOCK_API) {
    return delay(filterProperties(MOCK_PROPERTIES, filters));
  }
  const query = buildPropertyQuery(filters);
  const response = await request(`/properties${query ? `?${query}` : ''}`);
  return normalizePagedProperties(response);
}

export async function fetchBrokerDashboard() {
  if (USE_MOCK_API) {
    return delay(BROKER_DASHBOARD, 80);
  }
  return request('/broker/dashboard');
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
  return content.map((item) => ({
    id: item.id,
    title: item.title,
    address: item.address,
    ward: 'all',
    category: item.category?.slug || 'house',
    transaction: 'sale',
    price: Number(item.price) / 1_000_000_000,
    priceLabel: `${Number(item.price).toLocaleString('vi-VN')} đ`,
    statusLabel: item.status === 'AVAILABLE' ? 'Đang bán' : item.status,
    area: Number(item.attributes?.area || 0),
    size: item.attributes?.size || 'Đang cập nhật',
    bedrooms: Number(item.attributes?.bedrooms || 0),
    direction: item.attributes?.direction || 'Đang cập nhật',
    legal: item.attributes?.legal || 'Đang cập nhật',
    image: item.media?.[0]?.url || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
    description: item.attributes?.description || 'Thông tin chi tiết đang được cập nhật.',
    broker: {
      name: item.broker?.fullName || 'Môi giới Tra Vinh Realty',
      phone: item.broker?.phone || '02943999888',
      email: item.broker?.email || 'support@travinhrealty.vn',
      rating: 'Đã xác minh',
      responseTime: '15 phút',
    },
  }));
}

function delay(value, ms = 180) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}
