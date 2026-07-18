import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  buildDailySeries, buildMonthlySeries, buildWardData, Sparkline,
  buildCategoryDensityData, TrendLineChart, CategoryBreakdown,
  MiniBarSparkline, RankingList, WardCategoryMatrix,
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

// ── buildCategoryDensityData ─────────────────────────────

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

// ── WardCategoryMatrix ────────────────────────────────────

test('WardCategoryMatrix renders one row per ward with a column per category plus a total', () => {
  const wards = [
    {
      code: 'phuong-tra-vinh',
      label: 'Phường Trà Vinh',
      data: [
        { slug: 'tro', label: 'Trọ', count: 3, pct: 75 },
        { slug: 'nha', label: 'Nhà', count: 1, pct: 25 },
        { slug: 'dat', label: 'Đất', count: 0, pct: 0 },
      ],
    },
  ];
  render(<WardCategoryMatrix title="Mật độ tin theo phường" wards={wards} />);

  expect(screen.getByRole('heading', { name: 'Mật độ tin theo phường' })).toBeInTheDocument();
  const row = screen.getByText('Trà Vinh').closest('tr');
  expect(row).toHaveTextContent('Trà Vinh');
  expect(row).toHaveTextContent('3');
  expect(row).toHaveTextContent('1');
  expect(row).toHaveTextContent('0');
  expect(row).toHaveTextContent('4'); // total = 3+1+0
});

test('WardCategoryMatrix renders every ward as a real row even when every count is zero (honest, not misleading)', () => {
  const wards = [
    { code: 'w1', label: 'Phường A', data: [{ slug: 'tro', label: 'Trọ', count: 0, pct: 0 }, { slug: 'nha', label: 'Nhà', count: 0, pct: 0 }, { slug: 'dat', label: 'Đất', count: 0, pct: 0 }] },
  ];
  render(<WardCategoryMatrix title="X" wards={wards} />);
  const row = screen.getByText('A').closest('tr');
  expect(row).toHaveTextContent('0');
});
