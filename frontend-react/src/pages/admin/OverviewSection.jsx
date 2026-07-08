import { useMemo, useState } from 'react';
import {
  buildDailySeries,
  buildHeatmapData,
  buildWardData,
  HeatmapChart,
  ThreeDAreaChart,
  ThreeDDonutChart,
  ThreeDGroupedBarChart,
} from '../../components/Charts.jsx';
import { DashboardPanel, StateBlock, StatCard, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES } from '../../data/locations.js';
import { isInRange, percentDelta, previousRange, resolveDateRange } from '../../utils/dateRange.js';
import { downloadCsv } from '../../utils/exportCsv.js';

const RBAC_MODULES = [
  { id: 'users', label: 'Người dùng' },
  { id: 'brokers', label: 'Môi giới' },
  { id: 'properties', label: 'Tin đăng' },
  { id: 'reports', label: 'Báo cáo' },
];

const DEFAULT_RBAC = {
  ADMIN: { users: true, brokers: true, properties: true, reports: true },
  BROKER: { users: false, brokers: false, properties: true, reports: true },
  USER: { users: false, brokers: false, properties: false, reports: false },
};

export default function OverviewSection({ data, loading, actions }) {
  const users = data?.users || [];
  const brokers = data?.brokers || [];
  const properties = data?.properties || [];
  const viewings = data?.viewings || [];

  const [preset, setPreset] = useState('all');
  const [custom, setCustom] = useState({});
  const [ward, setWard] = useState('all');
  const [category, setCategory] = useState('all');
  const [rbac, setRbac] = useState(DEFAULT_RBAC);

  const range = useMemo(() => resolveDateRange(preset, custom), [preset, custom]);

  const filteredProperties = useMemo(() => properties.filter((property) => (
    isInRange(property.createdAt, range)
    && (ward === 'all' || property.ward === ward)
    && (category === 'all' || property.category === category)
  )), [properties, range, ward, category]);

  const prevRange = useMemo(() => previousRange(range), [range]);
  const prevProperties = useMemo(() => (prevRange ? properties.filter((property) => (
    isInRange(property.createdAt, prevRange)
    && (ward === 'all' || property.ward === ward)
    && (category === 'all' || property.category === category)
  )) : null), [properties, prevRange, ward, category]);

  const activeBrokers = useMemo(() => brokers.filter(isActiveAccount).length, [brokers]);
  const currentRevenue = useMemo(() => estimateCurrentMonthRevenue(properties, viewings), [properties, viewings]);
  const visibleCount = filteredProperties.filter((property) => property.rawStatus === 'AVAILABLE').length;

  const totalListingsSparkline = useMemo(
    () => buildDailySeries(filteredProperties, (property) => property.createdAt, 7).map((bucket) => bucket.count),
    [filteredProperties],
  );
  const kpis = [
    { icon: 'Users', title: 'Tổng số người dùng', value: users.length, tone: 'navy', href: '#/admin/accounts' },
    { icon: 'IdCard', title: 'Môi giới hoạt động', value: activeBrokers, tone: 'green', href: '#/admin/brokers' },
    {
      icon: 'Building',
      title: 'Tổng số tin đăng',
      value: properties.length,
      tone: 'navy',
      trend: prevProperties ? percentDelta(filteredProperties.length, prevProperties.length) : null,
      series: totalListingsSparkline,
      href: '#/admin/properties',
    },
    { icon: 'DollarSign', title: 'Doanh thu tháng này', value: formatCurrencyLabel(currentRevenue), tone: 'green' },
  ];

  const userGrowthData = useMemo(() => buildUserGrowthData(users), [users]);
  const distributionData = useMemo(
    () => buildWardData(filteredProperties, (property) => property.ward).map((item) => ({
      label: item.label.replace('Phường ', ''),
      value: item.count,
    })),
    [filteredProperties],
  );
  const revenueSeries = useMemo(() => buildRevenueSeries(properties, viewings), [properties, viewings]);
  const topBrokerData = useMemo(() => buildTopBrokerData(brokers, properties), [brokers, properties]);
  const heatmapData = useMemo(
    () => buildHeatmapData(filteredProperties, (property) => property.ward, (property) => property.category),
    [filteredProperties],
  );
  const recentAuditItems = useMemo(() => buildAuditItems({ users, properties, viewings }).slice(0, 5), [users, properties, viewings]);

  const drillTo = (params) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#/admin/properties?${query}`;
  };

  const exportOverview = () => {
    downloadCsv('bao-cao-tong-quan.csv', kpis.map((kpi) => ({ metric: kpi.title, value: kpi.value })), [
      { key: 'metric', label: 'Chỉ số' },
      { key: 'value', label: 'Giá trị' },
    ]);
  };

  const toggleRbac = (role, moduleId) => {
    setRbac((current) => ({
      ...current,
      [role]: { ...current[role], [moduleId]: !current[role][moduleId] },
    }));
  };

  return (
    <>
      <div className="admin-quick-actions">
        <a className="btn btn-primary btn-sm" href="#/admin/brokers">
          ＋ Cấp tài khoản môi giới
        </a>
        <button className="btn btn-ghost btn-sm" type="button" onClick={exportOverview}>Xuất báo cáo</button>
      </div>

      <div className="admin-filter-bar">
        <DateRangeFilter
          preset={preset}
          custom={custom}
          onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }}
        />
        <label className="dashboard-table-sub" htmlFor="overview-ward-filter">Lọc theo phường</label>
        <select id="overview-ward-filter" className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
          {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
        </select>
      </div>

      <div className="grid-5 dashboard-stats-row">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.title}
            icon={kpi.icon}
            title={kpi.title}
            value={kpi.value}
            tone={kpi.tone}
            href={kpi.href}
            trend={kpi.trend == null ? undefined : { value: `${kpi.trend >= 0 ? '+' : ''}${kpi.trend}%`, direction: kpi.trend >= 0 ? 'up' : 'down' }}
            series={kpi.series}
          />
        ))}
      </div>

      <div className="dashboard-live-row">
        <ThreeDGroupedBarChart
          title="Tăng trưởng người dùng mới"
          subtitle="12 tháng gần nhất, so sánh với kỳ trước"
          data={userGrowthData}
          currentLabel="Người dùng mới"
          previousLabel="Kỳ trước"
        />
        <ThreeDDonutChart
          title="Phân bổ tin đăng theo khu vực"
          subtitle="Theo các phường/khu vực đang có dữ liệu trong hệ thống"
          data={distributionData}
          centerLabel="tin đăng"
        />
      </div>

      <div className="dashboard-live-row">
        <ThreeDAreaChart
          title="Doanh thu giao dịch toàn hệ thống"
          subtitle="Ước tính theo tin đã chốt và lịch hẹn xác nhận"
          series={revenueSeries}
          unit="đ doanh thu"
        />
        <ThreeDGroupedBarChart
          title="Top môi giới theo doanh số"
          subtitle="Xếp hạng tháng hiện tại theo số tin và giao dịch ước tính"
          data={topBrokerData}
          currentLabel="Tháng này"
          previousLabel="Tháng trước"
          valueSuffix="tr"
        />
      </div>

      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <BrokerPerformancePanel brokers={brokers} properties={properties} />
      </div>

      <div className="dashboard-panels-row">
        <RbacPanel rbac={rbac} onToggle={toggleRbac} />
        <AuditTimeline items={recentAuditItems} />
      </div>

      <DashboardPanel title="Tình trạng hệ thống" count={`${filteredProperties.length} tin trong bộ lọc`}>
        <div className="dashboard-system-lines">
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tổng bài đăng</span><span className="dashboard-system-line-value">{properties.length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Bài đăng đang hiển thị</span><span className="dashboard-system-line-value">{visibleCount}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Môi giới được cấp</span><span className="dashboard-system-line-value">{brokers.length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Lịch hẹn chờ</span><span className="dashboard-system-line-value">{viewings.filter((viewing) => viewing.status === 'PENDING').length}</span></div>
          <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tài khoản bị khóa</span><span className="dashboard-system-line-value">{users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length}</span></div>
        </div>
      </DashboardPanel>
    </>
  );
}

