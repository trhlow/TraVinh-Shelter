import { expect, test } from 'vitest';
import { buildAdminNotifications } from './adminNotifications.js';

test('collects pending posts, pending viewings, and locked accounts', () => {
  const items = buildAdminNotifications({
    properties: [{ rawStatus: 'PENDING' }, { rawStatus: 'AVAILABLE' }, { rawStatus: 'PENDING' }],
    viewings: [{ status: 'PENDING' }, { status: 'CONFIRMED' }],
    users: [{ status: 'LOCKED' }, { status: 'ACTIVE' }],
  });

  expect(items).toEqual([
    { id: 'pending-posts', icon: 'Clock', text: '2 tin chờ duyệt', href: '#/admin/properties?status=PENDING', tone: 'warning' },
    { id: 'pending-viewings', icon: 'Calendar', text: '1 lịch hẹn chờ xác nhận', href: '#/admin/viewings', tone: 'warning' },
    { id: 'locked-accounts', icon: 'Lock', text: '1 tài khoản đang bị khóa', href: '#/admin/accounts', tone: 'muted' },
  ]);
});

test('returns empty array when nothing needs attention', () => {
  expect(buildAdminNotifications({ properties: [{ rawStatus: 'AVAILABLE' }], viewings: [], users: [] })).toEqual([]);
});
