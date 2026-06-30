import { LoadingRows, StateBlock, StatusBadge } from '../DashboardWidgets.jsx';

const STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

const STATUS_TONES = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'muted',
};

function formatRequestedAt(value) {
  if (!value) return 'Chưa chọn';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * ViewingsPanel — shared "Lịch hẹn xem" table for broker + admin dashboards.
 *
 * Props:
 *   viewings        {Array}    — appointment records
 *   loading         {boolean}
 *   onStatusChange  {function} — (id, status) => void; when provided (admin), renders a status select
 *   saving          {boolean}
 */
export default function ViewingsPanel({ viewings = [], loading = false, onStatusChange, saving = false }) {
  if (loading) return <LoadingRows rows={4} />;
  if (viewings.length === 0) {
    return (
      <StateBlock
        icon="Calendar"
        title="Chưa có lịch hẹn xem"
        description="Khi khách hàng đặt lịch xem trên một tin đăng, yêu cầu sẽ hiển thị tại đây."
      />
    );
  }

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Bất động sản</th>
            <th>Khách hàng</th>
            <th>Thời gian muốn xem</th>
            <th>Trạng thái</th>
            {onStatusChange && <th className="dashboard-table-right">Cập nhật</th>}
          </tr>
        </thead>
        <tbody>
          {viewings.map((viewing) => (
            <tr key={viewing.id}>
              <td>
                <div className="dashboard-table-name">
                  {viewing.propertyTitle || viewing.propertyId}
                </div>
                {viewing.roomLabel && (
                  <div className="dashboard-table-sub">Phòng: {viewing.roomLabel}</div>
                )}
              </td>
              <td>
                <div className="dashboard-table-name">{viewing.visitorName}</div>
                <div className="dashboard-table-sub">{viewing.visitorPhone}</div>
              </td>
              <td className="dashboard-table-sub">{formatRequestedAt(viewing.requestedAt)}</td>
              <td>
                <StatusBadge tone={STATUS_TONES[viewing.status] || 'muted'}>
                  {STATUS_LABELS[viewing.status] || viewing.status}
                </StatusBadge>
              </td>
              {onStatusChange && (
                <td className="dashboard-table-right">
                  <select
                    className="input"
                    value={viewing.status}
                    onChange={(event) => onStatusChange(viewing.id, event.target.value)}
                    disabled={saving}
                  >
                    <option value="PENDING">Chờ xác nhận</option>
                    <option value="CONFIRMED">Đã xác nhận</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
