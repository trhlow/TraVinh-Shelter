import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Footer } from './MainLayout.jsx';

afterEach(() => cleanup());

test('footer renders Facebook and TikTok links but not Youtube', () => {
  render(<Footer />);
  expect(screen.getByLabelText('Facebook')).toBeInTheDocument();
  expect(screen.getByLabelText('TikTok')).toBeInTheDocument();
  expect(screen.queryByLabelText('Youtube')).not.toBeInTheDocument();
});
