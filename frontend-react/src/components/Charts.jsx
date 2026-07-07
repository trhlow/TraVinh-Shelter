import { Fragment, useState } from 'react';
import { CATEGORIES, WARDS } from '../data/locations.js';

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

// Groups items into one entry per real ward (all 4, even at 0) so ward charts
// stay visually comparable between renders and dashboards.
export function buildWardData(items, getWardCode) {
  const total = items.length;
  return WARDS.filter((ward) => ward.code !== 'all').map((ward) => {
    const count = items.filter((item) => getWardCode(item) === ward.code).length;
    return {
      code: ward.code,
      label: ward.label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
}

// Local calendar-day key (not toISOString — that converts to UTC and shifts the
// date backward for positive-offset timezones like Asia/Ho_Chi_Minh).
function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Buckets items into one entry per calendar day over the trailing `days` window
// (oldest first), so the trend chart reflects real activity instead of a live simulation.
export function buildDailySeries(items, getDate, days = 30) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const buckets = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    buckets.push({ date: dayKey(date), count: 0 });
  }
  const indexByDate = new Map(buckets.map((bucket, index) => [bucket.date, index]));
  items.forEach((item) => {
    const raw = getDate(item);
    if (!raw) return;
    const day = new Date(raw);
    if (Number.isNaN(day.getTime())) return;
    const index = indexByDate.get(dayKey(day));
    if (index !== undefined) buckets[index].count += 1;
  });
  return buckets;
}

// Buckets items into one entry per calendar day of `referenceDate`'s month (1st → last
// day), so the monthly activity chart reflects a real calendar month instead of a
// trailing window. Days with no matching item — past or future — read 0 naturally.
export function buildMonthlySeries(items, getDate, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    buckets.push({ date: dayKey(new Date(year, month, day)), count: 0 });
  }
  const indexByDate = new Map(buckets.map((bucket, index) => [bucket.date, index]));
  items.forEach((item) => {
    const raw = getDate(item);
    if (!raw) return;
    const day = new Date(raw);
    if (Number.isNaN(day.getTime())) return;
    const index = indexByDate.get(dayKey(day));
    if (index !== undefined) buckets[index].count += 1;
  });
  return buckets;
}

function formatShortDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);
}

function linePathFor(values, width, height) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  return values.map((value, index) => (
    `${(index * stepX).toFixed(2)},${(height - ((value - min) / span) * height).toFixed(2)}`
  )).join(' L');
}

/**
 * TrendAreaChart — real daily activity (line + filled area), with a dot marker
 * per day and a hover tooltip showing the exact date + count for that day.
 * Expects `series`: [{ date: 'YYYY-MM-DD', count }], oldest first.
 */
