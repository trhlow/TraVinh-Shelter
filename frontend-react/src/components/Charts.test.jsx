import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  buildDailySeries, buildHeatmapData, buildMonthlySeries, buildWardData, HeatmapChart, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart,
} from './Charts.jsx';

afterEach(() => cleanup());

// ── buildWardData ─────────────────────────────────────────

test('buildWardData always returns the 4 wards, even with no listings', () => {
  const data = buildWardData([], (item) => item.ward);

  expect(data).toHaveLength(4);
  expect(data.map((ward) => ward.label)).toEqual([
    'Phường Trà Vinh', 'Phường Long Đức', 'Phường Nguyệt Hóa', 'Phường Hòa Thuận',
  ]);
  data.forEach((ward) => { expect(ward.count).toBe(0); expect(ward.pct).toBe(0); });
});

test('buildWardData counts items per ward and computes percentages', () => {
  const items = [
    { ward: 'phuong-tra-vinh' },
    { ward: 'phuong-tra-vinh' },
    { ward: 'phuong-long-duc' },
    { ward: 'unknown-ward' },
  ];
  const data = buildWardData(items, (item) => item.ward);

  const traVinh = data.find((ward) => ward.code === 'phuong-tra-vinh');
  const longDuc = data.find((ward) => ward.code === 'phuong-long-duc');
  expect(traVinh.count).toBe(2);
  expect(traVinh.pct).toBe(50);
  expect(longDuc.count).toBe(1);
  expect(longDuc.pct).toBe(25);
});

// ── WardBarChart ──────────────────────────────────────────

test('WardBarChart renders a column with count, name, and percent per ward', () => {
  const data = buildWardData([{ ward: 'phuong-hoa-thuan' }], (item) => item.ward);
  render(<WardBarChart title="Tin đăng theo phường" data={data} />);

  expect(screen.getByRole('heading', { name: 'Tin đăng theo phường' })).toBeInTheDocument();
  expect(screen.getByText('Phường Hòa Thuận')).toBeInTheDocument();
  expect(screen.getByText('Phường Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('100%')).toBeInTheDocument();
});

test('WardBarChart columns are clickable when onSelectWard is provided', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  const onSelectWard = vi.fn();
  render(<WardBarChart title="Theo phường" data={data} onSelectWard={onSelectWard} />);
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh: 1 tin' }));
  expect(onSelectWard).toHaveBeenCalledWith('phuong-tra-vinh');
});

// ── buildDailySeries ──────────────────────────────────────

test('buildDailySeries returns one bucket per day over the trailing window, oldest first', () => {
  const series = buildDailySeries([], () => null, 7);
  expect(series).toHaveLength(7);
  series.forEach((bucket) => expect(bucket.count).toBe(0));
  expect(new Date(series[0].date).getTime()).toBeLessThan(new Date(series[6].date).getTime());
});

test('buildDailySeries counts items into the bucket matching their date', () => {
  const today = new Date().toISOString();
  const items = [{ createdAt: today }, { createdAt: today }];
  const series = buildDailySeries(items, (item) => item.createdAt, 7);
  expect(series[6].count).toBe(2);
});

test('buildDailySeries ignores items outside the trailing window', () => {
  const longAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const series = buildDailySeries([{ createdAt: longAgo }], (item) => item.createdAt, 7);
  const total = series.reduce((sum, bucket) => sum + bucket.count, 0);
  expect(total).toBe(0);
});

// ── buildMonthlySeries ────────────────────────────────────

test('buildMonthlySeries returns one bucket per day of the reference month', () => {
  const series = buildMonthlySeries([], () => null, new Date('2026-07-15T00:00:00'));
  expect(series).toHaveLength(31); // July has 31 days
  expect(series[0].date).toBe('2026-07-01');
  expect(series[30].date).toBe('2026-07-31');
  series.forEach((bucket) => expect(bucket.count).toBe(0));
});

test('buildMonthlySeries handles a 28-day February', () => {
  const series = buildMonthlySeries([], () => null, new Date('2026-02-10T00:00:00'));
  expect(series).toHaveLength(28);
  expect(series[27].date).toBe('2026-02-28');
});

test('buildMonthlySeries counts items into the bucket matching their exact day', () => {
  const items = [
    { createdAt: '2026-07-05T10:00:00' },
    { createdAt: '2026-07-05T22:00:00' },
    { createdAt: '2026-07-20T00:00:00' },
  ];
  const series = buildMonthlySeries(items, (item) => item.createdAt, new Date('2026-07-25T00:00:00'));
  expect(series.find((bucket) => bucket.date === '2026-07-05').count).toBe(2);
  expect(series.find((bucket) => bucket.date === '2026-07-20').count).toBe(1);
});

test('buildMonthlySeries ignores items outside the reference month', () => {
  const items = [{ createdAt: '2026-06-30T00:00:00' }, { createdAt: '2026-08-01T00:00:00' }];
  const series = buildMonthlySeries(items, (item) => item.createdAt, new Date('2026-07-15T00:00:00'));
  const total = series.reduce((sum, bucket) => sum + bucket.count, 0);
  expect(total).toBe(0);
});

test('buildMonthlySeries leaves future days in the current month at 0', () => {
  // referenceDate = "today" = July 7 — days 8..31 have no items and must read 0
  const items = [{ createdAt: '2026-07-07T00:00:00' }];
  const series = buildMonthlySeries(items, (item) => item.createdAt, new Date('2026-07-07T00:00:00'));
  const futureDays = series.filter((bucket) => bucket.date > '2026-07-07');
  expect(futureDays.length).toBe(24);
  futureDays.forEach((bucket) => expect(bucket.count).toBe(0));
});

// ── TrendAreaChart ────────────────────────────────────────

test('TrendAreaChart shows title and the window total', () => {
  const series = buildDailySeries(
    [{ createdAt: new Date().toISOString() }, { createdAt: new Date().toISOString() }],
    (item) => item.createdAt,
    7,
  );
  render(<TrendAreaChart title="Hoạt động hệ thống" series={series} unit="tin/lịch hẹn" />);

  expect(screen.getByRole('heading', { name: 'Hoạt động hệ thống' })).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('tin/lịch hẹn')).toBeInTheDocument();
});

