import { useId, useState } from 'react';
import { CATEGORIES, WARDS } from '../data/locations.js';
import Icon from './ui/Icon.jsx';

const TRACK_COLOR = 'var(--color-hairline)';

/**
 * ChartTooltip — the shared hover/focus readout every interactive mark
 * shows (dataviz skill, interaction.md: "the hover layer is part of the
 * deliverable, not an upgrade"). `leftPct`/`topPct` are 0-100 positions
 * within the chart's own SVG viewBox — since every chart here uses
 * preserveAspectRatio="none" on a fixed-unit viewBox, those units map
 * linearly to percentage-of-container regardless of rendered pixel size,
 * so no pixel measurement or ResizeObserver is needed.
 */
function ChartTooltip({ leftPct, topPct, rows }) {
  return (
    <div className="chart-tooltip" role="tooltip" style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
      {rows.map((row) => (
        <div className="chart-tooltip-row" key={row.label}>
          {row.color && <span className="chart-tooltip-key" style={{ backgroundColor: row.color }} />}
          <span className="chart-tooltip-label">{row.label}</span>
          <span className="chart-tooltip-value">{row.value}</span>
        </div>
      ))}
    </div>
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

// One row per real category (Trọ/Nhà/Đất) scoped to a single ward, so each
// ward gets its own bar chart with counts/percent computed from that ward's
// listings only.
export function buildCategoryDensityData(properties, wardCode) {
  const wardProperties = properties.filter((property) => property.ward === wardCode);
  const total = wardProperties.length;
  return CATEGORIES.map((category) => {
    const count = wardProperties.filter((property) => property.category === category.slug).length;
    return {
      slug: category.slug,
      label: category.label,
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
 * MiniBarSparkline — bar-chart variant of Sparkline for a stat card's hero
 * layout. The last `activeCount` bars render in the brand accent color, the
 * rest in a muted track color — recent activity reads as more prominent
 * than older days.
 */
export function MiniBarSparkline({ series = [], activeCount = 2 }) {
  if (series.length < 2) return null;
  const max = Math.max(...series, 1);
  return (
    <div className="mini-bar-sparkline">
      {series.map((value, index) => {
        const isActive = index >= series.length - activeCount;
        return (
          <span
            key={index}
            className={`mini-bar-sparkline-bar${isActive ? ' is-active' : ''}`}
            style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
          />
        );
      })}
    </div>
  );
}

const COMBO_CHART_PLOT = { left: 10, right: 90, top: 6, bottom: 38 };

// TrendLineChart's viewBox width and rendered CSS width both scale with data.length
// at the same fixed px-per-unit ratio, so the chart never stretches into a mostly-empty
// canvas when there's little real data (e.g. a system's first month) — only the total
// width changes, not the proportions of bars/text within it. Capped at 100% of the panel
// via CSS min(), so once there's enough real data the chart reaches full width exactly as
// it always has. top/bottom stay COMBO_CHART_PLOT's for margin consistency with the other
// combo charts; left/right are local since this is the only combo chart with a variable
// (not fixed 3-4-category) column count.
const TREND_LEFT_MARGIN = 10;
const TREND_COLUMN_UNIT_WIDTH = 6;
const TREND_RIGHT_MARGIN = 4;
const TREND_PX_PER_UNIT = 7;

const TREND_LABEL_DENSITY_THRESHOLD = 10;

export function TrendLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh' }) {
  const { top, bottom } = COMBO_CHART_PLOT;
  const [hovered, setHovered] = useState(null);
  const gradientId = useId();
  const left = TREND_LEFT_MARGIN;
  const viewBoxWidth = TREND_LEFT_MARGIN + data.length * TREND_COLUMN_UNIT_WIDTH + TREND_RIGHT_MARGIN;
  const right = viewBoxWidth - TREND_RIGHT_MARGIN;
  const idealWidthPx = viewBoxWidth * TREND_PX_PER_UNIT;
  const hasPrevious = data.some((point) => point.previous);
  const isEmpty = data.every((point) => !point.current && !point.previous);

  if (isEmpty) {
    return (
      <section className="chart-panel">
        <div className="chart3d-header">
          <div>
            <h2 className="chart-title">{title}</h2>
            {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="widget-state-block">
          <span className="widget-state-icon">
            <Icon name="BarChart3" size={24} strokeWidth={1.75} />
          </span>
          <p className="widget-state-title">Chưa có dữ liệu trong khoảng thời gian này.</p>
        </div>
      </section>
    );
  }

  const axisMax = Math.max(...data.flatMap((point) => [point.current || 0, point.previous || 0]), 1);
  const columnWidth = (right - left) / data.length;
  const primaryColor = 'var(--color-primary)';
  const secondaryColor = 'color-mix(in srgb, var(--color-primary), transparent 55%)';

  const points = data.map((point, index) => {
    const x = left + columnWidth * (index + 0.5);
    return {
      point,
      x,
      currentY: bottom - ((point.current || 0) / axisMax) * (bottom - top),
      previousY: bottom - ((point.previous || 0) / axisMax) * (bottom - top),
    };
  });

  const currentLinePath = `M${points.map((p) => `${p.x},${p.currentY}`).join(' L')}`;
  const areaPath = `${currentLinePath} L${points[points.length - 1].x},${bottom} L${points[0].x},${bottom} Z`;
  const previousLinePath = `M${points.map((p) => `${p.x},${p.previousY}`).join(' L')}`;
  const lastPoint = points[points.length - 1];

  // Never render a <text> per point once there are more than TREND_LABEL_DENSITY_THRESHOLD
  // points (e.g. a 28-31-day month) — a mobile-width chart can't fit that many labels
  // without overlap. Keep every Nth label plus the last one always.
  const labelStep = data.length > TREND_LABEL_DENSITY_THRESHOLD
    ? Math.ceil(data.length / TREND_LABEL_DENSITY_THRESHOLD)
    : 1;
  const visibleLabelPoints = points.filter((_, index) => index % labelStep === 0 || index === points.length - 1);

  const hoveredPoint = hovered != null ? points[hovered] : null;
  const tooltipRows = hoveredPoint ? [
    { label: currentLabel, value: hoveredPoint.point.current || 0, color: primaryColor },
    ...(hasPrevious ? [{ label: previousLabel, value: hoveredPoint.point.previous || 0, color: secondaryColor }] : []),
  ] : [];

  return (
    <section className="chart-panel" style={{ '--trend-chart-width': `${idealWidthPx}px` }}>
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="chart-hover-wrap">
        <svg className="trend-line-svg" viewBox={`0 0 ${viewBoxWidth} 50`} preserveAspectRatio="none" role="img" aria-label={title}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          {hasPrevious && <path d={previousLinePath} fill="none" stroke={secondaryColor} strokeWidth="1" />}
          <path d={currentLinePath} fill="none" stroke={primaryColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={lastPoint.x} cy={lastPoint.currentY} r="1.4" fill="var(--color-canvas)" stroke={primaryColor} strokeWidth="1" />
          {hoveredPoint && hoveredPoint !== lastPoint && (
            <circle cx={hoveredPoint.x} cy={hoveredPoint.currentY} r="1.4" fill="var(--color-canvas)" stroke={primaryColor} strokeWidth="1" />
          )}
          {points.map((p, index) => (
            <rect
              key={p.point.label}
              role="img"
              tabIndex={0}
              aria-label={hasPrevious
                ? `${p.point.label}: ${currentLabel} ${p.point.current || 0}, ${previousLabel} ${p.point.previous || 0}`
                : `${p.point.label}: ${p.point.current || 0}`}
              className="trend-line-hit"
              x={left + columnWidth * index}
              y={top}
              width={columnWidth}
              height={bottom - top}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered((current) => (current === index ? null : current))}
              onFocus={() => setHovered(index)}
              onBlur={() => setHovered((current) => (current === index ? null : current))}
            />
          ))}
          {visibleLabelPoints.map((p) => (
            <text key={`x-label-${p.point.label}`} x={p.x} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
              {p.point.label}
            </text>
          ))}
        </svg>
        {hoveredPoint && (
          <ChartTooltip
            leftPct={(hoveredPoint.x / viewBoxWidth) * 100}
            topPct={(Math.min(hoveredPoint.currentY, hoveredPoint.previousY) / 50) * 100}
            rows={tooltipRows}
          />
        )}
      </div>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-line" style={{ backgroundColor: primaryColor }} />
          {currentLabel}
        </span>
        {hasPrevious && (
          <span className="combo-chart-legend-item">
            <span className="combo-chart-legend-line" style={{ backgroundColor: secondaryColor }} />
            {previousLabel}
          </span>
        )}
      </div>
    </section>
  );
}

export function CategoryBreakdown({ title, subtitle, data, totalLabel = 'Tổng cộng' }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const isEmpty = total === 0;

  if (isEmpty) {
    return (
      <section className="chart-panel">
        <div className="chart3d-header">
          <div>
            <h2 className="chart-title">{title}</h2>
            {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
          </div>
        </div>
        <div className="widget-state-block">
          <span className="widget-state-icon">
            <Icon name="BarChart3" size={24} strokeWidth={1.75} />
          </span>
          <p className="widget-state-title">Chưa có dữ liệu trong khoảng thời gian này.</p>
        </div>
      </section>
    );
  }

  // Every row already carries its own text label, so identity doesn't depend on hue —
  // one shade ramp of --color-primary is used instead of the multi-hue CHART_PALETTE
  // (a distinct hue per row was read as "this category is flagged/different" rather
  // than "this is just the Nth row").
  const rows = data.map((item, index) => ({
    ...item,
    pct: Math.round((item.value / total) * 100),
    color: `color-mix(in srgb, var(--color-primary), white ${index * 22}%)`,
  }));

  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="category-breakdown-rows">
        {rows.map((row) => (
          <div className="category-breakdown-row" key={row.label}>
            <div className="category-breakdown-row-top">
              <span className="category-breakdown-label">{row.label}</span>
              <span className="category-breakdown-value">
                <b>{row.value}</b> <span className="category-breakdown-pct">· {row.pct}%</span>
              </span>
            </div>
            <div className="category-breakdown-track">
              <div className="category-breakdown-fill" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="category-breakdown-total">
        <span>{totalLabel}</span>
        <span className="category-breakdown-total-value">{total}</span>
      </div>
    </section>
  );
}

/**
 * RankingList — numbered ranking, for categorical data with no time axis
 * (e.g. "top brokers by activity"). A line/bar trend chart is the wrong
 * form for this: there's no date/month per row, just a ranked comparison.
 */
export function RankingList({ title, subtitle, data, primaryLabel = 'Chỉ số 1', secondaryLabel = 'Chỉ số 2' }) {
  const maxCurrent = Math.max(...data.map((item) => item.current || 0), 1);
  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <ol className="ranking-list">
        {data.map((item, index) => (
          <li className="ranking-list-row" key={item.label}>
            <span className="ranking-list-rank">{index + 1}</span>
            <div className="ranking-list-body">
              <div className="ranking-list-top">
                <span className="ranking-list-name">{item.label}</span>
                <span className="ranking-list-stats">
                  {item.current || 0} {primaryLabel} · {item.previous || 0} {secondaryLabel}
                </span>
              </div>
              <div className="ranking-list-track">
                <div className="ranking-list-fill" style={{ width: `${Math.max(4, ((item.current || 0) / maxCurrent) * 100)}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * WardCategoryMatrix — ward × category count table, replacing 4 separate
 * per-ward density charts. A table of real (possibly-zero) counts is always
 * honest — unlike a chart, there's no geometry that can misrepresent an
 * all-zero row, so this needs no separate empty-state branch.
 */
export function WardCategoryMatrix({ title, subtitle, wards }) {
  const rows = wards.map((ward) => {
    const counts = Object.fromEntries(ward.data.map((item) => [item.slug, item.count]));
    const total = ward.data.reduce((sum, item) => sum + item.count, 0);
    return { code: ward.code, label: ward.label.replace('Phường ', ''), counts, total };
  });
  const maxCount = Math.max(...rows.flatMap((row) => CATEGORIES.map((category) => row.counts[category.slug] || 0)), 1);

  function cellStyle(count) {
    if (!count) return undefined;
    const intensity = Math.round((count / maxCount) * 60);
    return { backgroundColor: `color-mix(in srgb, var(--color-primary), transparent ${100 - intensity}%)` };
  }

  return (
    <section className="chart-panel">
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <table className="ward-category-matrix">
        <thead>
          <tr>
            <th>Phường</th>
            {CATEGORIES.map((category) => <th key={category.slug}>{category.label}</th>)}
            <th>Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <td className="ward-category-matrix-label">{row.label}</td>
              {CATEGORIES.map((category) => (
                <td key={category.slug} style={cellStyle(row.counts[category.slug])}>
                  {row.counts[category.slug] || 0}
                </td>
              ))}
              <td className="ward-category-matrix-total">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

