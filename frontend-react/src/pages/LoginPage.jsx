import { useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import { fetchCurrentUser, login } from '../services/api.js';
import { createSession } from '../services/session.js';
import { validateLoginForm } from '../utils/validation.js';

const DEMO_ACCOUNTS = {
  broker: { email: 'broker@travinhrealty.vn', password: 'password' },
  admin: { email: 'admin@travinhrealty.vn', password: 'password' },
};

export default function LoginPage({ session, onLogin }) {
  const [values, setValues] = useState(DEMO_ACCOUNTS.broker);
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
      window.location.hash = nextSession.role === 'ADMIN' ? '#/admin' : nextSession.role === 'BROKER' ? '#/broker' : '#/';
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
    const href = session.role === 'ADMIN' ? '#/admin' : session.role === 'BROKER' ? '#/broker' : '#/';
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
        <section className="relative z-10 w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 gap-gutter rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] bg-on-primary overflow-hidden border border-surface-variant">
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

          <aside className="p-stack-lg bg-surface-container-low flex flex-col justify-center border-l border-surface-variant relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-multiply z-0" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCYSSyh_-xMegKv5s-Vnp3lGXz1K52ud1fMRkUEG4SrW0mnakQp6i8otFfgmvdbd-vbfF0DBryF9ilCqPvjtktncGnFfEcriqhh8zhtrxWnVWm5mrkQuRQU0-xKdqR6ZjuXfnPJ5Dy0NhhNijX4SZuOs9EBgG6XJKlp5mQ5xvxLvwCJzGLvKCq-w-LjxygPx9yNHRtcFjykDWbK7-Hl4_gKEtb2BvyzC81zKjCnUrof9iTHhvL-5eoKz2Fse2ejjxyxYzPP_YHCPiM')" }}></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-stack-lg">
                <h2 className="font-headline-lg text-headline-lg text-trust-navy mb-stack-sm">Tài khoản theo vai trò</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Môi giới dùng tài khoản do admin cấp. Người dùng thường không thấy chức năng đăng tin.</p>
              </div>
              <div className="flex-grow flex flex-col justify-center space-y-stack-md">
                <button className="w-full bg-on-primary text-trust-navy border border-trust-navy font-label-bold text-label-bold py-3 rounded hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2" type="button" onClick={() => setValues(DEMO_ACCOUNTS.broker)}>
                  <MaterialIcon>badge</MaterialIcon>
                  Dùng tài khoản môi giới mẫu
                </button>
                <button className="w-full bg-on-primary text-trust-navy border border-trust-navy font-label-bold text-label-bold py-3 rounded hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2" type="button" onClick={() => setValues(DEMO_ACCOUNTS.admin)}>
                  <MaterialIcon>admin_panel_settings</MaterialIcon>
                  Dùng tài khoản admin mẫu
                </button>
              </div>
              <div className="mt-stack-lg pt-stack-md border-t border-outline-variant/30 flex items-start gap-3 bg-surface p-4 rounded shadow-sm">
                <MaterialIcon filled className="text-action-orange">info</MaterialIcon>
                <div>
                  <span className="block font-label-bold text-label-bold text-on-surface mb-1">Mật khẩu mẫu</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">Cả hai tài khoản demo dùng mật khẩu: password.</p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
