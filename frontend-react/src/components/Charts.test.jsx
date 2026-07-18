import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  buildDailySeries, buildMonthlySeries, buildWardData, Sparkline, TrendAreaChart, WardBarChart,
  buildCategoryDensityData, CategoryBarChart, TrendBarLineChart, ThreeDDonutChart, TrendLineChart, CategoryBreakdown,
  MiniBarSparkline, RankingList,
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
  // The single ward with a listing holds 100% of the (tiny) total; percent is
  // a direct label on its bar now, not a second axis.
  expect(screen.getByText('100%')).toBeInTheDocument();
});

test('WardBarChart columns are clickable when onSelectWard is provided', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  const onSelectWard = vi.fn();
  render(<WardBarChart title="Theo phường" data={data} onSelectWard={onSelectWard} />);
  // aria-label now also carries percent (hover/focus tooltip parity — the
  // dataviz skill requires the same detail on keyboard focus as on hover).
  fireEvent.click(screen.getByRole('button', { name: 'Phường Trà Vinh: 1 tin, 100%' }));
  expect(onSelectWard).toHaveBeenCalledWith('phuong-tra-vinh');
});

test('WardBarChart shows a tooltip on hover and hides it on mouse leave', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  render(<WardBarChart title="Theo phường" data={data} />);

  const bar = screen.getByRole('img', { name: 'Phường Trà Vinh: 1 tin, 100%' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.mouseEnter(bar);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Phường Trà Vinh');
  expect(screen.getByRole('tooltip')).toHaveTextContent('1 tin · 100%');

  fireEvent.mouseLeave(bar);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('WardBarChart shows the same tooltip on keyboard focus as on hover, and hides it on blur', () => {
  const data = buildWardData([{ ward: 'phuong-tra-vinh' }], (item) => item.ward);
  render(<WardBarChart title="Theo phường" data={data} />);

  const bar = screen.getByRole('img', { name: 'Phường Trà Vinh: 1 tin, 100%' });
  fireEvent.focus(bar);
  expect(screen.getByRole('tooltip')).toHaveTextContent('1 tin · 100%');

  fireEvent.blur(bar);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('WardBarChart bar height reflects count, and encodes percent as a direct label — not a second axis', () => {
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
  // only Nguyệt Hóa has listings (count=3=max) -> its bar spans the full plot height (38-6=32)
  expect(heights).toEqual([0, 0, 32, 0]);

  // Percent used to be a line on a second y-axis (the dual-axis anti-pattern
  // the dataviz skill flags); it's now a plain text label per bar instead.
  // Only Nguyệt Hóa has listings, so it alone shows a non-zero percent.
  expect(screen.getByText('100%')).toBeInTheDocument();
  expect(container.querySelectorAll('circle')).toHaveLength(0);
  expect(container.querySelector('.combo-svg path')).toBeNull();
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

// ── MiniBarSparkline ──────────────────────────────────────

test('MiniBarSparkline renders one bar per value and marks the last activeCount bars active', () => {
  const { container } = render(<MiniBarSparkline series={[1, 2, 3, 4, 5]} activeCount={2} />);
  const bars = container.querySelectorAll('.mini-bar-sparkline-bar');
  expect(bars).toHaveLength(5);
  expect(Array.from(bars).filter((bar) => bar.classList.contains('is-active'))).toHaveLength(2);
  expect(bars[3]).toHaveClass('is-active');
  expect(bars[4]).toHaveClass('is-active');
  expect(bars[0]).not.toHaveClass('is-active');
});

test('MiniBarSparkline renders nothing for fewer than 2 points, matching Sparkline', () => {
  const { container } = render(<MiniBarSparkline series={[3]} />);
  expect(container).toBeEmptyDOMElement();
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
  // data is always in CATEGORIES order (Trọ, Nhà, Đất): counts 4/1/0 of max=4
  // -> bar heights scale to 32/8/0 (plot height 38-6=32)
  expect(heights).toEqual([32, 8, 0]);

  // Percent used to be a line on a second y-axis (the dual-axis anti-pattern
  // the dataviz skill flags: pct is a fixed rescaling of count, so a second
  // scale for it adds no information); it's now a direct label per bar.
  expect(screen.getByText('80%')).toBeInTheDocument();
  expect(screen.getByText('20%')).toBeInTheDocument();
  expect(screen.getByText('0%')).toBeInTheDocument();
  expect(container.querySelectorAll('circle')).toHaveLength(0);
  expect(container.querySelector('.combo-svg path')).toBeNull();
});

test('CategoryBarChart shows a tooltip on hover/focus with category, count, and percent', () => {
  const data = buildCategoryDensityData([
    { ward: 'phuong-tra-vinh', category: 'tro' },
    { ward: 'phuong-tra-vinh', category: 'nha' },
  ], 'phuong-tra-vinh');
  render(<CategoryBarChart title="Test" data={data} />);

  const troBar = screen.getByRole('img', { name: 'Trọ: 1 tin, 50%' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.mouseEnter(troBar);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Trọ');
  expect(screen.getByRole('tooltip')).toHaveTextContent('1 tin · 50%');

  fireEvent.mouseLeave(troBar);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.focus(troBar);
  expect(screen.getByRole('tooltip')).toHaveTextContent('1 tin · 50%');
  fireEvent.blur(troBar);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
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

// ── ThreeDDonutChart ──────────────────────────────────────
// The conic-gradient ring has no per-wedge DOM of its own, so hover/focus
// is served by an invisible SVG arc overlaid per segment (see donutSegments
// in Charts.jsx). These tests exercise that overlay, not the gradient.

test('ThreeDDonutChart shows a tooltip with label, value, and percent on hover, and hides it on mouse leave', () => {
  const data = [
    { label: 'Trọ', value: 2 },
    { label: 'Nhà', value: 6 },
  ];
  render(<ThreeDDonutChart title="Loại hình" data={data} />);

  const troWedge = screen.getByRole('img', { name: 'Trọ: 2, 25%' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.mouseEnter(troWedge);
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('Trọ');
  expect(tooltip).toHaveTextContent('2 · 25%');

  fireEvent.mouseLeave(troWedge);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('ThreeDDonutChart shows the same tooltip on keyboard focus as on hover, and hides it on blur', () => {
  const data = [{ label: 'Trọ', value: 2 }, { label: 'Nhà', value: 6 }];
  render(<ThreeDDonutChart title="Loại hình" data={data} />);

  const nhaWedge = screen.getByRole('img', { name: 'Nhà: 6, 75%' });
  fireEvent.focus(nhaWedge);
  expect(screen.getByRole('tooltip')).toHaveTextContent('6 · 75%');

  fireEvent.blur(nhaWedge);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('ThreeDDonutChart exposes one focusable, labeled segment per data item, each with its own value and share of the total', () => {
  const data = [
    { label: 'Trọ', value: 1 },
    { label: 'Nhà', value: 2 },
    { label: 'Đất', value: 1 },
  ];
  render(<ThreeDDonutChart title="Loại hình" data={data} />);

  expect(screen.getByRole('img', { name: 'Trọ: 1, 25%' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Nhà: 2, 50%' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Đất: 1, 25%' })).toBeInTheDocument();
});

test('ThreeDDonutChart shows an empty state instead of a misleading full ring when every value is zero', () => {
  const data = [
    { label: 'Trọ', value: 0 },
    { label: 'Nhà', value: 0 },
    { label: 'Đất', value: 0 },
  ];
  const { container } = render(<ThreeDDonutChart title="Loại hình" data={data} />);

  expect(screen.getByText('Loại hình')).toBeInTheDocument();
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
  expect(container.querySelector('.chart3d-donut')).not.toBeInTheDocument();
  expect(screen.queryByRole('img', { name: /Trọ/ })).not.toBeInTheDocument();
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

test('TrendBarLineChart tooltip lists both series at the hovered point ("one tooltip, every series")', () => {
  const data = [
    { label: 'T1', current: 2, previous: 5 },
    { label: 'T2', current: 8, previous: 1 },
  ];
  render(
    <TrendBarLineChart title="Hoạt động" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />,
  );

  const t1 = screen.getByRole('img', { name: 'T1: Bài đăng 2, Lịch hẹn 5' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.mouseEnter(t1);
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('Bài đăng');
  expect(tooltip).toHaveTextContent('2');
  expect(tooltip).toHaveTextContent('Lịch hẹn');
  expect(tooltip).toHaveTextContent('5');

  fireEvent.mouseLeave(t1);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('TrendBarLineChart tooltip shows only the current series when there is no previous data', () => {
  const data = [{ label: 'T1', current: 3, previous: 0 }];
  render(<TrendBarLineChart title="Test" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />);

  fireEvent.focus(screen.getByRole('img', { name: 'T1: 3' }));
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('Bài đăng');
  expect(tooltip).not.toHaveTextContent('Lịch hẹn');
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

test('TrendBarLineChart shows an empty state when every point is entirely zero', () => {
  const data = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 0, previous: 0 },
  ];
  const { container } = render(
    <TrendBarLineChart title="Hoạt động" subtitle="Theo tháng" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />,
  );

  expect(screen.getByText('Hoạt động')).toBeInTheDocument();
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
  expect(container.querySelector('.combo-bar')).not.toBeInTheDocument();
  expect(container.querySelector('circle')).not.toBeInTheDocument();
});

test('TrendBarLineChart still renders bars normally when data is sparse but not all-zero', () => {
  const data = [
    { label: 'T1', current: 0, previous: 0 },
    { label: 'T2', current: 3, previous: 0 },
    { label: 'T3', current: 0, previous: 0 },
  ];
  const { container } = render(<TrendBarLineChart title="Hoạt động" data={data} />);

  expect(screen.queryByText('Chưa có dữ liệu trong khoảng thời gian này.')).not.toBeInTheDocument();
  expect(container.querySelectorAll('.combo-bar')).toHaveLength(3);
});

test('TrendBarLineChart renders a narrow viewBox and CSS width for a single data point (no stretched empty canvas)', () => {
  const data = [{ label: 'T7', current: 6, previous: 0 }];
  const { container } = render(<TrendBarLineChart title="Test" data={data} />);

  const svg = container.querySelector('.trend-chart-svg');
  // TREND_LEFT_MARGIN(10) + 1 * TREND_COLUMN_UNIT_WIDTH(6) + TREND_RIGHT_MARGIN(4) = 20
  expect(svg.getAttribute('viewBox')).toBe('0 0 20 50');
  // idealWidthPx = 20 * TREND_PX_PER_UNIT(7) = 140px
  // --trend-chart-width lives on the shared .chart-panel ancestor (not the svg itself) so
  // the sibling rotated-labels row (see the rotateLabels tests below) can inherit it too.
  const panel = container.querySelector('.chart-panel');
  expect(panel.style.getPropertyValue('--trend-chart-width')).toBe('140px');
});

test('TrendBarLineChart scales the viewBox and CSS width up as real data points grow', () => {
  const data = Array.from({ length: 12 }, (_, index) => ({ label: `T${index + 1}`, current: 1, previous: 0 }));
  const { container } = render(<TrendBarLineChart title="Test" data={data} />);

  const svg = container.querySelector('.trend-chart-svg');
  // 10 + 12*6 + 4 = 86
  expect(svg.getAttribute('viewBox')).toBe('0 0 86 50');
  // 86 * 7 = 602px
  const panel = container.querySelector('.chart-panel');
  expect(panel.style.getPropertyValue('--trend-chart-width')).toBe('602px');
});

test('TrendBarLineChart with rotateLabels renders an HTML label row instead of in-SVG text, one rotated span per data point', () => {
  const data = [
    { label: 'T.H.Long', current: 3, previous: 1 },
    { label: 'N.V.Toàn', current: 5, previous: 2 },
    { label: 'T.M.Linh', current: 2, previous: 0 },
  ];
  const { container } = render(<TrendBarLineChart title="Top môi giới" data={data} rotateLabels />);

  const stage = screen.getByRole('img', { name: 'Top môi giới' });
  // no in-SVG text labels for the data points when rotateLabels is on
  expect(within(stage).queryByText('T.H.Long')).not.toBeInTheDocument();

  const labelsRow = container.querySelector('.trend-chart-labels-row');
  expect(labelsRow).toBeInTheDocument();
  const rotatedSpans = within(labelsRow).getAllByText(/^(T\.H\.Long|N\.V\.Toàn|T\.M\.Linh)$/);
  expect(rotatedSpans).toHaveLength(3);
  rotatedSpans.forEach((span) => expect(span).toHaveClass('trend-chart-label-rotated'));
});

test('TrendBarLineChart without rotateLabels keeps rendering in-SVG text labels (default unchanged)', () => {
  const data = [{ label: 'T1', current: 3, previous: 1 }];
  const { container } = render(<TrendBarLineChart title="Test" data={data} />);

  expect(container.querySelector('.trend-chart-labels-row')).not.toBeInTheDocument();
  const stage = screen.getByRole('img', { name: 'Test' });
  expect(within(stage).getByText('T1')).toBeInTheDocument();
});

// ── TrendLineChart ────────────────────────────────────────

test('TrendLineChart renders title, subtitle, and a line ending on the last data point', () => {
  const data = [
    { label: '12/07', current: 2, previous: 5 },
    { label: '13/07', current: 8, previous: 1 },
  ];
  render(<TrendLineChart title="Xu hướng" subtitle="Theo ngày" data={data} currentLabel="Tin đăng" previousLabel="Lịch hẹn" />);

  expect(screen.getByRole('heading', { name: 'Xu hướng' })).toBeInTheDocument();
  expect(screen.getByText('Theo ngày')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '12/07: Tin đăng 2, Lịch hẹn 5' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: '13/07: Tin đăng 8, Lịch hẹn 1' })).toBeInTheDocument();
});

test('TrendLineChart shows the primary line, an area fill, and a secondary line only when previous data exists', () => {
  const withPrevious = [
    { label: 'T1', current: 3, previous: 1 },
    { label: 'T2', current: 5, previous: 2 },
  ];
  const { container: withContainer } = render(<TrendLineChart title="A" data={withPrevious} />);
  expect(withContainer.querySelectorAll('path')).toHaveLength(3); // area fill + primary line + secondary line

  cleanup();

  const noPrevious = [
    { label: 'T1', current: 3, previous: 0 },
    { label: 'T2', current: 5, previous: 0 },
  ];
  const { container: withoutContainer } = render(<TrendLineChart title="B" data={noPrevious} />);
  expect(withoutContainer.querySelectorAll('path')).toHaveLength(2); // area fill + primary line only
  expect(screen.queryByText('So sánh')).not.toBeInTheDocument();
});

test('TrendLineChart tooltip lists both series at the hovered point', () => {
  const data = [
    { label: 'T1', current: 2, previous: 5 },
    { label: 'T2', current: 8, previous: 1 },
  ];
  render(<TrendLineChart title="A" data={data} currentLabel="Bài đăng" previousLabel="Lịch hẹn" />);

  const t1 = screen.getByRole('img', { name: 'T1: Bài đăng 2, Lịch hẹn 5' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

  fireEvent.mouseEnter(t1);
  const tooltip = screen.getByRole('tooltip');
  expect(tooltip).toHaveTextContent('Bài đăng');
  expect(tooltip).toHaveTextContent('2');
  expect(tooltip).toHaveTextContent('Lịch hẹn');
  expect(tooltip).toHaveTextContent('5');

  fireEvent.mouseLeave(t1);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('TrendLineChart shows an empty state when every point is entirely zero', () => {
  const data = [{ label: 'T1', current: 0, previous: 0 }, { label: 'T2', current: 0, previous: 0 }];
  render(<TrendLineChart title="A" data={data} />);
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
});

test('TrendLineChart thins date labels when there are many data points, but always keeps the last label', () => {
  const data = Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1}`, current: 1, previous: 0 }));
  const { container } = render(<TrendLineChart title="A" data={data} />);
  const labelTexts = Array.from(container.querySelectorAll('.trend-line-svg text')).map((node) => node.textContent);
  expect(labelTexts.length).toBeLessThan(31);
  expect(labelTexts).toContain('31');
});

test('TrendLineChart renders every date label when there are few data points', () => {
  const data = Array.from({ length: 5 }, (_, index) => ({ label: `${index + 1}`, current: 1, previous: 0 }));
  const { container } = render(<TrendLineChart title="A" data={data} />);
  const labelTexts = Array.from(container.querySelectorAll('.trend-line-svg text')).map((node) => node.textContent);
  expect(labelTexts).toEqual(['1', '2', '3', '4', '5']);
});

// ── CategoryBreakdown ─────────────────────────────────────

test('CategoryBreakdown renders each row with its value and computed percent, plus a total line', () => {
  const data = [{ label: 'Nhà', value: 12 }, { label: 'Đất', value: 10 }, { label: 'Trọ', value: 2 }];
  render(<CategoryBreakdown title="Phân bổ theo danh mục" data={data} totalLabel="Tổng cộng" />);

  expect(screen.getByRole('heading', { name: 'Phân bổ theo danh mục' })).toBeInTheDocument();
  expect(screen.getByText('Nhà')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('· 50%')).toBeInTheDocument();
  expect(screen.getByText('Đất')).toBeInTheDocument();
  expect(screen.getByText('· 42%')).toBeInTheDocument();
  expect(screen.getByText('Tổng cộng')).toBeInTheDocument();
  expect(screen.getByText('24')).toBeInTheDocument();
});

test('CategoryBreakdown gives each row a distinct shade of the same primary color, not a multi-hue palette', () => {
  const data = [{ label: 'A', value: 3 }, { label: 'B', value: 2 }, { label: 'C', value: 1 }];
  const { container } = render(<CategoryBreakdown title="X" data={data} />);
  const fills = Array.from(container.querySelectorAll('.category-breakdown-fill')).map((el) => el.style.backgroundColor);
  expect(fills).toHaveLength(3);
  expect(new Set(fills).size).toBe(3); // all distinct
  fills.forEach((fill) => expect(fill).toContain('color-mix'));
});

test('CategoryBreakdown shows an empty state instead of a misleading full bar when every value is zero', () => {
  const data = [{ label: 'A', value: 0 }, { label: 'B', value: 0 }];
  render(<CategoryBreakdown title="X" data={data} />);
  expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
  expect(screen.queryByText('A')).not.toBeInTheDocument();
});

// ── RankingList ───────────────────────────────────────────

test('RankingList renders numbered rows with both stat labels, in the given order', () => {
  const data = [
    { label: 'N.V.Toàn', current: 12, previous: 5 },
    { label: 'T.M.Linh', current: 8, previous: 3 },
  ];
  render(<RankingList title="Top môi giới" data={data} primaryLabel="tin đăng" secondaryLabel="lịch hẹn xác nhận" />);

  expect(screen.getByRole('heading', { name: 'Top môi giới' })).toBeInTheDocument();
  const rows = screen.getAllByRole('listitem');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent('1');
  expect(rows[0]).toHaveTextContent('N.V.Toàn');
  expect(rows[0]).toHaveTextContent('12 tin đăng');
  expect(rows[0]).toHaveTextContent('5 lịch hẹn xác nhận');
  expect(rows[1]).toHaveTextContent('2');
  expect(rows[1]).toHaveTextContent('T.M.Linh');
});

test('RankingList handles the single-row empty placeholder without crashing', () => {
  const data = [{ label: 'Chưa có', current: 0, previous: 0 }];
  render(<RankingList title="Top môi giới" data={data} primaryLabel="tin đăng" secondaryLabel="lịch hẹn" />);
  expect(screen.getByText('Chưa có')).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});
