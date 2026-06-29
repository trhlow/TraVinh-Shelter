import { useEffect, useState } from 'react';
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import { fetchCurrentUser, login, registerUser } from '../services/api.js';
import { createSession } from '../services/session.js';
import { validateLoginForm } from '../utils/validation.js';

const MODE_COPY = {
  login: {
    title: 'Đăng nhập',
    subtitle: `Tiếp tục vào ${BRAND_NAME}.`,
    button: 'Đăng nhập',
    loading: 'Đang đăng nhập',
  },
  register: {
    title: 'Đăng ký miễn phí',
    subtitle: `Tạo tài khoản user để lưu và theo dõi tin trên ${BRAND_NAME}.`,
    button: 'Tạo tài khoản user',
    loading: 'Đang đăng ký',
  },
  forgot: {
    title: 'Quên mật khẩu?',
    subtitle: 'Không sao, nhập email để nhận hướng dẫn đặt lại mật khẩu.',
    button: 'Gửi liên kết đặt lại',
    loading: 'Đang gửi',
  },
};

export default function LoginPage({ session, onLogin, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState({ username: '', fullName: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setErrors({});
    setServerError('');
    setSuccessMessage('');
  }, [initialMode]);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLoginForm(values, mode);
    setErrors(nextErrors);
    setServerError('');
    setSuccessMessage('');
    if (Object.keys(nextErrors).length > 0) return;

    if (mode === 'forgot') {
      setSuccessMessage('Nếu email này tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi đến hộp thư của bạn.');
      return;
    }

    setSubmitting(true);
    try {
      const auth = mode === 'register'
        ? await registerUser({
          username: values.username.trim(),
          fullName: values.fullName.trim(),
          phone: values.phone.trim() || null,
          email: values.email.trim(),
          password: values.password,
        })
        : await login(values.email, values.password);
      const profile = await fetchCurrentUser(auth.accessToken).catch(() => ({}));
      const nextSession = createSession(auth, profile);
      onLogin(nextSession);
      window.location.hash = nextSession.role === 'ADMIN' ? '#/admin/overview' : nextSession.role === 'BROKER' ? '#/broker/dashboard' : '#/';
    } catch (exception) {
      setServerError(exception.message || (mode === 'register' ? 'Đăng ký thất bại.' : 'Đăng nhập thất bại.'));
    } finally {
      setSubmitting(false);
    }
  }

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setErrors({});
    setServerError('');
    setSuccessMessage('');
    window.location.hash = modePath(nextMode);
  }

  if (session) {
    const href = session.role === 'ADMIN' ? '#/admin/overview' : session.role === 'BROKER' ? '#/broker/dashboard' : '#/';
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="auth-brand-wrap">
            <a href="#/">
              <BrandLogo />
            </a>
          </div>
          <h1 className="auth-title">Bạn đã đăng nhập</h1>
          <p className="auth-subtitle">{session.email}</p>
          <a className="auth-btn" href={href}>
            Vào trang làm việc
          </a>
        </div>
      </div>
    );
  }

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const copy = MODE_COPY[mode] || MODE_COPY.login;

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand-wrap">
          <a href="#/" aria-label={BRAND_NAME}>
            <BrandLogo />
          </a>
        </div>

        <h1 className="auth-title">{copy.title}</h1>
        <p className="auth-subtitle">{copy.subtitle}</p>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-field-group">
              <Field error={errors.username} id="username" label="Tên đăng nhập">
                <input
                  className="input"
                  id="username"
                  name="username"
                  placeholder="ten_dang_nhap"
                  value={values.username}
                  onChange={(event) => updateValue('username', event.target.value)}
                />
              </Field>
              <Field error={errors.fullName} id="fullName" label="Họ tên">
                <input
                  className="input"
                  id="fullName"
                  name="fullName"
                  placeholder="Nguyễn Văn A"
                  value={values.fullName}
                  onChange={(event) => updateValue('fullName', event.target.value)}
                />
              </Field>
              <Field error={errors.phone} id="phone" label="Số điện thoại">
                <input
                  className="input"
                  id="phone"
                  name="phone"
                  placeholder="090..."
                  value={values.phone}
                  onChange={(event) => updateValue('phone', event.target.value)}
                />
              </Field>
            </div>
          )}

          <Field error={errors.email} id="email" label="Email">
            <input
              className="input"
              id="email"
              name="email"
              placeholder={isForgot ? 'Nhập email cá nhân hoặc email tài khoản' : 'email@domain.com'}
              type="email"
              value={values.email}
              onChange={(event) => updateValue('email', event.target.value)}
            />
          </Field>

          {!isForgot && (
            <Field error={errors.password} id="password" label="Mật khẩu">
              <input
                className="input"
                id="password"
                name="password"
                placeholder="Tối thiểu 8 ký tự"
                type="password"
                value={values.password}
                onChange={(event) => updateValue('password', event.target.value)}
              />
            </Field>
          )}

          {!isRegister && !isForgot && (
            <div className="auth-row">
              <label className="auth-remember">
                <input type="checkbox" />
                Ghi nhớ đăng nhập
              </label>
              <button className="auth-link" type="button" onClick={() => switchMode('forgot')}>
                Quên mật khẩu?
              </button>
            </div>
          )}

          {serverError && (
            <div className="alert alert-error">{serverError}</div>
          )}
          {successMessage && (
            <div className="alert">{successMessage}</div>
          )}

          <button className="auth-btn" type="submit" disabled={submitting}>
            {submitting ? copy.loading : copy.button}
          </button>
        </form>

        <div className="auth-divider" />

        <div className="auth-footer-links">
          {isForgot ? (
            <button className="auth-link" type="button" onClick={() => switchMode('login')}>
              Quay lại đăng nhập
            </button>
          ) : isRegister ? (
            <button className="auth-link" type="button" onClick={() => switchMode('login')}>
              Đã có tài khoản? Đăng nhập
            </button>
          ) : (
            <button className="auth-link" type="button" onClick={() => switchMode('register')}>
              Chưa có tài khoản? Đăng ký
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ children, className = '', error, id, label }) {
  return (
    <div className={`auth-field ${className}`}>
      <label className="auth-field-label" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}

function modePath(mode) {
  if (mode === 'register') return '#/register';
  if (mode === 'forgot') return '#/forgot-password';
  return '#/login';
}