test('TrendAreaChart renders a dot marker per data point', () => {
  const series = buildMonthlySeries(
    [{ createdAt: '2026-07-05T00:00:00' }],
    (item) => item.createdAt,
    new Date('2026-07-05T00:00:00'),
  );
  const { container } = render(<TrendAreaChart title="Test" series={series} unit="tin" />);
  expect(container.querySelectorAll('.trend-chart-dot')).toHaveLength(series.length);
});

test('TrendAreaChart shows a tooltip with date and count on hover', () => {
  const series = buildMonthlySeries(
    [{ createdAt: '2026-07-05T00:00:00' }, { createdAt: '2026-07-05T12:00:00' }],
    (item) => item.createdAt,
    new Date('2026-07-05T00:00:00'),
  );
  render(<TrendAreaChart title="Test" series={series} unit="tin" />);
  expect(screen.queryByTestId('trend-chart-tooltip')).not.toBeInTheDocument();

  const dots = screen.getAllByTestId('trend-chart-dot');
  fireEvent.mouseMove(dots[4]); // ngày 05/07 = index 4 (ngày 1..5)
  const tooltip = screen.getByTestId('trend-chart-tooltip');
  expect(tooltip).toHaveTextContent('05/07');
  expect(tooltip).toHaveTextContent('2');

  fireEvent.mouseLeave(dots[4]);
  expect(screen.queryByTestId('trend-chart-tooltip')).not.toBeInTheDocument();
});

// ── Sparkline ─────────────────────────────────────────────

test('Sparkline renders nothing for fewer than 2 points', () => {
  const { container } = render(<Sparkline series={[1]} />);
  expect(container.querySelector('svg')).not.toBeInTheDocument();
});

test('Sparkline renders a line path for 2+ points', () => {
  const { container } = render(<Sparkline series={[1, 3, 2]} />);
  expect(container.querySelector('.sparkline-line')).toBeInTheDocument();
});

// ── HeatmapChart ──────────────────────────────────────────

