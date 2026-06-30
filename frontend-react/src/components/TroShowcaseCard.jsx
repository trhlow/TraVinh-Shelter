import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

// Format a monthly rent (VND) to "X triệu", mirroring formatRoomPrice in RoomList.jsx.
function toMillions(price) {
  return (price / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
}

function priceRangeLabel(rooms, fallbackLabel) {
  const prices = rooms.map(room => room.price).filter(price => price > 0);
  if (prices.length === 0) return fallbackLabel || 'Liên hệ';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `Giá: ${toMillions(min)} triệu/tháng`;
  return `Giá từ ${toMillions(min)} đến ${toMillions(max)} triệu/tháng`;
}

export default function TroShowcaseCard({ property }) {
  // Defensive: a network-error fallback may pass raw template objects that lack
  // id/rooms and use `location` instead of `address` (see normalizeProperty in api.js).
  const rooms = Array.isArray(property.rooms) ? property.rooms : [];
  const address = property.address || property.location;
  const availableCount = rooms.filter(room => room.available).length;
  const href = property.id ? `#/property/${property.id}` : undefined;

  const Wrapper = href ? 'a' : 'div';

  return (
    <Wrapper href={href} className="tro-showcase-card">
      <div className="tro-showcase-image">
        <img src={property.image} alt={property.title} loading="lazy" />
        <Badge variant="success" className="tro-showcase-badge">
          <Icon name="ShieldCheck" size={13} /> Đã xác thực
        </Badge>
        {rooms.length > 0 && (
          <span className="tro-showcase-rooms">
            <Icon name="BedDouble" size={13} /> Còn {availableCount} phòng trống
          </span>
        )}
      </div>

      <div className="tro-showcase-body">
        <h3 className="tro-showcase-title">{property.title}</h3>
        {address && (
          <p className="tro-showcase-address">
            <Icon name="MapPin" size={14} /> {address}
          </p>
        )}
        <p className="tro-showcase-price">{priceRangeLabel(rooms, property.priceLabel)}</p>
        {rooms.length > 0 && (
          <p className="tro-showcase-total">Tổng: {rooms.length} phòng</p>
        )}
      </div>
    </Wrapper>
  );
}
