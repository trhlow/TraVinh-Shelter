import { describe, expect, test } from 'vitest';
import { filterListingsByStatus, countListingsByStatus } from './BrokerDashboard.jsx';

const listings = [
  { id: 1, rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị' },
  { id: 2, rawStatus: 'SOLD', statusLabel: 'Đã bán' },
  { id: 3, rawStatus: 'HIDDEN', statusLabel: 'Đã ẩn' },
  { id: 4, rawStatus: 'RENTED', statusLabel: 'Đã thuê' },
  { id: 5, rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị' },
];

describe('broker dashboard listing status filters', () => {
  test('lọc tin đang hoạt động', () => {
    expect(filterListingsByStatus(listings, 'AVAILABLE').map((l) => l.id)).toEqual([1, 5]);
  });

  test('lọc tin đã ẩn', () => {
    expect(filterListingsByStatus(listings, 'HIDDEN').map((l) => l.id)).toEqual([3]);
  });

  test('đếm tin theo từng trạng thái', () => {
    expect(countListingsByStatus(listings)).toEqual({ AVAILABLE: 2, SOLD: 1, RENTED: 1, HIDDEN: 1 });
  });
});
