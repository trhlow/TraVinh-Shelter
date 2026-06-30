import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const STATUS_VARIANT = {
  'Đang hiển thị': 'success',
  AVAILABLE:       'success',
  'Đã bán':        'neutral',
  SOLD:            'neutral',
  'Đã thuê':       'neutral',
  RENTED:          'neutral',
  'Đã ẩn':         'error',
  PENDING:         'warning',
};

const NON_FEATURED = new Set(['Đã bán', 'SOLD', 'Đã thuê', 'RENTED', 'Đã ẩn', 'PENDING']);

export default function PropertyCard({ property, compact = false }) {
  const price = property.priceLabel || property.price;
  const location = property.address || property.location;
  const href = property.id ? `#/property/${property.id}` : '#/property';
  const showFeatured = !NON_FEATURED.has(property.status);
  const showStatus   = NON_FEATURED.has(property.status);

  return (
    <article className="property-card">
      <a href={href} className="property-card-image-wrap">
        <img
          className="property-card-img"
          src={property.image}
          alt={property.title}
          loading="lazy"
        />
        {showFeatured && (
          <span className="property-card-featured-badge">Nổi bật</span>
        )}
        {showStatus && (
          <span className="property-card-status-overlay">
            <Badge variant={STATUS_VARIANT[property.status] || 'neutral'}>
              {property.status}
            </Badge>
          </span>
        )}
      </a>
      <div className="property-card-meta">
        <a href={href} className="property-card-title">{property.title}</a>
        {location && (
          <p className="property-card-location">
            <Icon name="MapPin" size={13} /> {location}
          </p>
        )}
        {price && <p className="property-card-price">{price}</p>}
      </div>
    </article>
  );
}
