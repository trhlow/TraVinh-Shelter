# Homepage Property Map + Broker Room-List (Dãy Trọ) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Add an interactive map on the homepage that drops an arrow pin at every property's lat/lng and links each pin to that property's detail page. (2) Lock the broker listing form to the "Phòng trọ" (`tro`) category only, without corrupting brokers' pre-existing Nhà/Đất listings. (3) Give brokers a UI to enter a "dãy trọ" (row of rooms) — a bulk room-count/vacancy list — inside a tin đăng, per the already-approved backend-owner spec.

**Architecture:** All three features are frontend-only (`frontend-react/`). No backend/API changes — `Property.attributes` is a free-form JSONB map that already round-trips `lat`/`lng`/`rooms` without any DTO or migration change (confirmed in `docs/superpowers/specs/2026-07-12-broker-room-list-input-design.md`). The map uses Leaflet + OpenStreetMap tiles (no API key) rendered client-side from properties returned by the existing `fetchProperties()` call. The room-list UI extends the existing `BrokerDashboard.jsx` listing form exactly as specified by devlong's design doc.

**Tech Stack:** React 19, `leaflet` + `react-leaflet` (new deps), Vitest + Testing Library, existing `services/api.js` mock/real API layer.

## Global Constraints

- UI text tiếng Việt, code/comments tiếng Anh, commit messages tiếng Anh (conventional commits).
- No inline `style`, no hard-coded `#hex` in JSX — only CSS custom properties (`.claude/rules/design.md`).
- TDD required for business logic (RED → GREEN → REFACTOR) — applies to `propertyPayload()` changes and room-list state logic.
- `frontend-react/src/pages/BrokerDashboard.jsx` and `frontend-react/src/pages/HomePage.jsx` are devnguyen-scope files (frontend workspace) — safe to modify directly on the current branch.
- Backend (`backend-springboot/`) is **out of scope** — do not touch it. `Property.attributes` already passes `lat`/`lng`/`rooms` through with no schema change needed.
- Run `cd frontend-react && npm test -- --run` before every commit that touches frontend code.
- No "Co-Authored-By" in commits (per CLAUDE.md).

---

## Task 1: Homepage interactive property map with arrow pins

**Context:** There is currently **no map on the homepage** — only a static, non-interactive Google Maps *embed iframe* on the property detail page (`PropertyMap` in `frontend-react/src/pages/PropertyDetailPage.jsx:379-402`), which cannot hold custom clickable pins. This task adds a real, interactive map (Leaflet + OpenStreetMap, no API key) to the homepage that plots one arrow pin per property with valid `lat`/`lng` (any category), and clicking a pin opens a popup linking to `#/property/:id`.

