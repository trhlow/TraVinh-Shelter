import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DateRangeFilter from './DateRangeFilter.jsx';

afterEach(cleanup);

test('renders preset pills and reports resolved range on click', () => {
  const onChange = vi.fn();
  render(<DateRangeFilter preset="all" custom={{}} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: '7 ngày' }));
  const [presetId, custom, range] = onChange.mock.calls[0];
  expect(presetId).toBe('7d');
  expect(custom).toEqual({});
  expect(range.from).toBeInstanceOf(Date);
});

test('custom preset shows from/to inputs and reports edits', () => {
  const onChange = vi.fn();
  render(<DateRangeFilter preset="custom" custom={{ from: '2026-01-01', to: '' }} onChange={onChange} />);
  const inputs = screen.getAllByLabelText(/Từ ngày|Đến ngày/);
  expect(inputs).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-02-01' } });
  const [presetId, custom] = onChange.mock.calls[0];
  expect(presetId).toBe('custom');
  expect(custom).toEqual({ from: '2026-01-01', to: '2026-02-01' });
});

test('active pill is highlighted', () => {
  render(<DateRangeFilter preset="30d" custom={{}} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: '30 ngày' })).toHaveClass('is-active');
});
