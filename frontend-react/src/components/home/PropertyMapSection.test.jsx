import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
}));

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));

import PropertyMapSection from './PropertyMapSection.jsx';

afterEach(() => { cleanup(); });

const withCoords = { id: 'p1', title: 'Nhà phố A', priceLabel: '2 tỷ', image: 'a.jpg', lat: 9.93, lng: 106.34 };
const withoutCoords = { id: 'p2', title: 'Nhà phố B', priceLabel: '3 tỷ', image: 'b.jpg', lat: null, lng: null };

test('renders nothing when no property has valid coordinates', () => {
  const { container } = render(<PropertyMapSection properties={[withoutCoords]} />);
  expect(container).toBeEmptyDOMElement();
});

test('renders one marker per property with valid coordinates, skipping ones without', () => {
  render(<PropertyMapSection properties={[withCoords, withoutCoords]} />);
  expect(screen.getAllByTestId('map-marker')).toHaveLength(1);
});

test('marker popup links to the property detail page', () => {
  render(<PropertyMapSection properties={[withCoords]} />);
  const link = screen.getByRole('link', { name: /Nhà phố A/ });
  expect(link).toHaveAttribute('href', '#/property/p1');
});
