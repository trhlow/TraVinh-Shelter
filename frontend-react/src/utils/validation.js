const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(0|\+84)[0-9\s.-]{8,13}$/;

export function validateLoginForm(values, mode = 'login') {
  const errors = {};
  if (mode === 'register' && !/^[A-Za-z0-9_.-]{3,50}$/.test(values.username || '')) {
    errors.username = 'Username cần 3-50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.';
  }
  if (mode === 'register' && !values.fullName?.trim()) {
    errors.fullName = 'Vui lòng nhập họ tên.';
  }
  if (mode === 'register' && values.phone && !PHONE_PATTERN.test(values.phone)) {
    errors.phone = 'Số điện thoại không hợp lệ.';
  }
  if (!EMAIL_PATTERN.test(values.email || '')) {
    errors.email = 'Email không hợp lệ.';
  }
  if (!values.password || values.password.length < 8) {
    errors.password = 'Mật khẩu cần ít nhất 8 ký tự.';
  }
  return errors;
}

export function validateContactForm(values) {
  const errors = {};
  if (!values.name?.trim()) {
    errors.name = 'Vui lòng nhập họ tên.';
  }
  if (!PHONE_PATTERN.test(values.phone || '')) {
    errors.phone = 'Số điện thoại không hợp lệ.';
  }
  return errors;
}
