import { expect, test, vi } from 'vitest';
import { toCsvString, downloadCsv } from './exportCsv.js';

const columns = [
  { key: 'title', label: 'Tiêu đề' },
  { key: 'price', label: 'Giá', format: (value) => `${value} VND` },
];

test('toCsvString renders header row from labels and data rows in column order', () => {
  const csv = toCsvString([{ title: 'Nhà A', price: 100 }], columns);
  expect(csv).toBe('Tiêu đề,Giá\r\nNhà A,100 VND');
});

test('toCsvString escapes commas, quotes, and newlines', () => {
  const csv = toCsvString([{ title: 'Nhà "to", đẹp\nmới', price: 1 }], columns);
  expect(csv.split('\r\n')[1]).toBe('"Nhà ""to"", đẹp\nmới",1 VND');
});

test('toCsvString renders null/undefined as empty string', () => {
  const csv = toCsvString([{ title: null, price: 2 }], columns);
  expect(csv.split('\r\n')[1]).toBe(',2 VND');
});

test('downloadCsv creates an object URL with BOM and clicks an anchor', () => {
  const createObjectURL = vi.fn(() => 'blob:mock');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  downloadCsv('bao-cao.csv', [{ title: 'A', price: 3 }], columns);

  expect(createObjectURL).toHaveBeenCalledTimes(1);
  const blob = createObjectURL.mock.calls[0][0];
  expect(blob.type).toBe('text/csv;charset=utf-8');
  expect(click).toHaveBeenCalledTimes(1);
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  click.mockRestore();
  vi.unstubAllGlobals();
});
