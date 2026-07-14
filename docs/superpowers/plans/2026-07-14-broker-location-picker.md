# Broker Location Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broker listing form's two manual lat/lng number inputs with an interactive Leaflet map (`LocationPicker`) so brokers click the real-world location instead of hand-converting Google Maps coordinates — eliminating the transcription errors that make the homepage and detail-page maps show the wrong spot.

**Architecture:** A new `LocationPicker` React component wraps `react-leaflet`'s `MapContainer`, listens for map clicks via `useMapEvents`, and optionally recenters via `useMap()` when a debounced Nominatim address search resolves. It is a controlled component (`lat`/`lng`/`onChange` props) — `BrokerDashboard.jsx` owns the actual form state, unchanged in shape (still `listingForm.lat`/`listingForm.lng` strings, still validated by the existing `propertyPayload()`/`coordinateOrNull()`). Two small shared modules (`utils/mapConstants.js`, `utils/mapMarkerIcon.js`) are extracted from `PropertyMapSection.jsx` so the new component and the existing homepage map share the same center point and pin icon instead of duplicating them.

**Tech Stack:** React 19, `react-leaflet` 5 / `leaflet` 1.9 (already a dependency), Vitest + Testing Library, Nominatim (OpenStreetMap) geocoding via `fetch` — no new dependencies.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-14-broker-location-picker-design.md` — this plan implements it in full; deviations are called out inline where they occur.
- No external UI library imports; only `lucide-react` for icons (`.claude/rules/design.md`).
- No inline styles, no hard-coded hex colors in JSX — CSS classes + tokens only (`.claude/rules/workflow.md`).
- UI text tiếng Việt, code/comments/commits tiếng Anh, conventional commit prefixes (`.claude/rules/workflow.md`).
- `attributes.lat`/`attributes.lng` stay decimal-degree numbers, validated by the existing `coordinateOrNull(value, -90, 90)` / `coordinateOrNull(value, -180, 180)` in `BrokerDashboard.jsx` — do not change that validation or the payload shape.
- TDD: write the failing test before the implementation for every behavioral step.
- No `git push`; commit locally after each task as instructed below.

---

### Task 1: Extract shared map constants and marker icon

**Files:**
- Create: `frontend-react/src/utils/mapConstants.js`
- Create: `frontend-react/src/utils/mapMarkerIcon.js`
- Modify: `frontend-react/src/components/home/PropertyMapSection.jsx`
- Test: `frontend-react/src/components/home/PropertyMapSection.test.jsx` (existing — run as regression check, no edits expected)

**Interfaces:**
- Produces: `TRA_VINH_CENTER: [number, number]` and `TRA_VINH_VIEWBOX: string` exported from `utils/mapConstants.js`.
- Produces: `arrowMarkerIcon(): L.DivIcon` exported (named export) from `utils/mapMarkerIcon.js`.
- Consumed by: Task 2 (`LocationPicker.jsx`) and this task's own refactor of `PropertyMapSection.jsx`.

This task is a pure extraction (no behavior change), so it is verified by the existing `PropertyMapSection.test.jsx` continuing to pass rather than a new test.

- [ ] **Step 1: Create `utils/mapConstants.js`**

```js
// frontend-react/src/utils/mapConstants.js
export const TRA_VINH_CENTER = [9.9347, 106.3453];

// west,north,east,south — Nominatim viewbox, slightly wider than the
// administrative boundary so edge-of-province results aren't excluded
export const TRA_VINH_VIEWBOX = '105.8,10.15,106.8,9.4';
```

- [ ] **Step 2: Create `utils/mapMarkerIcon.js`**

```js
// frontend-react/src/utils/mapMarkerIcon.js
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
```

- [ ] **Step 3: Refactor `PropertyMapSection.jsx` to use the extracted modules**

Replace the top of the file:

```jsx
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

const ARROW_ICON = arrowMarkerIcon();
```

with:

```jsx
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { TRA_VINH_CENTER } from '../../utils/mapConstants.js';
import { arrowMarkerIcon } from '../../utils/mapMarkerIcon.js';

