import { useEffect, useMemo, useState } from 'react';
import { DonutChart, GaugeChart } from '../../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../../components/DashboardWidgets.jsx';
import { wardLabel, categoryLabel } from '../../data/locations.js';
import { fetchAdminBrokers, fetchAdminProperties, fetchAdminUsers } from '../../services/api.js';
import { loadStoredSession } from '../../services/session.js';

const CHART_COLORS = {
  success: '#22C55E',
  orange: '#F97316',
};

// Mock fetchers return a flat array; the real API returns a PagedResponse — flatten both.
function toArray(result) {
  if (Array.isArray(result)) return result;
  return result?.content ?? [];
}

// Custom, non-MUI overview kept intentionally on the site's own widgets/tokens (the /admin
// MUI exception applies to the react-admin resource views, not this dashboard). It fetches
// straight from the api service rather than through the react-admin dataProvider.
export default function OverviewDashboard() {
  const [users, setUsers] = useState([]);
  const [brokers, setBrokers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const session = loadStoredSession();
    if (!session?.token) { setLoading(false); return undefined; }
    let alive = true;
    setLoading(true);
    Promise.all([
      fetchAdminUsers(session.token, { size: 1000 }),
      fetchAdminBrokers(session.token, { size: 1000 }),
      fetchAdminProperties(session.token, { size: 1000 }),
    ])
      .then(([nextUsers, nextBrokers, nextProperties]) => {
        if (!alive) return;
        setUsers(toArray(nextUsers));
        setBrokers(toArray(nextBrokers));
        setProperties(toArray(nextProperties));
      })
      .catch((exception) => { if (alive) setError(exception.message || 'Không tải được tổng quan.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const stats = useMemo(() => ({
    totalAccounts: users.filter((user) => user.role === 'ADMIN' || user.role === 'BROKER').length,
    brokers: brokers.length,
    admins: users.filter((user) => user.role === 'ADMIN').length,
    posts: properties.length,
    visiblePosts: properties.filter((property) => property.rawStatus === 'AVAILABLE').length,
    locked: users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length,
  }), [users, brokers, properties]);

  const roleChart = useMemo(() => ([
    { label: 'Môi giới', value: stats.brokers, color: CHART_COLORS.orange },
    { label: 'Admin', value: stats.admins, color: CHART_COLORS.success },
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

  const regionData = useMemo(() => {
    const counts = new Map();
    properties.forEach((property) => {
      const label = wardLabel(property.ward);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const total = properties.length || 1;
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
  }, [properties]);

  const recentProperties = useMemo(() => (
    [...properties].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
  ), [properties]);

  const visiblePercent = stats.posts > 0 ? Math.round((stats.visiblePosts / stats.posts) * 100) : 0;

  return (
    <div className="dashboard-main">
      <h1 className="dashboard-page-title">Tổng quan</h1>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-4 dashboard-stats-row">
        <StatCard icon="Users" title="Tổng tài khoản" value={stats.totalAccounts} tone="navy" />
        <StatCard icon="IdCard" title="Môi giới" value={stats.brokers} tone="orange" />
        <StatCard icon="ShieldCheck" title="Admin" value={stats.admins} tone="green" />
        <StatCard icon="Building" title="Bài đăng" value={stats.posts} tone="navy" />
      </div>

      <div className="dashboard-charts-row">
        <GaugeChart title="Tỷ lệ bài đăng hiển thị" value={visiblePercent} max={100} label="Đang hiển thị" />
        <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
        <DonutChart title="Top môi giới theo tin đăng" data={topBrokersChart} centerLabel="môi giới" />
      </div>

      <div className="dashboard-panels-row">
        <DashboardPanel title="BĐS theo khu vực Trà Vinh" count={`${regionData.length} khu vực`}>
          {loading ? <LoadingRows rows={4} /> : regionData.length === 0 ? (
            <StateBlock icon="MapPin" title="Chưa có dữ liệu khu vực" description="Khi có bài đăng, phân bố theo khu vực sẽ hiển thị tại đây." />
          ) : (
            <div className="region-list">
              {regionData.map((region) => (
                <div className="region-row" key={region.name}>
                  <div className="region-meta">
                    <span className="region-name">{region.name}</span>
                    <span className="region-count">{region.count} tin · {region.pct}%</span>
                  </div>
                  <div className="region-bar">
                    <div className="region-fill" style={{ width: `${region.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>

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
                    {property.statusLabel || property.rawStatus}
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
    </div>
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
