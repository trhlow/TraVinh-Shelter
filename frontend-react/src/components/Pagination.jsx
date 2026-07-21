import Icon from './ui/Icon.jsx';

// Pure — windowed page list: always show first, last, current, and current's
// immediate neighbors; collapse any gap into a single '...' entry.
export function buildPageList(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('...');
    result.push(page);
  });
  return result;
}

export default function Pagination({ page, totalPages, onPageChange, disabled = false }) {
  if (totalPages <= 1) return null;
  const current = page + 1;
  const pageList = buildPageList(current, totalPages);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="pagination-btn"
        disabled={disabled || page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        <Icon name="ChevronLeft" size={16} /> Trước
      </button>
      <div className="pagination-pages">
        {pageList.map((item, index) => (
          item === '...' ? (
            <span key={`ellipsis-${index}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={item}
              type="button"
              className={`pagination-page-btn${item === current ? ' is-active' : ''}`}
              disabled={disabled}
              aria-current={item === current ? 'page' : undefined}
              onClick={() => onPageChange(item - 1)}
            >
              {item}
            </button>
          )
        ))}
      </div>
      <button
        type="button"
        className="pagination-btn"
        disabled={disabled || page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Tiếp <Icon name="ChevronRight" size={16} />
      </button>
    </nav>
  );
}
