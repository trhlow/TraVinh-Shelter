import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import PageMeta from './PageMeta.jsx';

afterEach(() => cleanup());

test('sets the document title', () => {
  render(<PageMeta routeKey="brokers" />);
  expect(document.title).toBe('Đội ngũ môi giới — Công Tín Land');
});

test('emits a description meta tag into head', () => {
  render(<PageMeta routeKey="home" />);
  const tag = document.head.querySelector('meta[name="description"]');
  expect(tag).not.toBeNull();
  expect(tag.getAttribute('content')).toContain('Trà Vinh');
});

test('emits robots noindex for private routes', () => {
  render(<PageMeta routeKey="admin" />);
  expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
});

test('emits no robots tag for public routes', () => {
  render(<PageMeta routeKey="search" />);
  expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
});

test('uses the listing title for a property page', () => {
  render(<PageMeta routeKey="property" data={{ propertyTitle: 'Nhà phố Phường 6' }} />);
  expect(document.title).toBe('Nhà phố Phường 6 — Công Tín Land');
});
