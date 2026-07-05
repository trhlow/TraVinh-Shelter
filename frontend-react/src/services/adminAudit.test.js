import { afterEach, expect, test, vi } from 'vitest';

vi.stubEnv('VITE_USE_MOCK_API', 'true');
vi.resetModules();
const { MOCK_PROPERTIES } = await import('./mockData.js');
const { createBroker, fetchAdminAuditLogs, updateAdminPropertyStatus, updateUserStatus, updateViewingStatus } = await import('./api.js');

afterEach(() => localStorage.clear());

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

test('creating a broker in mock mode appends a CREATE_BROKER audit entry', async () => {
  const before = await fetchAdminAuditLogs('test-token');
  await createBroker('test-token', { fullName: 'Trần Mỹ Linh', email: 'linh@x.vn' });
  const after = await fetchAdminAuditLogs('test-token');

  expect(after.length).toBe(before.length + 1);
  expect(after[0]).toMatchObject({ action: 'CREATE_BROKER', targetLabel: 'Trần Mỹ Linh' });
});

test('locking a user in mock mode appends a LOCK_USER audit entry with the user name', async () => {
  await updateUserStatus('test-token', 'u1', 'LOCKED', 'Phạm Quốc Huy');
  const logs = await fetchAdminAuditLogs('test-token');

  expect(logs[0]).toMatchObject({ action: 'LOCK_USER', targetLabel: 'Phạm Quốc Huy' });
});

test('hiding a property in mock mode appends a HIDE_PROPERTY audit entry with its title', async () => {
  await updateAdminPropertyStatus('test-token', 'p1', 'HIDDEN', 'Nhà mới đường Nguyễn Đáng');
  const logs = await fetchAdminAuditLogs('test-token');

  expect(logs[0]).toMatchObject({ action: 'HIDE_PROPERTY', targetLabel: 'Nhà mới đường Nguyễn Đáng' });
});

test('confirming a viewing in mock mode appends an UPDATE_VIEWING_STATUS audit entry', async () => {
  await updateViewingStatus('test-token', 'v1', 'CONFIRMED', 'Nguyễn Văn A');
  const logs = await fetchAdminAuditLogs('test-token');

  expect(logs[0]).toMatchObject({ action: 'UPDATE_VIEWING_STATUS', targetLabel: 'Nguyễn Văn A' });
});
