// Inline SVG resolves var(--color-*) fine, so charts stay theme-reactive.
const CHART_PALETTE = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)',
  'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)',
];
const TRACK_COLOR = 'var(--color-hairline)';

function withColors(data) {
  return data.map((item, index) => ({
    ...item,
    color: item.color || CHART_PALETTE[index % CHART_PALETTE.length],
  }));
}

function Legend({ data, total }) {
  return (
    <div className="chart-legend">
      {data.map((item) => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div className="chart-legend-row" key={item.label}>
            <span className="chart-legend-label">
              <span className="chart-legend-dot" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="chart-legend-pct">{percent}%</span>
          </div>
        );
      })}
    </div>
  );
}

export function DonutChart({ title, data, centerLabel }) {
  const normalized = withColors(data);
  const totalValue = normalized.reduce((sum, item) => sum + item.value, 0);
  const total = totalValue || 1;
  let offset = 25;

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="chart-donut-wrap">
        <div className="chart-donut-ring">
          <svg className="chart-donut-svg" viewBox="0 0 42 42" aria-hidden="true">
            <circle
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={TRACK_COLOR}
              strokeWidth="5"
            />
            {normalized.map((item) => {
              const dash = (item.value / total) * 100;
              const circle = (
                <circle
                  key={item.label}
                  cx="21"
                  cy="21"
                  r="15.915"
                  fill="transparent"
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
          <div className="chart-donut-center">
            <span className="chart-donut-total">{totalValue}</span>
            <span className="chart-donut-label">{centerLabel}</span>
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
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="chart-bar-grid">
        <div className="chart-bar-yaxis">
          {[100, 75, 50, 25, 0].map((tick) => (
            <span key={tick}>{Math.round((max * tick) / 100)}</span>
          ))}
        </div>
        <div className="chart-bar-area">
          <div className="chart-bar-gridlines">
            {Array.from({ length: 4 }).map((_, index) => (
              <span className="chart-bar-gridline" key={index} />
            ))}
          </div>
          <div className="chart-bar-cols">
            {normalized.map((item) => (
              <div className="chart-bar-col" key={item.label}>
                <div className="chart-bar-pair">
                  <span
                    className="chart-bar-stick"
                    style={{
                      height: `${Math.max(8, (item.value / max) * 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                  <span
                    className="chart-bar-stick"
                    style={{
                      height: `${Math.max(8, ((item.value * 0.82) / max) * 100)}%`,
                      backgroundColor: TRACK_COLOR,
                    }}
                  />
                </div>
                <span className="chart-bar-col-label">{item.label}</span>
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
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="chart-hbar-list">
        {normalized.map((item) => (
          <div className="chart-hbar-item" key={item.label}>
            <div className="chart-hbar-meta">
              <span className="chart-hbar-item-label">{item.label}</span>
              <span className="chart-hbar-item-value">{item.value}</span>
            </div>
            <div className="chart-hbar-track">
              <div
                className="chart-hbar-fill"
                style={{
                  width: `${Math.max(8, (item.value / max) * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * GaugeChart — circular progress gauge showing value/max as a percentage.
 *
 * Props:
 *   title  {string}  — panel heading
 *   value  {number}  — current value
 *   max    {number}  — maximum value (default: 100)
 *   label  {string}  — optional sub-label below the percentage
 */
export function GaugeChart({ title, value, max = 100, label }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / (max || 1)) * 100)));
  // SVG circle: r=15.915 → circumference ≈ 100 (convenient for percent)
  const circumference = 2 * Math.PI * 15.915;
  const filled = (pct / 100) * circumference;
  const gap = circumference - filled;

  return (
    <section className="gauge-panel">
      {title && <h2 className="gauge-title">{title}</h2>}
      <div className="gauge-ring">
        <svg className="gauge-svg" viewBox="0 0 42 42" aria-hidden="true">
          {/* track */}
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke={TRACK_COLOR}
            strokeWidth="5"
          />
          {/* arc */}
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="transparent"
            stroke="var(--color-success)"
            strokeWidth="5"
            strokeDasharray={`${filled} ${gap}`}
            strokeDashoffset="0"
            strokeLinecap="round"
          />
        </svg>
        <div className="gauge-center">
          <span className="gauge-pct">{pct}%</span>
          {label && <span className="gauge-sub-label">{label}</span>}
        </div>
      </div>
    </section>
  );
}
