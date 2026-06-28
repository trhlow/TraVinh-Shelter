export function DonutChart({ title, data, centerLabel }) {
  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const total = totalValue || 1;
  let offset = 25;

  return (
    <section className="ui-panel p-5">
      <h2 className="font-headline-md text-headline-md text-trust-navy mb-4">{title}</h2>
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <div className="relative w-44 h-44 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(var(--twc-surface-container-highest))" strokeWidth="6" />
            {data.map((item) => {
              const dash = (item.value / total) * 100;
              const circle = (
                <circle
                  key={item.label}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="6"
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={offset}
                />
              );
              offset -= dash;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-headline-lg text-headline-lg text-trust-navy">{totalValue}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{centerLabel}</span>
          </div>
        </div>
        <div className="w-full space-y-3">
          {data.map((item) => (
            <LegendItem key={item.label} item={item} total={total} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BarChart({ title, data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <section className="ui-panel p-5">
      <h2 className="font-headline-md text-headline-md text-trust-navy mb-4">{title}</h2>
      <div className="h-56 flex items-end gap-3 border-b border-outline-variant pb-2">
        {data.map((item) => (
          <div key={item.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
            <div className="w-full max-w-16 rounded-t bg-primary transition-all" style={{ height: `${Math.max(10, (item.value / max) * 100)}%` }} />
            <span className="font-body-sm text-body-sm text-on-surface-variant text-center">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HorizontalBarChart({ title, data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <section className="ui-panel p-5">
      <h2 className="font-headline-md text-headline-md text-trust-navy mb-4">{title}</h2>
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <span className="font-body-sm text-body-sm text-on-surface">{item.label}</span>
              <span className="font-label-bold text-label-bold text-trust-navy">{item.value}</span>
            </div>
            <div className="h-3 rounded bg-surface-container-low overflow-hidden">
              <div className="h-full rounded bg-action-orange" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LegendItem({ item, total }) {
  const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
        {item.label}
      </span>
      <span className="font-label-bold text-label-bold text-trust-navy">{percent}%</span>
    </div>
  );
}
