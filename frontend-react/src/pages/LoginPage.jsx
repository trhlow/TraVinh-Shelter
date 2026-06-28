import { useEffect, useState } from 'react';
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCurrentUser, login, registerUser } from '../services/api.js';
import { createSession } from '../services/session.js';
import { validateLoginForm } from '../utils/validation.js';

const AUTH_BACKGROUND = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=80';

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
      <main className="flex min-h-screen items-center justify-center bg-surface-container-low p-margin-mobile text-on-surface md:p-margin-desktop">
        <section className="ui-panel w-full max-w-xl p-stack-lg text-center">
          <MaterialIcon filled className="text-4xl text-primary">verified_user</MaterialIcon>
          <h1 className="mb-2 mt-4 font-headline-lg text-headline-lg text-on-surface">Bạn đã đăng nhập</h1>
          <p className="mb-stack-md font-body-sm text-body-sm text-on-surface-variant">{session.email}</p>
          <a className="ui-action" href={href}>
            Vào trang làm việc
          </a>
        </section>
      </main>
    );
  }

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const copy = MODE_COPY[mode] || MODE_COPY.login;

  return (
    <main className="auth-shell" style={{ '--auth-bg-image': `url("${AUTH_BACKGROUND}")` }}>
      <section className={`auth-card ${isForgot ? 'is-compact' : ''}`}>
        <div className="mb-8 flex justify-center">
          <a className="auth-kicker" href="#/" aria-label={BRAND_NAME}>
            <BrandLogo />
          </a>
        </div>

        <div className="mb-10">
          <h1 className="auth-title">{copy.title}</h1>
          <p className="auth-subtitle">{copy.subtitle}</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field error={errors.username} id="username" label="Tên đăng nhập">
                <input
                  className="auth-input"
                  id="username"
                  name="username"
                  placeholder="ten_dang_nhap"
                  value={values.username}
                  onChange={(event) => updateValue('username', event.target.value)}
                />
              </Field>
              <Field error={errors.fullName} id="fullName" label="Họ tên">
                <input
                  className="auth-input"
                  id="fullName"
                  name="fullName"
                  placeholder="Nguyễn Văn A"
                  value={values.fullName}
                  onChange={(event) => updateValue('fullName', event.target.value)}
                />
              </Field>
              <Field error={errors.phone} id="phone" label="Số điện thoại" className="sm:col-span-2">
                <input
                  className="auth-input"
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
            <div className="relative">
              <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</MaterialIcon>
              <input
                className="auth-input pl-12"
                id="email"
                name="email"
                placeholder={isForgot ? 'Nhập email cá nhân hoặc email tài khoản' : 'email@domain.com'}
                type="email"
                value={values.email}
                onChange={(event) => updateValue('email', event.target.value)}
              />
            </div>
          </Field>

          {!isForgot && (
            <Field error={errors.password} id="password" label="Mật khẩu">
              <div className="relative">
                <MaterialIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</MaterialIcon>
                <input
                  className="auth-input pl-12 pr-12"
                  id="password"
                  name="password"
                  placeholder="Tối thiểu 8 ký tự"
                  type="password"
                  value={values.password}
                  onChange={(event) => updateValue('password', event.target.value)}
                />
                <MaterialIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-outline">visibility</MaterialIcon>
              </div>
              {!isRegister && <p className="mt-2 text-[13px] leading-5 text-on-surface-variant">Mật khẩu cần tối thiểu 8 ký tự, gồm chữ hoặc số.</p>}
            </Field>
          )}

          {!isRegister && !isForgot && (
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
                <input className="h-4 w-4 rounded-none border-outline-variant text-primary focus:ring-primary" type="checkbox" />
                Ghi nhớ đăng nhập
              </label>
              <button className="auth-link" type="button" onClick={() => switchMode('forgot')}>
                Quên mật khẩu?
              </button>
            </div>
          )}

          {serverError && <div className="border border-error-container bg-error-container/50 p-3 font-body-sm text-body-sm text-on-error-container">{serverError}</div>}
          {successMessage && <div className="border border-success-green/40 bg-success-green/10 p-3 font-body-sm text-body-sm text-on-surface">{successMessage}</div>}

          <button className="auth-primary disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? copy.loading : copy.button}
          </button>
        </form>

        <div className="mt-8 border-t border-outline-variant pt-8 text-center">
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
      </section>
    </main>
  );
}

function Field({ children, className = '', error, id, label }) {
  return (
    <div className={className}>
      <label className="mb-2 block font-body-sm text-body-sm text-on-surface" htmlFor={id}>{label}</label>
      {children}
      {error && <p className="mt-1 font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  );
}

function modePath(mode) {
  if (mode === 'register') return '#/register';
  if (mode === 'forgot') return '#/forgot-password';
  return '#/login';
}
