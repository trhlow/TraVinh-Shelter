import '@testing-library/jest-dom/vitest';
import { beforeEach, test, expect } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

beforeEach(() => {
  window.location.hash = '#/';
});

test('renders usable property search and empty state', async () => {
  render(<App />);

  expect(screen.getByText('Đang tải dữ liệu...')).toBeInTheDocument();
  expect(await screen.findAllByText('Nhà phố 1 trệt 2 lầu, KDC 586')).toHaveLength(2);

  await userEvent.selectOptions(screen.getByLabelText('Loại'), 'apartment');
  await waitFor(() => expect(screen.getAllByText('Căn hộ Chung cư Minh Châu')).toHaveLength(2));

  await userEvent.clear(screen.getByLabelText('Địa điểm hoặc dự án'));
  await userEvent.type(screen.getByLabelText('Địa điểm hoặc dự án'), 'khong co ket qua');
  expect(await screen.findByText('Không tìm thấy kết quả')).toBeInTheDocument();
});

test('validates login form fields', async () => {
  window.location.hash = '#/login';
  render(<App />);

  const dialog = screen.getByRole('dialog', { name: 'Đăng nhập' });
  const loginButtons = within(dialog).getAllByRole('button', { name: 'Đăng nhập' });
  await userEvent.click(loginButtons[loginButtons.length - 1]);
  expect(await screen.findByText('Email không hợp lệ.')).toBeInTheDocument();
  expect(screen.getByText('Mật khẩu cần ít nhất 8 ký tự.')).toBeInTheDocument();
});
