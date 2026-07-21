import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchProperties: vi.fn().mockResolvedValue([]),
}));

import { fetchProperties } from '../services/api.js';
import HomePage from './HomePage.jsx';

beforeEach(() => { fetchProperties.mockResolvedValue([]); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('"Khám phá theo loại hình" renders exactly 3 category cards with unique category links', async () => {
  render(<HomePage />);
  const heading = await screen.findByText('Khám phá theo loại hình');
  const section = heading.closest('.section');
  const cards = section.querySelectorAll('.category-card');

  expect(cards).toHaveLength(3);
  const hrefs = Array.from(cards).map((card) => card.getAttribute('href'));
  expect(new Set(hrefs).size).toBe(3);
  expect(hrefs).toEqual(expect.arrayContaining([
    '#/search?category=tro',
    '#/search?category=nha',
    '#/search?category=dat',
  ]));
});

test('"Khám phá theo loại hình" shows the 3 real category labels', async () => {
  render(<HomePage />);
  const heading = await screen.findByText('Khám phá theo loại hình');
  const section = heading.closest('.section');
  const labels = Array.from(section.querySelectorAll('.category-card-label')).map((el) => el.textContent);

  expect(labels).toEqual(expect.arrayContaining(['Trọ', 'Nhà', 'Đất']));
});

test('every category card renders a visible icon, not a blank placeholder', async () => {
  render(<HomePage />);
  const heading = await screen.findByText('Khám phá theo loại hình');
  const section = heading.closest('.section');
  const iconWraps = section.querySelectorAll('.category-card-icon');

  expect(iconWraps).toHaveLength(3);
  iconWraps.forEach((wrap) => {
    expect(wrap.querySelector('svg')).not.toBeNull();
  });
});

test('"Tin đăng mới nhất" carousel does not render when there is no data', async () => {
  render(<HomePage />);
  await screen.findByText('Khám phá theo loại hình'); // wait for the page to finish its initial render
  expect(screen.queryByText('Tin đăng mới nhất')).not.toBeInTheDocument();
});

test('"Tin đăng mới nhất" carousel renders real listings fetched with sort=createdAt,desc', async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, title: `Tin ${i}`, priceLabel: '1 tỷ' }));
  fetchProperties.mockResolvedValue(items);
  render(<HomePage />);

  const heading = await screen.findByText('Tin đăng mới nhất');
  const section = heading.closest('.section');
  expect(section.querySelectorAll('.pcard')).toHaveLength(5);

  expect(fetchProperties).toHaveBeenCalledWith({ sort: 'createdAt,desc', size: 12 });
});
