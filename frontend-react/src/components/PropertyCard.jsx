import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const STATUS_VARIANT = {
  'Đang hiển thị': 'success',
  'Đã bán': 'neutral',
  'Đã thuê': 'neutral',
  'Đã ẩn': 'error',
};

export default function PropertyCard({ property, compact = false }) {
  const price = property.priceLabel || property.price;
  const location = property.address || property.location;
  const area = property.area
    ? `${property.area}${Number.isFinite(Number(property.area)) ? 'm²' : ''}`
    : property.size;
  const beds = property.bedrooms ?? property.beds;
  const baths = property.bathrooms ?? property.baths;
  const broker = property.broker?.name || property.broker;
  const brokerInitial = property.brokerInitial || broker?.charAt(0) || 'B';
  const postedAt = property.postedAt || 'Mới cập nhật';
  const href = property.id ? `#/property/${property.id}` : '#/property';
  const statusVariant = STATUS_VARIANT[property.status] || 'neutral';

  return (
    <article className="property-card">
      <a href={href} className="property-card-image">
        <img src={property.image} alt={property.title} />
        <span
          style={{
            position: 'absolute', top: 12, left: 12,
            background: 'var(--color-accent)', color: '#fff',
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 700,
          }}
        >
          {price}
        </span>
        {property.status && (
          <span style={{ position: 'absolute', top: 12, right: 12 }}>
            <Badge variant={statusVariant}>{property.status}</Badge>
          </span>
        )}
      </a>
      <div className="property-card-body">
        <a href={href}>
          <h3
            style={{
              fontSize: compact ? 14 : 16,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 8px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {property.title}
          </h3>
        </a>
        <p className="property-card-meta" style={{ marginBottom: 8 }}>
          <span className="property-card-meta-item">
            <Icon name="MapPin" size={13} />
            {location}
          </span>
        </p>
        <div className="property-card-meta">
          {area && (
            <span className="property-card-meta-item">
              <Icon name="Maximize2" size={13} /> {area}
            </span>
          )}
          {beds > 0 && (
            <span className="property-card-meta-item">
              <Icon name="Bed" size={13} /> {beds}
            </span>
          )}
          {baths > 0 && (
            <span className="property-card-meta-item">
              <Icon name="Bath" size={13} /> {baths}
            </span>
          )}
        </div>
        {!compact && (
          <div className="property-card-footer">
            <div className="property-card-broker">
              <div className="broker-avatar">{brokerInitial}</div>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {broker}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {postedAt}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
