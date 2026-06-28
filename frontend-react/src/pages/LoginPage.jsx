import { useState } from 'react';
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCurrentUser, login, registerUser } from '../services/api.js';
import { createSession } from '../services/session.js';
import { validateLoginForm } from '../utils/validation.js';

const iconInputClass = 'input !pl-11';

export default function LoginPage({ session, onLogin }) {
  const [mode, setMode] = useState('login');
  const [values, setValues] = useState({ username: '', fullName: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLoginForm(values, mode);
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length > 0) return;

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
  }

  if (session) {
    const href = session.role === 'ADMIN' ? '#/admin/overview' : session.role === 'BROKER' ? '#/broker/dashboard' : '#/';
    return (
      <main className="min-h-screen bg-surface text-on-surface font-body-md flex items-center justify-center p-margin-mobile md:p-margin-desktop">
        <section className="ui-panel w-full max-w-xl p-stack-lg text-center">
          <MaterialIcon filled className="text-trust-navy text-4xl">verified_user</MaterialIcon>
          <h1 className="font-headline-lg text-headline-lg text-trust-navy mt-4 mb-2">Bạn đã đăng nhập</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">{session.email}</p>
          <a className="ui-action" href={href}>
            Vào trang làm việc
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-on-surface font-body-md lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#001D6C] text-white lg:flex">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          src="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1600&q=80"
          alt="Khu nhà ở hiện đại"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#001D6C]/95 via-[#001D6C]/70 to-[#0F62FE]/55" />
        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <a className="inline-flex items-center gap-2 text-white" href="#/">
            <BrandLogo />
          </a>
          <div className="max-w-xl">
            <p className="mb-4 font-label-bold text-label-bold text-primary-fixed-dim">{BRAND_NAME}</p>
            <h1 className="font-headline-xl text-headline-xl text-white">
              Quản lý và tìm bất động sản Trà Vinh trong một giao diện gọn hơn.
            </h1>
            <div className="mt-8 grid grid-cols-3 border border-white/20 bg-white/10 backdrop-blur">
              <Metric label="Vai trò" value="Admin, broker, user" />
              <Metric label="Tin đăng" value="Dữ liệu đang đồng bộ" />
              <Metric label="Bảo mật" value="Phân quyền rõ ràng" />
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-white/75">
            Tiếp tục quản lý hồ sơ, tin đăng và tài khoản trong một không gian làm việc thống nhất.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-margin-mobile py-10 md:px-margin-desktop lg:px-12">
        <div className="w-full max-w-[440px]">
          <a className="mb-stack-lg inline-flex items-center gap-2 text-trust-navy lg:hidden" href="#/">
            <BrandLogo />
          </a>

          <div className="mb-stack-lg">
            <p className="mb-3 font-label-bold text-label-bold uppercase tracking-normal text-on-surface-variant">{BRAND_NAME}</p>
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-trust-navy md:font-headline-xl md:text-headline-xl">
              {mode === 'register' ? 'Tạo tài khoản user' : 'Chào mừng trở lại'}
            </h1>
            <p className="mt-3 font-body-md text-body-md text-on-surface-variant">
              {mode === 'register' ? `Đăng ký để lưu và theo dõi tin trên ${BRAND_NAME}.` : 'Đăng nhập để tiếp tục quản lý bất động sản của bạn.'}
            </p>
          </div>

          <div className="mb-stack-md grid grid-cols-2 border border-outline-variant bg-surface-container-low p-1">
            <button
              className={`min-h-11 rounded px-3 py-2 font-label-bold text-label-bold transition-colors ${mode === 'login' ? 'bg-surface-container-lowest text-trust-navy shadow-sm' : 'text-on-surface-variant hover:text-trust-navy'}`}
              type="button"
              onClick={() => switchMode('login')}
            >
              Đăng nhập
            </button>
            <button
              className={`min-h-11 rounded px-3 py-2 font-label-bold text-label-bold transition-colors ${mode === 'register' ? 'bg-surface-container-lowest text-trust-navy shadow-sm' : 'text-on-surface-variant hover:text-trust-navy'}`}
              type="button"
              onClick={() => switchMode('register')}
            >
              Đăng ký
            </button>
          </div>

          <form className="ui-panel p-5 space-y-stack-md" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <>
                <Field error={errors.username} icon="badge" id="username" label="Username">
                  <input
                    className={iconInputClass}
                    id="username"
                    name="username"
                    value={values.username}
                    onChange={(event) => updateValue('username', event.target.value)}
                  />
                </Field>

                <Field error={errors.fullName} icon="account_circle" id="fullName" label="Họ tên">
                  <input
                    className={iconInputClass}
                    id="fullName"
                    name="fullName"
                    value={values.fullName}
                    onChange={(event) => updateValue('fullName', event.target.value)}
                  />
                </Field>

                <Field error={errors.phone} icon="call" id="phone" label="Số điện thoại">
                  <input
                    className={iconInputClass}
                    id="phone"
                    name="phone"
                    value={values.phone}
                    onChange={(event) => updateValue('phone', event.target.value)}
                  />
                </Field>
              </>
            )}

            <Field error={errors.email} icon="person" id="email" label="Email">
              <input
                className={iconInputClass}
                id="email"
                name="email"
                type="email"
                value={values.email}
                onChange={(event) => updateValue('email', event.target.value)}
              />
            </Field>

            <Field error={errors.password} icon="lock" id="password" label="Mật khẩu">
              <input
                className={iconInputClass}
                id="password"
                name="password"
                type="password"
                value={values.password}
                onChange={(event) => updateValue('password', event.target.value)}
              />
            </Field>

            {serverError && <div className="rounded border border-error-container bg-error-container/50 text-on-error-container p-3 font-body-sm text-body-sm">{serverError}</div>}

            <button className="ui-action w-full group disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? (mode === 'register' ? 'Đang đăng ký' : 'Đang đăng nhập') : (mode === 'register' ? 'Đăng ký user' : 'Đăng nhập')}
              <MaterialIcon className="group-hover:translate-x-1 transition-transform">arrow_forward</MaterialIcon>
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Field({ children, error, icon, id, label }) {
  return (
    <div>
      <label className="block font-label-bold text-label-bold text-trust-navy mb-1" htmlFor={id}>{label}</label>
      <div className="relative">
        <MaterialIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">{icon}</MaterialIcon>
        {children}
      </div>
      {error && <p className="mt-1 font-body-sm text-body-sm text-error">{error}</p>}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="border-r border-white/20 p-4 last:border-r-0">
      <p className="font-label-bold text-label-bold text-primary-fixed-dim">{label}</p>
      <p className="mt-2 font-body-sm text-body-sm text-white">{value}</p>
    </div>
  );
}
