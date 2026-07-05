import { useMemo, useState } from 'react';
import {
  buildDailySeries, buildHeatmapData, buildWardData, DonutChart, GaugeChart, HeatmapChart, TrendAreaChart, WardBarChart,
} from '../../components/Charts.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatCard, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES, categoryLabel } from '../../data/locations.js';
import { isInRange, previousRange, percentDelta, resolveDateRange } from '../../utils/dateRange.js';
import { downloadCsv } from '../../utils/exportCsv.js';

export default function OverviewSection({ data, loading }) {
  const { users, brokers, properties, viewings } = data;
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

  const pendingViewings = useMemo(
    () => viewings.filter((viewing) => viewing.status === 'PENDING' && isInRange(viewing.requestedAt, range)),
    [viewings, range],
  );

  const visibleCount = filteredProperties.filter((property) => property.rawStatus === 'AVAILABLE').length;

  const newPostsSparkline = useMemo(
    () => buildDailySeries(filteredProperties, (property) => property.createdAt, 7).map((bucket) => bucket.count),
    [filteredProperties],
  );
  const visibleSparkline = useMemo(
    () => buildDailySeries(
      filteredProperties.filter((property) => property.rawStatus === 'AVAILABLE'),
      (property) => property.createdAt,
      7,
    ).map((bucket) => bucket.count),
    [filteredProperties],
  );

  const kpis = [
    { icon: 'Building', title: 'Bài đăng mới', value: filteredProperties.length, tone: 'navy', delta: prevProperties ? percentDelta(filteredProperties.length, prevProperties.length) : null, series: newPostsSparkline },
    { icon: 'Eye', title: 'Đang hiển thị', value: visibleCount, tone: 'green', delta: prevProperties ? percentDelta(visibleCount, prevProperties.filter((property) => property.rawStatus === 'AVAILABLE').length) : null, series: visibleSparkline },
    { icon: 'IdCard', title: 'Môi giới', value: brokers.length, tone: 'orange', delta: null },
    { icon: 'Calendar', title: 'Lịch hẹn chờ', value: pendingViewings.length, tone: 'navy', delta: null },
  ];

  const activitySeries = useMemo(() => {
    const propertySeries = buildDailySeries(properties, (property) => property.createdAt, 30);
    const viewingSeries = buildDailySeries(viewings, (viewing) => viewing.createdAt, 30);
    return propertySeries.map((bucket, index) => ({ date: bucket.date, count: bucket.count + viewingSeries[index].count }));
  }, [properties, viewings]);

  const wardData = useMemo(() => buildWardData(filteredProperties, (property) => property.ward), [filteredProperties]);
  const heatmapData = useMemo(
    () => buildHeatmapData(filteredProperties, (property) => property.ward, (property) => property.category),
    [filteredProperties],
  );
  const roleChart = useMemo(() => ([
    { label: 'Môi giới', value: brokers.length },
    { label: 'Admin', value: users.filter((user) => user.role === 'ADMIN').length },
  ]), [users, brokers]);
  const visiblePercent = filteredProperties.length > 0 ? Math.round((visibleCount / filteredProperties.length) * 100) : 0;

  const recentProperties = useMemo(() => (
    [...filteredProperties].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)
  ), [filteredProperties]);

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

      <div className="grid-4 dashboard-stats-row">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.title}
            icon={kpi.icon}
            title={kpi.title}
            value={kpi.value}
            tone={kpi.tone}
            trend={kpi.delta == null ? undefined : { value: `${kpi.delta >= 0 ? '+' : ''}${kpi.delta}%`, direction: kpi.delta >= 0 ? 'up' : 'down' }}
            series={kpi.series}
          />
        ))}
      </div>

      <div className="dashboard-live-row">
        <TrendAreaChart
          title="Hoạt động hệ thống (bài đăng + lịch hẹn, 30 ngày)"
          series={activitySeries}
          unit="lượt hoạt động"
        />
        <WardBarChart title="BĐS theo khu vực Trà Vinh" data={wardData} onSelectWard={(code) => drillTo({ ward: code })} />
      </div>

      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <DonutChart title="Cơ cấu tài khoản" data={roleChart} centerLabel="tài khoản" />
        <GaugeChart title="Tỷ lệ bài đăng hiển thị" value={visiblePercent} max={100} label="Đang hiển thị" />
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
        <DashboardPanel title="Tình trạng hệ thống">
          <div className="dashboard-system-lines">
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tổng bài đăng</span><span className="dashboard-system-line-value">{filteredProperties.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Bài đăng đang hiển thị</span><span className="dashboard-system-line-value">{visibleCount}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Môi giới được cấp</span><span className="dashboard-system-line-value">{brokers.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Lịch hẹn chờ</span><span className="dashboard-system-line-value">{pendingViewings.length}</span></div>
            <div className="dashboard-system-line"><span className="dashboard-system-line-label">Tài khoản bị khóa</span><span className="dashboard-system-line-value">{users.filter((user) => user.status === 'LOCKED' || user.status === 'BLOCKED').length}</span></div>
          </div>
        </DashboardPanel>
      </div>
    </>
  );
}
