import { useState } from 'react';
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

function ChartModeToggle({ mode, onModeChange }) {
  return (
    <div className="chart-mode-toggle" aria-label="Chọn kiểu hiển thị biểu đồ">
      {['2d', '3d'].map((item) => (
        <button
          key={item}
          type="button"
          className={`chart-mode-btn${mode === item ? ' is-active' : ''}`}
          aria-pressed={mode === item}
          onClick={() => onModeChange(item)}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ThreeDChartPanel({ title, subtitle, mode, onModeChange, children }) {
  return (
    <section className={`chart-panel chart3d-panel ${mode === '3d' ? 'is-3d' : 'is-2d'}`}>
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
        <ChartModeToggle mode={mode} onModeChange={onModeChange} />
      </div>
      {children}
    </section>
  );
}

function formatChartNumber(value, suffix = '') {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}${suffix}`;
}

function conicGradientFor(data, total) {
  let cursor = 0;
  return `conic-gradient(${data.map((item) => {
    const next = cursor + (total > 0 ? (item.value / total) * 100 : 0);
    const segment = `${item.color} ${cursor}% ${next}%`;
    cursor = next;
    return segment;
  }).join(', ')})`;
}

export function ThreeDDonutChart({ title, subtitle, data, centerLabel = 'tổng', compact = false }) {
  const [mode, setMode] = useState('3d');
  const normalized = withColors(data);
  const total = normalized.reduce((sum, item) => sum + item.value, 0);
  const layoutClass = `chart3d-donut-layout${compact ? ' chart3d-donut-layout--compact' : ''}`;

  return (
    <ThreeDChartPanel title={title} subtitle={subtitle} mode={mode} onModeChange={setMode}>
      <div className={layoutClass}>
        <div className="chart3d-donut" style={{ background: conicGradientFor(normalized, total || 1) }}>
          <div className="chart3d-donut-hole">
            <span className="chart3d-donut-total">{formatChartNumber(total)}</span>
            <span className="chart3d-donut-label">{centerLabel}</span>
          </div>
        </div>
        <Legend data={normalized} total={total || 1} />
      </div>
    </ThreeDChartPanel>
  );
}


export function ThreeDAreaChart({ title, subtitle, series, unit = '' }) {
  const [mode, setMode] = useState('3d');
  const width = 100;
  const height = 34;
  const counts = series.map((point) => point.count);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const linePath = `M${linePathFor(counts, width, height)}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <ThreeDChartPanel title={title} subtitle={subtitle} mode={mode} onModeChange={setMode}>
      <div className="chart3d-area-summary">
        <span className="chart3d-area-total">{formatChartNumber(total)}</span>
        {unit && <span>{unit}</span>}
      </div>
      <div className="chart3d-area-stage">
        <svg className="chart3d-area-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <path className="chart3d-area-base" d={areaPath} />
          <path className="chart3d-area-fill" d={areaPath} />
          <path className="chart3d-area-line" d={linePath} />
        </svg>
      </div>
      <div className="trend-chart-axis">
        <span>{formatShortDate(series[0]?.date)}</span>
        <span>{formatShortDate(series[series.length - 1]?.date)}</span>
      </div>
    </ThreeDChartPanel>
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

// Clamped to a 5%-95% band so the tooltip's translate(-50%) centering never
// pushes it fully outside the chart at the first/last day.
function tooltipLeftPct(activeIndex, seriesLength) {
  const leftPct = (activeIndex / Math.max(1, seriesLength - 1)) * 100;
  return Math.min(95, Math.max(5, leftPct));
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
          {/* preserveAspectRatio="none" scales x/y unevenly, rendering these as slight ellipses — accepted, not worth restructuring the coordinate system for. */}
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
            style={{ left: `${tooltipLeftPct(activeIndex, series.length)}%` }}
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

const COMBO_CHART_TICK_PERCENTS = [0, 25, 50, 75, 100];
const COMBO_CHART_PLOT = { left: 10, right: 90, top: 6, bottom: 38 };

function comboChartTickY(pct) {
  const { top, bottom } = COMBO_CHART_PLOT;
  return bottom - (pct / 100) * (bottom - top);
}

/**
 * WardBarChart — single-axis bar (count) per ward, with each bar's share of
 * the total as a direct label. Previously this also plotted `ward.pct` as a
 * line on a second right-hand axis; pct is `count / total * 100`, a fixed
 * rescaling of the same count already on the bar, so the second scale added
 * no information and is exactly the dual-axis anti-pattern the dataviz
 * skill flags as its #1 chart mistake (two y-scales invent an alignment
 * that isn't in the data). Expects `data` from buildWardData so all 4
 * wards always render.
 */
export function WardBarChart({ title, data, onSelectWard }) {
  const { left, right, top, bottom } = COMBO_CHART_PLOT;
  const max = Math.max(...data.map((ward) => ward.count), 1);
  const columnWidth = (right - left) / data.length;
  const barWidth = columnWidth * 0.4;
  const barColor = CHART_PALETTE[0];

  const points = data.map((ward, index) => {
    const columnCenterX = left + columnWidth * (index + 0.5);
    const barTopY = bottom - (ward.count / max) * (bottom - top);
    return {
      ward,
      columnCenterX,
      barLeftX: columnCenterX - barWidth / 2,
      barTopY,
      barHeight: bottom - barTopY,
    };
  });

  const leftTicks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: Math.round((max * pct) / 100),
  }));

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <svg className="combo-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />

        {leftTicks.map((tick) => (
          <text key={`left-${tick.y}`} x={left - 1.5} y={tick.y + 1} textAnchor="end" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}

        {points.map((point) => (
          onSelectWard ? (
            <g
              key={point.ward.code}
              role="button"
              tabIndex={0}
              aria-label={`${point.ward.label}: ${point.ward.count} tin`}
              className="combo-bar-group"
              onClick={() => onSelectWard(point.ward.code)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectWard(point.ward.code);
                }
              }}
            >
              <rect className="combo-bar" x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
            </g>
          ) : (
            <rect className="combo-bar" key={point.ward.code} x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
          )
        ))}

        {points.map((point) => (
          <text
            key={`pct-${point.ward.code}`}
            x={point.columnCenterX}
            y={point.barTopY - 1.5}
            textAnchor="middle"
            fontSize="3"
            fill="var(--color-body)"
          >
            {point.ward.pct}%
          </text>
        ))}

        {points.map((point) => (
          <text key={`x-label-${point.ward.code}`} x={point.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {point.ward.label.replace('Phường ', '')}
          </text>
        ))}
      </svg>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-swatch" style={{ backgroundColor: barColor }} />
          Số tin đăng — nhãn trên cột là tỉ lệ trong tổng số
        </span>
      </div>
    </section>
  );
}

/**
 * CategoryBarChart — single-axis bar (count) per property category
 * (Trọ/Nhà/Đất) for a single ward, with each bar's share of the total as a
 * direct label. Previously plotted `item.pct` as a line on a second right
 * axis alongside the count bars — same dual-axis anti-pattern as
 * WardBarChart (pct is a fixed rescaling of count, so the second scale
 * added no information); see that component's comment for the full
 * rationale. Shares its coordinate system with WardBarChart via
 * COMBO_CHART_PLOT/comboChartTickY so the two stay visually consistent.
 */
export function CategoryBarChart({ title, data }) {
  const { left, right, top, bottom } = COMBO_CHART_PLOT;
  const max = Math.max(...data.map((item) => item.count), 1);
  const columnWidth = (right - left) / data.length;
  const barWidth = columnWidth * 0.4;
  const barColor = CHART_PALETTE[0];

  const points = data.map((item, index) => {
    const columnCenterX = left + columnWidth * (index + 0.5);
    const barTopY = bottom - (item.count / max) * (bottom - top);
    return {
      item,
      columnCenterX,
      barLeftX: columnCenterX - barWidth / 2,
      barTopY,
      barHeight: bottom - barTopY,
    };
  });

  const leftTicks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: Math.round((max * pct) / 100),
  }));

  return (
    <section className="chart-panel">
      <h2 className="chart-title">{title}</h2>
      <svg className="combo-svg" viewBox="0 0 100 50" preserveAspectRatio="none">
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />

        {leftTicks.map((tick) => (
          <text key={`left-${tick.y}`} x={left - 1.5} y={tick.y + 1} textAnchor="end" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}

        {points.map((point) => (
          <rect className="combo-bar" key={point.item.slug} x={point.barLeftX} y={point.barTopY} width={barWidth} height={point.barHeight} fill={barColor} />
        ))}

        {points.map((point) => (
          <text
            key={`pct-${point.item.slug}`}
            x={point.columnCenterX}
            y={point.barTopY - 1.5}
            textAnchor="middle"
            fontSize="3"
            fill="var(--color-body)"
          >
            {point.item.pct}%
          </text>
        ))}

        {points.map((point) => (
          <text key={`x-label-${point.item.slug}`} x={point.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {point.item.label}
          </text>
        ))}
      </svg>
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-swatch" style={{ backgroundColor: barColor }} />
          Số tin đăng — nhãn trên cột là tỉ lệ trong tổng số
        </span>
      </div>
    </section>
  );
}

/**
 * TrendBarLineChart — combo bar (current, left axis) + line (previous, same
 * left axis) for series where both values share one unit (e.g. two kinds of
 * counts). Unlike WardBarChart/CategoryBarChart's fixed 0-100 percent right
 * axis, this axis auto-scales to the real max of both series combined. When
 * every `previous` value is 0 (no real comparison data), the line, its dots,
 * and its legend entry are omitted — only bars render.
 */
// TrendBarLineChart's viewBox width and rendered CSS width both scale with data.length
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

export function TrendBarLineChart({ title, subtitle, data, currentLabel = 'Hiện tại', previousLabel = 'So sánh', rotateLabels = false }) {
  const { top, bottom } = COMBO_CHART_PLOT;
  const left = TREND_LEFT_MARGIN;
  const viewBoxWidth = TREND_LEFT_MARGIN + data.length * TREND_COLUMN_UNIT_WIDTH + TREND_RIGHT_MARGIN;
  const right = viewBoxWidth - TREND_RIGHT_MARGIN;
  const idealWidthPx = viewBoxWidth * TREND_PX_PER_UNIT;
  const hasPrevious = data.some((point) => point.previous);
  const axisMax = Math.max(...data.flatMap((point) => [point.current || 0, point.previous || 0]), 1);
  const columnWidth = (right - left) / data.length;
  const barWidth = columnWidth * 0.4;
  const barColor = CHART_PALETTE[0];
  const lineColor = CHART_PALETTE[4];

  const points = data.map((point, index) => {
    const columnCenterX = left + columnWidth * (index + 0.5);
    const barTopY = bottom - ((point.current || 0) / axisMax) * (bottom - top);
    const lineY = bottom - ((point.previous || 0) / axisMax) * (bottom - top);
    return {
      point,
      columnCenterX,
      barLeftX: columnCenterX - barWidth / 2,
      barTopY,
      barHeight: bottom - barTopY,
      lineY,
    };
  });

  const linePath = `M${points.map((p) => `${p.columnCenterX},${p.lineY}`).join(' L')}`;
  const ticks = COMBO_CHART_TICK_PERCENTS.map((pct) => ({
    y: comboChartTickY(pct),
    value: Math.round((axisMax * pct) / 100),
  }));

  return (
    <section className="chart-panel" style={{ '--trend-chart-width': `${idealWidthPx}px` }}>
      <div className="chart3d-header">
        <div>
          <h2 className="chart-title">{title}</h2>
          {subtitle && <p className="chart3d-subtitle">{subtitle}</p>}
        </div>
      </div>
      <svg
        className="trend-chart-svg"
        viewBox={`0 0 ${viewBoxWidth} 50`}
        preserveAspectRatio="none"
        role="img"
        aria-label={title}
      >
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={TRACK_COLOR} strokeWidth="0.3" />

        {ticks.map((tick) => (
          <text key={`left-${tick.y}`} x={left - 1.5} y={tick.y + 1} textAnchor="end" fontSize="3" fill="var(--color-muted)">
            {tick.value}
          </text>
        ))}

        {points.map((p) => (
          <rect className="combo-bar" key={p.point.label} x={p.barLeftX} y={p.barTopY} width={barWidth} height={p.barHeight} fill={barColor} />
        ))}

        {hasPrevious && <path d={linePath} fill="none" stroke={lineColor} strokeWidth="0.6" />}
        {hasPrevious && points.map((p) => (
          <circle key={`dot-${p.point.label}`} cx={p.columnCenterX} cy={p.lineY} r="1" fill={lineColor} />
        ))}

        {!rotateLabels && points.map((p) => (
          <text key={`x-label-${p.point.label}`} x={p.columnCenterX} y={bottom + 4} textAnchor="middle" fontSize="3" fill="var(--color-muted)">
            {p.point.label}
          </text>
        ))}
      </svg>
      {rotateLabels && (
        <div className="trend-chart-labels-row">
          {points.map((p) => (
            <div key={`x-label-cell-${p.point.label}`} className="trend-chart-label-cell">
              <span className="trend-chart-label-rotated">{p.point.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="combo-chart-legend">
        <span className="combo-chart-legend-item">
          <span className="combo-chart-legend-swatch" style={{ backgroundColor: barColor }} />
          {currentLabel}
        </span>
        {hasPrevious && (
          <span className="combo-chart-legend-item">
            <span className="combo-chart-legend-line" style={{ backgroundColor: lineColor }} />
            {previousLabel}
          </span>
        )}
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

