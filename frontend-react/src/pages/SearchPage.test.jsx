import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchPropertiesPage: vi.fn(),
}));

import { fetchPropertiesPage } from '../services/api.js';
import SearchPage from './SearchPage.jsx';

function pageResult(page, totalPages, totalElements, items = []) {
  return { items, totalElements, totalPages, page };
}

beforeEach(() => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 1, 0));
  // jsdom does not implement scrollIntoView; Pagination's onPageChange calls it.
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('fetches page 0 on first render with the default sort', async () => {
  render(<SearchPage queryParams={{}} />);
  await waitFor(() => expect(fetchPropertiesPage).toHaveBeenCalled());
  const [, page, size, sort] = fetchPropertiesPage.mock.calls[0];
  expect(page).toBe(0);
  expect(size).toBe(9);
  expect(sort).toBe('createdAt,desc');
});

test('shows totalElements from the response, not just the current page\'s item count', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 5, 42, Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, title: `T${i}` }))));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('42 kết quả');
});

test('does not render pagination when there is only 1 page', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 1, 3, [{ id: 'p1', title: 'A' }]));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('3 kết quả');
  expect(screen.queryByRole('navigation', { name: 'Phân trang' })).not.toBeInTheDocument();
});

test('clicking a page number keeps the same filters and sort, changes only the page', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 3, 27, Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, title: `T${i}` }))));
  render(<SearchPage queryParams={{ category: 'nha' }} />);
  await screen.findByText('27 kết quả');

  fireEvent.click(screen.getByRole('button', { name: '2' }));

  await waitFor(() => {
    const lastCall = fetchPropertiesPage.mock.calls.at(-1);
    expect(lastCall[1]).toBe(1); // page index
    expect(lastCall[0]).toMatchObject({ category: 'nha' }); // filters unchanged
  });
});

test('changing sort resets to page 0', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(2, 3, 27, Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, title: `T${i}` }))));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('27 kết quả');

  fireEvent.change(screen.getByDisplayValue('Mới nhất'), { target: { value: 'price-asc' } });

  await waitFor(() => {
    const lastCall = fetchPropertiesPage.mock.calls.at(-1);
    expect(lastCall[1]).toBe(0); // page reset
    expect(lastCall[3]).toBe('price,asc');
  });
});

test('clicking "Tìm kiếm ngay" resets to page 0 with the new filters', async () => {
  fetchPropertiesPage.mockResolvedValue(pageResult(0, 1, 5, [{ id: 'p1', title: 'A' }]));
  render(<SearchPage queryParams={{}} />);
  await screen.findByText('5 kết quả');

  fireEvent.change(screen.getByPlaceholderText('Ví dụ: Trà Vinh, Phường 6...'), { target: { value: 'Long Đức' } });
  fireEvent.click(screen.getByText('Tìm kiếm ngay'));

  await waitFor(() => {
    const lastCall = fetchPropertiesPage.mock.calls.at(-1);
    expect(lastCall[1]).toBe(0);
    expect(lastCall[0]).toMatchObject({ query: 'Long Đức' });
  });
});
