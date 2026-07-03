import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  fetchAdminViewings,
  updateAdminPropertyStatus,
  updateUserStatus,
  updateViewingStatus,
} from '../services/api.js';

// Per-resource wiring: which api fetch function backs the list, which field holds the
// enum status (properties expose it as `rawStatus`), and which fields the mock text
// search scans. The real backend does its own filtering/sorting/paging; the mock branch
// returns a flat array, so this dataProvider replicates that work client-side.
const RESOURCES = {
  brokers: { fetch: fetchAdminBrokers, statusField: 'status', searchFields: ['fullName', 'username', 'email', 'phone'] },
  users: { fetch: fetchAdminUsers, statusField: 'status', searchFields: ['fullName', 'username', 'email', 'phone'] },
  properties: { fetch: fetchAdminProperties, statusField: 'rawStatus', searchFields: ['title', 'address'] },
  viewings: { fetch: fetchAdminViewings, statusField: 'status', searchFields: ['visitorName', 'visitorPhone', 'roomLabel'] },
};

function requireResource(resource) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw new Error(`Resource không được hỗ trợ: "${resource}"`);
  return cfg;
}

function getField(row, field) {
  return field.split('.').reduce((value, key) => (value == null ? value : value[key]), row);
}

function compareValues(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

// Client-side filter → sort → slice for the mock branch (which returns the full array).
function paginateAndFilterMock(items, { page, perPage, field, order, q, status }, cfg) {
  let rows = [...items];
  if (q) {
    const needle = String(q).trim().toLowerCase();
    rows = rows.filter((row) => cfg.searchFields.some(
      (f) => String(getField(row, f) ?? '').toLowerCase().includes(needle),
    ));
  }
  if (status) {
    rows = rows.filter((row) => row[cfg.statusField] === status);
  }
  if (field) {
    const dir = String(order || 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
    rows.sort((a, b) => compareValues(getField(a, field), getField(b, field)) * dir);
  }
  const total = rows.length;
  const start = (page - 1) * perPage;
  return { data: rows.slice(start, start + perPage), total };
}

export function createDataProvider({ session }) {
  const token = session?.token;

  // Loads every record for a resource (mock: flat array as-is; real: one big page).
  // Used by getOne/getMany since the backend has no get-by-id endpoint (accepted debt).
  async function fetchAll(resource) {
    const cfg = requireResource(resource);
    const result = await cfg.fetch(token, { size: 1000 });
    return Array.isArray(result) ? result : (result.content || []);
  }

  return {
    async getList(resource, params) {
      const cfg = requireResource(resource);
      const { page = 1, perPage = 10 } = params.pagination || {};
      const { field, order } = params.sort || {};
      const { q, status } = params.filter || {};

      const result = await cfg.fetch(token, {
        page: page - 1,
        size: perPage,
        sort: field ? `${field},${String(order || 'ASC').toLowerCase()}` : undefined,
        q: q || undefined,
        status: status || undefined,
      });

      if (Array.isArray(result)) {
        return paginateAndFilterMock(result, { page, perPage, field, order, q, status }, cfg);
      }
      return {
        data: result.content || [],
        total: result.totalElements ?? (result.content ? result.content.length : 0),
      };
    },

    async getOne(resource, params) {
      const all = await fetchAll(resource);
      const record = all.find((row) => String(row.id) === String(params.id));
      if (!record) throw new Error('Không tìm thấy bản ghi');
      return { data: record };
    },

    async getMany(resource, params) {
      const all = await fetchAll(resource);
      const ids = params.ids.map(String);
      return { data: all.filter((row) => ids.includes(String(row.id))) };
    },

    async create(resource, params) {
      if (resource !== 'brokers') {
        throw new Error(`Tạo mới không được hỗ trợ cho resource "${resource}"`);
      }
      const created = await createBroker(token, params.data);
      return { data: { ...params.data, ...created, id: created?.id ?? params.data.id } };
    },

    async update(resource, params) {
      const status = params.data?.status;
      let updated;
      if (resource === 'properties') {
        updated = await updateAdminPropertyStatus(token, params.id, status);
      } else if (resource === 'users' || resource === 'brokers') {
        updated = await updateUserStatus(token, params.id, status);
      } else if (resource === 'viewings') {
        updated = await updateViewingStatus(token, params.id, status);
      } else {
        throw new Error(`Cập nhật không được hỗ trợ cho resource "${resource}"`);
      }
      return { data: { ...params.data, ...(updated || {}), id: params.id } };
    },

    getManyReference: () => Promise.reject(new Error('getManyReference không được hỗ trợ')),
    delete: () => Promise.reject(new Error('Xóa không được hỗ trợ — dùng đổi trạng thái thay thế')),
    deleteMany: () => Promise.reject(new Error('Xóa hàng loạt không được hỗ trợ')),
    updateMany: () => Promise.reject(new Error('Cập nhật hàng loạt không được hỗ trợ')),
  };
}
