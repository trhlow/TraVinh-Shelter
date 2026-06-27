import { useEffect, useMemo, useState } from 'react';
import MaterialIcon from '../components/MaterialIcon.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import LoginPage from './LoginPage.jsx';
import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  updateUserStatus,
} from '../services/api.js';

const EMPTY_BROKER = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
};

export default function AdminDashboard({ session, onLogin, onLogout, currentPath = '/admin/overview', section = 'overview' }) {
  const [users, setUsers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [brokerForm, setBrokerForm] = useState(EMPTY_BROKER);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token || session.role !== 'ADMIN') return;
    let alive = true;
    setLoading(true);
    loadAdminData(session.token)
      .then(({ nextUsers, nextBrokers, nextProperties }) => {
        if (!alive) return;
        setUsers(nextUsers);
        setBrokers(nextBrokers);
        setProperties(nextProperties);
      })
      .catch((exception) => {
        if (alive) setError(exception.message || 'Không tải được dashboard admin.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [session]);

  const stats = useMemo(() => ({
    users: users.filter((user) => user.role === 'USER').length,
    brokers: brokers.length,
    posts: properties.length,
    locked: users.filter((user) => user.status === 'LOCKED').length,
  }), [users, brokers, properties]);

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'ADMIN') {
    return (
      <AdminLayout session={session} onLogout={onLogout} variant="admin" activePath={currentPath}>
        <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto">
          <section className="bg-white rounded-xl border border-outline-variant p-stack-lg">
            <h1 className="font-headline-lg text-headline-lg text-trust-navy mb-2">Không có quyền admin</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Chỉ admin mới được cấp tài khoản môi giới và kiểm tra toàn bộ hệ thống.</p>
          </section>
        </main>
      </AdminLayout>
    );
  }

  async function reload() {
    const data = await loadAdminData(session.token);
    setUsers(data.nextUsers);
    setBrokers(data.nextBrokers);
    setProperties(data.nextProperties);
  }

  async function saveBroker(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await createBroker(session.token, brokerForm);
      setBrokerForm(EMPTY_BROKER);
      setNotice('Đã cấp tài khoản môi giới.');
      await reload();
    } catch (exception) {
      setError(exception.message || 'Không tạo được tài khoản môi giới.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateUserStatus(session.token, user.id, user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE');
      setNotice('Đã cập nhật trạng thái tài khoản.');
      await reload();
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được tài khoản.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout session={session} onLogout={onLogout} variant="admin" activePath={currentPath}>
      <main className="flex-1 md:ml-64 p-margin-mobile md:p-margin-desktop w-full max-w-container-max mx-auto">
        <header className="mb-stack-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-headline-xl-mobile md:text-headline-xl text-trust-navy">{adminTitle(section)}</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">{adminSubtitle(section)}</p>
          </div>
          <span className="bg-primary-fixed text-trust-navy font-label-bold text-label-bold px-4 py-2 rounded">{loading ? 'Đang đồng bộ' : 'Dữ liệu mới nhất'}</span>
        </header>

        {notice && <div className="mb-stack-md rounded border border-success-green/40 bg-success-green/10 text-trust-navy p-3 font-body-sm text-body-sm">{notice}</div>}
        {error && <div className="mb-stack-md rounded border border-error-container bg-error-container/50 text-on-error-container p-3 font-body-sm text-body-sm">{error}</div>}

        {section === 'overview' && (
          <>
            <section className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-lg">
              <StatCard icon="group" label="Users" value={stats.users} />
              <StatCard icon="badge" label="Môi giới" value={stats.brokers} />
              <StatCard icon="description" label="Bài đăng" value={stats.posts} />
              <StatCard icon="lock" label="Bị khóa" value={stats.locked} />
            </section>
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
              <OverviewLink icon="group" title="Tài khoản users" value={`${users.length} tài khoản`} href="#/admin/users" />
              <OverviewLink icon="badge" title="Môi giới" value={`${brokers.length} môi giới`} href="#/admin/brokers" />
              <OverviewLink icon="description" title="Bài đăng" value={`${properties.length} bài đăng`} href="#/admin/properties" />
            </section>
          </>
        )}

        {section === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
            <TableHeader title="Tài khoản users và môi giới" count={users.length} />
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead className="bg-surface-container-low text-trust-navy">
                  <tr>
                    <th className="px-4 py-3 font-label-bold">Email</th>
                    <th className="px-4 py-3 font-label-bold">Vai trò</th>
                    <th className="px-4 py-3 font-label-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-label-bold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-low">
                      <td className="px-4 py-3">
                        <div className="font-label-bold text-label-bold text-on-surface">{user.fullName || user.username}</div>
                        <div className="text-on-surface-variant">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">{roleLabel(user.role)}</td>
                      <td className="px-4 py-3">{statusLabel(user.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <button className="border border-outline px-3 py-2 rounded text-trust-navy hover:bg-surface-container-low disabled:opacity-60" onClick={() => toggleStatus(user)} disabled={saving || user.id === session.userId}>
                          {user.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {section === 'brokers' && (
          <section className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-gutter">
            <form className="bg-white rounded-xl shadow-sm border border-surface-variant p-6 h-fit" onSubmit={saveBroker}>
              <h2 className="font-headline-md text-headline-md text-trust-navy mb-2">Cấp tài khoản môi giới</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-stack-md">Broker không tự đăng ký. Admin tạo tài khoản và gửi thông tin đăng nhập bên ngoài hệ thống.</p>
              <div className="space-y-stack-md">
                <Field label="Username"><input className="input" value={brokerForm.username} onChange={(event) => setBrokerValue('username', event.target.value, setBrokerForm)} required minLength={3} /></Field>
                <Field label="Email"><input className="input" type="email" value={brokerForm.email} onChange={(event) => setBrokerValue('email', event.target.value, setBrokerForm)} required /></Field>
                <Field label="Mật khẩu"><input className="input" type="password" value={brokerForm.password} onChange={(event) => setBrokerValue('password', event.target.value, setBrokerForm)} required minLength={8} /></Field>
                <Field label="Họ tên"><input className="input" value={brokerForm.fullName} onChange={(event) => setBrokerValue('fullName', event.target.value, setBrokerForm)} required /></Field>
                <Field label="Số điện thoại"><input className="input" value={brokerForm.phone} onChange={(event) => setBrokerValue('phone', event.target.value, setBrokerForm)} required /></Field>
                <button className="w-full bg-trust-navy text-on-primary font-label-bold text-label-bold py-2 rounded hover:bg-primary-container transition-colors disabled:opacity-60" disabled={saving}>
                  Tạo môi giới
                </button>
              </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
              <TableHeader title="Môi giới đang quản lý" count={brokers.length} />
              <div className="divide-y divide-surface-variant">
                {brokers.map((broker) => (
                  <div key={broker.id} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-container-low">
                    <div>
                      <div className="font-label-bold text-label-bold text-trust-navy">{broker.fullName}</div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant">{broker.phone} · {broker.email}</div>
                    </div>
                    <span className="font-label-bold text-label-bold text-on-surface-variant">{statusLabel(broker.status)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {section === 'properties' && (
          <div className="bg-white rounded-xl shadow-sm border border-surface-variant overflow-hidden">
            <TableHeader title="Bài đăng trong hệ thống" count={properties.length} />
            <div className="divide-y divide-surface-variant">
              {properties.map((property) => (
                <a key={property.id} className="p-4 flex items-center gap-4 hover:bg-surface-container-low" href={`#/property/${property.id}`}>
                  <img className="w-20 h-16 rounded object-cover shrink-0" src={property.image} alt={property.title} />
                  <div className="min-w-0 flex-1">
                    <div className="font-label-bold text-label-bold text-trust-navy truncate">{property.title}</div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant truncate">{property.broker?.name} · {property.priceLabel}</div>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{property.statusLabel}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

async function loadAdminData(token) {
  const [nextUsers, nextBrokers, nextProperties] = await Promise.all([
    fetchAdminUsers(token),
    fetchAdminBrokers(token),
    fetchAdminProperties(token),
  ]);
  return { nextUsers, nextBrokers, nextProperties };
}

function adminTitle(section) {
  return {
    overview: 'Tổng quan',
    users: 'Tài khoản users',
    brokers: 'Môi giới',
    properties: 'Bài đăng',
  }[section] || 'Tổng quan';
}

function adminSubtitle(section) {
  return {
    overview: 'Theo dõi nhanh users, môi giới, bài đăng và tài khoản bị khóa.',
    users: 'Quản lý trạng thái tài khoản người dùng, môi giới và admin.',
    brokers: 'Cấp tài khoản môi giới và theo dõi danh sách môi giới đang hoạt động.',
    properties: 'Kiểm tra các bài đăng đang có trong hệ thống.',
  }[section] || 'Theo dõi nhanh hệ thống.';
}

function OverviewLink({ icon, title, value, href }) {
  return (
    <a className="bg-white p-6 rounded-xl shadow-sm border border-surface-variant flex items-center justify-between hover:bg-surface-container-low transition-colors" href={href}>
      <div>
        <p className="font-headline-md text-headline-md text-trust-navy mb-1">{title}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-primary bg-primary-fixed">
        <MaterialIcon filled>{icon}</MaterialIcon>
      </div>
    </a>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-label-bold text-label-bold block mb-2 text-trust-navy">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-surface-variant flex items-center justify-between">
      <div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-1">{label}</p>
        <p className="font-headline-lg text-headline-lg text-trust-navy">{value}</p>
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center text-primary bg-primary-fixed">
        <MaterialIcon filled>{icon}</MaterialIcon>
      </div>
    </div>
  );
}

function TableHeader({ title, count }) {
  return (
    <div className="px-6 py-4 border-b border-surface-variant flex justify-between items-center bg-surface-bright">
      <h3 className="font-headline-md text-headline-md text-trust-navy">{title}</h3>
      <span className="font-body-sm text-body-sm text-on-surface-variant">{count}</span>
    </div>
  );
}

function roleLabel(role) {
  return { USER: 'User', BROKER: 'Môi giới', ADMIN: 'Admin' }[role] || role;
}

function statusLabel(status) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa';
}

function setBrokerValue(name, value, setBrokerForm) {
  setBrokerForm((current) => ({ ...current, [name]: value }));
}