**Files:**
- Modify: `frontend-react/package.json` (add `leaflet`, `react-leaflet` deps)
- Modify: `frontend-react/src/main.jsx` (import Leaflet's CSS)
- Create: `frontend-react/src/components/home/PropertyMapSection.jsx`
- Create: `frontend-react/src/components/home/PropertyMapSection.test.jsx`
- Modify: `frontend-react/src/services/propertyFilters.js` (`buildPropertyQuery` gains optional `size` passthrough)
- Modify: `frontend-react/src/services/propertyFilters.test.js` (test the new `size` param)
- Modify: `frontend-react/src/pages/HomePage.jsx` (fetch + render the map section)
- Modify: `frontend-react/src/pages/HomePage.test.jsx` (mock `react-leaflet`, add a map-rendering test)
- Modify: `frontend-react/src/styles/home.css` (map + marker + popup styles)

**Interfaces:**
- Consumes: `fetchProperties(filters)` from `services/api.js` (existing, returns array of normalized properties shaped like `{ id, title, image, priceLabel, lat, lng, ... }` — see `normalizeProperty()` in `services/api.js:355-409`, `lat`/`lng` are `number|null` via `numericCoordinate()`).
- Produces: `PropertyMapSection({ properties: Array<{ id, title, image, priceLabel, lat: number|null, lng: number|null }> })` — a default-exported React component that renders `null` when no property has valid coordinates.

- [ ] **Step 1: Install Leaflet dependencies**

```bash
cd frontend-react && npm install leaflet@1.9.4 react-leaflet@5.0.0
```

- [ ] **Step 2: Import Leaflet's stylesheet globally**

Edit `frontend-react/src/main.jsx` — add the import alongside the other CSS imports:

```js
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import 'leaflet/dist/leaflet.css';
import './styles.css';
import './styles/dashboard.css';
import './styles/home.css';
import './styles/carousel.css';
import './styles/gallery.css';
import './styles/detail.css';
```

- [ ] **Step 3: Add optional `size` passthrough to `buildPropertyQuery` (write the failing test first)**

Edit `frontend-react/src/services/propertyFilters.test.js` — add this test right after the existing `buildPropertyQuery` test (near line 26):

```js
  test('buildPropertyQuery includes size when provided', () => {
    expect(buildPropertyQuery({ size: 200 })).toBe('size=200');
  });
```

Run: `cd frontend-react && npx vitest run src/services/propertyFilters.test.js`
Expected: FAIL (`size=200` not present — `buildPropertyQuery` doesn't emit it yet).

- [ ] **Step 4: Implement the `size` param**

Edit `frontend-react/src/services/propertyFilters.js` — in `buildPropertyQuery`, add one line after the `broker` param (after line 39, before `return params.toString();`):

```js
  if (safeFilters.broker) params.set('brokerEmail', safeFilters.broker.trim());
  if (safeFilters.size) params.set('size', String(safeFilters.size));
  return params.toString();
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend-react && npx vitest run src/services/propertyFilters.test.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/services/propertyFilters.js frontend-react/src/services/propertyFilters.test.js
git commit -m "feat(frontend): support optional size param in property query builder"
```

- [ ] **Step 7: Write the failing test for `PropertyMapSection`**

Create `frontend-react/src/components/home/PropertyMapSection.test.jsx`:

```jsx
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
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/home/PropertyMapSection.test.jsx`
Expected: FAIL with "Failed to resolve import './PropertyMapSection.jsx'"

- [ ] **Step 9: Implement `PropertyMapSection`**

Create `frontend-react/src/components/home/PropertyMapSection.jsx`:

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
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd frontend-react && npx vitest run src/components/home/PropertyMapSection.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 11: Add map styles**

Edit `frontend-react/src/styles/home.css` — append at the end of the file:

```css
.home-map-container {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-hairline);
}

.home-map {
  width: 100%;
  height: 420px;
}

.home-map-marker-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full) var(--radius-full) var(--radius-full) 2px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  transform: rotate(45deg);
  box-shadow: var(--shadow-card);
}

.home-map-marker-pin svg {
  transform: rotate(-45deg);
}

.home-map-popup {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-decoration: none;
  color: var(--color-ink);
  min-width: 160px;
}

.home-map-popup img {
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.home-map-popup-title {
  font-weight: 600;
  font-size: 14px;
}

.home-map-popup-price {
  font-size: 13px;
  color: var(--color-primary);
  font-weight: 600;
}
```

- [ ] **Step 12: Wire the map into `HomePage`**

Edit `frontend-react/src/pages/HomePage.jsx`:

Add the import (after the `TroShowcaseCard` import, line 3):

```js
import PropertyMapSection from '../components/home/PropertyMapSection.jsx';
```

Add a `mapProperties` state and fetch effect, right after the existing per-category fetch effect (after line 170, before `const rowItems = ...`):

```js
  const [mapProperties, setMapProperties] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all', size: 200 })
      .then(items => { if (alive) setMapProperties(items); })
      .catch(() => { if (alive) setMapProperties([]); });
    return () => { alive = false; };
  }, []);
```

Render the section right after the `{/* 4. CATEGORY SHOWCASE ROWS */}` block closes (after line 285) and before `{/* 5. WHY CHOOSE US */}` (line 287), and renumber the two sections that follow:

```jsx
      {/* 5. PROPERTY MAP */}
      <PropertyMapSection properties={mapProperties} />

      {/* 6. WHY CHOOSE US */}
      <section className="section-subtle" style={{ paddingTop: '80px', paddingBottom: '80px', background: 'var(--color-surface-soft)' }}>
```

(only the comment numbers change on the following two sections — `WHY_US` becomes "6." and `STATS` becomes "7."; no other content changes.)

- [ ] **Step 13: Update `HomePage.test.jsx` to mock `react-leaflet` and verify the map renders**

Edit `frontend-react/src/pages/HomePage.test.jsx` — add the mock after the existing `vi.mock('../services/api.js', ...)` block (after line 7):

```js
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="map-popup">{children}</div>,
}));

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})) },
}));
```

Add a new test at the end of the file:

```js
test('renders the property map when a listing has valid coordinates', async () => {
  const { fetchProperties } = await import('../services/api.js');
  fetchProperties.mockResolvedValue([
    { id: 'p1', title: 'Nhà phố A', lat: 9.93, lng: 106.34, image: 'a.jpg', priceLabel: '2 tỷ' },
  ]);
  render(<HomePage />);
  expect(await screen.findByText('Bất động sản trên bản đồ')).toBeInTheDocument();
});
```

- [ ] **Step 14: Run the full frontend test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS (all suites, including the 3 new `PropertyMapSection` tests and the new `HomePage` test)

- [ ] **Step 15: Commit**

```bash
git add frontend-react/package.json frontend-react/package-lock.json frontend-react/src/main.jsx \
  frontend-react/src/components/home/PropertyMapSection.jsx frontend-react/src/components/home/PropertyMapSection.test.jsx \
  frontend-react/src/pages/HomePage.jsx frontend-react/src/pages/HomePage.test.jsx frontend-react/src/styles/home.css
git commit -m "feat(frontend): add interactive property map with arrow pins to homepage"
```

---

## Task 2: Lock broker listing form to Phòng trọ category

**Context:** Brokers should only create Phòng trọ (`tro`) listings going forward. `BrokerDashboard.jsx`'s listing form currently lets brokers freely pick Trọ/Nhà/Đất (`frontend-react/src/pages/BrokerDashboard.jsx:616-625`). Some brokers may already have existing Nhà/Đất listings — editing those must **not** silently convert them to `tro`. The fix: disable category selection entirely. New listings always default to `tro` (already `EMPTY_FORM.categorySlug: 'tro'`); editing an existing listing preserves whatever category it already has (shown, but not changeable).

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`

**Interfaces:**
- Consumes: `categoryLabel(category)` (existing helper, `BrokerDashboard.jsx:1077-1083`) to render the disabled select's single option label.
- Produces: no new exports — this is a pure UI-behavior change to the existing `BrokerDashboard` default export.

- [ ] **Step 1: Import the mocked `fetchBrokerDashboard` in the test file (needed by the new tests in this task and Task 3)**

Edit `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` — add this import after line 5 (`import BrokerDashboard, { propertyPayload } from './BrokerDashboard.jsx';`):

```js
import { fetchBrokerDashboard } from '../services/api.js';
```

- [ ] **Step 2: Write the failing tests**

Replace the test at lines 107-113 (`test('hides Phòng ngủ / Nhà vệ sinh when category is Đất', ...)`) with:

```js
  test('category select is locked to Trọ and disabled for new listings', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    const select = within(categoryField).getByRole('combobox');
    expect(select).toBeDisabled();
    expect(select).toHaveValue('tro');
    expect(within(categoryField).getAllByRole('option')).toHaveLength(1);
  });

  test('editing a legacy Đất listing preserves its category and hides Phòng ngủ / Nhà vệ sinh', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-dat-1', title: 'Lô đất cũ', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1 tỷ', area: 100, category: 'dat', rooms: [],
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    expect(within(categoryField).getByRole('combobox')).toHaveValue('dat');
    expect(screen.queryByText('Phòng ngủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà vệ sinh')).not.toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx -t "category select"`
Expected: FAIL — the select is currently not disabled and has 3 options.

- [ ] **Step 4: Lock the category `<select>`**

Edit `frontend-react/src/pages/BrokerDashboard.jsx` — replace lines 616-625:

```jsx
                  <FormField label="Danh mục">
                    <select className="input" value={listingForm.categorySlug} onChange={(event) => {
                      const categorySlug = event.target.value;
                      setListingForm((current) => ({ ...current, categorySlug, transaction: categorySlug === 'tro' ? 'rent' : current.transaction }));
                    }}>
                      <option value="tro">Trọ</option>
                      <option value="nha">Nhà</option>
                      <option value="dat">Đất</option>
                    </select>
                  </FormField>
```

with:

```jsx
                  <FormField label="Danh mục">
                    <select className="input" value={listingForm.categorySlug} disabled>
                      <option value={listingForm.categorySlug}>{categoryLabel(listingForm.categorySlug)}</option>
                    </select>
                    <p className="form-hint">
                      Môi giới chỉ đăng tin Phòng trọ. Tin danh mục khác (đã tạo trước đây) giữ nguyên danh mục gốc khi chỉnh sửa.
                    </p>
                  </FormField>
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS (all tests, including the two new ones)

- [ ] **Step 6: Run the full frontend test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx
git commit -m "fix(frontend): lock broker listing category to Phong tro, preserve legacy categories on edit"
```

---

## Task 3: Broker room-list ("dãy trọ") input UI

**Context:** This implements the UI half of the already-approved spec `docs/superpowers/specs/2026-07-12-broker-room-list-input-design.md` (written by devlong; backend needs zero changes — `attributes.rooms` already round-trips end to end). The **display** side already works today: `components/property/RoomList.jsx` (property detail page) and `components/TroShowcaseCard.jsx` (homepage/search "Còn N phòng trống" badge) both already read `property.rooms: [{ label, price, available }]` correctly — only mock data (`services/mockData.js:167`, `:213`) has ever populated it. What's missing is the broker-facing form to create/edit this array. Gated on `categorySlug === 'tro'`, which after Task 2 is the default for all new listings (still relevant for legacy `tro` edits and defensively matches the existing display-side gate).

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`
- Modify: `frontend-react/src/styles.css`

**Interfaces:**
- Consumes: `numericOrNull(value)` (existing helper, `BrokerDashboard.jsx:1057-1061`) to coerce room price.
- Produces: `EMPTY_FORM.rooms: []` (new field), `propertyPayload(form).attributes.rooms?: Array<{ label: string, price: number, available: boolean }>` (present only when `categorySlug === 'tro'` and at least one room survives filtering).

- [ ] **Step 1: Write the failing `propertyPayload` tests**

Edit `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` — add this `describe` block after the existing `describe('propertyPayload — area from length × width', ...)` block (after line 50):

```js
describe('propertyPayload — rooms (dãy trọ)', () => {
  const base = {
    categorySlug: 'tro', transaction: 'rent', ward: 'phuong-tra-vinh',
    length: '', width: '', bedrooms: '', bathrooms: '', description: '', amenities: [],
    lat: '', lng: '', coverUrl: '', title: 'Dãy trọ test', address: 'Test', price: '1500000',
  };

  test('attaches attributes.rooms when category is tro and at least one valid room', () => {
    const payload = propertyPayload({ ...base, rooms: [{ label: 'P.01', price: '1500000', available: true }] });
    expect(payload.attributes.rooms).toEqual([{ label: 'P.01', price: 1500000, available: true }]);
  });

  test('filters out rooms with empty label', () => {
    const payload = propertyPayload({
      ...base,
      rooms: [{ label: '  ', price: '1000000', available: true }, { label: 'P.02', price: '1000000', available: true }],
    });
    expect(payload.attributes.rooms).toEqual([{ label: 'P.02', price: 1000000, available: true }]);
  });

  test('coerces empty/invalid price to 0', () => {
    const payload = propertyPayload({ ...base, rooms: [{ label: 'P.01', price: '', available: true }] });
    expect(payload.attributes.rooms[0].price).toBe(0);
  });

  test('omits attributes.rooms when list is empty after filtering', () => {
    const payload = propertyPayload({ ...base, rooms: [{ label: '   ', price: '1000000', available: true }] });
    expect('rooms' in payload.attributes).toBe(false);
  });

  test('omits attributes.rooms when category is not tro, even if rooms has data', () => {
    const payload = propertyPayload({ ...base, categorySlug: 'nha', rooms: [{ label: 'P.01', price: '1000000', available: true }] });
    expect('rooms' in payload.attributes).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx -t "rooms (dãy trọ)"`
Expected: FAIL — `payload.attributes.rooms` is `undefined` (form has no `rooms` handling yet).

- [ ] **Step 3: Add `rooms` to `EMPTY_FORM` and `propertyPayload`**

Edit `frontend-react/src/pages/BrokerDashboard.jsx` — in `EMPTY_FORM` (line 37-59), add `rooms: [],` after `amenities: [],` (line 53):

```js
  description: '',
  amenities: [],
  rooms: [],
  coverUrl: '',
```

In `propertyPayload` (line 1025-1055), add the rooms-building block after the `houseType` block (after line 1045, before `if (form.coverUrl?.trim())`):

```js
  if (form.categorySlug === 'nha' && form.transaction === 'rent') {
    attributes.houseType = form.houseType;
  }
  if (form.categorySlug === 'tro') {
    const validRooms = (form.rooms || [])
      .filter((room) => room.label?.trim())
      .map((room) => ({
        label: room.label.trim(),
        price: numericOrNull(room.price) ?? 0,
        available: room.available !== false,
      }));
    if (validRooms.length > 0) attributes.rooms = validRooms;
  }
  if (form.coverUrl?.trim()) attributes.image = form.coverUrl.trim();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx -t "rooms (dãy trọ)"`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx
git commit -m "feat(frontend): compute attributes.rooms in propertyPayload for dãy trọ listings"
```

- [ ] **Step 6: Write the failing rendered-form tests**

Edit `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` — add this `describe` block at the end of the file:

```js
describe('Listing form — room list (dãy trọ)', () => {
  test('shows empty-state hint when no rooms yet', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText(/Chưa có phòng nào/)).toBeInTheDocument();
  });

  test('Thêm nhanh generates N rooms with zero-padded, continuing labels', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByText(/Chưa có phòng nào/);
    await userEvent.clear(screen.getByLabelText('Số lượng phòng thêm nhanh'));
    await userEvent.type(screen.getByLabelText('Số lượng phòng thêm nhanh'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm nhanh' }));
    expect(screen.getByLabelText('Tên phòng 1')).toHaveValue('P.01');
    expect(screen.getByLabelText('Tên phòng 2')).toHaveValue('P.02');
    expect(screen.getByLabelText('Tên phòng 3')).toHaveValue('P.03');
  });

  test('+ Thêm 1 phòng adds one empty row; delete removes it', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await screen.findByText(/Chưa có phòng nào/);
    await userEvent.click(screen.getByRole('button', { name: 'Thêm 1 phòng' }));
    expect(screen.getByLabelText('Tên phòng 1')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Xóa phòng 1'));
    expect(screen.queryByLabelText('Tên phòng 1')).not.toBeInTheDocument();
  });

  test('editing an existing tro listing prefills room rows', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-tro-1', title: 'Dãy trọ ABC', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1,5 triệu/tháng', area: 20, category: 'tro',
        rooms: [{ label: 'P.01', price: 1500000, available: true }],
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    expect(await screen.findByLabelText('Tên phòng 1')).toHaveValue('P.01');
    expect(screen.getByLabelText('Giá phòng 1')).toHaveValue(1500000);
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx -t "room list (dãy trọ)"`
Expected: FAIL — none of the quick-add bar, room rows, or empty-state hint exist yet.

- [ ] **Step 8: Prefill `rooms` in `editListing`**

Edit `frontend-react/src/pages/BrokerDashboard.jsx` — in `editListing` (line 359-384), add after `amenities: Array.isArray(property.amenities) ? property.amenities : [],` (line 376):

```js
      amenities: Array.isArray(property.amenities) ? property.amenities : [],
      rooms: Array.isArray(property.rooms)
        ? property.rooms.map((room) => ({ label: room.label, price: String(room.price ?? ''), available: room.available !== false }))
        : [],
```

- [ ] **Step 9: Add room-management state and handlers**

Edit `frontend-react/src/pages/BrokerDashboard.jsx` — add local state right after `const [listingForm, setListingForm] = useState(EMPTY_FORM);` (line 67):

```js
  const [quickAddCount, setQuickAddCount] = useState('1');
  const [quickAddPrefix, setQuickAddPrefix] = useState('P.');
  const [quickAddPrice, setQuickAddPrice] = useState('');
```

Add the room handler functions right before `handleCoverChange` (before line 386):

```js
  function addRoom() {
    setListingForm((current) => ({ ...current, rooms: [...current.rooms, { label: '', price: '', available: true }] }));
  }

  function removeRoom(index) {
    setListingForm((current) => ({ ...current, rooms: current.rooms.filter((_, i) => i !== index) }));
  }

  function updateRoom(index, field, value) {
    setListingForm((current) => ({
      ...current,
      rooms: current.rooms.map((room, i) => (i === index ? { ...room, [field]: value } : room)),
    }));
  }

  function quickAddRooms() {
    const count = Math.max(1, Number(quickAddCount) || 1);
    const startIndex = listingForm.rooms.length + 1;
    const newRooms = Array.from({ length: count }, (_, i) => ({
      label: `${quickAddPrefix}${String(startIndex + i).padStart(2, '0')}`,
      price: quickAddPrice,
      available: true,
    }));
    setListingForm((current) => ({ ...current, rooms: [...current.rooms, ...newRooms] }));
  }

```

- [ ] **Step 10: Render the room-list section in the form**

Edit `frontend-react/src/pages/BrokerDashboard.jsx` — insert right after the `{listingForm.categorySlug !== 'dat' && (...)}` bedroom/bathroom block closes (after line 677, before the `<FormField label="Ảnh đại diện" ...>` field on line 678):

```jsx
                  {listingForm.categorySlug === 'tro' && (
                    <div className="form-group dashboard-listing-span3">
                      <label className="auth-field-label">Danh sách phòng trong dãy trọ</label>
                      <div className="dashboard-room-quickadd">
                        <input className="input" type="number" min="1" value={quickAddCount} onChange={(event) => setQuickAddCount(event.target.value)} aria-label="Số lượng phòng thêm nhanh" />
                        <input className="input" type="text" value={quickAddPrefix} onChange={(event) => setQuickAddPrefix(event.target.value)} aria-label="Tiền tố tên phòng" />
                        <input className="input" type="number" min="0" value={quickAddPrice} onChange={(event) => setQuickAddPrice(event.target.value)} placeholder="Giá mặc định" aria-label="Giá mặc định phòng thêm nhanh" />
                        <button type="button" className="btn btn-secondary btn-sm" onClick={quickAddRooms}>Thêm nhanh</button>
                      </div>

                      {listingForm.rooms.length === 0 ? (
                        <p className="form-hint">Chưa có phòng nào — dùng &quot;Thêm nhanh&quot; để thêm cả dãy, hoặc thêm từng phòng.</p>
                      ) : (
                        <div className="dashboard-room-list">
                          {listingForm.rooms.map((room, index) => (
                            <div className="dashboard-room-row" key={index}>
                              <input className="input" type="text" value={room.label} onChange={(event) => updateRoom(index, 'label', event.target.value)} placeholder="Tên phòng" aria-label={`Tên phòng ${index + 1}`} />
                              <input className="input" type="number" min="0" value={room.price} onChange={(event) => updateRoom(index, 'price', event.target.value)} placeholder="Giá" aria-label={`Giá phòng ${index + 1}`} />
                              <label className="dashboard-room-available">
                                <input type="checkbox" checked={room.available} onChange={(event) => updateRoom(index, 'available', event.target.checked)} />
                                Còn trống
                              </label>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeRoom(index)} aria-label={`Xóa phòng ${index + 1}`}>
                                <Icon name="X" size={16} className="icon-muted" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <button type="button" className="btn btn-ghost btn-sm dashboard-room-add-btn" onClick={addRoom}>
                        <Icon name="Plus" size={16} /> Thêm 1 phòng
                      </button>
                    </div>
                  )}
```

- [ ] **Step 11: Add room-list CSS**

Edit `frontend-react/src/styles.css` — insert right after the `.dashboard-cover-preview` rule block's closing styles, near the other `.dashboard-*` form rules (right after the `.dashboard-coordinate-inputs` block ending around line 1655):

```css
.dashboard-room-quickadd {
  display: grid;
  grid-template-columns: 80px 1fr 120px auto;
  gap: 8px;
  margin-bottom: 12px;
}

.dashboard-room-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.dashboard-room-row {
  display: grid;
  grid-template-columns: 1fr 120px auto auto;
  gap: 8px;
  align-items: center;
}

.dashboard-room-available {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-body);
  white-space: nowrap;
}

.dashboard-room-add-btn {
  align-self: flex-start;
}

@media (max-width: 640px) {
  .dashboard-room-quickadd { grid-template-columns: 1fr; }
  .dashboard-room-row { grid-template-columns: 1fr; }
}
```

- [ ] **Step 12: Run the tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS (all tests in the file)

- [ ] **Step 13: Run the full frontend test suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx frontend-react/src/styles.css
git commit -m "feat(frontend): add room-list (dãy trọ) input UI to broker listing form"
```

---

## Self-Review Notes

- **Spec coverage**: Homepage map with clickable arrow pins → Task 1. Broker locked to Phòng trọ → Task 2. Dãy trọ room-count/vacancy input reusing the existing display components → Task 3 (built directly from the pre-approved `2026-07-12-broker-room-list-input-design.md` spec, which the research phase confirmed is unimplemented).
- **No backend work**: confirmed via `PropertyController.java`/`Property.java` research — `attributes` is a free-form JSONB passthrough; devlong owns any future backend-side category enforcement (not required for this plan to function correctly, since the frontend now structurally prevents brokers from picking non-`tro` categories for new listings).
- **Data integrity**: Task 2's disabled-select design was specifically chosen over a hard `categorySlug: 'tro'` override to avoid silently reclassifying brokers' pre-existing Nhà/Đất listings when they open them for editing.
