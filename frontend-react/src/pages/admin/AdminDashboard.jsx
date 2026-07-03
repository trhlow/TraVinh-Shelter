import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../../components/BrandLogo.jsx';
import Icon from '../../components/ui/Icon.jsx';
import NotificationBell from '../../components/dashboard/NotificationBell.jsx';
import { buildAdminNotifications } from '../../utils/adminNotifications.js';
import LoginPage from '../LoginPage.jsx';
import OverviewSection from './OverviewSection.jsx';
import BrokersSection from './BrokersSection.jsx';
import AccountsSection from './AccountsSection.jsx';
import PropertiesSection from './PropertiesSection.jsx';
import ViewingsSection from './ViewingsSection.jsx';
import AuditLogSection from './AuditLogSection.jsx';
import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  fetchAdminViewings,
  updateAdminPropertyStatus,
  updateUserStatus,
} from '../../services/api.js';

const ADMIN_SIDEBAR_ITEMS = [
  { href: '#/admin/overview', icon: 'BarChart3', label: 'Tổng quan' },
  { href: '#/admin/brokers', icon: 'IdCard', label: 'Môi giới' },
  { href: '#/admin/accounts', icon: 'Users', label: 'Tài khoản' },
  { href: '#/admin/properties', icon: 'Building', label: 'Bài đăng' },
  { href: '#/admin/viewings', icon: 'Calendar', label: 'Lịch hẹn xem' },
  { href: '#/admin/audit', icon: 'ScrollText', label: 'Nhật ký' },
];

const SECTION_COMPONENTS = {
  overview: OverviewSection,
  brokers: BrokersSection,
  accounts: AccountsSection,
  properties: PropertiesSection,
  viewings: ViewingsSection,
  audit: AuditLogSection,
};

// Mock fetchers return flat arrays; the real API returns PagedResponse — flatten both.
function toArray(result) {
  if (Array.isArray(result)) return result;
  return result?.content ?? [];
}

export default function AdminDashboard({ session, onLogin, onLogout, currentPath = '/admin/overview', section = 'overview', queryParams = {} }) {
  const [users, setUsers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token || session.role !== 'ADMIN') return undefined;
    let alive = true;
    setLoading(true);
    setError('');
    loadAll(session.token)
      .then((data) => { if (alive) applyData(data); })
      .catch((exception) => { if (alive) setError(exception.message || 'Không tải được dashboard admin.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session]);

  function applyData({ nextUsers, nextBrokers, nextProperties, nextViewings }) {
    setUsers(nextUsers);
    setBrokers(nextBrokers);
    setProperties(nextProperties);
    setViewings(nextViewings);
  }

  async function reload() {
    applyData(await loadAll(session.token));
  }

  async function runAction(work, successMessage) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await work();
      setNotice(successMessage);
      await reload();
    } catch (exception) {
      setError(exception.message || 'Thao tác thất bại.');
    } finally {
      setSaving(false);
    }
  }

  const actions = {
    reload,
    toggleUserStatus: (user) => runAction(
      () => updateUserStatus(session.token, user.id, user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'),
      'Đã cập nhật trạng thái tài khoản.',
    ),
    changePropertyStatus: (propertyId, status) => runAction(
      () => updateAdminPropertyStatus(session.token, propertyId, status),
      status === 'HIDDEN' ? 'Đã gỡ bài đăng khỏi trang công khai.' : 'Đã cập nhật trạng thái bài đăng.',
    ),
    createBrokerAccount: (payload) => runAction(
      () => createBroker(session.token, payload),
      'Đã cấp tài khoản môi giới.',
    ),
  };

  const notifications = useMemo(
    () => buildAdminNotifications({ properties, viewings, users }),
    [properties, viewings, users],
  );

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'ADMIN') {
    return (
      <div className="dashboard-shell admin-theme">
        <AdminSidebar currentPath={currentPath} onLogout={onLogout} session={session} />
        <div className="dashboard-content">
          <div className="dashboard-main">
            <h1 className="dashboard-page-title">Không có quyền admin</h1>
            <p>Chỉ admin mới được cấp tài khoản môi giới và kiểm tra toàn bộ hệ thống.</p>
          </div>
        </div>
      </div>
    );
  }

  const Section = SECTION_COMPONENTS[section] || OverviewSection;

  return (
    <div className="dashboard-shell admin-theme">
      <AdminSidebar currentPath={currentPath} onLogout={onLogout} session={session} />
      <div className="dashboard-content">
        <div className="dashboard-topbar">
          <span className="dashboard-topbar-title">{adminTitle(section)}</span>
          <div className="admin-topbar-actions">
            <NotificationBell notifications={notifications} />
          </div>
        </div>
        <div className="dashboard-main">
          <h1 className="dashboard-page-title">{adminTitle(section)}</h1>
          {notice && <div className="alert dashboard-notice">{notice}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <Section
            session={session}
            data={{ users, brokers, properties, viewings }}
            loading={loading}
            saving={saving}
            actions={actions}
            queryParams={queryParams}
          />
        </div>
      </div>
    </div>
  );
}

function AdminSidebar({ currentPath, onLogout, session }) {
  const pathname = currentPath.split('?')[0];
  const activePath = pathname.startsWith('/') ? `#${pathname}` : pathname;
  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar-header">
        <a href="#/"><BrandLogo /></a>
      </div>
      <nav className="dashboard-sidebar-nav">
        {ADMIN_SIDEBAR_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`sidebar-item ${activePath === item.href || (item.href === '#/admin/overview' && activePath === '#/admin') ? 'is-active' : ''}`}
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

async function loadAll(token) {
  const [nextUsers, nextBrokers, nextProperties, nextViewings] = await Promise.all([
    fetchAdminUsers(token, { size: 1000 }),
    fetchAdminBrokers(token, { size: 1000 }),
    fetchAdminProperties(token, { size: 1000 }),
    fetchAdminViewings(token, { size: 1000 }),
  ]);
  return {
    nextUsers: toArray(nextUsers),
    nextBrokers: toArray(nextBrokers),
    nextProperties: toArray(nextProperties),
    nextViewings: toArray(nextViewings),
  };
}

function adminTitle(section) {
  return {
    overview: 'Tổng quan',
    brokers: 'Môi giới',
    accounts: 'Tài khoản',
    properties: 'Bài đăng',
    viewings: 'Lịch hẹn xem',
    audit: 'Nhật ký hoạt động',
  }[section] || 'Tổng quan';
}
