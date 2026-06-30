import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { WARDS, TRA_VINH_CENTER } from '../data/locations.js';

// Vite doesn't resolve Leaflet's internal image URLs, so build the marker icon
// from explicitly imported assets instead of relying on L.Icon.Default.
const wardMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const WARD_MARKERS = WARDS.filter((ward) => ward.code !== 'all' && ward.lat && ward.lng);

export default function WardMap() {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Guard against StrictMode's double-invoke re-initialising the same container.
    if (mapRef.current || !containerRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: [TRA_VINH_CENTER.lat, TRA_VINH_CENTER.lng],
      zoom: TRA_VINH_CENTER.zoom,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    WARD_MARKERS.forEach((ward) => {
      L.marker([ward.lat, ward.lng], { icon: wardMarkerIcon })
        .addTo(map)
        .bindPopup(
          `<strong>${ward.label}</strong><br/>`
          + `<a href="#/search?category=tro&amp;ward=${ward.code}">Xem phòng trọ</a>`,
        );
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="ward-map"
      role="region"
      aria-label="Bản đồ phòng trọ theo khu vực Trà Vinh"
    />
  );
}
