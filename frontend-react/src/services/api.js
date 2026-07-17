import { BROKER_DASHBOARD, MOCK_PROPERTIES, MOCK_USERS, MOCK_ADMIN_BROKERS, MOCK_AUDIT_LOGS } from './mockData.js';
import { buildAdminQuery, buildPropertyQuery, filterProperties } from './propertyFilters.js';
import { isGoogleMapsEmbedUrl } from '../utils/googleMapsEmbed.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export async function login(email, password) {
  if (USE_MOCK_API) {
    const role = email.includes('admin') ? 'ADMIN' : 'BROKER';
    return delay({ accessToken: 'mock-token', tokenType: 'Bearer', expiresIn: 3600, email, role, userId: role.toLowerCase() });
  }
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function logout(token) {
  if (!token || USE_MOCK_API) return null;
  return request('/auth/logout', { method: 'POST', token });
}

export async function requestPasswordReset(email) {
  if (USE_MOCK_API) return delay({ message: 'Nếu email này tồn tại, hướng dẫn đã được gửi.' }, 200);
  return request('/auth/forgot-password', { method: 'POST', body: { email } });
}

export async function confirmPasswordReset(email, otpCode, newPassword) {
  if (USE_MOCK_API) return delay({ message: 'Đặt lại mật khẩu thành công.' }, 200);
  return request('/auth/reset-password', { method: 'POST', body: { email, otpCode, newPassword } });
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
      facebookUrl: '',
      tiktokUrl: '',
    }, 80);
  }
  return request('/users/me', { token });
}

export async function updateCurrentProfile(token, payload) {
  return request('/users/me', { method: 'PATCH', token, body: payload });
}

export async function changePassword(token, currentPassword, newPassword) {
  if (USE_MOCK_API) {
    await delay(null, 300);
    if (currentPassword !== 'password123') throw new Error('Mật khẩu hiện tại không đúng.');
    return null;
  }
  return request('/users/me/password', { method: 'PATCH', token, body: { currentPassword, newPassword } });
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
    // Mirror the real backend: an unknown id is a 404, not "some other
    // listing". The detail page owns the not-found presentation.
    const items = await fetchProperties({});
    return items.find((item) => item.id === propertyId) ?? null;
  }
  const response = await request(`/properties/${propertyId}`);
  return normalizeProperty(response);
}

export async function fetchPropertyMedia(propertyId) {
  if (USE_MOCK_API || !propertyId) {
    // No invented galleries: a listing shows its own photo(s) or an honest
    // empty state, same as the real backend when no media was uploaded.
    return delay([], 80);
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
    listings,
  };
}

export async function createProperty(token, payload) {
  const response = await request('/properties', { method: 'POST', token, body: payload });
  return normalizeProperty(response);
}

export async function updateProperty(token, propertyId, payload) {
  const response = await request(`/properties/${propertyId}`, { method: 'PATCH', token, body: payload });
  return normalizeProperty(response);
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
  return normalizeProperty(response);
}

export async function deleteProperty(token, propertyId) {
  return request(`/properties/${propertyId}`, { method: 'DELETE', token });
}

export async function requestViewingOtp(propertyId, payload) {
  if (USE_MOCK_API) {
    return delay({ message: 'Xác minh OTP tạm thời không bắt buộc.', otpRequired: false }, 150);
  }
  return request(`/properties/${propertyId}/viewings/request-otp`, { method: 'POST', body: payload });
}

export async function verifyViewingOtp(propertyId, payload) {
  const { booking, otpCode } = payload;
  if (USE_MOCK_API) {
    const record = {
      id: 'mock-viewing-' + Date.now(),
      status: 'PENDING',
      propertyId,
      propertyTitle: booking.propertyTitle,
      visitorName: booking.visitorName,
      visitorPhone: booking.visitorPhone,
      note: booking.note,
      roomLabel: booking.roomLabel,
      expectedMoveIn: booking.expectedMoveIn,
      occupants: booking.occupants,
      vehicles: booking.vehicles,
      pets: booking.pets,
      requestedAt: booking.requestedAt,
      createdAt: new Date().toISOString(),
    };
    try {
      const existing = JSON.parse(localStorage.getItem('travinh-mock-viewings') || '[]');
      existing.push(record);
      localStorage.setItem('travinh-mock-viewings', JSON.stringify(existing));
    } catch {
      // localStorage unavailable — ignore
    }
    return delay(record, 150);
  }
  const { propertyTitle: _title, ...backendBooking } = booking;
  return request(`/properties/${propertyId}/viewings/verify-otp`, {
    method: 'POST',
    body: { booking: backendBooking, otpCode },
  });
}