export function TrendAreaChart({ title, series, unit }) {
  const width = 100;
  const height = 32;
  const counts = series.map((point) => point.count);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const linePath = `M${linePathFor(counts, width, height)}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
  const max = Math.max(...counts, 1);
  const min = Math.min(...counts, 0);
  const span = max - min || 1;
  const stepX = series.length > 1 ? width / (series.length - 1) : width;
  const [activeIndex, setActiveIndex] = useState(null);

  return (
    <section className="chart-panel trend-chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="trend-chart-value-row">
        <span className="trend-chart-value">{total}</span>
        {unit && <span className="trend-chart-unit">{unit}</span>}
      </div>
      <div className="trend-chart-svg-wrap">
        <svg className="trend-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="trend-chart-area" d={areaPath} />
          <path className="trend-chart-line" d={linePath} />
          {series.map((point, index) => (
            <circle
              key={point.date}
              data-testid="trend-chart-dot"
              className="trend-chart-dot"
              cx={index * stepX}
              cy={height - ((point.count - min) / span) * height}
              r={activeIndex === index ? 2.2 : 1.4}
              onMouseMove={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          ))}
        </svg>
        {activeIndex !== null && (
          <div
            className="trend-chart-tooltip"
            data-testid="trend-chart-tooltip"
            style={{ left: `${(activeIndex / Math.max(1, series.length - 1)) * 100}%` }}
          >
            {formatShortDate(series[activeIndex].date)}: {series[activeIndex].count} {unit || ''}
          </div>
        )}
      </div>
      <div className="trend-chart-axis">
        <span>{formatShortDate(series[0]?.date)}</span>
        <span>{formatShortDate(series[series.length - 1]?.date)}</span>
      </div>
    </section>
  );
}

/**
 * Sparkline — compact inline trend line for a stat card (no axis/labels).
 * `series` is a plain array of numbers, oldest first.
 */
export function Sparkline({ series = [] }) {
  if (series.length < 2) return null;
  const width = 64;
  const height = 22;
  return (
    <svg className="sparkline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="sparkline-line" d={`M${linePathFor(series, width, height)}`} />
    </svg>
  );
}

/**
 * WardBarChart — one real column per ward with the count on top, ward name and
 * percent share underneath (chart + number + text combined).
 * Expects `data` from buildWardData so all 4 wards always render.
 */
export function WardBarChart({ title, data, onSelectWard }) {
  const max = Math.max(...data.map((ward) => ward.count), 1);

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <div className="ward-bar-cols">
        {data.map((ward, index) => {
          const bar = (
            <>
              <span className="ward-bar-count">{ward.count}</span>
              <div className="ward-bar-track">
                <span
                  className="ward-bar-fill"
                  style={{
                    height: `${Math.max(4, (ward.count / max) * 100)}%`,
                    backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length],
                  }}
                />
              </div>
              <span className="ward-bar-name">{ward.label}</span>
              <span className="ward-bar-pct">{ward.pct}%</span>
            </>
          );
          return onSelectWard ? (
            <button
              type="button"
              className="ward-bar-col"
              key={ward.code}
              aria-label={`${ward.label}: ${ward.count} tin`}
              onClick={() => onSelectWard(ward.code)}
            >
              {bar}
            </button>
          ) : (
            <div className="ward-bar-col" key={ward.code}>
              {bar}
            </div>
          );
        })}
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

// Ward × category matrix; full grid always renders so density is comparable between loads.
export function buildHeatmapData(items, getWardCode, getCategorySlug) {
  let max = 1;
  const rows = WARDS.filter((ward) => ward.code !== 'all').map((ward) => ({
    code: ward.code,
    label: ward.label,
    cells: CATEGORIES.map((category) => {
      const count = items.filter((item) => (
        getWardCode(item) === ward.code && getCategorySlug(item) === category.slug
      )).length;
      if (count > max) max = count;
      return { category: category.slug, categoryLabel: category.label, count };
    }),
  }));
  return { rows, max };
}

/**
 * HeatmapChart — ward rows × category columns; cell opacity scales with count.
 * Cells are buttons so the admin can drill down into the matching property list.
 */
export function HeatmapChart({ title, data, onSelectCell }) {
  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <p className="heatmap-hint">Màu càng đậm, số tin đăng trong ô càng nhiều</p>
      <div className="heatmap-grid">
        <span className="heatmap-corner" />
        {CATEGORIES.map((category) => (
          <span className="heatmap-col-label" key={category.slug}>{category.label}</span>
        ))}
        {data.rows.map((row) => (
          <Fragment key={row.code}>
            <span className="heatmap-row-label">{row.label}</span>
            {row.cells.map((cell) => (
              <button
                type="button"
                className="heatmap-cell"
                key={cell.category}
                aria-label={`${row.label} · ${cell.categoryLabel}: ${cell.count} tin`}
                onClick={() => onSelectCell?.({ ward: row.code, category: cell.category })}
              >
                <span
                  className="heatmap-cell-fill"
                  style={{ opacity: cell.count === 0 ? 0.06 : 0.15 + 0.85 * (cell.count / data.max) }}
                />
                <span className="heatmap-cell-count">{cell.count}</span>
              </button>
            ))}
          </Fragment>
        ))}
      </div>
      <div className="heatmap-scale">
        <span>Ít</span>
        <span className="heatmap-scale-track">
          {[0.15, 0.4, 0.65, 0.85, 1].map((opacity) => (
            <span key={opacity} className="heatmap-scale-step" style={{ opacity }} />
          ))}
        </span>
        <span>Nhiều</span>
      </div>
    </section>
  );
}
