import { expect, test } from 'vitest';
import { buildDailyActivitySeries } from './BrokerDashboard.jsx';

test('returns one bucket per day of the reference month, labeled by day number', () => {
  const referenceDate = new Date(2026, 1, 15); // Feb 2026 → 28 days
  const series = buildDailyActivitySeries([], [], referenceDate);
  expect(series).toHaveLength(28);
  expect(series[0].label).toBe('1');
  expect(series[27].label).toBe('28');
});

test('counts listings by createdAt day as current', () => {
  const referenceDate = new Date(2026, 6, 15); // July 2026
  const listings = [
    { createdAt: '2026-07-03T10:00:00' },
    { createdAt: '2026-07-03T18:00:00' },
    { createdAt: '2026-07-10T08:00:00' },
  ];
  const series = buildDailyActivitySeries(listings, [], referenceDate);
  expect(series.find((bucket) => bucket.label === '3').current).toBe(2);
  expect(series.find((bucket) => bucket.label === '10').current).toBe(1);
  expect(series.find((bucket) => bucket.label === '1').current).toBe(0);
});

test('counts only CONFIRMED viewings by requestedAt day as previous', () => {
  const referenceDate = new Date(2026, 6, 15);
  const viewings = [
    { status: 'CONFIRMED', requestedAt: '2026-07-05T09:00:00' },
    { status: 'PENDING', requestedAt: '2026-07-05T09:00:00' },
    { status: 'CONFIRMED', createdAt: '2026-07-06T09:00:00' },
  ];
  const series = buildDailyActivitySeries([], viewings, referenceDate);
  expect(series.find((bucket) => bucket.label === '5').previous).toBe(1);
  expect(series.find((bucket) => bucket.label === '6').previous).toBe(1);
});

test('ignores listings/viewings from a different month', () => {
  const referenceDate = new Date(2026, 6, 15);
  const listings = [{ createdAt: '2026-06-30T10:00:00' }];
  const series = buildDailyActivitySeries(listings, [], referenceDate);
  expect(series.every((bucket) => bucket.current === 0)).toBe(true);
});
