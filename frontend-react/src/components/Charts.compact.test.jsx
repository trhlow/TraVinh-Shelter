import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThreeDDonutChart } from './Charts.jsx';

afterEach(cleanup);

const data = [{ label: 'Trọ', value: 2 }, { label: 'Nhà', value: 1 }];

test('compact prop adds the compact layout class', () => {
  const { container } = render(<ThreeDDonutChart title="Loại hình BĐS" data={data} compact />);
  expect(container.querySelector('.chart3d-donut-layout--compact')).not.toBeNull();
});

test('without compact prop, the compact layout class is absent', () => {
  const { container } = render(<ThreeDDonutChart title="Loại hình BĐS" data={data} />);
  expect(container.querySelector('.chart3d-donut-layout--compact')).toBeNull();
});
