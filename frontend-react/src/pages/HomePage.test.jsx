import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchProperties: vi.fn().mockResolvedValue([]),
}));

import HomePage from './HomePage.jsx';

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
