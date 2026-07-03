import { DashboardPanel, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';
import Icon from '../../components/ui/Icon.jsx';

const ROLE_LABELS = { ADMIN: 'Quản trị viên', BROKER: 'Môi giới', USER: 'Người dùng' };

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

export default function AccountsSection({ data, loading, saving, actions }) {
  const columns = [
    { key: 'fullName', label: 'Họ tên', render: (user) => user.fullName || user.username, csv: (user) => user.fullName || user.username },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Vai trò', render: (user) => ROLE_LABELS[user.role] || user.role, csv: (user) => ROLE_LABELS[user.role] || user.role },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (user) => (
        <StatusBadge tone={user.status === 'ACTIVE' ? 'success' : 'danger'}>
          {user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
        </StatusBadge>
      ),
      csv: (user) => (user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      sortable: false,
      render: (user) => <AccountStatusToggle user={user} saving={saving} onToggle={actions.toggleUserStatus} />,
      csv: () => '',
    },
  ];

  return (
    <DashboardPanel title="Tài khoản hệ thống" count={`${data.users.length} tài khoản`}>
      <DataTable
        columns={columns}
        rows={data.users}
        searchKeys={['fullName', 'username', 'email']}
        searchPlaceholder="Tìm tên, email..."
        exportFilename="tai-khoan.csv"
        loading={loading}
        emptyTitle="Chưa có tài khoản"
        emptyDescription="Tài khoản đăng ký sẽ hiển thị tại đây."
      />
    </DashboardPanel>
  );
}
