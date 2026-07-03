import ViewingsPanel from '../../components/dashboard/ViewingsPanel.jsx';
import { DashboardPanel } from '../../components/DashboardWidgets.jsx';

// Ported from the pre-react-admin AdminDashboard viewings section.
export default function ViewingsSection({ data, loading }) {
  const { viewings } = data;
  return (
    <DashboardPanel title="Lịch hẹn xem" count={loading ? 'Đang tải' : `${viewings.length} yêu cầu`}>
      <ViewingsPanel viewings={viewings} loading={loading} />
    </DashboardPanel>
  );
}
