import { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { DashboardPanel, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';

const EMPTY_BROKER = {
  username: '',
  email: '',
  password: '',
  fullName: '',
  phone: '',
};

// The system has a single admin — locking it would lose access permanently.
export function AccountStatusToggle({ user, saving, onToggle }) {
  if (user.role === 'ADMIN') {
    return <StatusBadge tone="muted">Quản trị viên</StatusBadge>;
  }
  const locked = user.status !== 'ACTIVE';
  return (
    <button className="btn btn-ghost btn-sm" type="button" disabled={saving} onClick={() => onToggle(user)}>
      <Icon name={locked ? 'Eye' : 'EyeOff'} size={14} className="icon-muted" />
      {locked ? 'Mở khóa' : 'Khóa'}
    </button>
  );
}

// Ported from the legacy AdminDashboard brokers section.
// Table-ified with the shared DataTable in Task 12.
export default function BrokersSection({ data, loading, saving, actions }) {
  const { brokers } = data;
  const [brokerForm, setBrokerForm] = useState(EMPTY_BROKER);

  function setBrokerValue(name, value) {
    setBrokerForm((current) => ({ ...current, [name]: value }));
  }

  async function saveBroker(event) {
    event.preventDefault();
    const ok = await actions.createBrokerAccount(brokerForm);
    if (ok) setBrokerForm(EMPTY_BROKER);
  }

  const columns = [
    { key: 'fullName', label: 'Họ tên', render: (broker) => broker.fullName || broker.username },
    { key: 'phone', label: 'SĐT', render: (broker) => broker.phone || 'Chưa có SĐT' },
    { key: 'email', label: 'Email' },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (broker) => (
        <AccountStatusToggle user={broker} saving={saving} onToggle={actions.toggleUserStatus} />
      ),
      sortable: false,
      csv: (broker) => (broker.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'),
    },
  ];

  return (
    <div className="dashboard-profile-grid">
      <form className="card dashboard-form-card" onSubmit={saveBroker}>
        <h2 className="dashboard-section-title">Cấp tài khoản môi giới</h2>
        <p className="dashboard-section-subtitle">Admin tạo tài khoản và gửi thông tin đăng nhập cho broker bên ngoài hệ thống.</p>
        <FormField label="Username"><input className="input" value={brokerForm.username} onChange={(event) => setBrokerValue('username', event.target.value)} required minLength={3} /></FormField>
        <FormField label="Email"><input className="input" type="email" value={brokerForm.email} onChange={(event) => setBrokerValue('email', event.target.value)} required /></FormField>
        <FormField label="Mật khẩu"><input className="input" type="password" value={brokerForm.password} onChange={(event) => setBrokerValue('password', event.target.value)} required minLength={8} /></FormField>
        <FormField label="Họ tên"><input className="input" value={brokerForm.fullName} onChange={(event) => setBrokerValue('fullName', event.target.value)} required /></FormField>
        <FormField label="Số điện thoại" htmlFor="broker-phone">
          <input
            id="broker-phone"
            className="input"
            type="tel"
            value={brokerForm.phone}
            onChange={(event) => setBrokerValue('phone', event.target.value)}
            required
            pattern="0(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])[0-9]{7}"
            maxLength={10}
            title="Số điện thoại di động Việt Nam hợp lệ, VD: 0912345678"
          />
        </FormField>
        <button className="auth-btn" type="submit" disabled={saving}>
          <Icon name="Plus" size={16} className="icon-inverse" />
          Tạo môi giới
        </button>
      </form>

      <DashboardPanel title="Môi giới đang quản lý" count={`${brokers.length} hồ sơ`}>
        <DataTable
          columns={columns}
          rows={brokers}
          searchKeys={['fullName', 'username', 'email', 'phone']}
          searchPlaceholder="Tìm tên, SĐT, email..."
          exportFilename="moi-gioi.csv"
          loading={loading}
          emptyTitle="Không có môi giới phù hợp"
          emptyDescription="Thử đổi từ khóa hoặc bộ lọc trạng thái."
        />
      </DashboardPanel>
    </div>
  );
}

function FormField({ label, htmlFor, children }) {
  return (
    <div className="auth-field">
      <label className="auth-field-label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
