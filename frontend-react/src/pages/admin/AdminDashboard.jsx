import { useEffect, useMemo, useState } from 'react';
import BrandLogo from '../../components/BrandLogo.jsx';
import Icon from '../../components/ui/Icon.jsx';
import NotificationBell from '../../components/dashboard/NotificationBell.jsx';
import { buildAdminNotifications } from '../../utils/adminNotifications.js';
import LoginPage from '../LoginPage.jsx';
import OverviewSection from './OverviewSection.jsx';
import BrokersSection from './BrokersSection.jsx';
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
  updateViewingStatus,
} from '../../services/api.js';

const ADMIN_SIDEBAR_ITEMS = [
  { href: '#/admin/overview', icon: 'BarChart3', label: 'Tổng quan' },
  { href: '#/admin/brokers', icon: 'IdCard', label: 'Quản lý môi giới' },
  { href: '#/admin/properties', icon: 'Building', label: 'Duyệt tin đăng' },
  { href: '#/admin/viewings', icon: 'Calendar', label: 'Giao dịch' },
  { href: '#/admin/reports', icon: 'BarChart3', label: 'Báo cáo & Thống kê' },
  { href: '#/admin/rbac', icon: 'ShieldCheck', label: 'Phân quyền (RBAC)' },
  { href: '#/admin/settings', icon: 'Settings', label: 'Cài đặt hệ thống' },
  { href: '#/admin/audit', icon: 'ScrollText', label: 'Nhật ký' },
];

const SECTION_COMPONENTS = {
  overview: OverviewSection,
  brokers: BrokersSection,
  properties: PropertiesSection,
  viewings: ViewingsSection,
  reports: OverviewSection,
  rbac: OverviewSection,
  settings: OverviewSection,
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
  const [quickSearch, setQuickSearch] = useState('');

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
      return true;
    } catch (exception) {
      setError(exception.message || 'Thao tác thất bại.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const actions = {
    reload,
    toggleUserStatus: (user) => runAction(
      () => updateUserStatus(session.token, user.id, user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE', user.fullName || user.username),
      'Đã cập nhật trạng thái tài khoản.',
    ),
    changePropertyStatus: (propertyId, status) => runAction(
      () => updateAdminPropertyStatus(session.token, propertyId, status, properties.find((property) => property.id === propertyId)?.title),
      status === 'HIDDEN' ? 'Đã gỡ bài đăng khỏi trang công khai.' : 'Đã cập nhật trạng thái bài đăng.',
    ),
    createBrokerAccount: (payload) => runAction(
      () => createBroker(session.token, payload),
      'Đã cấp tài khoản môi giới.',
    ),
    changeViewingStatus: (viewingId, status) => runAction(
      () => updateViewingStatus(session.token, viewingId, status, viewings.find((viewing) => viewing.id === viewingId)?.visitorName),
      'Đã cập nhật lịch hẹn.',
    ),
  };

  const notifications = useMemo(
    () => buildAdminNotifications({ properties, viewings, users }),
    [properties, viewings, users],
  );
  const dashboardMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { month: 'numeric', year: 'numeric' }).format(new Date()),
    [],
  );

  function handleQuickSearch(event) {
    event.preventDefault();
    const query = quickSearch.trim();
    if (!query) return;
    window.location.hash = `#/admin/properties?search=${encodeURIComponent(query)}`;
  }

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
          <form className="dashboard-topbar-search" onSubmit={handleQuickSearch}>
            <Icon name="Search" size={16} className="icon-muted" />
            <input
              className="dashboard-topbar-search-input"
              type="search"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Tìm kiếm toàn hệ thống..."
              aria-label="Tìm kiếm toàn hệ thống"
            />
          </form>
          <div className="dashboard-topbar-actions admin-topbar-actions">
            <NotificationBell notifications={notifications} />
            <div className="dashboard-user-chip">
              <span className="dashboard-user-avatar">{initialsFor(session.email)}</span>
              <span className="dashboard-user-name">Admin</span>
            </div>
          </div>
        </div>
        <div className="dashboard-main">
          <div className="dashboard-title-row">
            <div>
              <h1 className="dashboard-page-title">{adminTitle(section)}</h1>
              <p className="dashboard-page-subtitle">{adminSubtitle(section, dashboardMonthLabel)}</p>
            </div>
            {section === 'overview' && (
              <div className="dashboard-period-chip">
                <Icon name="Calendar" size={16} />
                Tháng {dashboardMonthLabel}
                <Icon name="ChevronDown" size={15} className="icon-muted" />
              </div>
            )}
          </div>
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
    brokers: 'Quản lý môi giới',
    properties: 'Duyệt tin đăng',
    viewings: 'Giao dịch',
    reports: 'Báo cáo & Thống kê',
    rbac: 'Phân quyền RBAC',
    settings: 'Cài đặt hệ thống',
    audit: 'Nhật ký hoạt động',
  }[section] || 'Tổng quan';
}

function adminSubtitle(section, monthLabel) {
  return {
    overview: `Toàn cảnh hoạt động nền tảng TraVinh Shelter trong tháng ${monthLabel}.`,
    brokers: 'Quản lý đội ngũ môi giới và cấp quyền làm việc.',
    properties: 'Duyệt, ẩn hoặc khôi phục tin đăng trong hệ thống.',
    viewings: 'Kiểm tra giao dịch/lịch hẹn xem bất động sản từ khách hàng.',
    reports: 'Theo dõi KPI, biểu đồ 3D và hiệu suất vận hành.',
    rbac: 'Kiểm tra ma trận quyền theo vai trò thực tế của hệ thống.',
    settings: 'Các cấu hình hệ thống đang được gom trong màn tổng quan quản trị.',
    audit: 'Theo dõi các thay đổi quan trọng trong hệ thống.',
  }[section] || 'Toàn cảnh hoạt động nền tảng.';
}

function initialsFor(value) {
  const source = String(value || 'AD').trim();
  const words = source.includes('@') ? source.split('@')[0].split(/[._-]/) : source.split(/\s+/);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('') || 'AD';
}