const ARROW_ICON = arrowMarkerIcon();
```

The rest of the file (the `PropertyMapSection` function body) is unchanged.

- [ ] **Step 4: Run the existing regression test**

Run: `cd frontend-react && npx vitest run src/components/home/PropertyMapSection.test.jsx`
Expected: all 3 existing tests still PASS (the mock of `leaflet`'s `default.divIcon` in that test file covers the icon module too, since `mapMarkerIcon.js` imports `leaflet` the same way the old inline code did).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/utils/mapConstants.js frontend-react/src/utils/mapMarkerIcon.js frontend-react/src/components/home/PropertyMapSection.jsx
git commit -m "refactor: extract shared map center and marker icon into utils"
```

---

### Task 2: `LocationPicker` — initial render (map + optional marker)

**Files:**
- Create: `frontend-react/src/components/broker/LocationPicker.jsx`
- Test: `frontend-react/src/components/broker/LocationPicker.test.jsx`

**Interfaces:**
- Consumes: `TRA_VINH_CENTER` from `utils/mapConstants.js` (Task 1), `arrowMarkerIcon` from `utils/mapMarkerIcon.js` (Task 1).
- Produces: default export `LocationPicker({ lat, lng, onChange })` — a React component. `lat`/`lng` are `number | null`. Later tasks (3, 4, 5) add behavior to this same component; the exported signature does not change.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend-react/src/components/broker/LocationPicker.test.jsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx`
Expected: FAIL — `Failed to resolve import "./LocationPicker.jsx"` (file does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```jsx
// frontend-react/src/components/broker/LocationPicker.jsx
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
```

`onChange` is accepted but unused until Task 3 — keep the parameter now so the public signature is stable across tasks.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/broker/LocationPicker.jsx frontend-react/src/components/broker/LocationPicker.test.jsx
git commit -m "feat: add LocationPicker map with initial center and marker"
```

---

### Task 3: `LocationPicker` — click-to-place marker

**Files:**
- Modify: `frontend-react/src/components/broker/LocationPicker.jsx`
- Modify: `frontend-react/src/components/broker/LocationPicker.test.jsx`

