import { useEffect, useMemo, useState } from 'react';
import { DashboardPanel } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { fetchAdminAuditLogs } from '../../services/api.js';
import { isInRange, resolveDateRange } from '../../utils/dateRange.js';

const ACTION_LABELS = {
  CREATE_BROKER: 'Cấp tài khoản môi giới',
  LOCK_USER: 'Khóa tài khoản',
  UNLOCK_USER: 'Mở khóa tài khoản',
  UPDATE_PROPERTY_STATUS: 'Đổi trạng thái bài đăng',
  HIDE_PROPERTY: 'Gỡ bài đăng',
  UPDATE_VIEWING_STATUS: 'Đổi trạng thái lịch hẹn',
};

export default function AuditLogSection({ session }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('all');
  const [custom, setCustom] = useState({});
  const [action, setAction] = useState('all');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAdminAuditLogs(session.token)
      .then((items) => { if (alive) setLogs(Array.isArray(items) ? items : []); })
      .catch(() => { if (alive) setLogs([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [session]);

  const range = useMemo(() => resolveDateRange(preset, custom), [preset, custom]);
  const filtered = useMemo(() => logs.filter((log) => (
    isInRange(log.createdAt, range) && (action === 'all' || log.action === action)
  )), [logs, range, action]);

  const columns = [
    { key: 'createdAt', label: 'Thời gian', render: (log) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(log.createdAt)) },
    { key: 'action', label: 'Hành động', render: (log) => ACTION_LABELS[log.action] || log.action, csv: (log) => ACTION_LABELS[log.action] || log.action },
    { key: 'targetLabel', label: 'Đối tượng' },
    { key: 'detail', label: 'Chi tiết' },
  ];

  const toolbar = (
    <>
      <DateRangeFilter preset={preset} custom={custom} onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }} />
      <select className="input" aria-label="Lọc theo hành động" value={action} onChange={(event) => setAction(event.target.value)}>
        <option value="all">Tất cả hành động</option>
        {Object.entries(ACTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </>
  );

  return (
    <DashboardPanel title="Nhật ký hoạt động" count={loading ? 'Đang tải' : `${filtered.length} bản ghi`}>
      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={['targetLabel', 'detail', 'actorEmail']}
        searchPlaceholder="Tìm đối tượng, chi tiết..."
        exportFilename="nhat-ky.csv"
        loading={loading}
        toolbar={toolbar}
        emptyTitle="Chưa có nhật ký"
        emptyDescription="Khi admin cấp tài khoản, khóa/mở tài khoản, đổi trạng thái bài đăng hoặc lịch hẹn, hoạt động sẽ hiển thị tại đây."
      />
    </DashboardPanel>
  );
}
