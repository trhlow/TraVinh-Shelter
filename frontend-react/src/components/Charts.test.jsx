import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  buildDailySeries, buildMonthlySeries, buildWardData, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart, TrendBarLineChart,
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
  expect(screen.getByText('Hòa Thuận')).toBeInTheDocument();
  expect(screen.getByText('Trà Vinh')).toBeInTheDocument();
  expect(screen.getByText('100')).toBeInTheDocument();
});

test('WardBarChart columns are clickable when onSelectWard is provided', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  const onSelectWard = vi.fn();
  render(<WardBarChart title="Theo phường" data={data} onSelectWard={onSelectWard} />);
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh: 1 tin' }));
  expect(onSelectWard).toHaveBeenCalledWith('phuong-tra-vinh');
});

test('WardBarChart draws both the count bar and the percent line for the same ward', () => {
  const items = [
    { ward: 'phuong-nguyet-hoa' },
    { ward: 'phuong-nguyet-hoa' },
    { ward: 'phuong-nguyet-hoa' },
  ];
  const data = buildWardData(items, (item) => item.ward);
  const { container } = render(<WardBarChart title="Test" data={data} />);

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // data is always in WARDS order (Trà Vinh, Long Đức, Nguyệt Hóa, Hòa Thuận);
  // only Nguyệt Hóa has listings (count=3=leftMax) -> its bar spans the full plot height (38-6=32)
  expect(heights).toEqual([0, 0, 32, 0]);

  const dots = Array.from(container.querySelectorAll('circle'));
  const dotYs = dots.map((dot) => Number(dot.getAttribute('cy')));
  // only Nguyệt Hóa has pct=100% -> its line point sits at the very top (y=6); the rest sit at
  // the bottom (y=38, pct=0%)
  expect(dotYs).toEqual([38, 38, 6, 38]);

  expect(container.querySelectorAll('.combo-value-label')).toHaveLength(0);
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

test('CategoryBarChart renders title, category labels, and encodes both count and percent per bar', () => {
  const data = buildCategoryDensityData([
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
  ], 'phuong-tra-vinh');
  const { container } = render(<CategoryBarChart title="Mật độ tin — Phường Trà Vinh" data={data} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin — Phường Trà Vinh' })).toBeInTheDocument();
  expect(screen.getByText('Trọ')).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // data is always in CATEGORIES order (Trọ, Nhà, Đất): counts 4/1/0 of leftMax=4
  // -> bar heights scale to 32/8/0 (plot height 38-6=32)
  expect(heights).toEqual([32, 8, 0]);

  const dots = Array.from(container.querySelectorAll('circle'));
  const dotYs = dots.map((dot) => Number(dot.getAttribute('cy')));
  // percents 80/20/0 map onto the fixed 0-100 right axis (top 6, bottom 38)
  expect(dotYs[0]).toBeCloseTo(12.4);
  expect(dotYs[1]).toBeCloseTo(31.6);
  expect(dotYs[2]).toBe(38);

  expect(container.querySelectorAll('.combo-value-label')).toHaveLength(0);
});

test('CategoryBarChart scales bar height to the real max, not a fixed range', () => {
  const highVolume = buildCategoryDensityData(
    Array.from({ length: 7 }, () => ({ ward: 'phuong-tra-vinh', category: 'tro' })),
    'phuong-tra-vinh',
  );
  const { container } = render(<CategoryBarChart title="Test" data={highVolume} />);
  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // max count (7, all in "tro") must render at the full plot height (bottom 38 - top 6 = 32)
  expect(Math.max(...heights)).toBe(32);
});

// ── TrendBarLineChart ─────────────────────────────────────

test('TrendBarLineChart renders title, subtitle, and one bar per data point scaled to the real combined max', () => {
  const data = [
    { label: 'T1', current: 2, previous: 5 },
    { label: 'T2', current: 8, previous: 1 },
  ];
  const { container } = render(
    <TrendBarLineChart title="Hoạt động" subtitle="Theo tháng" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />,
  );

  expect(screen.getByRole('heading', { name: 'Hoạt động' })).toBeInTheDocument();
  expect(screen.getByText('Theo tháng')).toBeInTheDocument();

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // axisMax = max(2,5,8,1,1) = 8; plot height = 38-6 = 32
  // T1 current=2 -> 2/8*32=8; T2 current=8 -> 8/8*32=32
  expect(heights).toEqual([8, 32]);

  const dots = Array.from(container.querySelectorAll('circle'));
  const dotYs = dots.map((dot) => Number(dot.getAttribute('cy')));
  // T1 previous=5 -> y=38-5/8*32=18; T2 previous=1 -> y=38-1/8*32=34
  expect(dotYs).toEqual([18, 34]);

  expect(container.querySelector('.combo-chart-legend')).toHaveTextContent('Bài đăng');
  expect(container.querySelector('.combo-chart-legend')).toHaveTextContent('Lịch hẹn');
});

test('TrendBarLineChart exposes role=img with the title as its accessible name, and month labels are findable inside it', () => {
  const data = [
    { label: 'T5', current: 3, previous: 1 },
    { label: 'T6', current: 4, previous: 2 },
  ];
  render(<TrendBarLineChart title="Hoạt động môi giới theo tháng" data={data} />);

  const stage = screen.getByRole('img', { name: 'Hoạt động môi giới theo tháng' });
  expect(within(stage).getAllByText(/^T\d{1,2}$/)).toHaveLength(2);
});

test('TrendBarLineChart hides the line and second legend item when every previous value is 0', () => {
  const data = [
    { label: 'T1', current: 3, previous: 0 },
    { label: 'T2', current: 5, previous: 0 },
  ];
  const { container } = render(
    <TrendBarLineChart title="Test" data={data} currentLabel="Người dùng mới" previousLabel="Kỳ trước" />,
  );

  expect(container.querySelectorAll('circle')).toHaveLength(0);
  expect(container.querySelector('path[d]')).not.toBeInTheDocument();

  const legendItems = Array.from(container.querySelectorAll('.combo-chart-legend-item'));
  expect(legendItems).toHaveLength(1);
  expect(legendItems[0]).toHaveTextContent('Người dùng mới');

  const bars = Array.from(container.querySelectorAll('.combo-bar'));
  const heights = bars.map((bar) => Number(bar.getAttribute('height')));
  // axisMax = max(3,0,5,0,1) = 5; plot height 32; T1: 3/5*32=19.2; T2: 5/5*32=32
  expect(heights[0]).toBeCloseTo(19.2);
  expect(heights[1]).toBe(32);
});

test('TrendBarLineChart renders a narrow viewBox and CSS width for a single data point (no stretched empty canvas)', () => {
  const data = [{ label: 'T7', current: 6, previous: 0 }];
  const { container } = render(<TrendBarLineChart title="Test" data={data} />);

  const svg = container.querySelector('.trend-chart-svg');
  // TREND_LEFT_MARGIN(10) + 1 * TREND_COLUMN_UNIT_WIDTH(6) + TREND_RIGHT_MARGIN(4) = 20
  expect(svg.getAttribute('viewBox')).toBe('0 0 20 50');
  // idealWidthPx = 20 * TREND_PX_PER_UNIT(7) = 140px
  expect(svg.style.getPropertyValue('--trend-chart-width')).toBe('140px');
});

test('TrendBarLineChart scales the viewBox and CSS width up as real data points grow', () => {
  const data = Array.from({ length: 12 }, (_, index) => ({ label: `T${index + 1}`, current: 1, previous: 0 }));
  const { container } = render(<TrendBarLineChart title="Test" data={data} />);

  const svg = container.querySelector('.trend-chart-svg');
  // 10 + 12*6 + 4 = 86
  expect(svg.getAttribute('viewBox')).toBe('0 0 86 50');
  // 86 * 7 = 602px
  expect(svg.style.getPropertyValue('--trend-chart-width')).toBe('602px');
});
