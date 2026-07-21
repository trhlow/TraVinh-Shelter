import { useState } from 'react';
import Icon from './ui/Icon.jsx';
import { wardLabel } from '../data/locations.js';

const CATEGORY_LABEL = {
  tro: 'Trọ',
  nha: 'Nhà',
  dat: 'Đất',
};

// Listings no longer on offer get a dim overlay rather than a badge, so
// browsing eyes skip them instead of reading them.
const CLOSED_STATUS = {
  'Đã bán': 'Đã bán',
  SOLD: 'Đã bán',
  'Đã thuê': 'Đã thuê',
  RENTED: 'Đã thuê',
};

function Facts({ area, bedrooms, bathrooms, roomsTotal, roomsAvailable }) {
  const facts = [];
  if (area > 0) facts.push({ key: 'area', icon: 'Maximize2', text: `${area}m²` });
  if (bedrooms > 0) facts.push({ key: 'bed', icon: 'Bed', text: `${bedrooms} PN` });
  if (bathrooms > 0) facts.push({ key: 'bath', icon: 'Bath', text: `${bathrooms} WC` });
  if (roomsTotal > 0) {
    facts.push({
      key: 'rooms',
      icon: 'BedDouble',
      text: roomsAvailable > 0 ? `Còn ${roomsAvailable} phòng` : 'Hết phòng trống',
    });
  }
  if (facts.length === 0) return null;

  return (
    <p className="pcard-facts">
      {facts.map((fact, index) => (
        <span key={fact.key} className="pcard-fact">
          {index > 0 && <span className="pcard-fact-sep" aria-hidden="true">·</span>}
          <Icon name={fact.icon} size={14} />
          {fact.text}
        </span>
      ))}
    </p>
  );
}

// A trọ listing with per-room prices shows the honest range instead of a
// single number that matches no actual room.
function roomsPriceLabel(rooms) {
  const prices = rooms.map((room) => room.price).filter((price) => price > 0);
  if (prices.length === 0) return null;
  const fmt = (value) => (value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? `${fmt(min)} triệu/tháng` : `${fmt(min)} – ${fmt(max)} triệu/tháng`;
}

export default function PropertyCard({ property }) {
  const href = property.id ? `#/property/${property.id}` : '#/property';
  const closedLabel = CLOSED_STATUS[property.status];
  const place = property.ward && property.ward !== 'all' ? wardLabel(property.ward) : property.address;
  const rooms = Array.isArray(property.rooms) ? property.rooms : [];
  const priceLabel = (rooms.length > 0 && roomsPriceLabel(rooms)) || property.priceLabel;
  // A URL being present doesn't mean the photo loads — broken/unreachable
  // URLs must fall back to the same empty state as no URL at all.
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(property.image) && !imageFailed;

  return (
    <article className="pcard">
      <a href={href} className="pcard-media pcard-link" tabIndex={-1} aria-hidden="true">
        {hasImage ? (
          <img
            className="pcard-img"
            src={property.image}
            alt=""
            width="400"
            height="300"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="pcard-img-empty">
            <Icon name="Image" size={20} />
            Chưa có ảnh
          </span>
        )}
        {CATEGORY_LABEL[property.category] && (
          <span className="pcard-chip">{CATEGORY_LABEL[property.category]}</span>
        )}
        {closedLabel && <span className="pcard-state">{closedLabel}</span>}
      </a>

      <div className="pcard-body">
        <p className={priceLabel ? 'pcard-price' : 'pcard-price pcard-price-empty'}>
          {priceLabel || 'Giá thương lượng'}
        </p>

        <Facts
          area={property.area}
          bedrooms={property.bedrooms}
          bathrooms={property.bathrooms}
          roomsTotal={rooms.length}
          roomsAvailable={rooms.filter((room) => room.available).length}
        />

        {place && (
          <p className="pcard-ward">
            <Icon name="MapPin" size={14} />
            {place}
          </p>
        )}

        <a href={href} className="pcard-title pcard-link">{property.title}</a>
      </div>
    </article>
  );
}
