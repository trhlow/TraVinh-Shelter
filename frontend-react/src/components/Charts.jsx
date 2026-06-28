const KIT_COLORS = ['#697077', '#A2A9B0', '#C1C7CD', '#0F62FE', '#001D6C', '#DDE1E6'];

export function DonutChart({ title, data, centerLabel }) {
  const normalized = withColors(data);
  const totalValue = normalized.reduce((sum, item) => sum + item.value, 0);
  const total = totalValue || 1;
  let offset = 25;

  return (
    <section className="ui-panel p-5">
      <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-48 w-48 shrink-0">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgb(var(--twc-surface-container))" strokeWidth="5" />
            {normalized.map((item) => {
              const dash = (item.value / total) * 100;
              const circle = (
                <circle
                  cx="21"
                  cy="21"
                  fill="transparent"
                  key={item.label}
                  r="15.915"
                  stroke={item.color}
                  strokeDasharray={`${dash} ${100 - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  strokeWidth="5"
                />
              );
              offset -= dash;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-headline-lg text-headline-lg text-on-surface">{totalValue}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{centerLabel}</span>
          </div>
        </div>
        <Legend data={normalized} total={total} />
      </div>
    </section>
  );
}

export function BarChart({ title, data }) {
  const normalized = withColors(data);
  const max = Math.max(...normalized.map((item) => item.value), 1);
  return (
    <section className="ui-panel p-5">
      <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      <div className="mt-5 grid grid-cols-[52px_1fr] gap-3">
        <div className="flex h-64 flex-col justify-between pb-7 text-right font-body-sm text-body-sm text-on-surface-variant">
          {[100, 75, 50, 25, 0].map((tick) => (
            <span key={tick}>{Math.round((max * tick) / 100)}</span>
          ))}
        </div>
        <div className="relative h-64 border-b border-outline-variant">
          <div className="absolute inset-0 grid grid-rows-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <span className="border-t border-outline-variant/70" key={index} />
            ))}
          </div>
          <div className="relative z-10 flex h-full items-end gap-4 pb-7">
            {normalized.map((item) => (
              <div className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2" key={item.label}>
                <div className="flex w-full items-end justify-center gap-1">
                  <span className="w-4 bg-[#697077]" style={{ height: `${Math.max(8, (item.value / max) * 100)}%` }} />
                  <span className="w-4 bg-[#C1C7CD]" style={{ height: `${Math.max(8, ((item.value * 0.82) / max) * 100)}%` }} />
                </div>
                <span className="max-w-24 truncate text-center font-body-sm text-body-sm text-on-surface-variant">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HorizontalBarChart({ title, data }) {
  const normalized = withColors(data);
  const max = Math.max(...normalized.map((item) => item.value), 1);
  return (
    <section className="ui-panel p-5">
      <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      <div className="mt-5 space-y-4">
        {normalized.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="font-body-sm text-body-sm text-on-surface">{item.label}</span>
              <span className="font-label-bold text-label-bold text-on-surface">{item.value}</span>
            </div>
            <div className="h-3 bg-surface-container">
              <div className="h-full bg-[#697077]" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Legend({ data, total }) {
  return (
    <div className="w-full space-y-3">
      {data.map((item) => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div className="flex items-center justify-between gap-3" key={item.label}>
            <span className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="font-label-bold text-label-bold text-on-surface">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

function withColors(data) {
  return data.map((item, index) => ({
    ...item,
    color: item.color || KIT_COLORS[index % KIT_COLORS.length],
  }));
}
