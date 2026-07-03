import { DashboardPanel } from '../../components/DashboardWidgets.jsx';
import ViewingsPanel from '../../components/dashboard/ViewingsPanel.jsx';
import { downloadCsv } from '../../utils/exportCsv.js';

const VIEWING_COLUMNS = [
  { key: 'roomLabel', label: 'Phòng / tin' },
  { key: 'visitorName', label: 'Khách hẹn' },
  { key: 'visitorPhone', label: 'Số điện thoại' },
  { key: 'requestedAt', label: 'Thời gian hẹn' },
  { key: 'status', label: 'Trạng thái' },
];

export default function ViewingsSection({ data, loading, saving, actions }) {
  function handleStatusChange(viewingId, status) {
    actions.changeViewingStatus(viewingId, status);
  }

  return (
    <DashboardPanel
      title="Lịch hẹn xem"
      count={loading ? 'Đang tải' : `${data.viewings.length} yêu cầu`}
      action={(
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => downloadCsv('lich-hen.csv', data.viewings, VIEWING_COLUMNS)}>
          Xuất CSV
        </button>
      )}
    >
      <ViewingsPanel viewings={data.viewings} loading={loading} onStatusChange={handleStatusChange} saving={saving} />
    </DashboardPanel>
  );
}
