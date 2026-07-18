import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StatCard } from './DashboardWidgets.jsx';

afterEach(() => cleanup());

test('StatCard without series renders the original icon-chip layout unchanged', () => {
  const { container } = render(
    <StatCard icon="Building" title="Tổng số người dùng" value={4} tone="navy" />,
  );
  expect(screen.getByText('Tổng số người dùng')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(container.querySelector('.kpi-icon-chip')).toBeInTheDocument();
  expect(container.querySelector('.stat-card-trend-block')).not.toBeInTheDocument();
});

test('StatCard with series renders the bar-sparkline hero layout, with trendContext and seriesCaption', () => {
  const { container } = render(
    <StatCard
      icon="Building"
      title="Tin đăng"
      value={24}
      tone="navy"
      trend={{ value: '▲ 12%', direction: 'up' }}
      trendContext="so với 7 ngày trước"
      series={[1, 2, 3, 4, 5, 6, 7]}
      seriesCaption="7 ngày gần nhất"
    />,
  );
  expect(screen.getByText('Tin đăng')).toBeInTheDocument();
  expect(screen.getByText('24')).toBeInTheDocument();
  expect(screen.getByText('▲ 12%')).toBeInTheDocument();
  expect(screen.getByText('so với 7 ngày trước')).toBeInTheDocument();
  expect(screen.getByText('7 ngày gần nhất')).toBeInTheDocument();
  expect(container.querySelector('.mini-bar-sparkline')).toBeInTheDocument();
  expect(container.querySelector('.kpi-icon-chip')).not.toBeInTheDocument();
});

test('StatCard with series but no trendContext/seriesCaption omits those lines without crashing', () => {
  render(<StatCard icon="Building" title="Tin đăng" value={24} series={[1, 2, 3]} />);
  expect(screen.getByText('Tin đăng')).toBeInTheDocument();
  expect(screen.getByText('24')).toBeInTheDocument();
});
