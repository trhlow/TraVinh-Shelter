import MaterialIcon from './MaterialIcon.jsx';

const toneClasses = {
  navy: 'bg-primary-fixed text-primary',
  orange: 'bg-secondary-fixed text-action-orange',
  green: 'bg-success-green/10 text-success-green',
  red: 'bg-error-container text-error',
  muted: 'bg-surface-container text-on-surface-variant',
};

export function StatCard({ icon, title, value, meta, tone = 'navy', href }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body-sm text-body-sm text-on-surface-variant">{title}</p>
          <p className="mt-2 font-headline-lg text-headline-lg text-on-surface">{value}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone] || toneClasses.navy}`}>
          <MaterialIcon filled>{icon}</MaterialIcon>
        </span>
      </div>
      {meta && <p className="mt-4 font-body-sm text-body-sm text-on-surface-variant">{meta}</p>}
    </>
  );

  const className = 'ui-card block p-5 transition-colors hover:bg-surface-container-low';
  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }
  return <article className={className}>{content}</article>;
}

export function DashboardPanel({ title, count, action, children, className = '' }) {
  return (
    <section className={`ui-panel ${className}`.trim()}>
      {(title || action || count !== undefined) && (
        <div className="flex flex-col gap-3 border-b border-outline-variant px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>}
            {count !== undefined && <p className="font-body-sm text-body-sm text-on-surface-variant">{count}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({ children, tone = 'muted' }) {
  return (
    <span className={`ui-badge ${badgeTone(tone)}`}>
      {children}
    </span>
  );
}

export function StateBlock({ icon = 'inbox', title, description }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded bg-surface-container text-on-surface-variant">
        <MaterialIcon>{icon}</MaterialIcon>
      </span>
      <p className="font-label-bold text-label-bold text-on-surface">{title}</p>
      {description && <p className="mt-1 max-w-md font-body-sm text-body-sm text-on-surface-variant">{description}</p>}
    </div>
  );
}

export function LoadingRows({ rows = 4 }) {
  return (
    <div className="divide-y divide-outline-variant">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="grid grid-cols-[56px_1fr_120px] items-center gap-4 px-5 py-4">
          <div className="h-12 rounded bg-surface-container-low" />
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-surface-container-low" />
            <div className="h-3 w-1/2 rounded bg-surface-container-low" />
          </div>
          <div className="h-8 rounded bg-surface-container-low" />
        </div>
      ))}
    </div>
  );
}

function badgeTone(tone) {
  return {
    success: 'bg-success-green/10 text-success-green',
    warning: 'bg-secondary-fixed text-on-secondary-container',
    danger: 'bg-error-container text-on-error-container',
    info: 'bg-primary-fixed text-trust-navy',
    muted: 'bg-surface-container text-on-surface-variant',
  }[tone] || 'bg-surface-container text-on-surface-variant';
}
