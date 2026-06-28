import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import App from './App.jsx';

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

  expect(screen.getByRole('heading', { name: 'Công Tín Land - tìm nhà trọ, bất động sản Trà Vinh nhanh chóng' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tin nổi bật' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByText('Công Tín Land').length).toBeGreaterThan(0));
});

test('routes to search page', async () => {
  window.location.hash = '#/search';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Nhà đất bán tại Trà Vinh' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByTestId('property-grid')).toBeInTheDocument());
});

test('routes to broker dashboard for broker sessions', () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Bảng điều khiển' }).length).toBeGreaterThan(0);
});

test('routes to separate broker pages for broker sessions', () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/profile';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Hồ sơ môi giới' }).length).toBeGreaterThan(0);
});

test('routes to broker properties page for broker sessions', () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/properties';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Tin đăng của tôi' }).length).toBeGreaterThan(0);
});

test('routes to broker support page for broker sessions', () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'broker@congtinland.vn',
    role: 'BROKER',
    userId: 'broker-id',
  }));
  window.location.hash = '#/broker/support';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Hỗ trợ ưu tiên' }).length).toBeGreaterThan(0);
});

test('routes to separate admin pages for admin sessions', () => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token',
    email: 'admin@congtinland.vn',
    role: 'ADMIN',
    userId: 'admin-id',
  }));
  window.location.hash = '#/admin/users';
  render(<App />);
  expect(screen.getAllByRole('heading', { name: 'Tài khoản users' }).length).toBeGreaterThan(0);
});

test('routes to all required admin pages for admin sessions', () => {
  const adminSession = {
    token: 'test-token',
    email: 'admin@congtinland.vn',
    role: 'ADMIN',
    userId: 'admin-id',
  };
  const cases = [
    ['#/admin/overview', 'Tổng quan'],
    ['#/admin/brokers', 'Môi giới'],
    ['#/admin/properties', 'Bài đăng'],
    ['#/admin/support', 'Hỗ trợ ưu tiên'],
  ];

  for (const [hash, heading] of cases) {
    cleanup();
    window.localStorage.setItem('travinh-realty-session', JSON.stringify(adminSession));
    window.location.hash = hash;
    render(<App />);
    expect(screen.getAllByRole('heading', { name: heading }).length).toBeGreaterThan(0);
  }
});

test('login page hides demo role account shortcuts', () => {
  window.location.hash = '#/login';
  render(<App />);
  expect(screen.getAllByRole('button', { name: /Đăng nhập/ }).length).toBeGreaterThan(0);
  expect(screen.queryByText('Tài khoản theo vai trò')).not.toBeInTheDocument();
  expect(screen.queryByText(/mẫu/i)).not.toBeInTheDocument();
});

test('routes to public projects and brokers pages', () => {
  window.location.hash = '#/projects';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Khu đô thị và dự án nổi bật' })).toBeInTheDocument();

  cleanup();
  window.location.hash = '#/brokers';
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Hồ sơ môi giới Công Tín Land' })).toBeInTheDocument();
});
