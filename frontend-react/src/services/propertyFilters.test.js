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

    expect(result.map((item) => item.id)).toEqual(['p-ql53', 'p-vuon']);
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