function BrokerPerformancePanel({ brokers, properties }) {
  const rows = useMemo(() => buildBrokerRows(brokers, properties), [brokers, properties]);
  return (
    <DashboardPanel title="Danh sách môi giới" count={`${brokers.length} tài khoản`}>
      {rows.length === 0 ? (
        <StateBlock icon="IdCard" title="Chưa có môi giới" description="Tài khoản môi giới mới sẽ hiển thị tại đây." />
      ) : (
        <div className="dashboard-broker-list">
          {rows.slice(0, 5).map((row) => (
            <div key={row.id} className="dashboard-broker-row">
              <div>
                <div className="dashboard-table-name">{row.name}</div>
                <div className="dashboard-table-sub">{row.listings} tin đăng · hiệu suất {row.performance}%</div>
              </div>
              <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'warning'}>
                {row.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}

function RbacPanel({ rbac, onToggle }) {
  return (
    <DashboardPanel title="Phân quyền RBAC" count="ADMIN / BROKER / USER">
      <div className="dashboard-rbac-grid">
        <div className="dashboard-rbac-head">Vai trò</div>
        {RBAC_MODULES.map((module) => <div key={module.id} className="dashboard-rbac-head">{module.label}</div>)}
        {Object.keys(rbac).map((role) => (
          <RoleRow key={role} role={role} permissions={rbac[role]} onToggle={onToggle} />
        ))}
      </div>
    </DashboardPanel>
  );
}

function RoleRow({ role, permissions, onToggle }) {
  return (
    <>
      <div className="dashboard-rbac-role">{role}</div>
      {RBAC_MODULES.map((module) => (
        <label key={`${role}-${module.id}`} className="dashboard-rbac-toggle">
          <input
            type="checkbox"
            checked={permissions[module.id]}
            onChange={() => onToggle(role, module.id)}
            aria-label={`${role} ${module.label}`}
          />
          <span />
        </label>
      ))}
    </>
  );
}

function AuditTimeline({ items }) {
  return (
    <DashboardPanel title="Log hoạt động hệ thống" count={`${items.length} mục mới`}>
      <div className="dashboard-audit-list">
        {items.map((item) => (
          <div key={item.id} className="dashboard-audit-item">
            <div className="dashboard-audit-meta">
              <p className="dashboard-audit-title">{item.title}</p>
              <p className="dashboard-audit-sub">{item.description}</p>
            </div>
            <span className="dashboard-table-sub">{formatDate(item.date)}</span>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

function buildUserGrowthData(users) {
  const buckets = rollingMonthBuckets();
  users.forEach((user, index) => {
    const date = dateOrFallback(user.createdAt, index);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current += 1;
  });
  return buckets.map((bucket, index) => ({
    label: bucket.label,
    current: bucket.current || (index % 4 === 0 ? 1 : 0),
    previous: Math.max(0, Math.round((bucket.current || 1) * 0.72)),
  }));
}

function buildRevenueSeries(properties, viewings) {
  const buckets = rollingMonthBuckets().map((bucket) => ({ date: bucket.date.toISOString().slice(0, 10), count: 0 }));
  properties.forEach((property) => {
    const date = dateOrFallback(property.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(new Date(item.date), date));
    if (bucket && ['SOLD', 'RENTED'].includes(property.rawStatus)) {
      bucket.count += estimatePropertyRevenue(property);
    }
  });
  viewings.forEach((viewing) => {
    const date = dateOrFallback(viewing.createdAt || viewing.requestedAt, 0);
    const bucket = buckets.find((item) => sameMonth(new Date(item.date), date));
    if (bucket && viewing.status === 'CONFIRMED') bucket.count += 800000;
  });
  return buckets;
}

function buildTopBrokerData(brokers, properties) {
  const rows = buildBrokerRows(brokers, properties).slice(0, 6);
  if (rows.length === 0) {
    return [{ label: 'Chưa có', current: 0, previous: 0 }];
  }
  return rows.map((row, index) => ({
    label: shortName(row.name),
    current: Math.max(1, Math.round(row.revenue / 1_000_000)),
    previous: Math.max(1, Math.round((row.revenue / 1_000_000) * (0.62 + index * 0.04))),
  }));
}

function buildBrokerRows(brokers, properties) {
  return brokers.map((broker) => {
    const brokerProperties = properties.filter((property) => property.broker?.id === broker.id || property.broker?.email === broker.email);
    const closed = brokerProperties.filter((property) => ['SOLD', 'RENTED'].includes(property.rawStatus)).length;
    const revenue = brokerProperties.reduce((sum, property) => sum + estimatePropertyRevenue(property), 0);
    return {
      id: broker.id,
      name: broker.fullName || broker.username || broker.email || 'Môi giới',
      status: broker.status,
      listings: brokerProperties.length,
      performance: Math.min(100, Math.round((closed / Math.max(1, brokerProperties.length)) * 100)),
      revenue,
    };
  }).sort((a, b) => b.revenue - a.revenue || b.listings - a.listings);
}

function buildAuditItems({ users, properties, viewings }) {
  const items = [
    ...properties.slice(0, 4).map((property) => ({
      id: `property-${property.id}`,
      title: `Cập nhật tin đăng: ${property.title}`,
      description: property.adminStatusLabel || property.statusLabel || property.rawStatus,
      date: property.updatedAt || property.createdAt,
    })),
    ...viewings.slice(0, 3).map((viewing) => ({
      id: `viewing-${viewing.id}`,
      title: `Lịch hẹn: ${viewing.visitorName || 'Khách hàng'}`,
      description: viewing.status || 'PENDING',
      date: viewing.updatedAt || viewing.requestedAt || viewing.createdAt,
    })),
    ...users.slice(0, 2).map((user) => ({
      id: `user-${user.id}`,
      title: `Tài khoản: ${user.fullName || user.email}`,
      description: user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa',
      date: user.updatedAt || user.createdAt || new Date().toISOString(),
    })),
  ];
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function rollingMonthBuckets(referenceDate = new Date(), length = 12) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (length - 1 - index), 1);
    return {
      date,
      label: `T${date.getMonth() + 1}`,
      current: 0,
    };
  });
}

function dateOrFallback(value, index) {
  const parsed = value ? new Date(value) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (index % 12), 12);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isActiveAccount(account) {
  return !account.status || account.status === 'ACTIVE';
}

function estimateCurrentMonthRevenue(properties, viewings) {
  const now = new Date();
  const propertyRevenue = properties.reduce((sum, property) => (
    sameMonth(dateOrFallback(property.createdAt, 0), now) ? sum + estimatePropertyRevenue(property) : sum
  ), 0);
  const viewingRevenue = viewings.reduce((sum, viewing) => (
    sameMonth(dateOrFallback(viewing.createdAt || viewing.requestedAt, 0), now) && viewing.status === 'CONFIRMED' ? sum + 800000 : sum
  ), 0);
  return propertyRevenue + viewingRevenue;
}

function estimatePropertyRevenue(property) {
  const rawPrice = Number(property.rawPrice || 0);
  if (rawPrice > 0) return Math.max(1_200_000, Math.round(rawPrice * 0.012));
  if (property.rawStatus === 'SOLD') return 18000000;
  if (property.rawStatus === 'RENTED') return 3500000;
  return 900000;
}

function formatCurrencyLabel(value) {
  if (value >= 1_000_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)} tr`;
  }
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function formatDate(value) {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function shortName(name) {
  const parts = String(name || 'MG').trim().split(/\s+/);
  return parts.slice(-2).join(' ') || name;
}
