import { useMemo, useState } from 'react';
import { buildDailySeries, ThreeDGroupedBarChart } from '../../components/Charts.jsx';
import { DashboardPanel, StatCard } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES } from '../../data/locations.js';
import { isInRange, percentDelta, previousRange, resolveDateRange } from '../../utils/dateRange.js';
import { downloadCsv } from '../../utils/exportCsv.js';
import { trimLeadingEmptyMonths } from '../../utils/chartSeries.js';

export default function OverviewSection({ data, loading, actions }) {
  const users = data?.users || [];
  const brokers = data?.brokers || [];
  const properties = data?.properties || [];
  const viewings = data?.viewings || [];

  const [preset, setPreset] = useState('all');
  const [custom, setCustom] = useState({});
  const [ward, setWard] = useState('all');
  const [category, setCategory] = useState('all');

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
  const confirmedViewingsThisMonth = useMemo(() => {
    const now = new Date();
    return viewings.filter((viewing) => (
      viewing.status === 'CONFIRMED' && sameMonth(dateOrFallback(viewing.createdAt || viewing.requestedAt, 0), now)
    )).length;
  }, [viewings]);
  const visibleCount = filteredProperties.filter((property) => property.rawStatus === 'AVAILABLE').length;

  const totalListingsSparkline = useMemo(
    () => buildDailySeries(filteredProperties, (property) => property.createdAt, 7).map((bucket) => bucket.count),
    [filteredProperties],
  );
  const kpis = [
    { icon: 'Users', title: 'Tổng số người dùng', value: users.length, tone: 'navy' },
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
    { icon: 'CalendarCheck', title: 'Lịch hẹn xác nhận tháng này', value: confirmedViewingsThisMonth, tone: 'green' },
  ];

  const systemActivityData = useMemo(() => buildSystemActivitySeries(properties, viewings), [properties, viewings]);
  const recentAuditItems = useMemo(() => buildAuditItems({ users, properties, viewings }).slice(0, 5), [users, properties, viewings]);

  const exportOverview = () => {
    downloadCsv('bao-cao-tong-quan.csv', kpis.map((kpi) => ({ metric: kpi.title, value: kpi.value })), [
      { key: 'metric', label: 'Chỉ số' },
      { key: 'value', label: 'Giá trị' },
    ]);
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
          title="Hoạt động hệ thống theo tháng"
          subtitle="12 tháng gần nhất — tin đăng mới và lịch hẹn đã xác nhận"
          data={systemActivityData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
      </div>

      <div className="dashboard-panels-row">
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

function buildSystemActivitySeries(properties, viewings) {
  const buckets = rollingMonthBuckets();
  properties.forEach((property) => {
    const date = dateOrFallback(property.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current = (bucket.current || 0) + 1;
  });
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const date = dateOrFallback(viewing.requestedAt || viewing.createdAt, 0);
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.previous = (bucket.previous || 0) + 1;
  });
  return trimLeadingEmptyMonths(buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: bucket.previous || 0,
  })));
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

function formatDate(value) {
  if (!value) return 'Chưa rõ';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa rõ';
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}
