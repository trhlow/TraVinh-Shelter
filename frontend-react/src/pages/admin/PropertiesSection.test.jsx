import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import PropertiesSection from './PropertiesSection.jsx';

afterEach(cleanup);

const properties = [
  { id: 'p1', title: 'Trọ Trà Vinh', address: 'TV', ward: 'phuong-tra-vinh', category: 'tro', rawStatus: 'AVAILABLE', statusLabel: 'Đang hiển thị', priceLabel: '1tr', createdAt: '2026-06-01T00:00:00Z' },
  { id: 'p2', title: 'Nhà Long Đức', address: 'LD', ward: 'phuong-long-duc', category: 'nha', rawStatus: 'PENDING', statusLabel: 'Chờ duyệt', priceLabel: '2 tỷ', createdAt: '2026-06-02T00:00:00Z' },
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
  renderSection({ status: 'PENDING' });
  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
  expect(screen.queryByText('Trọ Trà Vinh')).not.toBeInTheDocument();
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
      queryParams={{ status: 'PENDING' }}
    />,
  );

  expect(screen.getByText('Nhà Long Đức')).toBeInTheDocument();
  expect(screen.queryByText('Trọ Trà Vinh')).not.toBeInTheDocument();
});
