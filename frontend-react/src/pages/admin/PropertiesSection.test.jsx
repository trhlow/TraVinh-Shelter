import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PropertiesSection from './PropertiesSection.jsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const properties = [
  { id: 'p1', title: 'Trọ Trà Vinh', address: 'TV', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị', priceLabel: '1tr', createdAt: '2026-06-01T00:00:00Z' },
  { id: 'p2', title: 'Nhà Long Đức', address: 'LD', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'HIDDEN', statusLabel: 'Đã gỡ', priceLabel: '2 tỷ', createdAt: '2026-06-02T00:00:00Z' },
];

function renderSection(queryParams = {}) {
  return render(
    <PropertiesSection
      data={{ users: [], brokers: [], properties, viewings: [] }}
      loading={false}
      saving={false}
      actions={{ changePropertyStatus: vi.fn() }}
      queryParams={queryParams}
    />,
  );
}

test('renders all properties without filters', () => {
  renderSection();
  expect(screen.getByText('Trọ Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
});

test('seeds ward + category filters from drill-down query params', () => {
  renderSection({ ward: 'phuong-tra-vinh', category: 'tro' });
  expect(screen.getByText('Trọ Trà Vinh')).toBeInTheDocument();
  expect(screen.queryByText('Nhà Long Đức')).not.toBeInTheDocument();
});

test('seeds status filter from quick-action query param', () => {
  renderSection({ status: 'HIDDEN' });
  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
  expect(screen.queryByText('Trọ Trà Vinh')).not.toBeInTheDocument();
});

test('hiding a visible property asks for confirmation then sets status to HIDDEN', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const changePropertyStatus = vi.fn();
  render(
    <PropertiesSection
      data={{ users: [], brokers: [], properties, viewings: [] }}
      loading={false}
      saving={false}
      actions={{ changePropertyStatus }}
      queryParams={{}}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Gỡ bài đăng' }));

  expect(window.confirm).toHaveBeenCalled();
  expect(changePropertyStatus).toHaveBeenCalledWith('p1', 'HIDDEN');
});

test('restoring a hidden property sets status to AVAILABLE without confirmation', () => {
  const confirmSpy = vi.spyOn(window, 'confirm');
  const changePropertyStatus = vi.fn();
  render(
    <PropertiesSection
      data={{ users: [], brokers: [], properties, viewings: [] }}
      loading={false}
      saving={false}
      actions={{ changePropertyStatus }}
      queryParams={{}}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Khôi phục bài đăng' }));

  expect(confirmSpy).not.toHaveBeenCalled();
  expect(changePropertyStatus).toHaveBeenCalledWith('p2', 'AVAILABLE');
});

test('re-syncs status filter when queryParams change on an already-mounted section', () => {
  const { rerender } = renderSection();
  expect(screen.getByText('Trọ Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();

  rerender(
    <PropertiesSection
      data={{ users: [], brokers: [], properties, viewings: [] }}
      loading={false}
      saving={false}
      actions={{ changePropertyStatus: vi.fn() }}
      queryParams={{ status: 'HIDDEN' }}
    />,
  );

  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
  expect(screen.queryByText('Trọ Trà Vinh')).not.toBeInTheDocument();
});
