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

  test('forgot password only requires a valid email', () => {
    expect(validateLoginForm({ email: 'user@example.com', password: '' }, 'forgot')).toEqual({});
    expect(validateLoginForm({ email: 'bad', password: '' }, 'forgot')).toEqual({
      email: 'Email không hợp lệ.',
    });
  });
});
