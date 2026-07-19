import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

test('mock mode: fetchProperties honors sort and size when provided', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'true');
  vi.resetModules();
  const { fetchProperties } = await import('./api.js');

  const items = await fetchProperties({ sort: 'createdAt,desc', size: 12 });

  expect(items.length).toBeLessThanOrEqual(12);
  for (let i = 0; i < items.length - 1; i += 1) {
    expect(new Date(items[i].createdAt).getTime())
      .toBeGreaterThanOrEqual(new Date(items[i + 1].createdAt).getTime());
  }
});

test('mock mode: fetchProperties ignores sort/size when not provided (existing callers unaffected)', async () => {
  vi.stubEnv('VITE_USE_MOCK_API', 'true');
  vi.resetModules();
  const { fetchProperties } = await import('./api.js');

  const filtered = await fetchProperties({ category: 'nha', transaction: 'all' });
  const unfiltered = await fetchProperties({ category: 'all', transaction: 'all' });

  expect(filtered.length).toBeLessThanOrEqual(unfiltered.length);
  expect(filtered.every((item) => item.category === 'nha')).toBe(true);
});
