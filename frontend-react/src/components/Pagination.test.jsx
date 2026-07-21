import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Pagination, { buildPageList } from './Pagination.jsx';

afterEach(() => cleanup());

// ── buildPageList (pure) ──────────────────────────────────
test('buildPageList shows every page when total is small', () => {
  expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
});

test('buildPageList collapses the middle with an ellipsis when total is large', () => {
  expect(buildPageList(1, 10)).toEqual([1, 2, '...', 10]);
});

test('buildPageList keeps current page and its neighbors visible', () => {
  expect(buildPageList(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10]);
});

test('buildPageList at the last page has no trailing ellipsis', () => {
  expect(buildPageList(10, 10)).toEqual([1, '...', 9, 10]);
});

// ── Pagination component ──────────────────────────────────
test('renders nothing when there is only 1 page', () => {
  const { container } = render(<Pagination page={0} totalPages={1} onPageChange={() => {}} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders page numbers 1-indexed, marking the current page', () => {
  render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
  const current = screen.getByRole('button', { name: '2' });
  expect(current).toHaveAttribute('aria-current', 'page');
  expect(current).toHaveClass('is-active');
});

test('"Trước" is disabled on the first page, "Tiếp" is disabled on the last page', () => {
  const { rerender } = render(<Pagination page={0} totalPages={3} onPageChange={() => {}} />);
  expect(screen.getByText('Trước').closest('button')).toBeDisabled();
  expect(screen.getByText('Tiếp').closest('button')).not.toBeDisabled();

  rerender(<Pagination page={2} totalPages={3} onPageChange={() => {}} />);
  expect(screen.getByText('Trước').closest('button')).not.toBeDisabled();
  expect(screen.getByText('Tiếp').closest('button')).toBeDisabled();
});

test('clicking a page number calls onPageChange with the 0-indexed page', () => {
  const onPageChange = vi.fn();
  render(<Pagination page={0} totalPages={3} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByRole('button', { name: '3' }));
  expect(onPageChange).toHaveBeenCalledWith(2);
});

test('clicking "Tiếp" advances by one page', () => {
  const onPageChange = vi.fn();
  render(<Pagination page={0} totalPages={3} onPageChange={onPageChange} />);
  fireEvent.click(screen.getByText('Tiếp').closest('button'));
  expect(onPageChange).toHaveBeenCalledWith(1);
});

test('all buttons are disabled while disabled=true, even mid-list pages', () => {
  render(<Pagination page={1} totalPages={5} onPageChange={() => {}} disabled />);
  expect(screen.getByText('Trước').closest('button')).toBeDisabled();
  expect(screen.getByText('Tiếp').closest('button')).toBeDisabled();
  expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
});
