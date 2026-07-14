import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { TRA_VINH_CENTER } from '../../utils/mapConstants.js';
import { arrowMarkerIcon } from '../../utils/mapMarkerIcon.js';

const ARROW_ICON = arrowMarkerIcon();

export default function LocationPicker({ lat, lng, onChange }) {
  const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);
  const initialCenter = hasPosition ? [lat, lng] : TRA_VINH_CENTER;

  return (
    <div>
      <MapContainer center={initialCenter} zoom={hasPosition ? 15 : 13} scrollWheelZoom={false} className="location-picker">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasPosition && <Marker position={[lat, lng]} icon={ARROW_ICON} />}
      </MapContainer>
    </div>
  );
}
