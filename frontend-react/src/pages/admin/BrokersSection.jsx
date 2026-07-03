import { useMemo, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatusBadge } from '../../components/DashboardWidgets.jsx';

const EMPTY_BROKER = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
};

const ALL = 'all';

// Ported from the pre-react-admin AdminDashboard brokers section.
// Table-ified with the shared DataTable in Task 12.
export default function BrokersSection({ data, loading, saving, actions }) {
  const { brokers } = data;
  const [brokerForm, setBrokerForm] = useState(EMPTY_BROKER);
  const [brokerQuery, setBrokerQuery] = useState('');
  const [brokerStatusFilter, setBrokerStatusFilter] = useState(ALL);

  const filteredBrokers = useMemo(() => brokers.filter((broker) => {
    const query = brokerQuery.trim().toLowerCase();
    const matchesQuery = !query || [broker.email, broker.username, broker.fullName, broker.phone].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = brokerStatusFilter === ALL || broker.status === brokerStatusFilter;
    return matchesQuery && matchesStatus;
  }), [brokers, brokerQuery, brokerStatusFilter]);

  function setBrokerValue(name, value) {
    setBrokerForm((current) => ({ ...current, [name]: value }));
  }

  async function saveBroker(event) {
    event.preventDefault();
    await actions.createBrokerAccount(brokerForm);
    setBrokerForm(EMPTY_BROKER);
  }

  return (
    <div className="dashboard-profile-grid">
      <form className="card dashboard-form-card" onSubmit={saveBroker}>
        <h2 className="dashboard-section-title">Cấp tài khoản môi giới</h2>
        <p className="dashboard-section-subtitle">Admin tạo tài khoản và gửi thông tin đăng nhập cho broker bên ngoài hệ thống.</p>
        <FormField label="Username"><input className="input" value={brokerForm.username} onChange={(event) => setBrokerValue('username', event.target.value)} required minLength={3} /></FormField>
        <FormField label="Email"><input className="input" type="email" value={brokerForm.email} onChange={(event) => setBrokerValue('email', event.target.value)} required /></FormField>
        <FormField label="Mật khẩu"><input className="input" type="password" value={brokerForm.password} onChange={(event) => setBrokerValue('password', event.target.value)} required minLength={8} /></FormField>
        <FormField label="Họ tên"><input className="input" value={brokerForm.fullName} onChange={(event) => setBrokerValue('fullName', event.target.value)} required /></FormField>
        <FormField label="Số điện thoại"><input className="input" value={brokerForm.phone} onChange={(event) => setBrokerValue('phone', event.target.value)} required /></FormField>
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
        <BrokerTable brokers={filteredBrokers} loading={loading} saving={saving} onToggleStatus={actions.toggleUserStatus} />
      </DashboardPanel>
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

function FormField({ label, children }) {
  return (
    <div className="auth-field">
      <label className="auth-field-label">{label}</label>
      {children}
    </div>
  );
}

function userStatusLabel(status) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa';
}
