import L from 'leaflet';

export function arrowMarkerIcon() {
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
