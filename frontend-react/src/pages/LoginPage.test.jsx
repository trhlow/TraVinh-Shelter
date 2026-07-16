import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { requestPasswordReset, confirmPasswordReset, login, verifyLoginOtp, fetchCurrentUser } = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  login: vi.fn(),
  verifyLoginOtp: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

vi.mock('../services/api.js', () => ({
  login,
  fetchCurrentUser,
  requestPasswordReset,
  confirmPasswordReset,
  verifyLoginOtp,
}));

import LoginPage from './LoginPage.jsx';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test('submitting the forgot-password form calls requestPasswordReset and switches to the reset mode', async () => {
  requestPasswordReset.mockResolvedValue({ message: 'Nếu email này tồn tại, hướng dẫn đã được gửi.' });
  render(<LoginPage initialMode="forgot" onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@congtinland.vn' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }));

  await waitFor(() => expect(requestPasswordReset).toHaveBeenCalledWith('user@congtinland.vn'));
  expect(await screen.findByText('Nếu email này tồn tại, hướng dẫn đã được gửi.')).toBeInTheDocument();
  expect(await screen.findByLabelText(/Mã OTP/i)).toBeInTheDocument();
});

test('submitting the reset form with a wrong OTP shows the server error and stays on the reset form', async () => {
  requestPasswordReset.mockResolvedValue({ message: 'Đã gửi.' });
  confirmPasswordReset.mockRejectedValue(new Error('Mã OTP không hợp lệ hoặc đã hết hạn'));
  render(<LoginPage initialMode="forgot" onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@congtinland.vn' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }));
  await screen.findByLabelText(/Mã OTP/i);

  fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'newpassword1' } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'newpassword1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

  expect(await screen.findByText('Mã OTP không hợp lệ hoặc đã hết hạn')).toBeInTheDocument();
  expect(screen.getByLabelText(/Mã OTP/i)).toBeInTheDocument();
});

test('submitting the reset form with a valid OTP shows a success message', async () => {
  requestPasswordReset.mockResolvedValue({ message: 'Đã gửi.' });
  confirmPasswordReset.mockResolvedValue({ message: 'Đặt lại mật khẩu thành công.' });
  render(<LoginPage initialMode="forgot" onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@congtinland.vn' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' }));
  await screen.findByLabelText(/Mã OTP/i);

  fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu mới'), { target: { value: 'newpassword1' } });
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu mới'), { target: { value: 'newpassword1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

  await waitFor(() => expect(confirmPasswordReset).toHaveBeenCalledWith('user@congtinland.vn', '123456', 'newpassword1'));
  expect(await screen.findByText('Đặt lại mật khẩu thành công.')).toBeInTheDocument();
});

test('admin login with mfaRequired shows the OTP step instead of logging in immediately', async () => {
  login.mockResolvedValue({ mfaRequired: true });
  render(<LoginPage onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(login).toHaveBeenCalledWith('admin@congtinland.vn', 'password123'));
  expect(await screen.findByLabelText(/Mã OTP/i)).toBeInTheDocument();
  expect(fetchCurrentUser).not.toHaveBeenCalled();
});

test('submitting a valid OTP after mfaRequired completes login and redirects to admin', async () => {
  const onLogin = vi.fn();
  login.mockResolvedValue({ mfaRequired: true });
  verifyLoginOtp.mockResolvedValue({
    accessToken: 'jwt-token', tokenType: 'Bearer', expiresIn: 86400,
    userId: 'u1', email: 'admin@congtinland.vn', role: 'ADMIN',
  });
  fetchCurrentUser.mockResolvedValue({ fullName: 'Admin User', role: 'ADMIN' });
  render(<LoginPage onLogin={onLogin} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByLabelText(/Mã OTP/i);

  fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

  await waitFor(() => expect(verifyLoginOtp).toHaveBeenCalledWith('admin@congtinland.vn', '123456'));
  await waitFor(() => expect(onLogin).toHaveBeenCalled());
});

test('submitting a wrong OTP shows the server error and stays on the mfa step', async () => {
  login.mockResolvedValue({ mfaRequired: true });
  verifyLoginOtp.mockRejectedValue(new Error('Mã OTP không hợp lệ hoặc đã hết hạn'));
  render(<LoginPage onLogin={() => {}} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
  await screen.findByLabelText(/Mã OTP/i);

  fireEvent.change(screen.getByLabelText(/Mã OTP/i), { target: { value: '000000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

  expect(await screen.findByText('Mã OTP không hợp lệ hoặc đã hết hạn')).toBeInTheDocument();
  expect(screen.getByLabelText(/Mã OTP/i)).toBeInTheDocument();
});

test('broker login without mfaRequired logs in immediately, unaffected by the mfa step', async () => {
  const onLogin = vi.fn();
  login.mockResolvedValue({
    accessToken: 'jwt-token', tokenType: 'Bearer', expiresIn: 86400,
    userId: 'u2', email: 'broker@congtinland.vn', role: 'BROKER',
  });
  fetchCurrentUser.mockResolvedValue({ fullName: 'Broker User', role: 'BROKER' });
  render(<LoginPage onLogin={onLogin} />);

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'broker@congtinland.vn' } });
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

  await waitFor(() => expect(onLogin).toHaveBeenCalled());
  expect(verifyLoginOtp).not.toHaveBeenCalled();
});
