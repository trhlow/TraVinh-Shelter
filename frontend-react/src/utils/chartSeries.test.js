import { expect, test } from 'vitest';
import { trimLeadingEmptyMonths } from './chartSeries.js';

test('trimLeadingEmptyMonths cuts leading zero-value entries', () => {
  const buckets = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
    { label: 'T3', current: 5, previous: 0 },
    { label: 'T4', current: 2, previous: 1 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result.map((b) => b.label)).toEqual(['T3', 'T4']);
});

test('trimLeadingEmptyMonths keeps a bucket real if only previous is non-zero', () => {
  const buckets = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 3 },
    { label: 'T3', current: 0, previous: 0 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result.map((b) => b.label)).toEqual(['T2', 'T3']);
});

test('trimLeadingEmptyMonths returns only the last entry when everything is zero', () => {
  const buckets = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
    { label: 'T3', current: 0, previous: 0 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result).toHaveLength(1);
  expect(result[0].label).toBe('T3');
});

test('trimLeadingEmptyMonths returns the array unchanged when the first entry already has data', () => {
  const buckets = [
    { label: 'T1', current: 1, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result).toEqual(buckets);
});

test('trimLeadingEmptyMonths treats missing current/previous fields as 0', () => {
  const buckets = [
    { label: 'T1' },
    { label: 'T2', current: 4 },
  ];
  const result = trimLeadingEmptyMonths(buckets);
  expect(result.map((b) => b.label)).toEqual(['T2']);
});
