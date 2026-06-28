import { describe, expect, test } from 'vitest';
import { validateContactForm, validateLoginForm } from './validation.js';

describe('form validation', () => {
  test('requires valid email and password', () => {
    expect(validateLoginForm({ email: 'bad', password: '123' })).toEqual({
      email: 'Email không hợp lệ.',
      password: 'Mật khẩu cần ít nhất 8 ký tự.',
    });
  });

  test('accepts Vietnamese phone formats for contact form', () => {
    expect(validateContactForm({ name: 'Minh', phone: '0912 345 678' })).toEqual({});
  });

  test('validates user registration fields', () => {
    expect(validateLoginForm({ username: 'ab', fullName: '', phone: 'abc', email: 'bad', password: '123' }, 'register')).toEqual({
      username: 'Username cần 3-50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.',
      fullName: 'Vui lòng nhập họ tên.',
      phone: 'Số điện thoại không hợp lệ.',
      email: 'Email không hợp lệ.',
      password: 'Mật khẩu cần ít nhất 8 ký tự.',
    });
  });

  test('forgot password only requires a valid email', () => {
    expect(validateLoginForm({ email: 'user@example.com', password: '' }, 'forgot')).toEqual({});
    expect(validateLoginForm({ email: 'bad', password: '' }, 'forgot')).toEqual({
      email: 'Email không hợp lệ.',
    });
  });
});
