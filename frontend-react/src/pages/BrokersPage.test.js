import { describe, expect, test } from 'vitest';
import { MOCK_PROPERTIES } from '../services/mockData.js';
import { brokerStatsFrom } from './BrokersPage.jsx';

describe('brokerStatsFrom', () => {
  test('đã bán không vượt quá tổng tin đăng', () => {
    const brokers = brokerStatsFrom(MOCK_PROPERTIES);

    expect(brokers.length).toBeGreaterThan(0);
    brokers.forEach((broker) => {
      expect(broker.closedDeals).toBeLessThanOrEqual(broker.listings.length);
    });
  });
});
