import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Footer } from './MainLayout.jsx';

afterEach(() => cleanup());

test('footer renders Facebook, TikTok, and YouTube links', () => {
  render(<Footer />);
  expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
  expect(screen.getByLabelText('TikTok')).toBeInTheDocument();
  expect(screen.getByLabelText('YouTube')).toBeInTheDocument();
});
