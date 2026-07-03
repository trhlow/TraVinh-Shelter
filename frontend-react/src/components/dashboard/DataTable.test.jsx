import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import DataTable from './DataTable.jsx';

vi.mock('../../utils/exportCsv.js', () => ({ downloadCsv: vi.fn() }));
import { downloadCsv } from '../../utils/exportCsv.js';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const columns = [
  { key: 'name', label: 'Tên' },
  { key: 'age', label: 'Tuổi' },
];
const rows = Array.from({ length: 12 }, (_, index) => ({ id: index, name: `Người ${index}`, age: 20 + index }));

test('renders rows and paginates at pageSize', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} pageSize={10} exportFilename="x.csv" />);
  expect(screen.getByText('Người 0')).toBeInTheDocument();
  expect(screen.queryByText('Người 11')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
  expect(screen.getByText('Người 11')).toBeInTheDocument();
});

test('search filters rows across searchKeys', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} exportFilename="x.csv" />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Người 11' } });
  expect(screen.getByText('Người 11')).toBeInTheDocument();
  expect(screen.queryByText('Người 0')).not.toBeInTheDocument();
});

test('clicking a column header toggles sort direction', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} pageSize={12} exportFilename="x.csv" />);
  fireEvent.click(screen.getByRole('button', { name: /Tuổi/ }));
  let cells = screen.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent);
  expect(cells[0]).toBe('20');
  fireEvent.click(screen.getByRole('button', { name: /Tuổi/ }));
  cells = screen.getAllByRole('row').slice(1).map((row) => row.cells[1].textContent);
  expect(cells[0]).toBe('31');
});

test('export button downloads the filtered set, not just the current page', () => {
  render(<DataTable columns={columns} rows={rows} searchKeys={['name']} pageSize={5} exportFilename="danh-sach.csv" />);
  fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));
  expect(downloadCsv).toHaveBeenCalledTimes(1);
  const [filename, exportedRows, exportedColumns] = downloadCsv.mock.calls[0];
  expect(filename).toBe('danh-sach.csv');
  expect(exportedRows).toEqual(expect.arrayContaining([rows[11]]));
  expect(exportedColumns.map((column) => column.key)).toEqual(['name', 'age']);
});

test('columns with a csv accessor export through it', () => {
  const csvColumns = [...columns, { key: 'x', label: 'X', render: () => 'jsx', csv: (row) => `csv-${row.name}` }];
  render(<DataTable columns={csvColumns} rows={rows.slice(0, 1)} searchKeys={['name']} exportFilename="x.csv" />);
  fireEvent.click(screen.getByRole('button', { name: 'Xuất CSV' }));
  const exported = downloadCsv.mock.calls[0][2].find((column) => column.key === 'x');
  expect(exported.format(null, rows[0])).toBe('csv-Người 0');
});

test('shows empty state when no rows match', () => {
  render(<DataTable columns={columns} rows={[]} searchKeys={['name']} exportFilename="x.csv" emptyTitle="Trống" emptyDescription="Không có dữ liệu." />);
  expect(screen.getByText('Trống')).toBeInTheDocument();
});
