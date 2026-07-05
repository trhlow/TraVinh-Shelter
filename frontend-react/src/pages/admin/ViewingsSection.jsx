import { useMemo } from 'react';
import { DashboardPanel } from '../../components/DashboardWidgets.jsx';
import ViewingsPanel from '../../components/dashboard/ViewingsPanel.jsx';
import { downloadCsv } from '../../utils/exportCsv.js';

function buildPropertyLookup(properties) {
  const lookup = {};
  properties.forEach((property) => {
    lookup[property.id] = { title: property.title, broker: property.broker };
  });
  return lookup;
}

function viewingColumns(propertyLookup) {
  return [
    { key: 'roomLabel', label: 'Phòng / tin', format: (value, viewing) => (
      propertyLookup[viewing.propertyId]?.title || viewing.propertyTitle || 'Bài đăng không xác định'
    ) },
    { key: 'brokerName', label: 'Môi giới', format: (value, viewing) => propertyLookup[viewing.propertyId]?.broker?.name || 'Chưa rõ' },
    { key: 'visitorName', label: 'Khách hẹn' },
    { key: 'visitorPhone', label: 'Số điện thoại' },
    { key: 'createdAt', label: 'Thời gian gửi' },
    { key: 'requestedAt', label: 'Thời gian hẹn' },
    { key: 'status', label: 'Trạng thái' },
  ];
}

export default function ViewingsSection({ data, loading, saving, actions }) {
  const propertyLookup = useMemo(() => buildPropertyLookup(data.properties), [data.properties]);

  function handleStatusChange(viewingId, status) {
    actions.changeViewingStatus(viewingId, status);
  }

  return (
    <DashboardPanel
      title="Lịch hẹn xem"
      count={loading ? 'Đang tải' : `${data.viewings.length} yêu cầu`}
      action={(
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => downloadCsv('lich-hen.csv', data.viewings, viewingColumns(propertyLookup))}>
          Xuất CSV
        </button>
      )}
    >
      <ViewingsPanel viewings={data.viewings} loading={loading} onStatusChange={handleStatusChange} saving={saving} propertyLookup={propertyLookup} />
    </DashboardPanel>
  );
}
