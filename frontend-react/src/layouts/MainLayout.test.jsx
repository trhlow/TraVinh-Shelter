import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Footer } from './MainLayout.jsx';

afterEach(() => cleanup());

test('footer does not render Facebook, TikTok, or Youtube links', () => {
  render(<Footer />);
  expect(screen.queryByLabelText('Facebook')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('TikTok')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Youtube')).not.toBeInTheDocument();
});
