import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart, HorizontalBarChart } from '../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatusBadge } from '../components/DashboardWidgets.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import Icon from '../components/ui/Icon.jsx';
import LoginPage from './LoginPage.jsx';
import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  updateAdminPropertyStatus,
  updateUserStatus,
} from '../services/api.js';

const CHART_COLORS = {
  accent: '#16A34A',   // --color-accent
  warning: '#D97706',  // --color-warning
  brand: '#2563EB',    // brand blue
  success: '#22C55E',  // green
  orange: '#F97316',   // orange
};

const ADMIN_SIDEBAR_ITEMS = [
  { href: '#/admin/overview', icon: 'BarChart3', label: 'Tổng quan' },
  { href: '#/admin/users', icon: 'Users', label: 'Tài khoản users' },
  { href: '#/admin/brokers', icon: 'IdCard', label: 'Môi giới' },
  { href: '#/admin/properties', icon: 'Building', label: 'Bài đăng' },
];

const EMPTY_BROKER = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
};

const ALL = 'all';

export default function AdminDashboard({ session, onLogin, onLogout, currentPath = '/admin/overview', section = 'overview' }) {
  const [users, setUsers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [brokerForm, setBrokerForm] = useState(EMPTY_BROKER);
  const [userQuery, setUserQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState(ALL);
  const [brokerQuery, setBrokerQuery] = useState('');
  const [brokerStatusFilter, setBrokerStatusFilter] = useState(ALL);
  const [propertyQuery, setPropertyQuery] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState(ALL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token || session.role !== 'ADMIN') return;
    let alive = true;
    setLoading(true);
    setError('');
    loadAdminData(session)
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

  const stats = useMemo(() => {
    const visiblePosts = properties.filter(isAvailableProperty).length;
    const pendingPosts = properties.filter(isPendingProperty).length;
    return {
      totalAccounts: users.length,
      users: users.filter((user) => user.role === 'USER').length,
      brokers: brokers.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      posts: properties.length,
      visiblePosts,
      pendingPosts,
      locked: users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length,
    };
  }, [users, brokers, properties]);

  const roleChart = useMemo(() => ([
    { label: 'Users', value: stats.users, color: CHART_COLORS.brand },
    { label: 'Môi giới', value: stats.brokers, color: CHART_COLORS.orange },
    { label: 'Admin', value: stats.admins, color: CHART_COLORS.success },
  ]), [stats]);
  const propertyCategoryChart = useMemo(() => chartBy(properties, (property) => categoryLabel(property.category)), [properties]);
  const propertyStatusChart = useMemo(() => chartBy(properties, (property) => property.statusLabel || property.rawStatus || 'Đang hiển thị'), [properties]);

  const customerUsers = useMemo(() => users.filter((user) => user.role === 'USER'), [users]);

  const filteredUsers = useMemo(() => customerUsers.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    const matchesQuery = !query || [user.email, user.username, user.fullName].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = userStatusFilter === ALL || user.status === userStatusFilter;
    return matchesQuery && matchesStatus;
  }), [customerUsers, userQuery, userStatusFilter]);

  const filteredBrokers = useMemo(() => brokers.filter((broker) => {
    const query = brokerQuery.trim().toLowerCase();
    const matchesQuery = !query || [broker.email, broker.username, broker.fullName, broker.phone].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = brokerStatusFilter === ALL || broker.status === brokerStatusFilter;
    return matchesQuery && matchesStatus;
  }), [brokers, brokerQuery, brokerStatusFilter]);

  const filteredProperties = useMemo(() => properties.filter((property) => {
    const query = propertyQuery.trim().toLowerCase();
    const broker = property.broker || {};
    const matchesQuery = !query || [
      property.title,
      property.address,
      property.priceLabel,
      property.statusLabel,
      property.rawStatus,
      categoryLabel(property.category),
      broker.name,
      broker.email,
      broker.phone,
    ].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = propertyStatusFilter === ALL || property.rawStatus === propertyStatusFilter;
    return matchesQuery && matchesStatus;
  }), [properties, propertyQuery, propertyStatusFilter]);

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'ADMIN') {
    return (
      <div className="dashboard-shell">
        <AdminSidebar currentPath={currentPath} />
        <div className="dashboard-content">
          <div className="dashboard-main">
            <h1 className="dashboard-page-title">Không có quyền admin</h1>
            <p>Chỉ admin mới được cấp tài khoản môi giới và kiểm tra toàn bộ hệ thống.</p>
          </div>
        </div>
      </div>
    );
  }

  async function reload() {
    const data = await loadAdminData(session);
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

  async function changePropertyStatus(propertyId, status) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updateAdminPropertyStatus(session.token, propertyId, status);
      setNotice(status === 'HIDDEN' ? 'Đã gỡ bài đăng khỏi trang công khai.' : 'Đã cập nhật trạng thái bài đăng.');
      await reload();
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được trạng thái bài đăng.');
    } finally {
      setSaving(false);
    }
  }

  async function removeProperty(property) {
    if (property.rawStatus === 'HIDDEN') return;
    if (!window.confirm('Gỡ bài đăng này khỏi trang công khai?')) return;
    await changePropertyStatus(property.id, 'HIDDEN');
  }

  return (
    <div className="dashboard-shell">
      <AdminSidebar currentPath={currentPath} onLogout={onLogout} session={session} />
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <span className="dashboard-topbar-title">{adminTitle(section)}</span>
          <div className="dashboard-topbar-actions">
            {session && (
              <button className="btn btn-ghost btn-sm" onClick={onLogout} type="button">
                <Icon name="LogOut" size={16} className="icon-muted" />
                Đăng xuất
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-main">
          <h1 className="dashboard-page-title">{adminTitle(section)}</h1>

          {notice && <div className="alert dashboard-notice">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {section === 'overview' && (
            <>
              <div className="grid-4 dashboard-stats-row">
                <div className="stat-card">
                  <div className="stat-card-number">{stats.totalAccounts}</div>
                  <div className="stat-card-label">Tổng tài khoản</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-number">{stats.users}</div>
                  <div className="stat-card-label">Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-number">{stats.brokers}</div>
                  <div className="stat-card-label">Môi giới</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-number">{stats.posts}</div>
                  <div className="stat-card-label">Bài đăng</div>
                </div>
              </div>

              <div className="dashboard-charts-row">
                <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
                <BarChart title="Bài đăng theo danh mục" data={propertyCategoryChart} />
                <HorizontalBarChart title="Trạng thái bài đăng" data={propertyStatusChart} />
              </div>

              <div className="dashboard-panels-row">
                <DashboardPanel title="Bài đăng mới trong hệ thống" count={`${properties.slice(0, 5).length} tin gần đây`}>
                  <PropertyTable properties={properties.slice(0, 5)} loading={loading} compact />
                </DashboardPanel>
                <DashboardPanel title="Tình trạng hệ thống" count="Từ API hiện có">
                  <div className="dashboard-system-lines">
                    <SystemLine label="Users đang hoạt động" value={stats.users} icon="Users" />
                    <SystemLine label="Môi giới được cấp" value={stats.brokers} icon="IdCard" />
                    <SystemLine label="Bài đăng hiển thị" value={stats.visiblePosts} icon="Eye" />
                    <SystemLine label="Tài khoản bị khóa" value={stats.locked} icon="Lock" />
                  </div>
                </DashboardPanel>
              </div>
            </>
          )}

          {section === 'users' && (
            <DashboardPanel
              title="Tài khoản users"
              count={`${filteredUsers.length}/${customerUsers.length} user`}
              action={(
                <div className="dashboard-filter-row">
                  <input className="input" placeholder="Tìm email, tên..." value={userQuery} onChange={(event) => setUserQuery(event.target.value)} />
                  <select className="input" value={userStatusFilter} onChange={(event) => setUserStatusFilter(event.target.value)}>
                    <option value={ALL}>Tất cả trạng thái</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="LOCKED">Đã khóa</option>
                  </select>
                </div>
              )}
            >
              <UserTable users={filteredUsers} session={session} loading={loading} saving={saving} onToggleStatus={toggleStatus} />
            </DashboardPanel>
          )}

          {section === 'brokers' && (
            <div className="dashboard-profile-grid">
              <form className="card dashboard-form-card" onSubmit={saveBroker}>
                <h2 className="dashboard-section-title">Cấp tài khoản môi giới</h2>
                <p className="dashboard-section-subtitle">Admin tạo tài khoản và gửi thông tin đăng nhập cho broker bên ngoài hệ thống.</p>
                <FormField label="Username"><input className="input" value={brokerForm.username} onChange={(event) => setBrokerValue('username', event.target.value, setBrokerForm)} required minLength={3} /></FormField>
                <FormField label="Email"><input className="input" type="email" value={brokerForm.email} onChange={(event) => setBrokerValue('email', event.target.value, setBrokerForm)} required /></FormField>
                <FormField label="Mật khẩu"><input className="input" type="password" value={brokerForm.password} onChange={(event) => setBrokerValue('password', event.target.value, setBrokerForm)} required minLength={8} /></FormField>
                <FormField label="Họ tên"><input className="input" value={brokerForm.fullName} onChange={(event) => setBrokerValue('fullName', event.target.value, setBrokerForm)} required /></FormField>
                <FormField label="Số điện thoại"><input className="input" value={brokerForm.phone} onChange={(event) => setBrokerValue('phone', event.target.value, setBrokerForm)} required /></FormField>
                <button className="auth-btn" type="submit" disabled={saving}>
                  <Icon name="Plus" size={16} className="icon-inverse" />
                  Tạo môi giới
                </button>
              </form>

              <DashboardPanel
                title="Môi giới đang quản lý"
                count={`${filteredBrokers.length}/${brokers.length} hồ sơ`}
                action={(
                  <div className="dashboard-filter-row">
                    <input className="input" placeholder="Tìm tên, SĐT, email..." value={brokerQuery} onChange={(event) => setBrokerQuery(event.target.value)} />
                    <select className="input" value={brokerStatusFilter} onChange={(event) => setBrokerStatusFilter(event.target.value)}>
                      <option value={ALL}>Tất cả trạng thái</option>
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="LOCKED">Đã khóa</option>
                    </select>
                  </div>
                )}
              >
                <BrokerTable brokers={filteredBrokers} loading={loading} saving={saving} onToggleStatus={toggleStatus} />
              </DashboardPanel>
            </div>
          )}

          {section === 'properties' && (
            <DashboardPanel
              title="Bài đăng từ môi giới"
              count={`${filteredProperties.length}/${properties.length} tin đăng`}
              action={(
                <div className="dashboard-filter-row">
                  <input className="input" placeholder="Tìm tin, môi giới, SĐT..." value={propertyQuery} onChange={(event) => setPropertyQuery(event.target.value)} />
                  <select className="input" value={propertyStatusFilter} onChange={(event) => setPropertyStatusFilter(event.target.value)}>
                    <option value={ALL}>Tất cả trạng thái</option>
                    <option value="AVAILABLE">Đang hiển thị</option>
                    <option value="RENTED">Đã thuê</option>
                    <option value="SOLD">Đã bán</option>
                    <option value="HIDDEN">Đã gỡ / tạm ẩn</option>
                  </select>
                </div>
              )}
            >
              <PropertyTable
                properties={filteredProperties}
                loading={loading}
                saving={saving}
                onStatus={changePropertyStatus}
                onRemove={removeProperty}
              />
            </DashboardPanel>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminSidebar({ currentPath, onLogout, session }) {
  const activePath = currentPath.startsWith('/') ? `#${currentPath}` : currentPath;
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <a href="#/">
          <BrandLogo />
        </a>
      </div>
      <nav className="dashboard-sidebar-nav">
        {ADMIN_SIDEBAR_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-item ${activePath === item.href ? 'is-active' : ''}`}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </a>
        ))}
        <a href="#/" className="sidebar-item">
          <Icon name="Home" size={18} />
          Trang chủ
        </a>
      </nav>
      {session && (
        <div className="dashboard-sidebar-footer">
          <div className="dashboard-sidebar-user">
            <Icon name="User" size={16} className="icon-muted" />
            <span className="dashboard-sidebar-email">{session.email}</span>
          </div>
          <button className="sidebar-item dashboard-sidebar-logout" type="button" onClick={onLogout}>
            <Icon name="LogOut" size={16} />
            Đăng xuất
          </button>
        </div>
      )}
    </aside>
  );
}

function UserTable({ users, session, loading, saving, onToggleStatus }) {
  if (loading) return <LoadingRows rows={5} />;
  if (users.length === 0) return <StateBlock title="Không có user phù hợp" description="Thử đổi từ khóa hoặc bộ lọc trạng thái." />;
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Tài khoản</th>
            <th>Trạng thái</th>
            <th className="dashboard-table-right">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <div className="dashboard-table-name">{user.fullName || user.username || 'Chưa cập nhật'}</div>
                <div className="dashboard-table-sub">{user.email}</div>
              </td>
              <td><StatusBadge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>{userStatusLabel(user.status)}</StatusBadge></td>
              <td className="dashboard-table-right">
                <button className="btn btn-ghost btn-sm" onClick={() => onToggleStatus(user)} disabled={saving || user.id === session.userId}>
                  {user.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BrokerTable({ brokers, loading, saving, onToggleStatus }) {
  if (loading) return <LoadingRows rows={4} />;
  if (brokers.length === 0) return <StateBlock title="Không có môi giới phù hợp" description="Thử đổi từ khóa hoặc bộ lọc trạng thái." />;
  return (
    <div className="dashboard-broker-list">
      {brokers.map((broker) => (
        <div key={broker.id || broker.email} className="dashboard-broker-row">
          <div>
            <div className="dashboard-table-name">{broker.fullName || broker.username}</div>
            <div className="dashboard-table-sub">{broker.phone || 'Chưa có SĐT'} · {broker.email}</div>
          </div>
          <div className="dashboard-broker-actions">
            <StatusBadge tone={broker.status === 'ACTIVE' ? 'success' : 'danger'}>{userStatusLabel(broker.status)}</StatusBadge>
            <button className="btn btn-ghost btn-sm" onClick={() => onToggleStatus(broker)} disabled={saving} type="button">
              <Icon name={broker.status === 'ACTIVE' ? 'EyeOff' : 'Eye'} size={14} className="icon-muted" />
              {broker.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PropertyTable({ properties, loading, compact = false, saving = false, onStatus, onRemove }) {
  const hasActions = Boolean(!compact && onStatus && onRemove);
  if (loading) return <LoadingRows rows={5} />;
  if (properties.length === 0) return <StateBlock title="Không có bài đăng phù hợp" description="Thử đổi từ khóa hoặc bộ lọc trạng thái." />;
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Bài đăng</th>
            <th>Môi giới</th>
            {!compact && <th>Danh mục</th>}
            <th>Giá</th>
            <th>Trạng thái</th>
            {!compact && <th>Ngày tạo</th>}
            {hasActions && <th className="dashboard-table-right">Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id}>
              <td>
                <a className="dashboard-property-cell" href={`#/property/${property.id}`}>
                  <img className="dashboard-property-thumb" src={property.image} alt={property.title} />
                  <div>
                    <div className="dashboard-table-name">{property.title}</div>
                    <div className="dashboard-table-sub">{property.address}</div>
                  </div>
                </a>
              </td>
              <td>{property.broker?.name || 'Công Tín Land'}</td>
              {!compact && <td>{categoryLabel(property.category)}</td>}
              <td className="dashboard-table-name">{property.priceLabel}</td>
              <td><StatusBadge tone={propertyStatusTone(property)}>{property.statusLabel || property.rawStatus}</StatusBadge></td>
              {!compact && <td className="dashboard-table-sub">{formatDate(property.createdAt)}</td>}
              {hasActions && (
                <td className="dashboard-table-right">
                  <div className="dashboard-property-actions">
                    <select className="input" value={property.rawStatus} onChange={(event) => onStatus(property.id, event.target.value)} disabled={saving}>
                      <option value="AVAILABLE">Đang hiển thị</option>
                      <option value="RENTED">Đã thuê</option>
                      <option value="SOLD">Đã bán</option>
                      <option value="HIDDEN">Đã gỡ / tạm ẩn</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemove(property)} disabled={saving || property.rawStatus === 'HIDDEN'} aria-label="Gỡ bài đăng" type="button">
                      <Icon name="EyeOff" size={16} className="icon-muted" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SystemLine({ icon, label, value }) {
  return (
    <div className="dashboard-system-line">
      <span className="dashboard-system-line-label">
        <Icon name={icon} size={16} className="icon-accent" />
        {label}
      </span>
      <span className="dashboard-system-line-value">{value}</span>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="auth-field">
      <label className="auth-field-label">{label}</label>
      {children}
    </div>
  );
}

async function loadAdminData(session) {
  const [nextUsers, nextBrokers, nextProperties] = await Promise.all([
    fetchAdminUsers(session.token),
    fetchAdminBrokers(session.token),
    fetchAdminProperties(session.token),
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

function userStatusLabel(status) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa';
}

function setBrokerValue(name, value, setBrokerForm) {
  setBrokerForm((current) => ({ ...current, [name]: value }));
}

function chartBy(items, getLabel) {
  const counts = new Map();
  items.forEach((item) => {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  const result = [...counts.entries()].map(([label, value]) => ({ label, value }));
  return result.length > 0 ? result : [{ label: 'Chưa có dữ liệu', value: 0 }];
}

function categoryLabel(category) {
  if (category === 'tro') return 'Trọ';
  if (category === 'dat' || category === 'land') return 'Đất';
  if (category === 'nha' || category === 'house') return 'Nhà';
  if (category === 'apartment') return 'Căn hộ';
  return category || 'Khác';
}

function isAvailableProperty(property) {
  return property.rawStatus === 'AVAILABLE' || String(property.statusLabel || '').toLowerCase().includes('hiển thị');
}

function isPendingProperty(property) {
  const status = String(property.rawStatus || property.statusLabel || '').toLowerCase();
  return status.includes('pending') || status.includes('chờ') || status.includes('duyệt');
}

function propertyStatusTone(property) {
  if (isAvailableProperty(property)) return 'success';
  if (isPendingProperty(property)) return 'warning';
  if (property.rawStatus === 'SOLD' || property.rawStatus === 'RENTED') return 'info';
  return 'muted';
}

function formatDate(value) {
  if (!value) return 'Đang cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
