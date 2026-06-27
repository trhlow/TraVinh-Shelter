import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  window.location.hash = '#/';
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API unavailable in unit test'))));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('renders the template home page', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Tìm nhà trọ, bất động sản Trà Vinh nhanh chóng' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tin nổi bật' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText('BĐS Trà Vinh').length).toBeGreaterThan(0));
});

test('routes to search and broker dashboard pages', () => {
  window.location.hash = '#/search';
  const { rerender } = render(<App />);
  expect(screen.getByRole('heading', { name: 'Nhà đất bán tại Trà Vinh' })).toBeInTheDocument();
  expect(screen.getByTestId('property-grid')).toBeInTheDocument();

  window.location.hash = '#/broker';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  rerender(<App />);
  expect(screen.getAllByRole('heading', { name: 'Tin đăng của tôi' }).length).toBeGreaterThan(0);
});
