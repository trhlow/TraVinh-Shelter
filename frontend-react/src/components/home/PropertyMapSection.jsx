import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';

const TRA_VINH_CENTER = [9.9347, 106.3453];

function arrowMarkerIcon() {
  return L.divIcon({
    className: 'home-map-marker',
    html: `
      <span class="home-map-marker-pin">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      </span>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

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
              <Marker key={property.id} position={[property.lat, property.lng]} icon={arrowMarkerIcon()}>
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
