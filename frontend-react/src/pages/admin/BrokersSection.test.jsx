import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BrokersSection, { AccountStatusToggle } from './BrokersSection.jsx';

afterEach(cleanup);

test('admin rows show a protected label instead of a lock button', () => {
  render(<AccountStatusToggle user={{ id: 1, role: 'ADMIN', status: 'ACTIVE' }} saving={false} onToggle={() => {}} />);
  expect(screen.queryByRole('button', { name: 'Khóa' })).not.toBeInTheDocument();
  expect(screen.getByText('Quản trị viên')).toBeInTheDocument();
});

test('non-admin active rows keep the lock button and fire onToggle', () => {
  const onToggle = vi.fn();
  const user = { id: 2, role: 'BROKER', status: 'ACTIVE' };
  render(<AccountStatusToggle user={user} saving={false} onToggle={onToggle} />);
  fireEvent.click(screen.getByRole('button', { name: 'Khóa' }));
  expect(onToggle).toHaveBeenCalledWith(user);
});

test('locked broker rows show the unlock button', () => {
  render(<AccountStatusToggle user={{ id: 3, role: 'BROKER', status: 'LOCKED' }} saving={false} onToggle={() => {}} />);
  expect(screen.getByRole('button', { name: 'Mở khóa' })).toBeInTheDocument();
});

test('phone input enforces the Vietnamese mobile number pattern', () => {
  render(
    <BrokersSection
      data={{ brokers: [] }}
      loading={false}
      saving={false}
      actions={{ createBrokerAccount: vi.fn(), toggleUserStatus: vi.fn() }}
    />,
  );
  const phoneInput = screen.getByLabelText('Số điện thoại');
  expect(phoneInput).toHaveAttribute('pattern', '0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}');
  expect(phoneInput).toHaveAttribute('maxlength', '10');
  expect(phoneInput.checkValidity()).toBe(false);

  fireEvent.change(phoneInput, { target: { value: '0912345678' } });
  expect(phoneInput.checkValidity()).toBe(true);

  fireEvent.change(phoneInput, { target: { value: '1' } });
  expect(phoneInput.checkValidity()).toBe(false);
});
