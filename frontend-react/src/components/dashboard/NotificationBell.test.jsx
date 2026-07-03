import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import NotificationBell from './NotificationBell.jsx';

afterEach(cleanup);

const items = [
  { id: 'pending-posts', icon: 'Clock', text: '2 tin chờ duyệt', href: '#/admin/properties?status=PENDING', tone: 'warning' },
];

test('shows badge count and opens dropdown with linked items', () => {
  render(<NotificationBell notifications={items} />);
  expect(screen.getByText('1')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }));
  const link = screen.getByRole('link', { name: /2 tin chờ duyệt/ });
  expect(link).toHaveAttribute('href', '#/admin/properties?status=PENDING');
});

test('renders no badge and an empty message when there are no notifications', () => {
  render(<NotificationBell notifications={[]} />);
  expect(screen.queryByText('0')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }));
  expect(screen.getByText('Không có thông báo mới.')).toBeInTheDocument();
});
