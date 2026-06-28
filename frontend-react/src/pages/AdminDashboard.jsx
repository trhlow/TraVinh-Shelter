import { useEffect, useMemo, useState } from 'react';
import { BarChart, DonutChart, HorizontalBarChart } from '../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../components/DashboardWidgets.jsx';
import MaterialIcon from '../components/MaterialIcon.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import LoginPage from './LoginPage.jsx';
import {
  createBroker,
  fetchAdminBrokers,
  fetchAdminProperties,
  fetchAdminUsers,
  fetchPrioritySupportTickets,
  updatePrioritySupportTicketStatus,
  updateUserStatus,
} from '../services/api.js';

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
  const [supportTickets, setSupportTickets] = useState([]);
  const [brokerForm, setBrokerForm] = useState(EMPTY_BROKER);
  const [userQuery, setUserQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState(ALL);
  const [supportStatusFilter, setSupportStatusFilter] = useState(ALL);
  const [supportPriorityFilter, setSupportPriorityFilter] = useState(ALL);
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
      .then(({ nextUsers, nextBrokers, nextProperties, nextSupportTickets }) => {
        if (!alive) return;
        setUsers(nextUsers);
        setBrokers(nextBrokers);
        setProperties(nextProperties);
        setSupportTickets(nextSupportTickets);
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
      supportNew: supportTickets.filter((ticket) => ticket.status === 'NEW').length,
    };
  }, [users, brokers, properties, supportTickets]);

  const roleChart = useMemo(() => ([
    { label: 'Users', value: stats.users, color: '#2563EB' },
    { label: 'Môi giới', value: stats.brokers, color: '#F97316' },
    { label: 'Admin', value: stats.admins, color: '#22C55E' },
  ]), [stats]);
  const propertyCategoryChart = useMemo(() => chartBy(properties, (property) => categoryLabel(property.category)), [properties]);
  const propertyStatusChart = useMemo(() => chartBy(properties, (property) => property.statusLabel || property.rawStatus || 'Đang hiển thị'), [properties]);
  const supportPriorityChart = useMemo(() => chartBy(supportTickets, (ticket) => priorityLabel(ticket.priority)), [supportTickets]);

  const customerUsers = useMemo(() => users.filter((user) => user.role === 'USER'), [users]);

  const filteredUsers = useMemo(() => customerUsers.filter((user) => {
    const query = userQuery.trim().toLowerCase();
    const matchesQuery = !query || [user.email, user.username, user.fullName].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = userStatusFilter === ALL || user.status === userStatusFilter;
    return matchesQuery && matchesStatus;
  }), [customerUsers, userQuery, userStatusFilter]);

  const filteredSupportTickets = useMemo(() => supportTickets.filter((ticket) => {
    const matchesStatus = supportStatusFilter === ALL || ticket.status === supportStatusFilter;
    const matchesPriority = supportPriorityFilter === ALL || ticket.priority === supportPriorityFilter;
    return matchesStatus && matchesPriority;
  }), [supportTickets, supportStatusFilter, supportPriorityFilter]);

  if (!session) return <LoginPage onLogin={onLogin} />;
  if (session.role !== 'ADMIN') {
    return (
      <AdminLayout session={session} onLogout={onLogout} variant="admin" activePath={currentPath}>
        <main className="dashboard-main">
          <section className="ui-panel p-stack-lg">
            <h1 className="font-headline-lg text-headline-lg text-trust-navy mb-2">Không có quyền admin</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Chỉ admin mới được cấp tài khoản môi giới và kiểm tra toàn bộ hệ thống.</p>
          </section>
        </main>
      </AdminLayout>
    );
  }

  async function reload() {
    const data = await loadAdminData(session);
    setUsers(data.nextUsers);
    setBrokers(data.nextBrokers);
    setProperties(data.nextProperties);
    setSupportTickets(data.nextSupportTickets);
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

  async function changeTicketStatus(ticketId, status) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await updatePrioritySupportTicketStatus(session.token, ticketId, status);
      const nextTickets = await fetchPrioritySupportTickets(session.token, { role: 'ADMIN', email: session.email });
      setSupportTickets(nextTickets);
      setNotice('Đã cập nhật trạng thái ticket hỗ trợ.');
    } catch (exception) {
      setError(exception.message || 'Không cập nhật được ticket hỗ trợ.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout session={session} onLogout={onLogout} variant="admin" activePath={currentPath}>
      <main className="dashboard-main">
        <header className="mb-stack-lg flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-trust-navy md:font-headline-xl md:text-headline-xl">{adminTitle(section)}</h1>
            <p className="mt-2 font-body-md text-body-md text-on-surface-variant">{adminSubtitle(section)}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
            <MaterialIcon className="text-sm">{loading ? 'sync' : 'verified'}</MaterialIcon>
            {loading ? 'Đang đồng bộ' : 'Dữ liệu mới nhất'}
          </div>
        </header>

        {notice && <div className="mb-stack-md rounded border border-success-green/40 bg-success-green/10 p-3 font-body-sm text-body-sm text-on-surface">{notice}</div>}
        {error && <div className="mb-stack-md rounded border border-error-container bg-error-container/50 p-3 font-body-sm text-body-sm text-on-error-container">{error}</div>}

        {section === 'overview' && (
          <>
            <AdminStatsGrid stats={stats} loading={loading} />
            <section className="mb-stack-lg grid grid-cols-1 gap-gutter xl:grid-cols-3">
              <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
              <BarChart title="Bài đăng theo danh mục" data={propertyCategoryChart} />
              <HorizontalBarChart title="Trạng thái bài đăng" data={propertyStatusChart} />
            </section>
            <section className="grid grid-cols-1 gap-gutter xl:grid-cols-[1fr_360px]">
              <DashboardPanel title="Bài đăng mới trong hệ thống" count={`${properties.slice(0, 5).length} tin gần đây`}>
                <PropertyTable properties={properties.slice(0, 5)} loading={loading} compact />
              </DashboardPanel>
              <DashboardPanel title="Hỗ trợ ưu tiên" count={`${stats.supportNew} ticket mới`}>
                <div className="p-5">
                  <div className="space-y-3">
                    {supportPriorityChart.map((item) => (
                      <div className="flex items-center justify-between gap-3 rounded border border-outline-variant bg-surface-container-low p-3" key={item.label}>
                        <span className="font-body-sm text-body-sm text-on-surface">{item.label}</span>
                        <span className="font-label-bold text-label-bold text-trust-navy">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <a className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-4 py-2 font-label-bold text-label-bold text-on-primary transition-colors hover:bg-primary-container" href="#/admin/support">
                    <MaterialIcon className="text-sm">support_agent</MaterialIcon>
                    Mở danh sách ticket
                  </a>
                </div>
              </DashboardPanel>
            </section>
          </>
        )}

        {section === 'users' && (
          <DashboardPanel
            title="Tài khoản users"
            count={`${filteredUsers.length}/${customerUsers.length} user`}
            action={(
              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[260px_150px]">
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
          <section className="grid grid-cols-1 gap-gutter xl:grid-cols-[380px_1fr]">
            <form className="ui-panel h-fit p-5" onSubmit={saveBroker}>
              <h2 className="font-headline-md text-headline-md text-trust-navy">Cấp tài khoản môi giới</h2>
              <p className="mb-stack-md mt-2 font-body-sm text-body-sm text-on-surface-variant">Admin tạo tài khoản và gửi thông tin đăng nhập cho broker bên ngoài hệ thống.</p>
              <div className="space-y-stack-md">
                <Field label="Username"><input className="input" value={brokerForm.username} onChange={(event) => setBrokerValue('username', event.target.value, setBrokerForm)} required minLength={3} /></Field>
                <Field label="Email"><input className="input" type="email" value={brokerForm.email} onChange={(event) => setBrokerValue('email', event.target.value, setBrokerForm)} required /></Field>
                <Field label="Mật khẩu"><input className="input" type="password" value={brokerForm.password} onChange={(event) => setBrokerValue('password', event.target.value, setBrokerForm)} required minLength={8} /></Field>
                <Field label="Họ tên"><input className="input" value={brokerForm.fullName} onChange={(event) => setBrokerValue('fullName', event.target.value, setBrokerForm)} required /></Field>
                <Field label="Số điện thoại"><input className="input" value={brokerForm.phone} onChange={(event) => setBrokerValue('phone', event.target.value, setBrokerForm)} required /></Field>
                <button className="ui-action w-full disabled:opacity-60" disabled={saving}>
                  <MaterialIcon className="text-sm">person_add</MaterialIcon>
                  Tạo môi giới
                </button>
              </div>
            </form>

            <DashboardPanel title="Môi giới đang quản lý" count={`${brokers.length} hồ sơ`}>
              <BrokerTable brokers={brokers} loading={loading} />
            </DashboardPanel>
          </section>
        )}

        {section === 'properties' && (
          <DashboardPanel title="Bài đăng trong hệ thống" count={`${properties.length} tin đăng`}>
            <PropertyTable properties={properties} loading={loading} />
          </DashboardPanel>
        )}

        {section === 'support' && (
          <DashboardPanel
            title="Ticket hỗ trợ ưu tiên"
            count={`${filteredSupportTickets.length}/${supportTickets.length} ticket`}
            action={(
              <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                <select className="input" value={supportStatusFilter} onChange={(event) => setSupportStatusFilter(event.target.value)}>
                  <option value={ALL}>Tất cả trạng thái</option>
                  <option value="NEW">Mới</option>
                  <option value="IN_PROGRESS">Đang xử lý</option>
                  <option value="DONE">Đã xong</option>
                </select>
                <select className="input" value={supportPriorityFilter} onChange={(event) => setSupportPriorityFilter(event.target.value)}>
                  <option value={ALL}>Tất cả mức độ</option>
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>
            )}
          >
            <SupportTable tickets={filteredSupportTickets} loading={loading} saving={saving} onChangeStatus={changeTicketStatus} />
          </DashboardPanel>
        )}
      </main>
    </AdminLayout>
  );
}

function AdminStatsGrid({ stats, loading }) {
  const items = [
    ['group', 'Tổng user', loading ? '...' : stats.users, 'Không gồm môi giới và admin', 'navy', '#/admin/users'],
    ['badge', 'Tổng môi giới', loading ? '...' : stats.brokers, 'Broker do admin cấp tài khoản', 'orange', '#/admin/brokers'],
    ['description', 'Tổng bài đăng', loading ? '...' : stats.posts, 'Bao gồm mọi trạng thái', 'navy', '#/admin/properties'],
    ['visibility', 'Bài đang hiển thị', loading ? '...' : stats.visiblePosts, 'Tin sẵn sàng cho user xem', 'green', '#/admin/properties'],
    ['pending_actions', 'Bài chờ xử lý', loading ? '...' : stats.pendingPosts, 'Đếm theo trạng thái pending nếu API có', 'orange', '#/admin/properties'],
    ['lock', 'Tài khoản bị khóa', loading ? '...' : stats.locked, 'Có thể mở lại trong trang Users', 'red', '#/admin/users'],
  ];
  return (
    <section className="mb-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 xl:grid-cols-3">
      {items.map(([icon, title, value, meta, tone, href]) => (
        <StatCard key={title} icon={icon} title={title} value={value} meta={meta} tone={tone} href={href} />
      ))}
    </section>
  );
}

function UserTable({ users, session, loading, saving, onToggleStatus }) {
  if (loading) return <LoadingRows rows={5} />;
  if (users.length === 0) return <StateBlock title="Không có user phù hợp" description="Thử đổi từ khóa hoặc bộ lọc trạng thái." />;
  return (
    <div className="overflow-x-auto">
      <table className="ui-table w-full text-left font-body-sm text-body-sm">
        <thead className="bg-surface-container-low text-trust-navy">
          <tr>
            <th className="px-4 py-3 font-label-bold">Tài khoản</th>
            <th className="px-4 py-3 font-label-bold">Trạng thái</th>
            <th className="px-4 py-3 font-label-bold text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-surface-container-low">
              <td className="px-4 py-3">
                <div className="font-label-bold text-label-bold text-on-surface">{user.fullName || user.username || 'Chưa cập nhật'}</div>
                <div className="text-on-surface-variant">{user.email}</div>
              </td>
              <td className="px-4 py-3"><StatusBadge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>{userStatusLabel(user.status)}</StatusBadge></td>
              <td className="px-4 py-3 text-right">
                <button className="rounded border border-outline px-3 py-2 text-trust-navy transition-colors hover:bg-surface-container-low disabled:opacity-60" onClick={() => onToggleStatus(user)} disabled={saving || user.id === session.userId}>
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

function BrokerTable({ brokers, loading }) {
  if (loading) return <LoadingRows rows={4} />;
  if (brokers.length === 0) return <StateBlock title="Chưa có môi giới" description="Tạo tài khoản broker ở form bên trái để bắt đầu." />;
  return (
    <div className="divide-y divide-outline-variant">
      {brokers.map((broker) => (
        <div key={broker.id || broker.email} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-container-low md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="font-label-bold text-label-bold text-on-surface">{broker.fullName || broker.username}</div>
            <div className="truncate font-body-sm text-body-sm text-on-surface-variant">{broker.phone || 'Chưa có SĐT'} · {broker.email}</div>
          </div>
          <StatusBadge tone={broker.status === 'ACTIVE' ? 'success' : 'danger'}>{userStatusLabel(broker.status)}</StatusBadge>
        </div>
      ))}
    </div>
  );
}

function PropertyTable({ properties, loading, compact = false }) {
  if (loading) return <LoadingRows rows={5} />;
  if (properties.length === 0) return <StateBlock title="Chưa có bài đăng" description="Khi broker đăng tin, dữ liệu sẽ xuất hiện tại đây." />;
  return (
    <div className="overflow-x-auto">
      <table className="ui-table w-full min-w-[760px] text-left font-body-sm text-body-sm">
        <thead className="bg-surface-container-low text-trust-navy">
          <tr>
            <th className="px-4 py-3 font-label-bold">Bài đăng</th>
            <th className="px-4 py-3 font-label-bold">Môi giới</th>
            {!compact && <th className="px-4 py-3 font-label-bold">Danh mục</th>}
            <th className="px-4 py-3 font-label-bold">Giá</th>
            <th className="px-4 py-3 font-label-bold">Trạng thái</th>
            {!compact && <th className="px-4 py-3 font-label-bold">Ngày tạo</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {properties.map((property) => (
            <tr key={property.id} className="hover:bg-surface-container-low">
              <td className="px-4 py-3">
                <a className="flex min-w-0 items-center gap-3" href={`#/property/${property.id}`}>
                  <img className="h-14 w-20 shrink-0 rounded object-cover" src={property.image} alt={property.title} />
                  <div className="min-w-0">
                    <div className="truncate font-label-bold text-label-bold text-on-surface">{property.title}</div>
                    <div className="truncate text-on-surface-variant">{property.address}</div>
                  </div>
                </a>
              </td>
              <td className="px-4 py-3">{property.broker?.name || 'Công Tín Land'}</td>
              {!compact && <td className="px-4 py-3">{categoryLabel(property.category)}</td>}
              <td className="px-4 py-3 font-label-bold text-label-bold text-trust-navy">{property.priceLabel}</td>
              <td className="px-4 py-3"><StatusBadge tone={propertyStatusTone(property)}>{property.statusLabel || property.rawStatus}</StatusBadge></td>
              {!compact && <td className="px-4 py-3 text-on-surface-variant">{formatDate(property.createdAt)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SupportTable({ tickets, loading, saving, onChangeStatus }) {
  if (loading) return <LoadingRows rows={5} />;
  if (tickets.length === 0) return <StateBlock icon="support_agent" title="Chưa có ticket phù hợp" description="Ticket broker gửi sẽ được lưu tạm ở frontend để demo luồng hỗ trợ." />;
  return (
    <div className="overflow-x-auto">
      <table className="ui-table w-full min-w-[880px] text-left font-body-sm text-body-sm">
        <thead className="bg-surface-container-low text-trust-navy">
          <tr>
            <th className="px-4 py-3 font-label-bold">Ticket</th>
            <th className="px-4 py-3 font-label-bold">Broker</th>
            <th className="px-4 py-3 font-label-bold">Loại</th>
            <th className="px-4 py-3 font-label-bold">Mức độ</th>
            <th className="px-4 py-3 font-label-bold">Trạng thái</th>
            <th className="px-4 py-3 font-label-bold">Cập nhật</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="align-top hover:bg-surface-container-low">
              <td className="px-4 py-3">
                <div className="font-label-bold text-label-bold text-on-surface">{ticket.title}</div>
                <div className="mt-1 max-w-md text-on-surface-variant">{ticket.content}</div>
                <div className="mt-2 text-text-muted">{ticket.id} · {formatDate(ticket.createdAt)}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-label-bold text-label-bold text-on-surface">{ticket.requesterName}</div>
                <div className="text-on-surface-variant">{ticket.requesterEmail}</div>
              </td>
              <td className="px-4 py-3">{issueTypeLabel(ticket.issueType)}</td>
              <td className="px-4 py-3"><StatusBadge tone={priorityTone(ticket.priority)}>{priorityLabel(ticket.priority)}</StatusBadge></td>
              <td className="px-4 py-3"><StatusBadge tone={ticketStatusTone(ticket.status)}>{ticketStatusLabel(ticket.status)}</StatusBadge></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {['NEW', 'IN_PROGRESS', 'DONE'].map((status) => (
                    <button
                      className={`rounded border px-2.5 py-1.5 font-label-bold text-label-bold transition-colors disabled:opacity-60 ${ticket.status === status ? 'border-primary bg-primary text-on-primary' : 'border-outline text-on-surface-variant hover:bg-surface-container'}`}
                      disabled={saving}
                      key={status}
                      onClick={() => onChangeStatus(ticket.id, status)}
                      type="button"
                    >
                      {ticketStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function loadAdminData(session) {
  const [nextUsers, nextBrokers, nextProperties, nextSupportTickets] = await Promise.all([
    fetchAdminUsers(session.token),
    fetchAdminBrokers(session.token),
    fetchAdminProperties(session.token),
    fetchPrioritySupportTickets(session.token, { role: 'ADMIN', email: session.email }),
  ]);
  return { nextUsers, nextBrokers, nextProperties, nextSupportTickets };
}

function adminTitle(section) {
  return {
    overview: 'Tổng quan',
    users: 'Tài khoản users',
    brokers: 'Môi giới',
    properties: 'Bài đăng',
    support: 'Hỗ trợ ưu tiên',
  }[section] || 'Tổng quan';
}

function adminSubtitle(section) {
  return {
    overview: 'Theo dõi nhanh users, môi giới, bài đăng, trạng thái xử lý và hỗ trợ ưu tiên.',
    users: 'Tìm kiếm, lọc vai trò/trạng thái và khóa hoặc mở tài khoản bằng API hiện có.',
    brokers: 'Cấp tài khoản môi giới và theo dõi danh sách broker đang hoạt động.',
    properties: 'Kiểm tra thumbnail, tiêu đề, broker, danh mục, giá và trạng thái bài đăng.',
    support: 'Theo dõi ticket hỗ trợ ưu tiên và cập nhật trạng thái xử lý.',
  }[section] || 'Theo dõi nhanh hệ thống.';
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-bold text-label-bold text-trust-navy">{label}</span>
      {children}
    </label>
  );
}

function userStatusLabel(status) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa';
}

function ticketStatusLabel(status) {
  return {
    NEW: 'Mới',
    IN_PROGRESS: 'Đang xử lý',
    DONE: 'Đã xong',
  }[status] || status;
}

function ticketStatusTone(status) {
  return {
    NEW: 'warning',
    IN_PROGRESS: 'info',
    DONE: 'success',
  }[status] || 'muted';
}

function priorityLabel(priority) {
  return {
    high: 'Cao',
    medium: 'Trung bình',
    low: 'Thấp',
  }[priority] || priority || 'Trung bình';
}

function priorityTone(priority) {
  return {
    high: 'danger',
    medium: 'warning',
    low: 'info',
  }[priority] || 'muted';
}

function issueTypeLabel(issueType) {
  return {
    listing: 'Tin đăng',
    approval: 'Duyệt tin',
    account: 'Tài khoản',
    payment: 'Thanh toán',
    other: 'Khác',
  }[issueType] || 'Khác';
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
