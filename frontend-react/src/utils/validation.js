const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(0|\+84)[0-9\s.-]{8,13}$/;

// Strict VN mobile prefixes: Viettel (03x/086/096-098), Mobifone (07x/089/090/093),
// Vinaphone (08x/088/091/094), Vietnamobile (052/056/058/092), Gmobile (059/099), Itel (087).
export const VN_MOBILE_PATTERN = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;

export function validateLoginForm(values, mode = 'login') {
  const errors = {};
  if (!EMAIL_PATTERN.test(values.email || '')) {
    errors.email = 'Email không hợp lệ.';
  }
  if (mode === 'forgot') {
    return errors;
  }
  if (mode === 'mfa') {
    if (!/^\d{6}$/.test(values.otpCode || '')) {
      errors.otpCode = 'Mã OTP phải gồm 6 chữ số.';
    }
    return errors;
  }
  if (mode === 'reset') {
    if (!/^\d{6}$/.test(values.otpCode || '')) {
      errors.otpCode = 'Mã OTP phải gồm 6 chữ số.';
    }
    if (!values.newPassword || values.newPassword.length < 8) {
      errors.newPassword = 'Mật khẩu cần ít nhất 8 ký tự.';
    }
    if (values.confirmNewPassword !== values.newPassword) {
      errors.confirmNewPassword = 'Mật khẩu xác nhận không khớp.';
    }
    return errors;
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
