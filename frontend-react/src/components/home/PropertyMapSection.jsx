import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { TRA_VINH_CENTER } from '../../utils/mapConstants.js';
import { arrowMarkerIcon } from '../../utils/mapMarkerIcon.js';

const ARROW_ICON = arrowMarkerIcon();

export default function PropertyMapSection({ properties = [] }) {
  const pins = properties.filter((property) => Number.isFinite(property.lat) && Number.isFinite(property.lng));
  if (pins.length === 0) return null;

  return (
    <section className="section home-map-section">
      <div className="container">
        <div className="section-header">
          <div className="section-header-text">
            <h2 className="text-display-md">Bất động sản trên bản đồ</h2>
            <p>Xem vị trí thực tế các tin đăng tại Trà Vinh</p>
          </div>
        </div>
        <div className="home-map-container">
          <MapContainer center={TRA_VINH_CENTER} zoom={13} scrollWheelZoom={false} className="home-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pins.map((property) => (
              <Marker key={property.id || property.title} position={[property.lat, property.lng]} icon={ARROW_ICON}>
                <Popup>
                  <a className="home-map-popup" href={`#/property/${property.id}`}>
                    <img src={property.image} alt={property.title} />
                    <span className="home-map-popup-title">{property.title}</span>
                    <span className="home-map-popup-price">{property.priceLabel}</span>
                  </a>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  );
}
