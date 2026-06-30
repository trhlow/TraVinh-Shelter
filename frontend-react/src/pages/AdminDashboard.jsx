import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart, GaugeChart, HorizontalBarChart } from '../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../components/DashboardWidgets.jsx';
import ViewingsPanel from '../components/dashboard/ViewingsPanel.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { wardLabel, categoryLabel } from '../data/locations.js';
import Icon from '../components/ui/Icon.jsx';
import LoginPage from './LoginPage.jsx';
import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  updateAdminPropertyStatus,
  updateUserStatus,
  fetchAdminViewings,
} from '../services/api.js';

const CHART_COLORS = {
  accent: '#ff385c',   // --color-primary
  warning: '#D97706',  // --color-warning
  brand: '#2563EB',    // brand blue
  success: '#22C55E',  // green
  orange: '#F97316',   // orange
};

const ADMIN_SIDEBAR_ITEMS = [
  { href: '#/admin/overview', icon: 'BarChart3', label: 'Tổng quan' },
  { href: '#/admin/brokers', icon: 'IdCard', label: 'Môi giới' },
  { href: '#/admin/properties', icon: 'Building', label: 'Bài đăng' },
  { href: '#/admin/viewings', icon: 'Calendar', label: 'Lịch hẹn xem' },
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
  const [brokerQuery, setBrokerQuery] = useState('');
  const [brokerStatusFilter, setBrokerStatusFilter] = useState(ALL);
  const [propertyQuery, setPropertyQuery] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState(ALL);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [viewings, setViewings] = useState([]);
  const [viewingsLoading, setViewingsLoading] = useState(false);

  useEffect(() => {
    if (!session?.token || session.role !== 'ADMIN' || section !== 'viewings') return;
    let alive = true;
    setViewingsLoading(true);
    fetchAdminViewings(session.token)
      .then((items) => { if (alive) setViewings(Array.isArray(items) ? items : []); })
      .catch(() => { if (alive) setViewings([]); })
      .finally(() => { if (alive) setViewingsLoading(false); });
    return () => { alive = false; };
  }, [session, section]);

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
    // `users` (GET /admin/users = findAll) is the full account registry; `brokers`
    // (findByRole BROKER) is a subset — never add them. The USER actor was removed in
    // Pass 3, so count only active account roles (ADMIN + BROKER); leftover USER seed
    // rows are not active accounts and stay out of the total to match the role donut.
    return {
      totalAccounts: users.filter((user) => user.role === 'ADMIN' || user.role === 'BROKER').length,
      brokers: brokers.length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
      posts: properties.length,
      visiblePosts,
      pendingPosts,
      locked: users.filter((u) => u.status === 'LOCKED' || u.status === 'BLOCKED').length,
    };
  }, [users, brokers, properties]);

  const roleChart = useMemo(() => ([
    { label: 'Môi giới', value: stats.brokers, color: CHART_COLORS.orange },
    { label: 'Admin', value: stats.admins, color: CHART_COLORS.success },
  ]), [stats]);
  const propertyCategoryChart = useMemo(() => chartBy(properties, (property) => categoryLabel(property.category)), [properties]);
  const propertyStatusChart = useMemo(() => chartBy(properties, (property) => property.statusLabel || property.rawStatus || 'Đang hiển thị'), [properties]);

  const topBrokersChart = useMemo(() => {
    const counts = new Map();
    properties.forEach((property) => {
      const name = property.broker?.name || 'Khác';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const sorted = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    return sorted.length > 0 ? sorted : [{ label: 'Chưa có dữ liệu', value: 0 }];
  }, [properties]);

  const regionData = useMemo(() => {
    const counts = new Map();
    properties.forEach((property) => {
      const label = wardLabel(property.ward);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const total = properties.length || 1;
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }, [properties]);

  const visiblePercent = stats.posts > 0 ? Math.round((stats.visiblePosts / stats.posts) * 100) : 0;

  // Recent-posts feed: newest 5 by createdAt — a curated stream, not the full count.
  const recentProperties = useMemo(() => (
    [...properties]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  ), [properties]);

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
        </div>

        <div className="dashboard-main">
          <h1 className="dashboard-page-title">{adminTitle(section)}</h1>

          {notice && <div className="alert dashboard-notice">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          {section === 'overview' && (
            <>
              <div className="grid-4 dashboard-stats-row">
                <StatCard icon="Users" title="Tổng tài khoản" value={stats.totalAccounts} tone="navy" trend={{ value: '+8%', direction: 'up' }} />
                <StatCard icon="IdCard" title="Môi giới" value={stats.brokers} tone="orange" trend={{ value: '+5%', direction: 'up' }} />
                <StatCard icon="ShieldCheck" title="Admin" value={stats.admins} tone="green" trend={{ value: '0%', direction: 'up' }} />
                <StatCard icon="Building" title="Bài đăng" value={stats.posts} tone="navy" trend={{ value: '+15%', direction: 'up' }} />
              </div>

              <div className="dashboard-charts-row">
                <GaugeChart title="Tỷ lệ bài đăng hiển thị" value={visiblePercent} max={100} label="Đang hiển thị" />
                <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
                <DonutChart title="Top môi giới theo tin đăng" data={topBrokersChart} centerLabel="môi giới" />
              </div>

              <div className="dashboard-panels-row">
                <DashboardPanel title="BĐS theo khu vực Trà Vinh" count={`${regionData.length} khu vực`}>
                  {regionData.length === 0 ? (
                    <StateBlock icon="MapPin" title="Chưa có dữ liệu khu vực" description="Khi có bài đăng, phân bố theo khu vực sẽ hiển thị tại đây." />
                  ) : (
                    <div className="region-list">
                      {regionData.map((region) => (
                        <div className="region-row" key={region.name}>
                          <div className="region-meta">
                            <span className="region-name">{region.name}</span>
                            <span className="region-count">{region.count} tin · {region.pct}%</span>
                          </div>
                          <div className="region-bar">
                            <div className="region-fill" style={{ width: `${region.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardPanel>

                <DashboardPanel title="Bài đăng mới trong hệ thống" count={`${recentProperties.length} tin mới nhất`}>
                  <PropertyTable properties={recentProperties} loading={loading} compact />
                </DashboardPanel>

                <DashboardPanel title="Tình trạng hệ thống" count="Từ API hiện có">
                  <div className="dashboard-system-lines">
                    <SystemLine label="Môi giới được cấp" value={stats.brokers} icon="IdCard" />
                    <SystemLine label="Admin trong hệ thống" value={stats.admins} icon="ShieldCheck" />
                    <SystemLine label="Bài đăng hiển thị" value={stats.visiblePosts} icon="Eye" />
                    <SystemLine label="Tài khoản bị khóa" value={stats.locked} icon="Lock" />
                  </div>
                </DashboardPanel>
              </div>
            </>
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

          {section === 'viewings' && (
            <DashboardPanel title="Lịch hẹn xem" count={viewingsLoading ? 'Đang tải' : `${viewings.length} yêu cầu`}>
              <ViewingsPanel viewings={viewings} loading={viewingsLoading} />
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
    brokers: 'Môi giới',
    properties: 'Bài đăng',
    viewings: 'Lịch hẹn xem',
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
