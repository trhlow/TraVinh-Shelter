import { expect, test, vi } from 'vitest';

vi.stubEnv('VITE_USE_MOCK_API', 'true');
vi.resetModules();
const { MOCK_PROPERTIES } = await import('./mockData.js');
const { fetchAdminAuditLogs } = await import('./api.js');

test('mock properties span multiple months for date filtering', () => {
  expect(MOCK_PROPERTIES.length).toBeGreaterThanOrEqual(20);
  const months = new Set(MOCK_PROPERTIES.map((property) => property.createdAt.slice(0, 7)));
  expect(months.size).toBeGreaterThanOrEqual(4);
});

test('every mock property keeps a real ward and category', () => {
  MOCK_PROPERTIES.forEach((property) => {
    expect(['phuong-tra-vinh', 'phuong-long-duc', 'phuong-nguyet-hoa', 'phuong-hoa-thuan']).toContain(property.ward);
    expect(['tro', 'nha', 'dat']).toContain(property.category);
  });
});

test('fetchAdminAuditLogs returns newest-first audit entries in mock mode', async () => {
  const logs = await fetchAdminAuditLogs('test-token');
  expect(logs.length).toBeGreaterThanOrEqual(10);
  expect(logs[0].action).toBeTruthy();
  const times = logs.map((log) => new Date(log.createdAt).getTime());
  expect([...times].sort((a, b) => b - a)).toEqual(times);
});
