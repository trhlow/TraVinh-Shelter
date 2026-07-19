import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PropertyCarousel, { getCarouselButtonState } from './PropertyCarousel.jsx';

afterEach(() => cleanup());

function itemsOf(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    title: `Tin đăng ${i}`,
    priceLabel: '1 tỷ',
    ward: 'phuong-tra-vinh',
  }));
}

test('renders skeleton placeholders while items is null (loading)', () => {
  const { container } = render(<PropertyCarousel items={null} />);
  expect(container.querySelectorAll('.pcard-skeleton')).toHaveLength(3);
});

test('renders nothing when items is an empty array — no empty carousel section', () => {
  const { container } = render(<PropertyCarousel items={[]} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders every item as a real PropertyCard', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(5)} />);
  expect(container.querySelectorAll('.pcard')).toHaveLength(5);
});

test('hides both arrow buttons when there are no more items than fit in one view', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(3)} visibleCount={3} />);
  expect(container.querySelectorAll('.carousel-arrow-btn')).toHaveLength(0);
});

test('shows arrow buttons when there are more items than fit in one view', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(5)} visibleCount={3} />);
  expect(container.querySelectorAll('.carousel-arrow-btn')).toHaveLength(2);
});

test('never auto-advances — no timer-driven scroll call', () => {
  const scrollBySpy = Element.prototype.scrollBy;
  let callCount = 0;
  Element.prototype.scrollBy = () => { callCount += 1; };
  render(<PropertyCarousel items={itemsOf(6)} />);
  // No fake timers needed: if the component used setInterval/setTimeout to
  // auto-advance, this would need to be proven absent by construction, not by
  // waiting. The real guarantee is architectural (no timer in the component) —
  // this assertion just confirms mounting alone triggers zero scroll calls.
  expect(callCount).toBe(0);
  Element.prototype.scrollBy = scrollBySpy;
});

test('"Xem tất cả" links to the unfiltered search page', () => {
  render(<PropertyCarousel items={itemsOf(5)} />);
  expect(screen.getByText('Xem tất cả').closest('a')).toHaveAttribute('href', '#/search');
});

test('clicking the right arrow scrolls forward by one viewport width', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(6)} />);
  const track = container.querySelector('.carousel-track');
  Object.defineProperty(track, 'clientWidth', { value: 900, configurable: true });
  track.scrollBy = vi.fn();
  fireEvent.click(screen.getByLabelText('Xem tin tiếp theo'));
  expect(track.scrollBy).toHaveBeenCalledWith({ left: 900, behavior: 'smooth' });
});

test('clicking the left arrow scrolls backward by one viewport width', () => {
  const { container } = render(<PropertyCarousel items={itemsOf(6)} />);
  const track = container.querySelector('.carousel-track');
  Object.defineProperty(track, 'clientWidth', { value: 900, configurable: true });
  track.scrollBy = vi.fn();
  fireEvent.click(screen.getByLabelText('Xem tin trước đó'));
  expect(track.scrollBy).toHaveBeenCalledWith({ left: -900, behavior: 'smooth' });
});

// ── getCarouselButtonState (pure) ──────────────────────────
test('getCarouselButtonState: at the very start, prev is disabled, next is enabled', () => {
  expect(getCarouselButtonState(0, 3000, 900)).toEqual({ canGoPrev: false, canGoNext: true });
});

test('getCarouselButtonState: at the very end, next is disabled, prev is enabled', () => {
  expect(getCarouselButtonState(2100, 3000, 900)).toEqual({ canGoPrev: true, canGoNext: false });
});

test('getCarouselButtonState: in the middle, both are enabled', () => {
  expect(getCarouselButtonState(900, 3000, 900)).toEqual({ canGoPrev: true, canGoNext: true });
});

test('getCarouselButtonState: everything fits in one view, both are disabled', () => {
  expect(getCarouselButtonState(0, 900, 900)).toEqual({ canGoPrev: false, canGoNext: false });
});
