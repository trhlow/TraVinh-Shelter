import { useMemo, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { DashboardPanel, LoadingRows, StateBlock, StatusBadge } from '../../components/DashboardWidgets.jsx';
import { categoryLabel } from '../../data/locations.js';

const ALL = 'all';

// Ported from the pre-react-admin AdminDashboard properties section.
// Table-ified with the shared DataTable in Task 13.
export default function PropertiesSection({ data, loading, saving, actions }) {
  const { properties } = data;
  const [propertyQuery, setPropertyQuery] = useState('');
  const [propertyStatusFilter, setPropertyStatusFilter] = useState(ALL);

  const filteredProperties = useMemo(() => properties.filter((property) => {
    const query = propertyQuery.trim().toLowerCase();
    const broker = property.broker || {};
    const matchesQuery = !query || [
      property.title,
      property.address,
      property.priceLabel,
      property.adminStatusLabel,
      property.statusLabel,
      property.rawStatus,
      categoryLabel(property.category),
      broker.name,
      broker.email,
      broker.phone,
    ].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesStatus = propertyStatusFilter === ALL || property.rawStatus === propertyStatusFilter;
    return matchesQuery && matchesStatus;
  }), [properties, propertyQuery, propertyStatusFilter]);

  function removeProperty(property) {
    if (property.rawStatus === 'HIDDEN') return;
    if (!window.confirm('Gỡ bài đăng này khỏi trang công khai?')) return;
    actions.changePropertyStatus(property.id, 'HIDDEN');
  }

  return (
    <DashboardPanel
      title="Bài đăng từ môi giới"
      count={`${filteredProperties.length}/${properties.length} tin đăng`}
      action={(
        <div className="dashboard-filter-row">
          <input className="input" placeholder="Tìm tin, môi giới, SĐT..." value={propertyQuery} onChange={(event) => setPropertyQuery(event.target.value)} />
          <select className="input" value={propertyStatusFilter} onChange={(event) => setPropertyStatusFilter(event.target.value)}>
            <option value={ALL}>Tất cả trạng thái</option>
            <option value="AVAILABLE">Đang hiển thị</option>
            <option value="RENTED">Đã thuê</option>
            <option value="SOLD">Đã bán</option>
            <option value="HIDDEN">Đã gỡ / tạm ẩn</option>
          </select>
        </div>
      )}
    >
      <PropertyTable
        properties={filteredProperties}
        loading={loading}
        saving={saving}
        onStatus={actions.changePropertyStatus}
        onRemove={removeProperty}
      />
    </DashboardPanel>
  );
}

function PropertyTable({ properties, loading, saving = false, onStatus, onRemove }) {
  const hasActions = Boolean(onStatus && onRemove);
  if (loading) return <LoadingRows rows={5} />;
  if (properties.length === 0) return <StateBlock title="Không có bài đăng phù hợp" description="Thử đổi từ khóa hoặc bộ lọc trạng thái." />;
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Bài đăng</th>
            <th>Môi giới</th>
            <th>Danh mục</th>
            <th>Giá</th>
            <th>Trạng thái</th>
            <th>Ngày tạo</th>
            {hasActions && <th className="dashboard-table-right">Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {properties.map((property) => (
            <tr key={property.id}>
              <td>
                <a className="dashboard-property-cell" href={`#/property/${property.id}`}>
                  <img className="dashboard-property-thumb" src={property.image} alt={property.title} />
                  <div>
                    <div className="dashboard-table-name">{property.title}</div>
                    <div className="dashboard-table-sub">{property.address}</div>
                  </div>
                </a>
              </td>
              <td>{property.broker?.name || 'Công Tín Land'}</td>
              <td>{categoryLabel(property.category)}</td>
              <td className="dashboard-table-name">{property.priceLabel}</td>
              <td><StatusBadge tone={propertyStatusTone(property)}>{property.adminStatusLabel || property.statusLabel || property.rawStatus}</StatusBadge></td>
              <td className="dashboard-table-sub">{formatDate(property.createdAt)}</td>
              {hasActions && (
                <td className="dashboard-table-right">
                  <div className="dashboard-property-actions">
                    <select className="input" value={property.rawStatus} onChange={(event) => onStatus(property.id, event.target.value)} disabled={saving}>
                      <option value="AVAILABLE">Đang hiển thị</option>
                      <option value="RENTED">Đã thuê</option>
                      <option value="SOLD">Đã bán</option>
                      <option value="HIDDEN">Đã gỡ / tạm ẩn</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => onRemove(property)} disabled={saving || property.rawStatus === 'HIDDEN'} aria-label="Gỡ bài đăng" type="button">
                      <Icon name="EyeOff" size={16} className="icon-muted" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function isAvailableProperty(property) {
  return property.rawStatus === 'AVAILABLE' || String(property.statusLabel || '').toLowerCase().includes('hiển thị');
}

function isPendingProperty(property) {
  const status = String(property.rawStatus || property.statusLabel || '').toLowerCase();
  return status.includes('pending') || status.includes('chờ') || status.includes('duyệt');
}

function propertyStatusTone(property) {
  if (isAvailableProperty(property)) return 'success';
  if (isPendingProperty(property)) return 'warning';
  if (property.rawStatus === 'SOLD' || property.rawStatus === 'RENTED') return 'info';
  return 'muted';
}

function formatDate(value) {
  if (!value) return 'Đang cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Đang cập nhật';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
