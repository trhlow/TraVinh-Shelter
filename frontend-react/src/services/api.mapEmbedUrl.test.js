import { afterEach, expect, test, vi } from 'vitest';

// normalizeProperty() is an internal (non-exported) helper in api.js — no existing test
// exports it in isolation, so we exercise it through fetchPropertyDetail() with mocking
// disabled, the same way it runs for real backend responses.
vi.stubEnv('VITE_USE_MOCK_API', 'false');
vi.resetModules();
const { fetchPropertyDetail } = await import('./api.js');

function stubFetchOnce(attributes) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      id: 'p1',
      title: 'Test property',
      address: '123 Test St',
      price: 1000000000,
      status: 'AVAILABLE',
      category: { id: 'c1', slug: 'nha' },
      attributes,
    }),
  })));
}

afterEach(() => vi.unstubAllGlobals());

test('normalizeProperty keeps a valid google.com embed URL from the backend', async () => {
  stubFetchOnce({ mapEmbedUrl: 'https://www.google.com/maps/embed?pb=1' });
  const property = await fetchPropertyDetail('p1');
  expect(property.mapEmbedUrl).toBe('https://www.google.com/maps/embed?pb=1');
});

test('normalizeProperty strips a non-google.com embed URL from the backend', async () => {
  stubFetchOnce({ mapEmbedUrl: 'https://evil.example.com/maps/embed' });
  const property = await fetchPropertyDetail('p1');
  expect(property.mapEmbedUrl).toBeNull();
});

test('normalizeProperty strips a javascript: URL from the backend', async () => {
  stubFetchOnce({ mapEmbedUrl: 'javascript:alert(1)' });
  const property = await fetchPropertyDetail('p1');
  expect(property.mapEmbedUrl).toBeNull();
});

test('normalizeProperty leaves mapEmbedUrl null when attribute is absent', async () => {
  stubFetchOnce({});
  const property = await fetchPropertyDetail('p1');
  expect(property.mapEmbedUrl).toBeNull();
});
