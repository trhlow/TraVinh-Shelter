import { describe, expect, test } from 'vitest';
import { MOCK_PROPERTIES } from './mockData.js';
import { buildPropertyQuery, filterProperties } from './propertyFilters.js';

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

  test('filters by broker email', () => {
    const result = filterProperties(MOCK_PROPERTIES, { broker: 'toan@congtinland.vn' });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.broker.email === 'toan@congtinland.vn')).toBe(true);
  });

  test('includes broker in API query when set', () => {
    expect(buildPropertyQuery({ broker: 'toan@congtinland.vn' })).toBe('brokerEmail=toan%40congtinland.vn');
  });
});
