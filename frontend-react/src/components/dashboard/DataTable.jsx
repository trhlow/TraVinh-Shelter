import { useEffect, useMemo, useState } from 'react';
import { downloadCsv } from '../../utils/exportCsv.js';
import { LoadingRows, StateBlock } from '../DashboardWidgets.jsx';
import Icon from '../ui/Icon.jsx';

/**
 * Generic admin/broker table: client-side search, sort, pagination, CSV export.
 * columns: [{ key, label, sortable = true, render?: (row) => node, csv?: (row) => string }]
 */
export default function DataTable({
  columns,
  rows,
  searchKeys = [],
  searchPlaceholder = 'Tìm kiếm...',
  pageSize = 10,
  exportFilename = 'du-lieu.csv',
  loading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Thử đổi từ khóa hoặc bộ lọc.',
  toolbar = null,
  initialQuery = '',
}) {
  const [query, setQuery] = useState(initialQuery);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    setQuery(initialQuery);
    setPage(0);
  }, [initialQuery]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = !needle ? rows : rows.filter((row) => (
      searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(needle))
    ));
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const left = a[sortKey];
        const right = b[sortKey];
        const compared = typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left ?? '').localeCompare(String(right ?? ''), 'vi');
        return sortDir === 'asc' ? compared : -compared;
      });
    }
    return result;
  }, [rows, query, searchKeys, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleExport = () => {
    // Columns whose render returns JSX need a csv accessor to produce a plain-text cell.
    const csvColumns = columns.map((column) => ({
      key: column.key,
      label: column.label,
      format: column.csv ? (value, row) => column.csv(row) : undefined,
    }));
    downloadCsv(exportFilename, filtered, csvColumns);
  };

  if (loading) return <LoadingRows rows={5} />;

  return (
    <div>
      <div className="data-table-toolbar">
        <input
          className="input data-table-search"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setPage(0); }}
        />
        {toolbar}
        <button className="btn btn-ghost btn-sm" type="button" onClick={handleExport}>
          <Icon name="Download" size={14} className="icon-muted" />
          Xuất CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <StateBlock title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.sortable === false ? column.label : (
                        <button className="data-table-sort-btn" type="button" onClick={() => toggleSort(column.key)}>
                          {column.label}
                          {sortKey === column.key && <Icon name={sortDir === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={13} />}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <div className="data-table-pager">
              <button className="btn btn-ghost btn-sm" type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Trang trước</button>
              <span>Trang {currentPage + 1}/{pageCount}</span>
              <button className="btn btn-ghost btn-sm" type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Trang sau</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
