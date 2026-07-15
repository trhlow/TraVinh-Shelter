import { expect, test } from 'vitest';
import { buildBrokerNotifications } from './brokerNotifications.js';

test('collects pending listings and pending viewings', () => {
  const items = buildBrokerNotifications({
    listings: [{ rawStatus: 'PENDING' }, { rawStatus: 'AVAILABLE' }, { rawStatus: 'PENDING' }],
    viewings: [{ status: 'PENDING' }, { status: 'CONFIRMED' }],
  });

  expect(items).toEqual([
    { id: 'pending-listings', icon: 'Clock', text: '2 tin chờ duyệt', href: '#/broker/properties', tone: 'warning' },
    { id: 'pending-viewings', icon: 'Calendar', text: '1 lịch hẹn chờ xác nhận', href: '#/broker/viewings', tone: 'warning' },
  ]);
});

test('returns empty array when nothing needs attention', () => {
  expect(buildBrokerNotifications({ listings: [{ rawStatus: 'AVAILABLE' }], viewings: [] })).toEqual([]);
});
