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

    // MOCK_PROPERTIES now clones each raw listing into 3 ward/category-rotated variants
    // (see mockData.js) so only the variant landing on dat + phuong-long-duc matches here.
    expect(result.map((item) => item.id)).toEqual(['p-ql53-v2']);
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
});
