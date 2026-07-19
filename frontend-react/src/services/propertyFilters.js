export function filterProperties(properties, filters) {
  const safeFilters = withDefaultFilters(filters);
  const query = normalize(safeFilters.query);
  const brokerEmail = normalize(safeFilters.broker);
  const minPrice = parseOptionalNumber(safeFilters.minPrice);
  const maxPrice = parseOptionalNumber(safeFilters.maxPrice);
  const minArea = parseOptionalNumber(safeFilters.minArea);
  const maxArea = parseOptionalNumber(safeFilters.maxArea);

  return properties.filter((property) => {
    const comparablePrice = property.rawPrice ?? property.price;
    const matchesQuery = !query || normalize(`${property.title} ${property.address} ${property.category} ${property.broker?.name}`).includes(query);
    const matchesBroker = !brokerEmail || normalize(property.broker?.email) === brokerEmail;
    const matchesCategory = safeFilters.category === 'all' || property.category === safeFilters.category;
    const matchesTransaction = safeFilters.transaction === 'all' || property.transaction === safeFilters.transaction;
    const matchesWard = safeFilters.ward === 'all' || property.ward === safeFilters.ward;
    const matchesHouseType = safeFilters.houseType === 'all' || property.houseType === safeFilters.houseType;
    const matchesMin = minPrice == null || comparablePrice >= minPrice;
    const matchesMax = maxPrice == null || comparablePrice <= maxPrice;
    const matchesMinArea = minArea == null || Number(property.area || 0) >= minArea;
    const matchesMaxArea = maxArea == null || Number(property.area || 0) <= maxArea;
    return matchesQuery && matchesBroker && matchesCategory && matchesTransaction && matchesWard
      && matchesHouseType && matchesMin && matchesMax && matchesMinArea && matchesMaxArea;
  });
}

export function buildPropertyQuery(filters) {
  const safeFilters = withDefaultFilters(filters);
  const params = new URLSearchParams();
  if (safeFilters.query) params.set('q', safeFilters.query.trim());
  if (safeFilters.category !== 'all') params.set('categorySlug', safeFilters.category);
  if (safeFilters.transaction !== 'all') params.set('attr.transaction', safeFilters.transaction);
  if (safeFilters.ward !== 'all') params.set('attr.ward', safeFilters.ward);
  if (safeFilters.houseType !== 'all') params.set('attr.houseType', safeFilters.houseType);
  if (safeFilters.minPrice) params.set('minPrice', safeFilters.minPrice);
  if (safeFilters.maxPrice) params.set('maxPrice', safeFilters.maxPrice);
  if (safeFilters.minArea) params.set('attr.area.min', safeFilters.minArea);
  if (safeFilters.maxArea) params.set('attr.area.max', safeFilters.maxArea);
  if (safeFilters.broker) params.set('brokerEmail', safeFilters.broker.trim());
  if (safeFilters.size) params.set('size', String(safeFilters.size));
  if (safeFilters.page != null) params.set('page', String(safeFilters.page));
  if (safeFilters.sort) params.set('sort', safeFilters.sort);
  return params.toString();
}

// Serializes admin list params (already 0-indexed page + `field,dir` sort) into a
// backend query string for the /admin/* endpoints. Empty values are skipped.
export function buildAdminQuery(params = {}) {
  const { page, size, sort, q, status } = params;
  const search = new URLSearchParams();
  if (page != null) search.set('page', String(page));
  if (size != null) search.set('size', String(size));
  if (sort) search.set('sort', sort);
  if (q) search.set('q', q);
  if (status) search.set('status', status);
  return search.toString();
}

// Field name -> comparator, mirroring the backend's `sort=field,direction` Pageable
// convention so the same string works for both the real API call and this local sort.
const SORT_COMPARATORS = {
  'createdAt,desc': (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  'price,asc': (a, b) => (a.rawPrice ?? 0) - (b.rawPrice ?? 0),
  'price,desc': (a, b) => (b.rawPrice ?? 0) - (a.rawPrice ?? 0),
};

export function sortProperties(properties, sort) {
  const comparator = SORT_COMPARATORS[sort];
  if (!comparator) return properties;
  return [...properties].sort(comparator);
}

// Mirrors Spring Data's Page<> shape (0-indexed page, ceil-divided totalPages) so the
// mock branch of fetchPropertiesPage() and the real backend produce the same shape.
export function paginateProperties(properties, page = 0, size = 9) {
  const totalElements = properties.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const items = properties.slice(page * size, (page + 1) * size);
  return { items, totalElements, totalPages, page };
}

function withDefaultFilters(filters = {}) {
  return {
    query: '',
    category: 'all',
    transaction: 'all',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    ward: 'all',
    houseType: 'all',
    broker: '',
    ...filters,
  };
}

function parseOptionalNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
