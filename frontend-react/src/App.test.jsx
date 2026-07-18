import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';
import { resolveRoute } from './routes/index.jsx';

beforeEach(() => {
  window.location.hash = '#/';
  window.localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('API unavailable in unit test'))));
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

test('renders the template home page', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Khám phá theo loại hình' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText('Công Tín Land').length).toBeGreaterThan(0));
});

test('routes to search page', async () => {
  window.location.hash = '#/search';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Nhà đất bán tại Trà Vinh' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('property-grid')).toBeInTheDocument());
});

test('routes to broker dashboard for broker sessions', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker';
  render(<App />);
  expect((await screen.findAllByRole('heading', { name: 'Bảng điều khiển' })).length).toBeGreaterThan(0);
});

test('routes to separate broker pages for broker sessions', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/settings';
  render(<App />);
  expect((await screen.findAllByRole('heading', { name: 'Cài đặt' })).length).toBeGreaterThan(0);
});

test('routes to broker properties page for broker sessions', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/properties';
  render(<App />);
  expect((await screen.findAllByRole('heading', { name: 'Tin đăng của tôi' })).length).toBeGreaterThan(0);
});

test('resolves every admin sub-path to the custom admin dashboard with a section', () => {
  const cases = [
    ['/admin', 'overview'],
    ['/admin/brokers', 'brokers'],
    ['/admin/properties', 'properties'],
    ['/admin/viewings', 'viewings'],
    ['/admin/audit', 'audit'],
  ];
  const adminPage = resolveRoute('/admin').Page;
  for (const [path, section] of cases) {
    const resolved = resolveRoute(path);
    expect(resolved.Page).toBe(adminPage);
    expect(resolved.params.section).toBe(section);
  }
});

test('mounts the admin overview dashboard for an admin session', async () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'admin@congtinland.vn',
    role: 'ADMIN',
    userId: 'admin-id',
  }));
  window.location.hash = '#/admin';
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Tổng quan' }, { timeout: 5000 })).toBeInTheDocument();
});

test('login page hides demo role account shortcuts', () => {
  window.location.hash = '#/login';
  render(<App />);
  expect(screen.getAllByRole('button', { name: /Đăng nhập/ }).length).toBeGreaterThan(0);
  expect(screen.queryByText('Tài khoản theo vai trò')).not.toBeInTheDocument();
  expect(screen.queryByText(/mẫu/i)).not.toBeInTheDocument();
  expect(screen.queryByText('Hoặc đăng nhập với')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Google' })).not.toBeInTheDocument();
});

test('routes to forgot password page', () => {
  window.location.hash = '#/forgot-password';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Quên mật khẩu?' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Gửi liên kết đặt lại' })).toBeInTheDocument();
});

test('the removed projects route falls back to the home page', () => {
  window.location.hash = '#/projects';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Khám phá theo loại hình' })).toBeInTheDocument();
});

test('routes to the public brokers page', () => {
  window.location.hash = '#/brokers';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Hồ sơ môi giới Công Tín Land' })).toBeInTheDocument();
});

test('the revenue route no longer resolves to a dedicated broker page', () => {
  window.location.hash = '#/broker/revenue';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Khám phá theo loại hình' })).toBeInTheDocument();
});