export async function fetchBrokerViewings(token) {
  if (USE_MOCK_API) return delay(readMockViewings(), 120);
  return request('/viewings/mine', { token });
}

export async function fetchAdminViewings(token, params) {
  if (USE_MOCK_API) return delay(readMockViewings(), 120);
  const qs = buildAdminQuery(params);
  return request(`/admin/viewings${qs ? `?${qs}` : ''}`, { token });
}

export async function updateViewingStatus(token, viewingId, status, targetLabel) {
  if (USE_MOCK_API) {
    try {
      const existing = JSON.parse(localStorage.getItem('travinh-mock-viewings') || '[]');
      const updated = existing.map((item) => (item.id === viewingId ? { ...item, status } : item));
      localStorage.setItem('travinh-mock-viewings', JSON.stringify(updated));
    } catch {
      // localStorage unavailable — ignore
    }
    appendMockAudit({
      action: 'UPDATE_VIEWING_STATUS',
      targetLabel: targetLabel || viewingId,
      detail: `Đổi trạng thái lịch hẹn sang ${status}`,
    });
    return delay({ id: viewingId, status }, 120);
  }
  return request(`/admin/viewings/${viewingId}/status`, { method: 'PATCH', token, body: { status } });
}

export async function updateBrokerViewingStatus(token, viewingId, status) {
  if (USE_MOCK_API) return delay({ id: viewingId, status }, 120);
  return request(`/viewings/mine/${viewingId}/status`, { method: 'PATCH', token, body: { status } });
}

function readMockViewings() {
  try {
    const items = JSON.parse(localStorage.getItem('travinh-mock-viewings') || '[]');
    return Array.isArray(items) ? [...items].reverse() : [];
  } catch {
    return [];
  }
}

export async function fetchAdminUsers(token, params) {
  if (USE_MOCK_API) return delay(MOCK_USERS, 120);
  const qs = buildAdminQuery(params);
  return request(`/admin/users${qs ? `?${qs}` : ''}`, { token });
}

export async function fetchAdminBrokers(token, params) {
  if (USE_MOCK_API) return delay(MOCK_ADMIN_BROKERS, 120);
  const qs = buildAdminQuery(params);
  return request(`/admin/brokers${qs ? `?${qs}` : ''}`, { token });
}

export async function fetchAdminProperties(token, params) {
  if (USE_MOCK_API) return delay(MOCK_PROPERTIES, 120);
  const qs = buildAdminQuery(params);
  const response = await request(`/admin/properties${qs ? `?${qs}` : ''}`, { token });
  return { ...response, content: (response.content || []).map((item) => normalizeProperty(item)) };
}

export async function createBroker(token, payload) {
  if (USE_MOCK_API) {
    appendMockAudit({ action: 'CREATE_BROKER', targetLabel: payload.fullName, detail: 'Cấp tài khoản môi giới mới' });
    return delay({ id: 'mock-' + Date.now(), role: 'BROKER', status: 'ACTIVE', ...payload }, 120);
  }
  return request('/admin/brokers', { method: 'POST', token, body: payload });
}

export async function updateUserStatus(token, userId, status, targetLabel) {
  if (USE_MOCK_API) {
    appendMockAudit({
      action: status === 'LOCKED' ? 'LOCK_USER' : 'UNLOCK_USER',
      targetLabel: targetLabel || userId,
      detail: status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
    });
    return delay({ id: userId, status }, 120);
  }
  return request(`/admin/users/${userId}/status`, { method: 'PATCH', token, body: { status } });
}

