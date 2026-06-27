import { useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCurrentUser, login } from '../services/api.js';
import { createSession } from '../services/session.js';
import { validateLoginForm } from '../utils/validation.js';

export default function LoginPage({ session, onLogin }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateLoginForm(values);
    setErrors(nextErrors);
    setServerError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const auth = await login(values.email, values.password);
      const profile = await fetchCurrentUser(auth.accessToken).catch(() => ({}));
      const nextSession = createSession(auth, profile);
      onLogin(nextSession);
      window.location.hash = nextSession.role === 'ADMIN' ? '#/admin/overview' : nextSession.role === 'BROKER' ? '#/broker/dashboard' : '#/';
    } catch (exception) {
      setServerError(exception.message || 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  }

  function updateValue(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  if (session) {
    const href = session.role === 'ADMIN' ? '#/admin/overview' : session.role === 'BROKER' ? '#/broker/dashboard' : '#/';
    return (
      <main className="bg-surface text-on-surface font-body-md min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop">
        <section className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg shadow-[0_10px_30px_rgba(0,0,0,0.08)] text-center">
          <MaterialIcon filled className="text-trust-navy text-4xl">verified_user</MaterialIcon>
          <h1 className="font-headline-lg text-headline-lg text-trust-navy mt-4 mb-2">Bạn đã đăng nhập</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">{session.email}</p>
          <a className="inline-flex items-center justify-center bg-trust-navy text-on-primary font-label-bold text-label-bold px-6 py-3 rounded hover:bg-primary-container transition-colors" href={href}>
            Vào trang làm việc
          </a>
        </section>
      </main>
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body-md min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center p-margin-mobile md:p-margin-desktop relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-surface-container-low to-surface-container-highest z-0"></div>
        <section className="relative z-10 w-full max-w-md rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] bg-on-primary overflow-hidden border border-surface-variant">
          <div className="p-stack-lg flex flex-col justify-center">
            <div className="mb-stack-lg">
              <a className="inline-flex items-center gap-2 font-headline-md text-headline-md font-bold text-trust-navy mb-stack-md" href="#/">
                <MaterialIcon filled>real_estate_agent</MaterialIcon>
                BĐS Trà Vinh
              </a>
              <h1 className="font-headline-xl text-headline-xl text-trust-navy mb-stack-sm">Chào mừng trở lại</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Đăng nhập để tiếp tục quản lý bất động sản của bạn.</p>
            </div>

            <form className="space-y-stack-md flex flex-col justify-center" onSubmit={handleSubmit}>
              <div>
                <label className="block font-label-bold text-label-bold text-trust-navy mb-1" htmlFor="email">Email</label>
                <div className="relative">
                  <MaterialIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">person</MaterialIcon>
                  <input
                    className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded bg-on-primary text-on-surface focus:outline-none focus:border-trust-navy focus:ring-2 focus:ring-trust-navy/20 transition-all font-body-md text-body-md"
                    id="email"
                    name="email"
                    type="email"
                    value={values.email}
                    onChange={(event) => updateValue('email', event.target.value)}
                  />
                </div>
                {errors.email && <p className="mt-1 font-body-sm text-body-sm text-error">{errors.email}</p>}
              </div>

              <div>
                <label className="block font-label-bold text-label-bold text-trust-navy mb-1" htmlFor="password">Mật khẩu</label>
                <div className="relative">
                  <MaterialIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-outline">lock</MaterialIcon>
                  <input
                    className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded bg-on-primary text-on-surface focus:outline-none focus:border-trust-navy focus:ring-2 focus:ring-trust-navy/20 transition-all font-body-md text-body-md"
                    id="password"
                    name="password"
                    type="password"
                    value={values.password}
                    onChange={(event) => updateValue('password', event.target.value)}
                  />
                </div>
                {errors.password && <p className="mt-1 font-body-sm text-body-sm text-error">{errors.password}</p>}
              </div>

              {serverError && <div className="rounded border border-error-container bg-error-container/50 text-on-error-container p-3 font-body-sm text-body-sm">{serverError}</div>}

              <button className="w-full bg-trust-navy text-on-primary font-label-bold text-label-bold py-3 rounded shadow hover:bg-primary-container transition-colors mt-stack-md flex items-center justify-center gap-2 group disabled:opacity-60" type="submit" disabled={submitting}>
                {submitting ? 'Đang đăng nhập' : 'Đăng nhập'}
                <MaterialIcon className="group-hover:translate-x-1 transition-transform">arrow_forward</MaterialIcon>
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
