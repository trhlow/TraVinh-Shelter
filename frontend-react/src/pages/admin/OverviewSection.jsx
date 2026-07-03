import { useMemo } from 'react';
import { buildWardData, DonutChart, GaugeChart, LiveLineChart, WardBarChart } from '../../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../../components/DashboardWidgets.jsx';
import { categoryLabel } from '../../data/locations.js';

// Carried over from admin-ra/dashboard/OverviewDashboard.jsx, adapted to consume
// data/loading from the AdminDashboard shell instead of fetching itself.
// Fancy overview (heatmap, drill-down) lands in Task 11.
export default function OverviewSection({ data, loading }) {
  const { users, brokers, properties } = data;

  const stats = useMemo(() => ({
    totalAccounts: users.filter((user) => user.role === 'ADMIN' || user.role === 'BROKER').length,
    brokers: brokers.length,
    admins: users.filter((user) => user.role === 'ADMIN').length,
    posts: properties.length,
    visiblePosts: properties.filter((property) => property.rawStatus === 'AVAILABLE').length,
    locked: users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length,
  }), [users, brokers, properties]);

  const roleChart = useMemo(() => ([
    { label: 'Môi giới', value: stats.brokers },
    { label: 'Admin', value: stats.admins },
  ]), [stats]);

  const topBrokersChart = useMemo(() => {
    const counts = new Map();
    properties.forEach((property) => {
      const name = property.broker?.name || 'Khác';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    return sorted.length > 0 ? sorted : [{ label: 'Chưa có dữ liệu', value: 0 }];
  }, [properties]);

  const wardData = useMemo(() => buildWardData(properties, (property) => property.ward), [properties]);

  const recentProperties = useMemo(() => (
    [...properties].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
  ), [properties]);

  const visiblePercent = stats.posts > 0 ? Math.round((stats.visiblePosts / stats.posts) * 100) : 0;

  return (
    <>
      <div className="grid-4 dashboard-stats-row">
        <StatCard icon="Users" title="Tổng tài khoản" value={stats.totalAccounts} tone="navy" />
        <StatCard icon="IdCard" title="Môi giới" value={stats.brokers} tone="orange" />
        <StatCard icon="ShieldCheck" title="Admin" value={stats.admins} tone="green" />
        <StatCard icon="Building" title="Bài đăng" value={stats.posts} tone="navy" />
      </div>

      <div className="dashboard-live-row">
        <LiveLineChart
          title="Hoạt động hệ thống (thời gian thực)"
          baseValue={stats.visiblePosts * 12 + stats.posts}
          unit="điểm hoạt động"
        />
        <WardBarChart title="BĐS theo khu vực Trà Vinh" data={wardData} />
      </div>

      <div className="dashboard-charts-row">
        <GaugeChart title="Tỷ lệ bài đăng hiển thị" value={visiblePercent} max={100} label="Đang hiển thị" />
        <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
        <DonutChart title="Top môi giới theo tin đăng" data={topBrokersChart} centerLabel="môi giới" />
      </div>

      <div className="dashboard-panels-row">
        <DashboardPanel title="Bài đăng mới trong hệ thống" count={`${recentProperties.length} tin mới nhất`}>
          {loading ? <LoadingRows rows={5} /> : recentProperties.length === 0 ? (
            <StateBlock title="Chưa có bài đăng" description="Bài đăng mới sẽ hiển thị tại đây." />
          ) : (
            <div className="dashboard-broker-list">
              {recentProperties.map((property) => (
                <div key={property.id} className="dashboard-broker-row">
                  <div>
                    <div className="dashboard-table-name">{property.title}</div>
                    <div className="dashboard-table-sub">{categoryLabel(property.category)} · {property.priceLabel}</div>
                  </div>
                  <StatusBadge tone={property.rawStatus === 'AVAILABLE' ? 'success' : 'muted'}>
                    {property.adminStatusLabel || property.statusLabel || property.rawStatus}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel title="Tình trạng hệ thống" count="Từ API hiện có">
          <div className="dashboard-system-lines">
            <SystemLine label="Môi giới được cấp" value={stats.brokers} />
            <SystemLine label="Admin trong hệ thống" value={stats.admins} />
            <SystemLine label="Bài đăng hiển thị" value={stats.visiblePosts} />
            <SystemLine label="Tài khoản bị khóa" value={stats.locked} />
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}

function SystemLine({ label, value }) {
  return (
    <div className="dashboard-system-line">
      <span className="dashboard-system-line-label">{label}</span>
      <span className="dashboard-system-line-value">{value}</span>
    </div>
  );
}
