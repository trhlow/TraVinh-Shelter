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
        <span className="property-card-price-badge">
          {price}
        </span>
        {property.status && (
          <span className="property-card-status-badge">
            <Badge variant={statusVariant}>{property.status}</Badge>
          </span>
        )}
      </a>
      <div className="property-card-body">
        <a href={href}>
          <h3 className={compact ? 'property-card-title property-card-title--compact' : 'property-card-title'}>
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
              <span className="property-card-broker-name">
                {broker}
              </span>
            </div>
            <span className="property-card-posted-at">
              {postedAt}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
