import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const { capturedHandlersRef, mockSetView } = vi.hoisted(() => ({
  capturedHandlersRef: { current: null },
  mockSetView: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center, zoom, className }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom} className={className}>
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: ({ position }) => <div data-testid="map-marker" data-lat={position?.[0]} data-lng={position?.[1]} />,
  useMap: () => ({ setView: mockSetView }),
  useMapEvents: (handlers) => { capturedHandlersRef.current = handlers; return null; },
}));

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));

import LocationPicker from './LocationPicker.jsx';

afterEach(() => { cleanup(); capturedHandlersRef.current = null; mockSetView.mockClear(); });

test('with no position, centers on Trà Vinh and renders no marker', () => {
  render(<LocationPicker lat={null} lng={null} onChange={vi.fn()} />);
  const map = screen.getByTestId('map-container');
  expect(JSON.parse(map.dataset.center)).toEqual([9.9347, 106.3453]);
  expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument();
});

test('with a valid position, centers on it and renders a marker there', () => {
  render(<LocationPicker lat={9.927833} lng={106.339167} onChange={vi.fn()} />);
  const map = screen.getByTestId('map-container');
  expect(JSON.parse(map.dataset.center)).toEqual([9.927833, 106.339167]);
  const marker = screen.getByTestId('map-marker');
  expect(marker.dataset.lat).toBe('9.927833');
  expect(marker.dataset.lng).toBe('106.339167');
});

test('clicking the map calls onChange with the clicked coordinates', () => {
  const onChange = vi.fn();
  render(<LocationPicker lat={null} lng={null} onChange={onChange} />);
  capturedHandlersRef.current.click({ latlng: { lat: 9.93, lng: 106.34 } });
  expect(onChange).toHaveBeenCalledWith(9.93, 106.34);
});
