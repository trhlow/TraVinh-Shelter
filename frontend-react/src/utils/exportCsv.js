function escapeCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvString(rows, columns) {
  const header = columns.map((column) => escapeCell(column.label)).join(',');
  const lines = rows.map((row) => columns
    .map((column) => escapeCell(column.format ? column.format(row[column.key], row) : row[column.key]))
    .join(','));
  return [header, ...lines].join('\r\n');
}

// BOM so Excel opens Vietnamese text as UTF-8 instead of mojibake.
export function downloadCsv(filename, rows, columns) {
  const blob = new Blob([`﻿${toCsvString(rows, columns)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