**Interfaces:**
- Consumes: `useMapEvents` from `react-leaflet` (mocked in tests via `capturedHandlersRef` from Task 2's mock setup).
- Produces: clicking the map calls `onChange(lat: number, lng: number)` with the exact clicked coordinates — later tasks and `BrokerDashboard.jsx` (Task 7) rely on this exact call signature.

- [ ] **Step 1: Write the failing test**

Append to `LocationPicker.test.jsx`:

```jsx
test('clicking the map calls onChange with the clicked coordinates', () => {
  const onChange = vi.fn();
  render(<LocationPicker lat={null} lng={null} onChange={onChange} />);
  capturedHandlersRef.current.click({ latlng: { lat: 9.93, lng: 106.34 } });
  expect(onChange).toHaveBeenCalledWith(9.93, 106.34);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx -t "clicking the map"`
Expected: FAIL — `Cannot read properties of null (reading 'click')` (no `useMapEvents` call yet, so `capturedHandlersRef.current` stays `null`).

- [ ] **Step 3: Implement the click handler**

In `LocationPicker.jsx`, add the import and a small internal component, and render it inside `MapContainer`:

```jsx
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
```

Add before the `LocationPicker` function:

```jsx
function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}
```

Inside `MapContainer`, as the first child (before the conditional `Marker`):

```jsx
        <ClickHandler onPick={onChange} />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/broker/LocationPicker.jsx frontend-react/src/components/broker/LocationPicker.test.jsx
git commit -m "feat: place LocationPicker marker on map click"
```

---

### Task 4: `LocationPicker` — debounced address search (Nominatim)

**Files:**
- Modify: `frontend-react/src/components/broker/LocationPicker.jsx`
- Modify: `frontend-react/src/components/broker/LocationPicker.test.jsx`

**Interfaces:**
- Consumes: `TRA_VINH_VIEWBOX` from `utils/mapConstants.js` (Task 1), global `fetch` (mocked in tests), `useMap` from `react-leaflet` (already mocked in Task 2's setup via `mockSetView`).
- Produces: a text input with `aria-label="Tìm địa chỉ trên bản đồ"`. Typing debounces 500ms, then calls Nominatim; a successful single result recenters the map (`mockSetView` in tests / `map.setView` in production) but does **not** call `onChange` and does **not** place a marker — the broker still must click to confirm the exact spot. No results or a network error renders the text "Không tìm thấy địa chỉ này".
- Deviation from spec: implemented as debounce-only (no separate search button/Enter-submit) — the spec listed both as an "either" ("debounce... hoặc bấm nút/Enter"); debounce alone satisfies the stated requirement with less UI surface (YAGNI per `.claude/rules/workflow.md`).

- [ ] **Step 1: Write the failing tests**

Append to `LocationPicker.test.jsx` (add `fireEvent` and `act` to the existing `@testing-library/react` import, and `beforeEach`/`vi` are already imported):

```jsx
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
```

(replace the existing `import { cleanup, render, screen } from '@testing-library/react';` line with the one above)

```jsx
test('typing an address, after the debounce, recenters the map on the geocoding result', async () => {
  vi.useFakeTimers();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve([{ lat: '9.93', lon: '106.34' }]),
  });
  render(<LocationPicker lat={null} lng={null} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Tìm địa chỉ trên bản đồ'), { target: { value: 'Chợ Trà Vinh' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(mockSetView).toHaveBeenCalledWith([9.93, 106.34], 15);
  vi.useRealTimers();
});

test('address search never calls onChange — the broker must still click to confirm', async () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve([{ lat: '9.93', lon: '106.34' }]),
  });
  render(<LocationPicker lat={null} lng={null} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText('Tìm địa chỉ trên bản đồ'), { target: { value: 'Chợ Trà Vinh' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(onChange).not.toHaveBeenCalled();
  vi.useRealTimers();
});

test('no geocoding results shows a not-found message', async () => {
  vi.useFakeTimers();
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) });
  render(<LocationPicker lat={null} lng={null} onChange={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Tìm địa chỉ trên bản đồ'), { target: { value: 'xyz khong ton tai' } });
  await act(async () => { await vi.advanceTimersByTimeAsync(500); });
  expect(screen.getByText('Không tìm thấy địa chỉ này')).toBeInTheDocument();
  vi.useRealTimers();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx -t "address"`
Expected: FAIL — `Unable to find a label with the text of: Tìm địa chỉ trên bản đồ` (no search input yet).

- [ ] **Step 3: Implement the address search**

In `LocationPicker.jsx`, update imports:

```jsx
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { TRA_VINH_CENTER, TRA_VINH_VIEWBOX } from '../../utils/mapConstants.js';
import { arrowMarkerIcon } from '../../utils/mapMarkerIcon.js';
import Icon from '../ui/Icon.jsx';
```

Add a second internal component next to `ClickHandler`:

```jsx
function RecenterOnSearch({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15);
  }, [center, map]);
  return null;
}
```

Rewrite the `LocationPicker` body:

```jsx
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
```

(`ClickHandler` from Task 3 stays as-is, just now sits above `RecenterOnSearch` in the file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/broker/LocationPicker.jsx frontend-react/src/components/broker/LocationPicker.test.jsx
git commit -m "feat: add debounced Nominatim address search to LocationPicker"
```

---

### Task 5: `LocationPicker` — read-only coordinate display

**Files:**
- Modify: `frontend-react/src/components/broker/LocationPicker.jsx`
- Modify: `frontend-react/src/components/broker/LocationPicker.test.jsx`

**Interfaces:**
- Produces: when `hasPosition` is true, renders text `Đã chọn: {lat}, {lng}` (6 decimal places) below the map; renders nothing when there is no position.

- [ ] **Step 1: Write the failing tests**

Append to `LocationPicker.test.jsx`:

```jsx
test('shows the selected coordinates (6 decimal places) when a position is set', () => {
  render(<LocationPicker lat={9.927833} lng={106.339167} onChange={vi.fn()} />);
  expect(screen.getByText('Đã chọn: 9.927833, 106.339167')).toBeInTheDocument();
});

test('shows no coordinate line when there is no position yet', () => {
  render(<LocationPicker lat={null} lng={null} onChange={vi.fn()} />);
  expect(screen.queryByText(/^Đã chọn:/)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx -t "Đã chọn"`
Expected: FAIL — `Unable to find an element with the text: Đã chọn: 9.927833, 106.339167`

- [ ] **Step 3: Implement the coordinate display**

In `LocationPicker.jsx`, right after the closing `</MapContainer>` tag, add:

```jsx
      {hasPosition && (
        <p className="form-hint">{`Đã chọn: ${lat.toFixed(6)}, ${lng.toFixed(6)}`}</p>
      )}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/components/broker/LocationPicker.test.jsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/broker/LocationPicker.jsx frontend-react/src/components/broker/LocationPicker.test.jsx
git commit -m "feat: show selected coordinates below the LocationPicker map"
```

---

### Task 6: CSS for `LocationPicker`

**Files:**
- Modify: `frontend-react/src/styles.css`

**Interfaces:**
- Produces: `.location-picker` (the map element) and `.location-picker-search` (the search label wrapper) classes, referenced by `LocationPicker.jsx` (Tasks 2 and 4).

No test — this is a pure styling addition with no behavioral assertion to make (visual-only, verified in Task 8's manual browser check via the `run`/`verify` step).

- [ ] **Step 1: Add the CSS rules**

In `frontend-react/src/styles.css`, append these rules at the end of the file (exact position doesn't matter — this file is a flat stylesheet with no cascade-order dependency between unrelated component blocks):

```css
/* Broker location picker */
.location-picker {
  width: 100%;
  height: 320px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-hairline);
  margin-top: 8px;
}

.location-picker-search {
  max-width: none;
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend-react/src/styles.css
git commit -m "style: add LocationPicker map and search field styles"
```

---

### Task 7: Integrate `LocationPicker` into `BrokerDashboard.jsx`

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`
- Modify: `frontend-react/src/styles.css` (remove the now-unused `.dashboard-coordinate-inputs` rules)

**Interfaces:**
- Consumes: `LocationPicker` default export `{ lat, lng, onChange }` (Tasks 2-5), `numericOrNull(value): number | null` (already defined in `BrokerDashboard.jsx`).
- No new exports — this task only rewires existing form state.
- Deviation from spec §4.2's third bullet: that bullet asks for a test that clicks the map, submits the form, and checks the `createProperty` payload. A real submit also requires `profileReady` and a cover image (`listingForm.coverFile || listingForm.coverUrl`), neither of which this task touches — wiring those up would pull unrelated form areas into this test for no added coverage. The chain is already fully covered by two narrower tests instead: this task's new "clicking the map updates the displayed coordinates" test proves click → `listingForm.lat`/`lng` state, and the existing `propertyPayload` — "stores valid map coordinates as numbers" test (`BrokerDashboard.listingForm.test.jsx:40-44`) proves state string → payload number. `String(9.927833)` round-trips through `Number(...)` with no precision loss, so together these two close the same loop the spec's single test would have.

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`:

1. Add the `react-leaflet`/`leaflet` mocks near the top of the file, right after the existing imports (before the `describe('propertyPayload — area from length × width'` block), reusing the same shape as `LocationPicker.test.jsx`:

```jsx
const { capturedHandlersRef } = vi.hoisted(() => ({
  capturedHandlersRef: { current: null },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ position }) => <div data-testid="map-marker" data-lat={position?.[0]} data-lng={position?.[1]} />,
  useMap: () => ({ setView: vi.fn() }),
  useMapEvents: (handlers) => { capturedHandlersRef.current = handlers; return null; },
}));

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));
```

2. Replace the existing test (currently lines ~138-143):

```jsx
  test('shows latitude and longitude inputs with the Maps coordinate hint', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByLabelText('Vĩ độ (lat)')).toBeInTheDocument();
    expect(screen.getByLabelText('Kinh độ (lng)')).toBeInTheDocument();
    expect(screen.getByText('Nhấn giữ trên ứng dụng Google Maps để lấy tọa độ.')).toBeInTheDocument();
  });
```

with:

```jsx
  test('shows the LocationPicker map with its confirmation hint, no lat/lng number inputs', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByLabelText('Tìm địa chỉ trên bản đồ')).toBeInTheDocument();
    expect(screen.getByText('Bấm vào bản đồ để chọn đúng vị trí thực tế của bất động sản.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vĩ độ (lat)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kinh độ (lng)')).not.toBeInTheDocument();
  });

  test('a new listing starts with no map position selected', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByLabelText('Tìm địa chỉ trên bản đồ');
    expect(screen.queryByText(/^Đã chọn:/)).not.toBeInTheDocument();
  });

  test('clicking the map updates the displayed coordinates in the form', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByLabelText('Tìm địa chỉ trên bản đồ');
    capturedHandlersRef.current.click({ latlng: { lat: 9.927833, lng: 106.339167 } });
    expect(await screen.findByText('Đã chọn: 9.927833, 106.339167')).toBeInTheDocument();
  });

  test('editing a listing with a saved position preloads it on the map', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-with-coords', title: 'Nhà có tọa độ', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1 tỷ', area: 100, category: 'nha', rooms: [],
        lat: 9.927833, lng: 106.339167,
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    expect(await screen.findByText('Đã chọn: 9.927833, 106.339167')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: FAIL — the new tests fail (`Unable to find a label with the text of: Tìm địa chỉ trên bản đồ`, since `BrokerDashboard.jsx` still renders the old number inputs).

- [ ] **Step 3: Wire `LocationPicker` into the form**

In `frontend-react/src/pages/BrokerDashboard.jsx`, add the import after the existing `Icon` import (line 10):

```jsx
import LocationPicker from '../components/broker/LocationPicker.jsx';
```

Replace the coordinate `FormField` block (currently lines ~686-692):

```jsx
                  <FormField label="Vị trí trên Google Maps" className="dashboard-listing-span2">
                    <div className="dashboard-coordinate-inputs">
                      <input className="input" type="number" min="-90" max="90" step="any" value={listingForm.lat} onChange={(event) => setListingValue('lat', event.target.value, setListingForm)} placeholder="Vĩ độ (lat)" aria-label="Vĩ độ (lat)" />
                      <input className="input" type="number" min="-180" max="180" step="any" value={listingForm.lng} onChange={(event) => setListingValue('lng', event.target.value, setListingForm)} placeholder="Kinh độ (lng)" aria-label="Kinh độ (lng)" />
                    </div>
                    <p className="form-hint">Nhấn giữ trên ứng dụng Google Maps để lấy tọa độ.</p>
                  </FormField>
```

with:

```jsx
                  <FormField label="Vị trí trên bản đồ" className="dashboard-listing-span2">
                    <LocationPicker
                      lat={numericOrNull(listingForm.lat)}
                      lng={numericOrNull(listingForm.lng)}
                      onChange={(pickedLat, pickedLng) => setListingForm((current) => ({ ...current, lat: String(pickedLat), lng: String(pickedLng) }))}
                    />
                    <p className="form-hint">Bấm vào bản đồ để chọn đúng vị trí thực tế của bất động sản.</p>
                  </FormField>
```

`numericOrNull` is already defined at module scope in this file (used elsewhere for `length`/`width`/etc.) — no new import needed.

- [ ] **Step 4: Remove the now-unused `.dashboard-coordinate-inputs` CSS**

In `frontend-react/src/styles.css`, delete this block (verified earlier at lines 1651-1655):

```css
.dashboard-coordinate-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
```

and remove the now-dangling reference inside the `@media (max-width: 640px)` block a few lines above it:

```css
  .dashboard-coordinate-inputs { grid-template-columns: 1fr; }
```

(leave the sibling rule `.dashboard-listing-grid { grid-template-columns: 1fr; }` in that same media block untouched).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS (all tests in the file, including the 4 new/replaced ones)

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx frontend-react/src/styles.css
git commit -m "feat: replace broker lat/lng number inputs with LocationPicker map"
```

---

### Task 8: Full regression run and manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: all tests PASS, no failures introduced in unrelated files (`PropertyDetailPage.test.jsx`, `HomePage.test.jsx`, `App.test.jsx` in particular, since they also touch `lat`/`lng` per the earlier grep).

- [ ] **Step 2: Manual verification in the browser**

Run: `cd frontend-react && npm run dev`

Open `http://localhost:5173`, log in as a broker (mock API: any email containing `broker`, any password), go to "Tin đăng của tôi" → "Đăng tin mới", scroll to "Vị trí trên bản đồ", and confirm:
- The map opens centered on Trà Vinh with no marker.
- Typing an address (e.g. "chợ Trà Vinh") pans the map after ~500ms without placing a marker.
- Clicking anywhere on the map places a marker and the "Đã chọn: lat, lng" line appears with the clicked coordinates.
- Clicking a different spot moves the marker and updates the text.
- Save the listing, then open the homepage and the property's detail page — confirm the pin/embed shows at the same real-world spot that was clicked (compare against the actual location, e.g. via a separate Google Maps tab for the same address).
- Edit that same listing again — confirm the map opens with the marker already at the saved position, not back at the Trà Vinh default.

- [ ] **Step 3: Report results**

If manual verification finds a discrepancy (marker position doesn't match what was clicked, or homepage/detail maps don't match), stop and report the specific mismatch rather than proceeding — this is the exact bug the feature exists to fix, so it must be visually confirmed correct, not just unit-tested.
