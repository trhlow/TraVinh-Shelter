import { useEffect, useState } from 'react';
import Icon from '../components/ui/Icon.jsx';
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
        <div className="auth-shell">
          <div className="auth-card">
            <h1 className="auth-title">Hồ sơ tài khoản</h1>
            <p className="auth-subtitle">
              Tài khoản {session.role === 'ADMIN' ? 'admin' : 'môi giới'} đang có khu vực hồ sơ riêng trong dashboard.
            </p>
            <a className="auth-btn" href={session.role === 'ADMIN' ? '#/admin/overview' : '#/broker/profile'}>
              Mở dashboard
            </a>
          </div>
        </div>
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
      <div className="profile-shell">
        <div className="profile-avatar-panel card">
          <div className="profile-avatar-wrap">
            {avatarPreview ? (
              <img className="profile-avatar-img" src={avatarPreview} alt="Ảnh đại diện user" />
            ) : (
              <div className="profile-avatar-placeholder">
                <Icon name="User" size={40} className="icon-muted" />
              </div>
            )}
            <p className="profile-display-name">{profile?.fullName || session.fullName || 'Hồ sơ user'}</p>
            <p className="profile-display-email">{profile?.email || session.email}</p>
            <span className="badge badge-neutral">USER</span>
          </div>
        </div>

        <form className="card profile-form-panel" onSubmit={saveProfile}>
          <h1 className="dashboard-page-title">Cập nhật hồ sơ</h1>
          <p className="profile-form-subtitle">Bạn có thể thay đổi thông tin cá nhân dùng cho tài khoản user.</p>

          {notice && <div className="alert profile-notice">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <ProfileField label="Ảnh đại diện">
            <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} />
          </ProfileField>
          <ProfileField label="Email">
            <input className="input" value={profile?.email || session.email || ''} readOnly />
          </ProfileField>
          <ProfileField label="Họ tên">
            <input
              className="input"
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
              disabled={loading}
            />
          </ProfileField>
          <ProfileField label="Số điện thoại">
            <input
              className="input"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              disabled={loading}
            />
          </ProfileField>

          <button className="auth-btn" type="submit" disabled={saving || loading}>
            <Icon name="Check" size={16} className="icon-inverse" />
            {saving ? 'Đang lưu' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
}

function ProfileField({ label, children }) {
  return (
    <div className="auth-field">
      <label className="auth-field-label">{label}</label>
      {children}
    </div>
  );
}

function objectUrlFor(file) {
  if (typeof URL !== 'undefined' && URL.createObjectURL && file) {
    return URL.createObjectURL(file);
  }
  return '';
}
