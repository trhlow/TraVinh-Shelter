import { describe, expect, test } from 'vitest';
import { MOCK_PROPERTIES } from './mockData.js';

describe('mock property statuses', () => {
  test('không còn tin ở trạng thái chờ duyệt (PENDING)', () => {
    expect(MOCK_PROPERTIES.some((property) => property.rawStatus === 'PENDING')).toBe(false);
  });
});