test('buildHeatmapData always yields 4 wards x 3 categories with counts and max', () => {
  const items = [
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-long-duc', category: 'dat' },
  ];
  const data = buildHeatmapData(items, (item) => item.ward, (item) => item.category);

  expect(data.rows).toHaveLength(4);
  expect(data.rows[0].cells).toHaveLength(3);
  const traVinhTro = data.rows.find((row) => row.code === 'phuong-tra-vinh').cells
    .find((cell) => cell.category === 'tro');
  expect(traVinhTro.count).toBe(2);
  expect(data.max).toBe(2);
});

test('HeatmapChart renders labels and fires onSelectCell with ward + category', () => {
  const items = [{ ward: 'phuong-hoa-thuan', category: 'nha' }];
  const data = buildHeatmapData(items, (item) => item.ward, (item) => item.category);
  const onSelectCell = vi.fn();
  render(<HeatmapChart title="Mật độ tin theo phường" data={data} onSelectCell={onSelectCell} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin theo phường' })).toBeInTheDocument();
  expect(screen.getByText('Phường Hòa Thuận')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Phường Hòa Thuận · Nhà: 1 tin' }));
  expect(onSelectCell).toHaveBeenCalledWith({ ward: 'phuong-hoa-thuan', category: 'nha' });
});

test('HeatmapChart shows a low-to-high color scale legend', () => {
  const data = buildHeatmapData([], () => null, () => null);
  render(<HeatmapChart title="Mật độ tin theo phường" data={data} />);

  expect(screen.getByText('Ít')).toBeInTheDocument();
  expect(screen.getByText('Nhiều')).toBeInTheDocument();
});

// ── buildCategoryDensityData / CategoryBarChart ──────────

test('buildCategoryDensityData returns all 3 categories with counts scoped to one ward', () => {
  const properties = [
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
    { ward: 'phuong-long-duc', category: 'dat' }, // different ward, must not count
  ];
  const data = buildCategoryDensityData(properties, 'phuong-tra-vinh');

  expect(data).toHaveLength(3);
  expect(data.map((item) => item.slug)).toEqual(['tro', 'nha', 'dat']);
  expect(data.find((item) => item.slug === 'tro').count).toBe(2);
  expect(data.find((item) => item.slug === 'nha').count).toBe(1);
  expect(data.find((item) => item.slug === 'dat').count).toBe(0);
});

test('buildCategoryDensityData computes percent share within the ward', () => {
  const properties = [
    { ward: 'phuong-hoa-thuan', category: 'tro' },
    { ward: 'phuong-hoa-thuan', category: 'tro' },
    { ward: 'phuong-hoa-thuan', category: 'tro' },
    { ward: 'phuong-hoa-thuan', category: 'nha' },
  ];
  const data = buildCategoryDensityData(properties, 'phuong-hoa-thuan');
  expect(data.find((item) => item.slug === 'tro').pct).toBe(75);
  expect(data.find((item) => item.slug === 'nha').pct).toBe(25);
});

test('buildCategoryDensityData returns all-zero counts and 0% when the ward has no listings', () => {
  const data = buildCategoryDensityData([], 'phuong-nguyet-hoa');
  data.forEach((item) => {
    expect(item.count).toBe(0);
    expect(item.pct).toBe(0);
  });
});

test('CategoryBarChart renders title and one column per category with count and percent', () => {
  const data = buildCategoryDensityData([
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
  ], 'phuong-tra-vinh');
  render(<CategoryBarChart title="Mật độ tin — Phường Trà Vinh" data={data} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin — Phường Trà Vinh' })).toBeInTheDocument();
  expect(screen.getByText('Trọ')).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument(); // tro count
  expect(screen.getByText('80%')).toBeInTheDocument(); // 4/5
});

test('CategoryBarChart scales bar height to the real max, not a fixed range', () => {
  const highVolume = buildCategoryDensityData(
    Array.from({ length: 7 }, () => ({ ward: 'phuong-tra-vinh', category: 'tro' })),
    'phuong-tra-vinh',
  );
  const { container } = render(<CategoryBarChart title="Test" data={highVolume} />);
  const filledBar = container.querySelector('.ward-bar-fill');
  // max count among the 3 categories is 7 (all in "tro") -> that bar must render at 100% height
  expect(filledBar.style.height).toBe('100%');
});
