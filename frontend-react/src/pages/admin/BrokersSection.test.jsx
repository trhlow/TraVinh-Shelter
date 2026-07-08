import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AccountStatusToggle } from './BrokersSection.jsx';

afterEach(cleanup);

test('admin rows show a protected label instead of a lock button', () => {
  render(<AccountStatusToggle user={{ id: 1, role: 'ADMIN', status: 'ACTIVE' }} saving={false} onToggle={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Khóa' })).not.toBeInTheDocument();
  expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
});

test('non-admin active rows keep the lock button and fire onToggle', () => {
  const onToggle = vi.fn();
  const user = { id: 2, role: 'USER', status: 'ACTIVE' };
  render(<AccountStatusToggle user={user} saving={false} onToggle={onToggle} />);
  fireEvent.click(screen.getByRole('button', { name: 'Khóa' }));
  expect(onToggle).toHaveBeenCalledWith(user);
});

test('locked broker rows show the unlock button', () => {
  render(<AccountStatusToggle user={{ id: 3, role: 'BROKER', status: 'LOCKED' }} saving={false} onToggle={() => {}} />);
  expect(screen.getByRole('button', { name: 'Mở khóa' })).toBeInTheDocument();
});
