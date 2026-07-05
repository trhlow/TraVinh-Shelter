import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  buildDailySeries, buildHeatmapData, buildWardData, HeatmapChart, Sparkline, TrendAreaChart, WardBarChart,
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
