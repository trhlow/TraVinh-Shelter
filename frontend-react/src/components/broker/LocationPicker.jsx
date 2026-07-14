import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { TRA_VINH_CENTER, TRA_VINH_VIEWBOX } from '../../utils/mapConstants.js';
import { arrowMarkerIcon } from '../../utils/mapMarkerIcon.js';
import Icon from '../ui/Icon.jsx';

const ARROW_ICON = arrowMarkerIcon();

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function RecenterOnSearch({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function LocationPicker({ lat, lng, onChange }) {
  const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);
  const initialCenter = hasPosition ? [lat, lng] : TRA_VINH_CENTER;
  const [query, setQuery] = useState('');
  const [searchCenter, setSearchCenter] = useState(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    if (!query.trim()) {
      setSearchError('');
      return undefined;
    }
    const timer = setTimeout(() => {
      runSearch(query);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function runSearch(text) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&viewbox=${TRA_VINH_VIEWBOX}&bounded=1&limit=1`;
      const response = await fetch(url);
      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) {
        setSearchError('Không tìm thấy địa chỉ này');
        return;
      }
      setSearchError('');
      setSearchCenter([Number(results[0].lat), Number(results[0].lon)]);
    } catch {
      setSearchError('Không tìm thấy địa chỉ này');
    }
  }

  return (
    <div>
      <label className="dashboard-search-label location-picker-search">
        <Icon name="Search" size={16} className="icon-muted dashboard-search-icon" />
        <input
          className="input dashboard-search-input"
          placeholder="Tìm địa chỉ để bay tới khu vực..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Tìm địa chỉ trên bản đồ"
        />
      </label>
      {searchError && <p className="form-hint">{searchError}</p>}
      <MapContainer center={initialCenter} zoom={hasPosition ? 15 : 13} scrollWheelZoom={false} className="location-picker">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {searchCenter && <RecenterOnSearch center={searchCenter} />}
        {hasPosition && <Marker position={[lat, lng]} icon={ARROW_ICON} />}
      </MapContainer>
    </div>
  );
}
