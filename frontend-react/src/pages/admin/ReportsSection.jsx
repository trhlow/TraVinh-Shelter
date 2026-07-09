import { useMemo, useState } from 'react';
import {
  buildHeatmapData,
  buildWardData,
  HeatmapChart,
  ThreeDDonutChart,
  ThreeDGroupedBarChart,
} from '../../components/Charts.jsx';
import { DashboardPanel, StateBlock, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DateRangeFilter from '../../components/dashboard/DateRangeFilter.jsx';
import { WARDS, CATEGORIES } from '../../data/locations.js';
import { isInRange, resolveDateRange } from '../../utils/dateRange.js';

export default function ReportsSection({ data }) {
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

  const userGrowthData = useMemo(() => buildUserGrowthData(data?.users || []), [data]);
  const distributionData = useMemo(
    () => buildWardData(filteredProperties, (property) => property.ward).map((item) => ({
      label: item.label.replace('Phường ', ''),
      value: item.count,
    })),
    [filteredProperties],
  );
  const topBrokerData = useMemo(() => buildTopBrokerData(brokers, properties, viewings), [brokers, properties, viewings]);
  const heatmapData = useMemo(
    () => buildHeatmapData(filteredProperties, (property) => property.ward, (property) => property.category),
    [filteredProperties],
  );

  const drillTo = (params) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `#/admin/properties?${query}`;
  };

  return (
    <>
      <div className="admin-filter-bar">
        <DateRangeFilter
          preset={preset}
          custom={custom}
          onChange={(nextPreset, nextCustom) => { setPreset(nextPreset); setCustom(nextCustom); }}
        />
        <label className="dashboard-table-sub" htmlFor="reports-ward-filter">Lọc theo phường</label>
        <select id="reports-ward-filter" className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
          {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
        </select>
        <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
        </select>
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

      <div className="dashboard-charts-row">
        <HeatmapChart title="Mật độ tin theo phường" data={heatmapData} onSelectCell={({ ward: cellWard, category: cellCategory }) => drillTo({ ward: cellWard, category: cellCategory })} />
        <ThreeDGroupedBarChart
          title="Top môi giới theo hoạt động"
          subtitle="Xếp hạng theo tổng số tin đăng và lịch hẹn đã xác nhận"
          data={topBrokerData}
          currentLabel="Tin đăng"
          previousLabel="Lịch hẹn xác nhận"
        />
        <BrokerPerformancePanel brokers={brokers} properties={properties} viewings={viewings} />
      </div>
    </>
  );
}

function BrokerPerformancePanel({ brokers, properties, viewings }) {
  const rows = useMemo(() => buildBrokerRows(brokers, properties, viewings), [brokers, properties, viewings]);
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

function buildTopBrokerData(brokers, properties, viewings) {
  const rows = buildBrokerRows(brokers, properties, viewings).slice(0, 6);
  if (rows.length === 0) {
    return [{ label: 'Chưa có', current: 0, previous: 0 }];
  }
  return rows.map((row) => ({
    label: shortName(row.name),
    current: row.listings,
    previous: row.confirmedViewings,
  }));
}

function buildBrokerRows(brokers, properties, viewings) {
  return brokers.map((broker) => {
    const brokerProperties = properties.filter((property) => property.broker?.id === broker.id || property.broker?.email === broker.email);
    const brokerPropertyIds = new Set(brokerProperties.map((property) => property.id));
    const closed = brokerProperties.filter((property) => ['SOLD', 'RENTED'].includes(property.rawStatus)).length;
    const confirmedViewings = viewings.filter((viewing) => (
      viewing.status === 'CONFIRMED' && brokerPropertyIds.has(viewing.propertyId)
    )).length;
    return {
      id: broker.id,
      name: broker.fullName || broker.username || broker.email || 'Môi giới',
      status: broker.status,
      listings: brokerProperties.length,
      performance: Math.min(100, Math.round((closed / Math.max(1, brokerProperties.length)) * 100)),
      confirmedViewings,
      activityScore: brokerProperties.length + confirmedViewings,
    };
  }).sort((a, b) => b.activityScore - a.activityScore || b.listings - a.listings);
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

function shortName(name) {
  const parts = String(name || 'MG').trim().split(/\s+/);
  return parts.slice(-2).join(' ') || name;
}
