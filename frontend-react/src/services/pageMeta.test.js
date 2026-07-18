import { expect, test } from 'vitest';
import { buildPageMeta } from './pageMeta.js';

test('home has the brand title and is indexable', () => {
  const meta = buildPageMeta('home');
  expect(meta.title).toBe('Công Tín Land — Bất động sản Trà Vinh: nhà, đất, phòng trọ');
  expect(meta.robots).toBe('index');
  expect(meta.description.length).toBeGreaterThan(0);
});

test('every public route is indexable', () => {
  for (const key of ['home', 'search', 'property', 'brokers']) {
    expect(buildPageMeta(key).robots).toBe('index');
  }
});

test('private routes are noindex', () => {
  for (const key of ['login', 'broker', 'admin']) {
    expect(buildPageMeta(key).robots).toBe('noindex');
  }
});

test('property title comes from the listing when available', () => {
  const meta = buildPageMeta('property', { propertyTitle: 'Nhà trọ Thanh Trúc' });
  expect(meta.title).toBe('Nhà trọ Thanh Trúc — Công Tín Land');
  expect(meta.robots).toBe('index');
});

test('property falls back to a generic title without listing data', () => {
  expect(buildPageMeta('property').title).toBe('Chi tiết bất động sản — Công Tín Land');
});

test('unknown route keys fall back to home metadata', () => {
  expect(buildPageMeta('does-not-exist')).toEqual(buildPageMeta('home'));
});

test('every route supplies a title and a description', () => {
  for (const key of ['home', 'search', 'property', 'brokers', 'login', 'broker', 'admin']) {
    const meta = buildPageMeta(key);
    expect(meta.title, key).toMatch(/Công Tín Land/);
    expect(meta.description, key).toBeTruthy();
  }
});