function appendMockAudit({ action, targetLabel, detail }) {
  try {
    const existing = JSON.parse(localStorage.getItem('travinh-mock-audit') || '[]');
    existing.push({
      id: 'mock-audit-' + Date.now(),
      action,
      actorEmail: 'admin@congtinland.vn',
      targetLabel,
      detail,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem('travinh-mock-audit', JSON.stringify(existing));
  } catch {
    // localStorage unavailable — ignore
  }
}

function readMockAuditLogs() {
  let extra = [];
  try {
    extra = JSON.parse(localStorage.getItem('travinh-mock-audit') || '[]');
  } catch {
    extra = [];
  }
  return [...MOCK_AUDIT_LOGS, ...(Array.isArray(extra) ? extra : [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function fetchAdminAuditLogs(token) {
  if (USE_MOCK_API) {
    return delay(readMockAuditLogs(), 120);
  }
  const response = await request('/admin/audit-logs?size=200', { token });
  return response.content || [];
}

export async function updateAdminPropertyStatus(token, propertyId, status, targetLabel) {
  if (USE_MOCK_API) {
    appendMockAudit({
      action: status === 'HIDDEN' ? 'HIDE_PROPERTY' : 'UPDATE_PROPERTY_STATUS',
      targetLabel: targetLabel || propertyId,
      detail: status === 'HIDDEN' ? 'Gỡ bài đăng khỏi trang công khai' : `Đổi trạng thái sang ${status}`,
    });
    return delay({ id: propertyId, status }, 120);
  }
  const response = await request(`/admin/properties/${propertyId}/status`, {
    method: 'PATCH',
    token,
    body: { status },
  });
  return normalizeProperty(response);
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
    const error = new Error(body.message || `Yêu cầu thất bại với mã lỗi ${response.status}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function normalizePagedProperties(response) {
  const content = Array.isArray(response.content) ? response.content : [];
  return content.map(normalizeProperty);
}

function normalizeProperty(item) {
  const attributes = item.attributes || {};
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
    adminStatusLabel: statusLabel(item.status),
    area: Number(attributes.area || 0),
    length: Number(attributes.length || 0),
    width: Number(attributes.width || 0),
    mapEmbedUrl: isGoogleMapsEmbedUrl(attributes.mapEmbedUrl) ? attributes.mapEmbedUrl : null,
    size: attributes.size || (attributes.area ? `${attributes.area}m²` : 'Đang cập nhật'),
    bedrooms: Number(attributes.bedrooms || 0),
    bathrooms: Number(attributes.bathrooms || 0),
    direction: attributes.direction || 'Đang cập nhật',
    legal: attributes.legal || 'Đang cập nhật',
    // No stock-photo stand-ins: a listing without a photo renders the card's
    // honest "Chưa có ảnh" frame instead of somebody else's living room.
    image: attributes.image || '',
    description: attributes.description || 'Thông tin chi tiết đang được cập nhật.',
    amenities: Array.isArray(attributes.amenities) ? attributes.amenities : [],
    costs: attributes.costs || null, // costs.*.value is a preformatted display string (e.g. '3.500đ/kWh'), not a numeric
    conditions: attributes.conditions || null,
    summary: attributes.summary || null,
    rooms: Array.isArray(attributes.rooms) ? attributes.rooms : [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    attributes,
    broker: {
      id: item.broker?.id,
      name: item.broker?.fullName || 'Môi giới Công Tín Land',
      phone: item.broker?.phone || '02943999888',
      email: item.broker?.email || 'support@congtinland.vn',
      avatarUrl: item.broker?.avatarUrl || '',
      facebook: item.broker?.facebookUrl || '',
      tiktok: item.broker?.tiktokUrl || '',
      rating: 'Đã xác minh',
      responseTime: '15 phút',
    },
  };
}

function statusLabel(status) {
  const labels = {
    AVAILABLE: 'Đang hiển thị',
    PENDING: 'Chờ duyệt',
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
