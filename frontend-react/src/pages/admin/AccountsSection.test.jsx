import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AccountsSection, { AccountStatusToggle } from './AccountsSection.jsx';

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

test('AccountsSection renders the account table from data.users', () => {
  render(
    <AccountsSection
      data={{ users: [{ id: 'u1', fullName: 'Anh Tú', email: 'tu@x.vn', role: 'BROKER', status: 'ACTIVE' }], brokers: [], properties: [], viewings: [] }}
      loading={false}
      saving={false}
      actions={{ toggleUserStatus: vi.fn() }}
      queryParams={{}}
    />,
  );
  expect(screen.getByText('Anh Tú')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Khóa' })).toBeInTheDocument();
});

test('status tabs filter accounts and show per-tab counts', () => {
  const users = [
    { id: 'u1', fullName: 'Anh Tú', email: 'tu@x.vn', role: 'BROKER', status: 'ACTIVE' },
    { id: 'u2', fullName: 'Chị Lan', email: 'lan@x.vn', role: 'BROKER', status: 'LOCKED' },
  ];
  render(
    <AccountsSection
      data={{ users, brokers: [], properties: [], viewings: [] }}
      loading={false}
      saving={false}
      actions={{ toggleUserStatus: vi.fn() }}
      queryParams={{}}
    />,
  );

  expect(screen.getByText('Anh Tú')).toBeInTheDocument();
  expect(screen.getByText('Chị Lan')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Đã khóa/ }));
  expect(screen.getByText('Chị Lan')).toBeInTheDocument();
  expect(screen.queryByText('Anh Tú')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Đang hoạt động/ }));
  expect(screen.getByText('Anh Tú')).toBeInTheDocument();
  expect(screen.queryByText('Chị Lan')).not.toBeInTheDocument();
});
