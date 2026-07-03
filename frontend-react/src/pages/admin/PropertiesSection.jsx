import { useEffect, useMemo, useState } from 'react';
import { DashboardPanel, StatusBadge } from '../../components/DashboardWidgets.jsx';
import DataTable from '../../components/dashboard/DataTable.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { CATEGORIES, WARDS, categoryLabel, wardLabel } from '../../data/locations.js';

// Used for the toolbar filter select — PENDING is a mock-only display status, not a
// value users search by beyond that, so it's kept here for filtering existing listings.
const STATUS_FILTER_OPTIONS = [
  { id: 'AVAILABLE', label: 'Đang hiển thị' },
  { id: 'PENDING', label: 'Chờ duyệt' },
  { id: 'RENTED', label: 'Đã thuê' },
  { id: 'SOLD', label: 'Đã bán' },
  { id: 'HIDDEN', label: 'Đã gỡ / tạm ẩn' },
];

// Backend PropertyStatus enum has no PENDING (AVAILABLE/RENTED/SOLD/HIDDEN only) — these
// are the only valid mutation targets for the per-row status select.
const STATUS_MUTATION_OPTIONS = [
  { id: 'AVAILABLE', label: 'Đang hiển thị' },
  { id: 'RENTED', label: 'Đã thuê' },
  { id: 'SOLD', label: 'Đã bán' },
  { id: 'HIDDEN', label: 'Đã gỡ / tạm ẩn' },
];

function statusTone(status) {
  if (status === 'AVAILABLE') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'SOLD' || status === 'RENTED') return 'info';
  return 'muted';
}

export default function PropertiesSection({ data, loading, saving, actions, queryParams }) {
  const [ward, setWard] = useState(queryParams.ward || 'all');
  const [category, setCategory] = useState(queryParams.category || 'all');
  const [status, setStatus] = useState(queryParams.status || 'all');

  // The admin shell reuses this mounted component across hashchanges (no key remount),
  // so the useState seeds above only run once — re-sync when a new drill-down/quick-action
  // navigates here while the section is already mounted.
  useEffect(() => {
    setWard(queryParams.ward || 'all');
    setCategory(queryParams.category || 'all');
    setStatus(queryParams.status || 'all');
  }, [queryParams.ward, queryParams.category, queryParams.status]);

  const filtered = useMemo(() => data.properties.filter((property) => (
    (ward === 'all' || property.ward === ward)
    && (category === 'all' || property.category === category)
    && (status === 'all' || property.rawStatus === status)
  )), [data.properties, ward, category, status]);

  const columns = [
    { key: 'title', label: 'Bài đăng', render: (property) => (
      <a className="dashboard-table-name" href={`#/property/${property.id}`}>{property.title}</a>
    ) },
    { key: 'broker', label: 'Môi giới', sortable: false, render: (property) => property.broker?.name || 'Công Tín Land', csv: (property) => property.broker?.name || 'Công Tín Land' },
    { key: 'ward', label: 'Phường', render: (property) => wardLabel(property.ward), csv: (property) => wardLabel(property.ward) },
    { key: 'category', label: 'Danh mục', render: (property) => categoryLabel(property.category), csv: (property) => categoryLabel(property.category) },
    { key: 'priceLabel', label: 'Giá' },
    { key: 'rawStatus', label: 'Trạng thái', render: (property) => (
      <StatusBadge tone={statusTone(property.rawStatus)}>{property.adminStatusLabel || property.statusLabel || property.rawStatus}</StatusBadge>
    ), csv: (property) => property.adminStatusLabel || property.statusLabel || property.rawStatus },
    { key: 'createdAt', label: 'Ngày tạo', render: (property) => formatDate(property.createdAt), csv: (property) => formatDate(property.createdAt) },
    { key: 'actions', label: 'Thao tác', sortable: false, csv: () => '', render: (property) => (
      <div className="dashboard-property-actions">
        <select
          className="input"
          value={property.rawStatus}
          disabled={saving}
          onChange={(event) => actions.changePropertyStatus(property.id, event.target.value)}
        >
          {property.rawStatus === 'PENDING' && <option value="PENDING" disabled>Chờ duyệt</option>}
          {STATUS_MUTATION_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <button
          className="btn btn-ghost btn-sm"
          type="button"
          aria-label="Gỡ bài đăng"
          disabled={saving || property.rawStatus === 'HIDDEN'}
          onClick={() => {
            if (window.confirm('Gỡ bài đăng này khỏi trang công khai?')) {
              actions.changePropertyStatus(property.id, 'HIDDEN');
            }
          }}
        >
          <Icon name="EyeOff" size={16} className="icon-muted" />
        </button>
      </div>
    ) },
  ];

  const filterToolbar = (
    <>
      <select className="input" aria-label="Lọc theo phường" value={ward} onChange={(event) => setWard(event.target.value)}>
        {WARDS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select>
      <select className="input" aria-label="Lọc theo danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">Tất cả danh mục</option>
        {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
      </select>
      <select className="input" aria-label="Lọc theo trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="all">Tất cả trạng thái</option>
        {STATUS_FILTER_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </>
  );

  return (
    <DashboardPanel title="Bài đăng từ môi giới" count={`${filtered.length}/${data.properties.length} tin đăng`}>
      <DataTable
        columns={columns}
        rows={filtered}
        searchKeys={['title', 'address', 'priceLabel']}
        searchPlaceholder="Tìm tin, địa chỉ..."
        exportFilename="bai-dang.csv"
        loading={loading}
        toolbar={filterToolbar}
        emptyTitle="Không có bài đăng phù hợp"
        emptyDescription="Thử đổi từ khóa hoặc bộ lọc trạng thái."
      />
    </DashboardPanel>
  );
}

function formatDate(value) {
  if (!value) return 'Đang cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(date);
}
