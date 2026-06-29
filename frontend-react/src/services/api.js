import { detailImages, searchProperties } from '../data/templateData.js';
import { BROKER_DASHBOARD, MOCK_PROPERTIES, MOCK_USERS, MOCK_ADMIN_BROKERS } from './mockData.js';
import { buildPropertyQuery, filterProperties } from './propertyFilters.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export async function login(email, password) {
  if (USE_MOCK_API) {
    const role = email.includes('admin') ? 'ADMIN' : email.includes('broker') ? 'BROKER' : 'USER';
    return delay({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 3600, email, role, userId: role.toLowerCase() });
  }
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function registerUser(payload) {
  if (USE_MOCK_API) {
    return delay({
      accessToken: 'mock-user-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      email: payload.email,
      role: 'USER',
      userId: 'mock-user',
    });
  }
  return request('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function logout(token) {
  if (!token || USE_MOCK_API) return null;
  return request('/auth/logout', { method: 'POST', token });
}

export async function fetchCurrentUser(token) {
  if (USE_MOCK_API) {
    return delay({
      id: 'mock-user',
      username: 'demo',
      fullName: 'Tài khoản demo',
      phone: '0901234567',
      email: 'demo@congtinland.vn',
      role: 'BROKER',
      status: 'ACTIVE',
      avatarUrl: '',
    }, 80);
  }
  return request('/users/me', { token });
}

export async function updateCurrentProfile(token, payload) {
  return request('/users/me', { method: 'PATCH', token, body: payload });
}

export async function uploadCurrentUserAvatar(token, file) {
  if (USE_MOCK_API) {
    return delay({
      avatarUrl: objectUrlFor(file),
    }, 120);
  }
  const formData = new FormData();
  formData.append('file', file);
  return request('/users/me/avatar', { method: 'POST', token, body: formData });
}

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

export async function fetchPropertyMedia(propertyId) {
  if (USE_MOCK_API || !propertyId) {
    return delay(detailImages.map((url, index) => ({
      id: `mock-media-${index}`,
      mediaType: 'IMAGE',
      url,
      thumbnail: index === 0,
    })), 80);
  }
  return request(`/properties/${propertyId}/media`);
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

export async function fetchBrokerDashboard(token) {
  if (USE_MOCK_API) {
    return delay({ ...BROKER_DASHBOARD, listings: MOCK_PROPERTIES }, 80);
  }
  const response = await request('/properties/mine?size=100', { token });
  const listings = normalizePagedProperties(response);
  return {
    activeListings: listings.filter((item) => item.rawStatus === 'AVAILABLE').length,
    totalListings: listings.length,
    pendingLeads: Math.max(0, listings.length * 2),
    listings,
  };
}

export async function createProperty(token, payload) {
  const response = await request('/properties', { method: 'POST', token, body: payload });
  return normalizeProperty(response, 0);
}

export async function updateProperty(token, propertyId, payload) {
  const response = await request(`/properties/${propertyId}`, { method: 'PATCH', token, body: payload });
  return normalizeProperty(response, 0);
}

export async function uploadPropertyImage(token, propertyId, file, thumbnail = false) {
  if (USE_MOCK_API) {
    return delay({
      id: `${propertyId}-${file.name}`,
      propertyId,
      mediaType: 'IMAGE',
      url: objectUrlFor(file),
      thumbnail,
    }, 120);
  }
  const formData = new FormData();
  formData.append('file', file);
  return request(`/properties/${propertyId}/media/images?thumbnail=${thumbnail ? 'true' : 'false'}`, {
    method: 'POST',
    token,
    body: formData,
  });
}

export async function updatePropertyStatus(token, propertyId, status) {
  const response = await request(`/properties/${propertyId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
  return normalizeProperty(response, 0);
}

export async function deleteProperty(token, propertyId) {
  return request(`/properties/${propertyId}`, { method: 'DELETE', token });
}

export async function fetchAdminUsers(token) {
  if (USE_MOCK_API) return delay(MOCK_USERS, 120);
  const response = await request('/admin/users?size=100', { token });
  return response.content || [];
}

export async function fetchAdminBrokers(token) {
  if (USE_MOCK_API) return delay(MOCK_ADMIN_BROKERS, 120);
  const response = await request('/admin/brokers?size=100', { token });
  return response.content || [];
}

export async function fetchAdminProperties(token) {
  if (USE_MOCK_API) return delay(MOCK_PROPERTIES, 120);
  const response = await request('/admin/properties?size=100', { token });
  return normalizePagedProperties(response);
}

export async function createBroker(token, payload) {
  if (USE_MOCK_API) return delay({ id: 'mock-' + Date.now(), role: 'BROKER', status: 'ACTIVE', ...payload }, 120);
  return request('/admin/brokers', { method: 'POST', token, body: payload });
}

export async function updateUserStatus(token, userId, status) {
  if (USE_MOCK_API) return delay({ id: userId, status }, 120);
  return request(`/admin/users/${userId}/status`, { method: 'PATCH', token, body: { status } });
}

export async function updateAdminPropertyStatus(token, propertyId, status) {
  if (USE_MOCK_API) return delay({ id: propertyId, status }, 120);
  const response = await request(`/admin/properties/${propertyId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
  return normalizeProperty(response, 0);
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : isFormData ? options.body : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed with ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function normalizePagedProperties(response) {
  const content = Array.isArray(response.content) ? response.content : [];
  return content.map(normalizeProperty);
}

function normalizeProperty(item, index = 0) {
  const attributes = item.attributes || {};
  const fallback = searchProperties[index % searchProperties.length] || {};
  const price = Number(item.price || 0);
  const categorySlug = item.category?.slug || item.category || 'nha';
  const transaction = attributes.transaction || (categorySlug === 'tro' ? 'rent' : 'sale');
  return {
    id: item.id,
    title: item.title,
    address: item.address,
    ward: attributes.ward || 'all',
    category: categorySlug,
    categoryId: item.category?.id,
    transaction,
    houseType: attributes.houseType || '',
    rawPrice: price,
    price: price / 1_000_000_000,
    priceLabel: formatPrice(price, categorySlug, transaction),
    rawStatus: item.status || 'AVAILABLE',
    statusLabel: statusLabel(item.status),
    status: statusLabel(item.status),
    area: Number(attributes.area || 0),
    size: attributes.size || (attributes.area ? `${attributes.area}m²` : 'Đang cập nhật'),
    bedrooms: Number(attributes.bedrooms || 0),
    bathrooms: Number(attributes.bathrooms || 0),
    direction: attributes.direction || 'Đang cập nhật',
    legal: attributes.legal || 'Đang cập nhật',
    image: attributes.image || fallback.image || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
    description: attributes.description || 'Thông tin chi tiết đang được cập nhật.',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    attributes,
    broker: {
      id: item.broker?.id,
      name: item.broker?.fullName || 'Môi giới Công Tín Land',
      phone: item.broker?.phone || '02943999888',
      email: item.broker?.email || 'support@congtinland.vn',
      avatarUrl: item.broker?.avatarUrl || '',
      rating: 'Đã xác minh',
      responseTime: '15 phút',
    },
  };
}

function statusLabel(status) {
  const labels = {
    AVAILABLE: 'Đang hiển thị',
    RENTED: 'Đã thuê',
    SOLD: 'Đã bán',
    HIDDEN: 'Đã ẩn',
  };
  return labels[status] || status || 'Đang hiển thị';
}

function formatPrice(price, categorySlug, transaction) {
  if (!Number.isFinite(price) || price <= 0) return 'Liên hệ';
  if (categorySlug === 'tro' || transaction === 'rent' || price < 100_000_000) {
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

function objectUrlFor(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file);
  }
  return '';
}
