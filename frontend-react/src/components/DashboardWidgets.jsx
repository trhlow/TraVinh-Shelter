import Icon from './ui/Icon.jsx';

// tone → icon chip CSS class
const CHIP_CLASS = {
  navy:   'kpi-chip-navy',
  orange: 'kpi-chip-orange',
  green:  'kpi-chip-green',
  red:    'kpi-chip-red',
  muted:  'kpi-chip-muted',
};

// badge tone → badge CSS class (reuses .badge-* from styles.css)
function badgeClass(tone) {
  return {
    success: 'badge badge-success',
    warning: 'badge badge-warning',
    danger:  'badge badge-error',
    error:   'badge badge-error',
    info:    'badge badge-brand',
    muted:   'badge badge-neutral',
    neutral: 'badge badge-neutral',
  }[tone] || 'badge badge-neutral';
}

function isTabActive(href, activePath) {
  return href.replace('#', '') === activePath;
}

/**
 * StatCard — KPI tile.
 *
 * Props (all existing props preserved):
 *   icon   {string}   — Icon name (lucide-react key in ICON_MAP)
 *   title  {string}   — label above the value
 *   value  {string|number}
 *   meta   {string}   — optional sub-text below value
 *   tone   {'navy'|'orange'|'green'|'red'|'muted'}
 *   href   {string}   — if provided, renders as <a>
 *   trend  {{ value: string, direction: 'up'|'down' }}  — optional trend pill
 */
export function StatCard({ icon, title, value, meta, tone = 'navy', href, trend }) {
  const chipClass = CHIP_CLASS[tone] || CHIP_CLASS.navy;

  const content = (
    <>
      <div className="stat-card-top">
        <div className="stat-card-body">
          <p className="stat-card-label">{title}</p>
          <p className="stat-card-value">{value}</p>
          {trend && (
            <span className={`kpi-trend ${trend.direction === 'up' ? 'kpi-trend-up' : 'kpi-trend-down'}`}>
              <Icon
                name={trend.direction === 'up' ? 'TrendingUp' : 'TrendingDown'}
                size={12}
                strokeWidth={2.5}
              />
              {trend.value}
            </span>
          )}
        </div>
        <span className={`kpi-icon-chip ${chipClass}`}>
          <Icon name={icon} size={22} strokeWidth={1.75} />
        </span>
      </div>
      {meta && <p className="stat-card-meta">{meta}</p>}
    </>
  );

  if (href) {
    return (
      <a className="stat-card-link" href={href}>
        {content}
      </a>
    );
  }
  return <article className="stat-card-article">{content}</article>;
}

/**
 * DashboardPanel — generic content panel with optional header.
 *
 * Props preserved: title, count, action, children, className
 */
export function DashboardPanel({ title, count, action, children, className = '' }) {
  return (
    <section className={`widget-panel ${className}`.trim()}>
      {(title || action || count !== undefined) && (
        <div className="widget-panel-header">
          <div>
            {title && <h2 className="widget-panel-title">{title}</h2>}
            {count !== undefined && <p className="widget-panel-count">{count}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * DashboardPageHeader — page-level heading with optional tabs and sync badge.
 *
 * Props preserved: title, subtitle, tabs, activePath, loading
 */
export function DashboardPageHeader({ title, subtitle, tabs = [], activePath, loading = false }) {
  return (
    <header className="widget-page-header">
      <div className="widget-page-header-row">
        <div>
          <h1 className="dashboard-page-title">{title}</h1>
          {subtitle && (
            <p style={{ marginTop: 8, fontSize: 15, color: 'var(--color-text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div className="widget-sync-badge">
          <Icon
            name={loading ? 'Clock' : 'CheckCircle'}
            size={14}
            strokeWidth={2}
            className={loading ? 'widget-spin' : ''}
          />
          {loading ? 'Đang đồng bộ' : 'Dữ liệu API'}
        </div>
      </div>
      {tabs.length > 0 && (
        <nav className="dashboard-tabs" aria-label="Dashboard sections">
          {tabs.map((tab) => (
            <a
              key={tab.href}
              className={`dashboard-tab ${isTabActive(tab.href, activePath) ? 'is-active' : ''}`}
              href={tab.href}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="dashboard-tab-count">{tab.count}</span>
              )}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

/**
 * StatusBadge — inline badge, maps old tones to design-system badge variants.
 *
 * Props preserved: children, tone
 */
export function StatusBadge({ children, tone = 'muted' }) {
  return (
    <span className={badgeClass(tone)}>
      {children}
    </span>
  );
}

/**
 * StateBlock — empty / error state with centered icon + text.
 *
 * Props preserved: icon, title, description
 * icon is now a lucide Icon name string (e.g. 'FileText', 'AlertCircle').
 * Falls back to 'FileText' if name not recognized.
 */
export function StateBlock({ icon = 'FileText', title, description }) {
  return (
    <div className="widget-state-block">
      <span className="widget-state-icon">
        <Icon name={icon} size={24} strokeWidth={1.75} />
      </span>
      <p className="widget-state-title">{title}</p>
      {description && <p className="widget-state-desc">{description}</p>}
    </div>
  );
}

/**
 * LoadingRows — skeleton loader for tabular content.
 *
 * Props preserved: rows
 */
export function LoadingRows({ rows = 4 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="widget-loading-row">
          <div className="widget-skeleton widget-skeleton-thumb" />
          <div className="widget-skeleton-lines">
            <div className="widget-skeleton widget-skeleton-line widget-skeleton-w-3-4" />
            <div className="widget-skeleton widget-skeleton-line widget-skeleton-w-1-2" />
          </div>
          <div className="widget-skeleton widget-skeleton-action" />
        </div>
      ))}
    </div>
  );
}
