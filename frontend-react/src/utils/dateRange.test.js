import { expect, test } from 'vitest';
import { DATE_PRESETS, resolveDateRange, isInRange, previousRange, percentDelta } from './dateRange.js';

const NOW = new Date('2026-07-03T12:00:00Z');

test('presets include all/7d/30d/quarter/custom in order', () => {
  expect(DATE_PRESETS.map((preset) => preset.id)).toEqual(['all', '7d', '30d', 'quarter', 'custom']);
});

test('resolveDateRange all → unbounded', () => {
  expect(resolveDateRange('all', {}, NOW)).toEqual({ from: null, to: null });
});

test('resolveDateRange 7d → from 7 days ago to now', () => {
  const range = resolveDateRange('7d', {}, NOW);
  expect(range.to.toISOString()).toBe(NOW.toISOString());
  expect(range.from.toISOString()).toBe(new Date('2026-06-26T12:00:00Z').toISOString());
});

test('resolveDateRange quarter → start of current quarter', () => {
  const range = resolveDateRange('quarter', {}, NOW);
  expect(range.from.getMonth()).toBe(6); // July = quarter 3 starts month index 6
  expect(range.from.getDate()).toBe(1);
});

test('resolveDateRange custom parses from/to strings, to is end-of-day', () => {
  const range = resolveDateRange('custom', { from: '2026-01-01', to: '2026-01-31' }, NOW);
  expect(range.from.getFullYear()).toBe(2026);
  expect(range.to.getHours()).toBe(23);
});

test('isInRange checks bounds and treats missing value as out-of-range when bounded', () => {
  const range = resolveDateRange('7d', {}, NOW);
  expect(isInRange('2026-07-01T00:00:00Z', range)).toBe(true);
  expect(isInRange('2026-06-01T00:00:00Z', range)).toBe(false);
  expect(isInRange(null, range)).toBe(false);
  expect(isInRange(null, { from: null, to: null })).toBe(true);
});

test('previousRange returns the adjacent earlier window of equal length', () => {
  const range = resolveDateRange('7d', {}, NOW);
  const prev = previousRange(range);
  expect(prev.to.toISOString()).toBe(range.from.toISOString());
  expect(prev.from.toISOString()).toBe(new Date('2026-06-19T12:00:00Z').toISOString());
  expect(previousRange({ from: null, to: null })).toBe(null);
});

test('percentDelta rounds and guards divide-by-zero', () => {
  expect(percentDelta(12, 10)).toBe(20);
  expect(percentDelta(8, 10)).toBe(-20);
  expect(percentDelta(5, 0)).toBe(null);
  expect(percentDelta(5, null)).toBe(null);
});
