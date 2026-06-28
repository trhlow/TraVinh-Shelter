import { useEffect, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { fetchCurrentUser, updateCurrentProfile, uploadCurrentUserAvatar } from '../services/api.js';
import LoginPage from './LoginPage.jsx';

export default function UserProfilePage({ session, onLogin, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token) return;
    let alive = true;
    setLoading(true);
    setError('');
    fetchCurrentUser(session.token)
      .then((data) => {
        if (!alive) return;
        const nextProfile = { ...session, ...data };
        setProfile(nextProfile);
        setForm({ fullName: nextProfile.fullName || '', phone: nextProfile.phone || '' });
        setAvatarPreview(nextProfile.avatarUrl || '');
      })
      .catch(() => {
        if (!alive) return;
        setProfile(session);
        setForm({ fullName: session.fullName || '', phone: session.phone || '' });
        setAvatarPreview(session.avatarUrl || '');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  if (!session) return <LoginPage onLogin={onLogin} />;

  if (session.role === 'BROKER' || session.role === 'ADMIN') {
    return (
      <MainLayout session={session} onLogout={onLogout}>
        <main className="mx-auto flex w-full max-w-container-max flex-grow items-center px-margin-mobile py-[72px] md:px-margin-desktop">
          <section className="ui-panel w-full max-w-2xl p-stack-lg">
            <h1 className="font-headline-lg text-headline-lg text-trust-navy">Hồ sơ tài khoản</h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
              Tài khoản {session.role === 'ADMIN' ? 'admin' : 'môi giới'} đang có khu vực hồ sơ riêng trong dashboard.
            </p>
            <a className="ui-action mt-stack-md" href={session.role === 'ADMIN' ? '#/admin/overview' : '#/broker/profile'}>
              Mở dashboard
            </a>
          </section>
        </main>
      </MainLayout>
    );
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');
    try {
      let nextProfile = await updateCurrentProfile(session.token, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
      });
      if (avatarFile) {
        const avatarProfile = await uploadCurrentUserAvatar(session.token, avatarFile);
        nextProfile = { ...nextProfile, ...avatarProfile };
      }
      const nextSession = {
        ...session,
        fullName: nextProfile.fullName || form.fullName.trim(),
        phone: nextProfile.phone || form.phone.trim(),
        avatarUrl: nextProfile.avatarUrl || avatarPreview,
      };
      setProfile({ ...profile, ...nextSession, ...nextProfile });
      setAvatarFile(null);
      setAvatarPreview(nextSession.avatarUrl || '');
      onLogin(nextSession);
      setNotice('Đã cập nhật hồ sơ của bạn.');
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(objectUrlFor(file));
  }

  return (
    <MainLayout session={session} onLogout={onLogout}>
      <main className="w-full flex-grow bg-surface-container-low px-margin-mobile py-[64px] md:px-margin-desktop">
        <section className="mx-auto grid max-w-container-max grid-cols-1 gap-gutter lg:grid-cols-[360px_1fr]">
          <aside className="ui-panel h-fit p-5">
            <div className="flex flex-col items-center text-center">
              {avatarPreview ? (
                <img className="h-28 w-28 rounded-full border-2 border-primary object-cover" src={avatarPreview} alt="Ảnh đại diện user" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary-fixed text-primary">
                  <MaterialIcon className="text-4xl">person</MaterialIcon>
                </div>
              )}
              <h1 className="mt-5 font-headline-lg text-headline-lg text-on-surface">{profile?.fullName || session.fullName || 'Hồ sơ user'}</h1>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{profile?.email || session.email}</p>
              <span className="ui-badge mt-4 bg-primary-fixed text-primary">USER</span>
            </div>
          </aside>

          <form className="ui-panel p-5" onSubmit={saveProfile}>
            <div className="mb-stack-md border-b border-outline-variant pb-stack-md">
              <h2 className="font-headline-lg text-headline-lg text-trust-navy">Cập nhật hồ sơ</h2>
              <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Bạn có thể thay đổi thông tin cá nhân dùng cho tài khoản user.</p>
            </div>

            {notice && <div className="mb-stack-md border border-success-green/40 bg-success-green/10 p-3 font-body-sm text-body-sm text-on-surface">{notice}</div>}
            {error && <div className="mb-stack-md border border-error-container bg-error-container/50 p-3 font-body-sm text-body-sm text-on-error-container">{error}</div>}

            <div className="space-y-stack-md">
              <Field label="Ảnh đại diện">
                <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} />
              </Field>
              <Field label="Email">
                <input className="input" value={profile?.email || session.email || ''} readOnly />
              </Field>
              <Field label="Họ tên">
                <input className="input" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} disabled={loading} />
              </Field>
              <Field label="Số điện thoại">
                <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} disabled={loading} />
              </Field>
              <button className="ui-action w-full disabled:opacity-60" disabled={saving || loading}>
                <MaterialIcon className="text-sm">save</MaterialIcon>
                {saving ? 'Đang lưu' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </MainLayout>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-bold text-label-bold text-trust-navy">{label}</span>
      {children}
    </label>
  );
}

function objectUrlFor(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file);
  }
  return '';
}
