export function filterProperties(properties, filters) {
  const safeFilters = withDefaultFilters(filters);
  const query = normalize(safeFilters.query);
  const minPrice = parseOptionalNumber(safeFilters.minPrice);
  const maxPrice = parseOptionalNumber(safeFilters.maxPrice);
  const minArea = parseOptionalNumber(safeFilters.minArea);
  const maxArea = parseOptionalNumber(safeFilters.maxArea);

  return properties.filter((property) => {
    const comparablePrice = property.rawPrice ?? property.price;
    const matchesQuery = !query || normalize(`${property.title} ${property.address}`).includes(query);
    const matchesCategory = safeFilters.category === 'all' || property.category === safeFilters.category;
    const matchesTransaction = safeFilters.transaction === 'all' || property.transaction === safeFilters.transaction;
    const matchesWard = safeFilters.ward === 'all' || property.ward === safeFilters.ward;
    const matchesHouseType = safeFilters.houseType === 'all' || property.houseType === safeFilters.houseType;
    const matchesMin = minPrice == null || comparablePrice >= minPrice;
    const matchesMax = maxPrice == null || comparablePrice <= maxPrice;
    const matchesMinArea = minArea == null || Number(property.area || 0) >= minArea;
    const matchesMaxArea = maxArea == null || Number(property.area || 0) <= maxArea;
    return matchesQuery && matchesCategory && matchesTransaction && matchesWard
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
  return params.toString();
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
