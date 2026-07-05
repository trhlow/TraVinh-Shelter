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

const OVERDUE_HOURS = 24;

function isOverduePending(viewing) {
  if (viewing.status !== 'PENDING' || !viewing.createdAt) return false;
  const createdAt = new Date(viewing.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return Date.now() - createdAt.getTime() > OVERDUE_HOURS * 60 * 60 * 1000;
}

/**
 * ViewingsPanel — shared "Lịch hẹn xem" table for broker + admin dashboards.
 *
 * Props:
 *   viewings        {Array}    — appointment records
 *   loading         {boolean}
 *   onStatusChange  {function} — (id, status) => void; when provided (admin), renders a status select
 *   saving          {boolean}
 *   propertyLookup  {Object}   — admin only: propertyId -> { title, broker: { name, phone } }.
 *                                When provided, adds Môi giới + Thời gian gửi columns and resolves
 *                                the property name instead of falling back to a raw UUID.
 */
export default function ViewingsPanel({ viewings = [], loading = false, onStatusChange, saving = false, propertyLookup }) {
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

  const showPropertyDetails = Boolean(propertyLookup);

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Bất động sản</th>
            {showPropertyDetails && <th>Môi giới</th>}
            <th>Khách hàng</th>
            {showPropertyDetails && <th>Thời gian gửi</th>}
            <th>Thời gian muốn xem</th>
            <th>Trạng thái</th>
            {onStatusChange && <th className="dashboard-table-right">Cập nhật</th>}
          </tr>
        </thead>
        <tbody>
          {viewings.map((viewing) => {
            const property = propertyLookup?.[viewing.propertyId];
            const overdue = showPropertyDetails && isOverduePending(viewing);
            return (
              <tr key={viewing.id}>
                <td>
                  <div className="dashboard-table-name">
                    {property?.title || viewing.propertyTitle || 'Bài đăng không xác định'}
                  </div>
                  {viewing.roomLabel && (
                    <div className="dashboard-table-sub">Phòng: {viewing.roomLabel}</div>
                  )}
                  {overdue && <StatusBadge tone="danger">Cần liên hệ môi giới</StatusBadge>}
                </td>
                {showPropertyDetails && (
                  <td>
                    <div className="dashboard-table-name">{property?.broker?.name || 'Chưa rõ'}</div>
                    {property?.broker?.phone && <div className="dashboard-table-sub">{property.broker.phone}</div>}
                  </td>
                )}
                <td>
                  <div className="dashboard-table-name">{viewing.visitorName}</div>
                  <div className="dashboard-table-sub">{viewing.visitorPhone}</div>
                </td>
                {showPropertyDetails && (
                  <td className="dashboard-table-sub">{formatRequestedAt(viewing.createdAt)}</td>
                )}
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
