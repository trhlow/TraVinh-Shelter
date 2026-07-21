import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test('mock mode: filters, sorts, and paginates MOCK_PROPERTIES, returning Spring Page<>-shaped metadata', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'true');
  vi.resetModules();
  const { fetchPropertiesPage } = await import('./api.js');

  const result = await fetchPropertiesPage({ category: 'nha' }, 0, 5, 'createdAt,desc');

  expect(result.items.length).toBeLessThanOrEqual(5);
  expect(result.items.every((item) => item.category === 'nha')).toBe(true);
  expect(typeof result.totalElements).toBe('number');
  expect(typeof result.totalPages).toBe('number');
  expect(result.page).toBe(0);
  // newest-first: every item's createdAt is >= the next item's createdAt
  for (let i = 0; i < result.items.length - 1; i += 1) {
    expect(new Date(result.items[i].createdAt).getTime())
      .toBeGreaterThanOrEqual(new Date(result.items[i + 1].createdAt).getTime());
  }
});

test('mock mode: page 2 of a filtered set does not repeat items from page 1', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'true');
  vi.resetModules();
  const { fetchPropertiesPage } = await import('./api.js');

  const page0 = await fetchPropertiesPage({}, 0, 5, 'createdAt,desc');
  const page1 = await fetchPropertiesPage({}, 1, 5, 'createdAt,desc');

  const page0Ids = new Set(page0.items.map((item) => item.id));
  expect(page1.items.every((item) => !page0Ids.has(item.id))).toBe(true);
});

test('real API mode: sends page/size/sort as query params and reads Page<> metadata from the response', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'false');
  vi.resetModules();
  const { fetchPropertiesPage } = await import('./api.js');

  let capturedUrl = '';
  vi.stubGlobal('fetch', vi.fn((url) => {
    capturedUrl = url;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        content: [
          { id: 'p1', title: 'A', address: '1 Test St', price: 1000000000, status: 'AVAILABLE', category: { id: 'c1', slug: 'nha' }, attributes: {} },
        ],
        totalElements: 42,
        totalPages: 5,
        number: 2,
      }),
    });
  }));

  const result = await fetchPropertiesPage({ category: 'nha' }, 2, 9, 'price,asc');

  expect(capturedUrl).toContain('page=2');
  expect(capturedUrl).toContain('size=9');
  expect(capturedUrl).toContain('sort=price%2Casc');
  expect(result.items).toHaveLength(1);
  expect(result.items[0].id).toBe('p1');
  expect(result.totalElements).toBe(42);
  expect(result.totalPages).toBe(5);
  expect(result.page).toBe(2);
});
