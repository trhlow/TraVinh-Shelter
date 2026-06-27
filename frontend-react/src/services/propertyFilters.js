export function filterProperties(properties, filters) {
  const query = normalize(filters.query);
  const minPrice = parseOptionalNumber(filters.minPrice);
  const maxPrice = parseOptionalNumber(filters.maxPrice);

  return properties.filter((property) => {
    const matchesQuery = !query || normalize(`${property.title} ${property.address}`).includes(query);
    const matchesCategory = filters.category === 'all' || property.category === filters.category;
    const matchesTransaction = filters.transaction === 'all' || property.transaction === filters.transaction;
    const matchesWard = filters.ward === 'all' || property.ward === filters.ward;
    const matchesMin = minPrice == null || property.price >= minPrice;
    const matchesMax = maxPrice == null || property.price <= maxPrice;
    return matchesQuery && matchesCategory && matchesTransaction && matchesWard && matchesMin && matchesMax;
  });
}

export function buildPropertyQuery(filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query.trim());
  if (filters.category !== 'all') params.set('categorySlug', filters.category);
  if (filters.minPrice) params.set('minPrice', filters.minPrice);
  if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
  return params.toString();
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
