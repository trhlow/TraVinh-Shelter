import { describe, expect, test } from 'vitest';
import { MOCK_PROPERTIES } from './mockData.js';
import { buildPropertyQuery, filterProperties, paginateProperties, sortProperties } from './propertyFilters.js';

describe('property filters', () => {
  test('filters by category, ward and query without accents', () => {
    const result = filterProperties(MOCK_PROPERTIES, {
      query: 'long duc',
      category: 'dat',
      transaction: 'sale',
      minPrice: '',
      maxPrice: '',
      ward: 'phuong-long-duc',
    });

    // MOCK_PROPERTIES clones each raw listing into 3 variants; variant 0 keeps the original
    // ward/category (p-ql53, p-vuon are both dat + phuong-long-duc originals), and only
    // variants 1-2 rotate through WARD_CYCLE/CATEGORY_CYCLE (see mockData.js). Of those,
    // only p-ql53's variant 2 lands back on dat + phuong-long-duc; p-vuon's rotated variants
    // land elsewhere, and p-cau-ke's rotated variant 2 matches ward+category but its address
    // ("Phường Hòa Thuận") never matches the "long duc" query text.
    expect(result.map((item) => item.id)).toEqual(['p-ql53', 'p-ql53-v2', 'p-vuon']);
  });

  test('builds API query without default filter noise', () => {
    expect(buildPropertyQuery({
      query: 'Phường 7',
      category: 'nha',
      transaction: 'all',
      minPrice: '1',
      maxPrice: '',
      ward: 'all',
    })).toBe('q=Ph%C6%B0%E1%BB%9Dng+7&categorySlug=nha&minPrice=1');
  });

  test('buildPropertyQuery includes size when provided', () => {
    expect(buildPropertyQuery({ size: 200 })).toBe('size=200');
  });

  test('buildPropertyQuery includes page and sort when provided', () => {
    expect(buildPropertyQuery({ page: 2, sort: 'createdAt,desc' })).toBe('page=2&sort=createdAt%2Cdesc');
  });

  test('buildPropertyQuery includes page=0 (falsy but valid)', () => {
    expect(buildPropertyQuery({ page: 0 })).toBe('page=0');
  });

  test('filters by broker email', () => {
    const result = filterProperties(MOCK_PROPERTIES, { broker: 'toan@congtinland.vn' });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.broker.email === 'toan@congtinland.vn')).toBe(true);
  });

  test('includes broker in API query when set', () => {
    expect(buildPropertyQuery({ broker: 'toan@congtinland.vn' })).toBe('brokerEmail=toan%40congtinland.vn');
  });
});

describe('sortProperties', () => {
  const items = [
    { id: 'a', createdAt: '2026-07-01T00:00:00Z', rawPrice: 2_000_000_000 },
    { id: 'b', createdAt: '2026-07-03T00:00:00Z', rawPrice: 1_000_000_000 },
    { id: 'c', createdAt: '2026-07-02T00:00:00Z', rawPrice: 3_000_000_000 },
  ];

  test('sorts by createdAt descending', () => {
    const result = sortProperties(items, 'createdAt,desc');
    expect(result.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  test('sorts by price ascending', () => {
    const result = sortProperties(items, 'price,asc');
    expect(result.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  test('sorts by price descending', () => {
    const result = sortProperties(items, 'price,desc');
    expect(result.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  test('returns items unchanged (same order) for an unknown or missing sort key', () => {
    expect(sortProperties(items, 'unknown,key').map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(sortProperties(items, undefined).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  test('does not mutate the input array', () => {
    const original = [...items];
    sortProperties(items, 'price,asc');
    expect(items).toEqual(original);
  });
});

describe('paginateProperties', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ id: `p${i}` }));

  test('slices the requested page at the given size', () => {
    const result = paginateProperties(items, 1, 9);
    expect(result.items.map((item) => item.id)).toEqual(['p9', 'p10', 'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17']);
  });

  test('computes totalElements from the full list, not the sliced page', () => {
    const result = paginateProperties(items, 0, 9);
    expect(result.totalElements).toBe(20);
  });

  test('computes totalPages by ceiling division', () => {
    expect(paginateProperties(items, 0, 9).totalPages).toBe(3); // 20 / 9 = 2.22 -> 3
    expect(paginateProperties([], 0, 9).totalPages).toBe(1); // empty list still reports 1 page, not 0
  });

  test('returns the requested page number unchanged', () => {
    expect(paginateProperties(items, 2, 9).page).toBe(2);
  });

  test('returns an empty items array for a page past the end, without throwing', () => {
    const result = paginateProperties(items, 10, 9);
    expect(result.items).toEqual([]);
    expect(result.totalElements).toBe(20);
  });
});
