import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { buildHeatmapData, buildWardData, HeatmapChart, LiveLineChart, useLiveSeries, WardBarChart } from './Charts.jsx';

function stubMatchMedia(reducedMotion) {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: reducedMotion,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
}

beforeEach(() => stubMatchMedia(false));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

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

// ── useLiveSeries ─────────────────────────────────────────

test('useLiveSeries seeds a full window around the base value', () => {
  const { result } = renderHook(() => useLiveSeries(100, { points: 16 }));

  expect(result.current).toHaveLength(16);
  result.current.forEach((value) => {
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(200);
  });
});

test('useLiveSeries slides the window on each tick', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useLiveSeries(100, { points: 8, intervalMs: 1000 }));
  const before = [...result.current];

  act(() => { vi.advanceTimersByTime(1000); });

  expect(result.current).toHaveLength(8);
  expect(result.current.slice(0, 7)).toEqual(before.slice(1));
});

test('useLiveSeries re-anchors the whole window when the base value changes', () => {
  const { result, rerender } = renderHook(({ base }) => useLiveSeries(base, { points: 8 }), {
    initialProps: { base: 1 },
  });

  rerender({ base: 1000 });

  result.current.forEach((value) => expect(value).toBeGreaterThan(500));
});

test('useLiveSeries stays static under prefers-reduced-motion', () => {
  stubMatchMedia(true);
  vi.useFakeTimers();
  const { result } = renderHook(() => useLiveSeries(100, { points: 8, intervalMs: 1000 }));
  const before = [...result.current];

  act(() => { vi.advanceTimersByTime(5000); });

  expect(result.current).toEqual(before);
});

// ── LiveLineChart ─────────────────────────────────────────

test('LiveLineChart shows title, current value, and a percent-change badge', () => {
  render(<LiveLineChart title="Hoạt động hệ thống" baseValue={120} unit="điểm" />);

  expect(screen.getByRole('heading', { name: 'Hoạt động hệ thống' })).toBeInTheDocument();
  expect(screen.getByText('điểm')).toBeInTheDocument();
  expect(screen.getByText(/^[+-]?\d+(\.\d+)?%$/)).toBeInTheDocument();
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
