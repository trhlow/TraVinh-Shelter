# Broker Dashboard Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broker's click-to-pick Leaflet map with a pasted Google Maps embed, switch the broker activity chart from monthly to daily buckets, give the broker notification bell the same dropdown behavior as admin's, and swap the "Loại hình BĐS" / "Lịch hẹn sắp tới" dashboard cards.

**Architecture:** Frontend-only (`frontend-react`), no backend changes — `Property.attributes` is a free-form JSONB column, so a new `mapEmbedUrl` key needs no migration. Removing broker-side `lat`/`lng` entirely means the homepage's Leaflet pin map (`PropertyMapSection.jsx`) loses its data source and gets deleted along with `leaflet`/`react-leaflet` and every helper that only existed to support it.

**Tech Stack:** React 19, Vitest + Testing Library, CSS custom properties (no inline style, no hex).

## Global Constraints

- UI text tiếng Việt, code/comments tiếng Anh, commit messages tiếng Anh theo conventional commits (từ `workflow.md`).
- Không `inline style`, không hard-code `#hex` trong JSX — chỉ CSS class/variable.
- TDD bắt buộc cho logic nghiệp vụ: RED → GREEN → REFACTOR.
- Không import thư viện UI ngoài; chỉ `lucide-react` cho icon.
- Xóa hẳn code thừa thay vì comment out.
- Spec nguồn: `docs/superpowers/specs/2026-07-15-broker-dashboard-revamp-design.md`.

---

### Task 1: `extractGoogleMapsEmbedSrc` helper

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (add helper near other form helpers, e.g. after `coordinateFormValue` — which this task does not yet remove; removal happens in Task 4)
- Test: `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` (new `describe` block)

**Interfaces:**
- Produces: `export function extractGoogleMapsEmbedSrc(pastedHtml: string): string | null` — bóc `src="..."` từ đoạn HTML dán vào, trả `null` nếu không có `src` hợp lệ hoặc hostname không phải `google.com`/`*.google.com`.

- [ ] **Step 1: Write the failing tests**

Add to `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`, right after the existing imports (before `describe('propertyPayload — area from length × width', ...)`):

```jsx
import { extractGoogleMapsEmbedSrc } from './BrokerDashboard.jsx';

describe('extractGoogleMapsEmbedSrc', () => {
  test('extracts src from a full Google Maps iframe embed', () => {
    const pasted = '<iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12" width="600" height="450"></iframe>';
    expect(extractGoogleMapsEmbedSrc(pasted)).toBe('https://www.google.com/maps/embed?pb=!1m17!1m12');
  });

  test('accepts single-quoted src attribute', () => {
    const pasted = "<iframe src='https://www.google.com/maps/embed?pb=abc'></iframe>";
    expect(extractGoogleMapsEmbedSrc(pasted)).toBe('https://www.google.com/maps/embed?pb=abc');
  });

  test('accepts a maps.google.com subdomain', () => {
    const pasted = '<iframe src="https://maps.google.com/maps?q=1,2&output=embed"></iframe>';
    expect(extractGoogleMapsEmbedSrc(pasted)).toBe('https://maps.google.com/maps?q=1,2&output=embed');
  });

  test('returns null when there is no src attribute', () => {
    expect(extractGoogleMapsEmbedSrc('<iframe width="600"></iframe>')).toBeNull();
  });

  test('returns null when src is not a google.com host', () => {
    const pasted = '<iframe src="https://evil.example.com/embed"></iframe>';
    expect(extractGoogleMapsEmbedSrc(pasted)).toBeNull();
  });

  test('returns null for empty or whitespace-only input', () => {
    expect(extractGoogleMapsEmbedSrc('')).toBeNull();
    expect(extractGoogleMapsEmbedSrc('   ')).toBeNull();
  });

  test('returns null for a malformed URL in src', () => {
    expect(extractGoogleMapsEmbedSrc('<iframe src="not a url"></iframe>')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx -t "extractGoogleMapsEmbedSrc"`
Expected: FAIL — `extractGoogleMapsEmbedSrc is not a function` (not exported yet).

- [ ] **Step 3: Implement the helper**

In `frontend-react/src/pages/BrokerDashboard.jsx`, add this function after `coordinateFormValue` (currently ends at line 1151):

```js
export function extractGoogleMapsEmbedSrc(pastedHtml) {
  const match = String(pastedHtml || '').match(/src=["']([^"']+)["']/i);
  if (!match) return null;
  let url;
  try {
    url = new URL(match[1]);
  } catch {
    return null;
  }
  const isGoogleHost = url.hostname === 'google.com' || url.hostname.endsWith('.google.com');
  return isGoogleHost ? url.href : null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx -t "extractGoogleMapsEmbedSrc"`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx
git commit -m "feat: add Google Maps embed src extractor for broker listing form"
```

---

### Task 2: `api.js` — normalize `mapEmbedUrl` instead of `lat`/`lng`

**Files:**
- Modify: `frontend-react/src/services/api.js:390-391` (in `normalizeProperty`), `:421-424` (`numericCoordinate`)

**Interfaces:**
- Produces: `normalizeProperty(item)` now returns `.mapEmbedUrl` (string | null) instead of `.lat`/`.lng`.

- [ ] **Step 1: Replace the normalized fields**

In `frontend-react/src/services/api.js`, replace lines 390-391:

```js
    lat: numericCoordinate(attributes.lat),
    lng: numericCoordinate(attributes.lng),
```

with:

```js
    mapEmbedUrl: attributes.mapEmbedUrl || null,
```

- [ ] **Step 2: Remove the now-unused `numericCoordinate` helper**

Delete lines 421-424:

```js
function numericCoordinate(value) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}
```

- [ ] **Step 3: Run the frontend test suite to confirm nothing else references these fields**

Run: `cd frontend-react && npx vitest run --environment jsdom`
Expected: Failures only in `PropertyDetailPage.test.jsx` (map test, fixed in Task 3) and `BrokerDashboard.listingForm.test.jsx` (map tests, fixed in Task 4) and `LocationPicker`/`PropertyMapSection`/`HomePage` map tests (fixed in Task 5) — no failures in unrelated files. If any other file fails, investigate before continuing.

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/services/api.js
git commit -m "feat: normalize property mapEmbedUrl instead of lat/lng"
```

---

### Task 3: `PropertyDetailPage.jsx` — display via `mapEmbedUrl`

**Files:**
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx:144` (`hasCoordinates`), `:296` (`PropertyMap` usage), `:379-402` (`PropertyMap` component), `:404-407` (`hasValidCoordinates`)
- Test: `frontend-react/src/pages/PropertyDetailPage.test.jsx:77-91`

**Interfaces:**
- Consumes: `property.mapEmbedUrl` (string | null) from Task 2's `normalizeProperty`.

- [ ] **Step 1: Write the failing tests**

Replace lines 77-91 in `frontend-react/src/pages/PropertyDetailPage.test.jsx`:

```jsx
test('renders a Google Map only when valid coordinates are available', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, lat: 9.9345, lng: 106.3456 });
  render(<PropertyDetailPage propertyId="p-1" />);

  const map = await screen.findByTitle('Bản đồ vị trí bất động sản');
  expect(map).toHaveAttribute('src', expect.stringContaining('9.9345%2C106.3456'));
});

test('does not render a Google Map without coordinates', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);

  await screen.findAllByText(baseProperty.title);
  expect(screen.queryByTitle('Bản đồ vị trí bất động sản')).not.toBeInTheDocument();
});
```

with:

```jsx
test('renders a Google Map only when the property has a mapEmbedUrl', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, mapEmbedUrl: 'https://www.google.com/maps/embed?pb=abc' });
  render(<PropertyDetailPage propertyId="p-1" />);

  const map = await screen.findByTitle('Bản đồ vị trí bất động sản');
  expect(map).toHaveAttribute('src', 'https://www.google.com/maps/embed?pb=abc');
});

test('does not render a Google Map without a mapEmbedUrl', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);

  await screen.findAllByText(baseProperty.title);
  expect(screen.queryByTitle('Bản đồ vị trí bất động sản')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/PropertyDetailPage.test.jsx -t "Google Map"`
Expected: FAIL — first test's `src` won't equal the exact URL yet (component still builds from lat/lng, which are undefined here).

- [ ] **Step 3: Update `PropertyDetailPage.jsx`**

Replace line 144:

```js
  const hasCoordinates = hasValidCoordinates(property.lat, property.lng);
```

with:

```js
  const hasMapEmbed = Boolean(property.mapEmbedUrl);
```

Replace line 296:

```jsx
            {hasCoordinates && <PropertyMap lat={property.lat} lng={property.lng} />}
```

with:

```jsx
            {hasMapEmbed && <PropertyMap embedUrl={property.mapEmbedUrl} />}
```

Replace the `PropertyMap` component and `hasValidCoordinates` (lines 379-407):

```js
function PropertyMap({ lat, lng }) {
  const location = `${lat},${lng}`;
  const mapsEmbedKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY;
  const src = mapsEmbedKey
    ? `https://www.google.com/maps/embed/v1/view?key=${encodeURIComponent(mapsEmbedKey)}&center=${encodeURIComponent(location)}&zoom=16&language=vi`
    : `https://www.google.com/maps?q=${encodeURIComponent(location)}&z=16&output=embed`;

  return (
    <section className="card p-24 mt-16" aria-label="Vị trí bất động sản">
      <h2 className="detail-block-title">
        <Icon name="MapPinned" size={18} className="icon-accent" />
        Vị trí trên bản đồ
      </h2>
      <iframe
        className="property-map"
        title="Bản đồ vị trí bất động sản"
        src={src}
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </section>
  );
}

function hasValidCoordinates(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
```

with:

```js
function PropertyMap({ embedUrl }) {
  return (
    <section className="card p-24 mt-16" aria-label="Vị trí bất động sản">
      <h2 className="detail-block-title">
        <Icon name="MapPinned" size={18} className="icon-accent" />
        Vị trí trên bản đồ
      </h2>
      <iframe
        className="property-map"
        title="Bản đồ vị trí bất động sản"
        src={embedUrl}
        loading="lazy"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/PropertyDetailPage.test.jsx`
Expected: PASS (all tests in file).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/PropertyDetailPage.jsx frontend-react/src/pages/PropertyDetailPage.test.jsx
git commit -m "feat: render property detail map from stored embed URL"
```

---

### Task 4: Broker listing form — paste-embed UI replacing `LocationPicker`

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (`EMPTY_FORM`, `editListing`, `propertyPayload`, form JSX, remove `coordinateOrNull`/`coordinateFormValue`, remove `LocationPicker` import)
- Modify: `frontend-react/src/styles.css:3277-3289` (replace `.location-picker`/`.location-picker-search` with `.location-embed-preview`)
- Modify: `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` (replace all lat/lng-based tests, drop the `react-leaflet`/`leaflet` mocks)

**Interfaces:**
- Consumes: `extractGoogleMapsEmbedSrc` from Task 1.
- Produces: `listingForm.mapEmbedInput` (raw textarea value), `listingForm.mapEmbedUrl` (parsed src or `''`); `propertyPayload(form).attributes.mapEmbedUrl`.

- [ ] **Step 1: Write the failing tests**

In `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`, remove the `vi.mock('react-leaflet', ...)` and `vi.mock('leaflet', ...)` blocks (lines 12-22) and the `capturedHandlersRef` hoisted mock (lines 8-10) — no longer needed once `LocationPicker` is gone. The file's top should read:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrokerDashboard, { extractGoogleMapsEmbedSrc, propertyPayload } from './BrokerDashboard.jsx';
import { fetchBrokerDashboard } from '../services/api.js';

describe('extractGoogleMapsEmbedSrc', () => {
  // ... (kept from Task 1, unchanged)
});
```

Replace the `describe('propertyPayload — area from length × width', ...)` block's `base` object (lines 25-30) — drop `lat`/`lng` keys:

```js
  const base = {
    categorySlug: 'dat', transaction: 'sale', ward: 'phuong-tra-vinh',
    length: '5', width: '20', bedrooms: '', bathrooms: '', description: '', amenities: [],
    mapEmbedUrl: '',
    coverUrl: '', title: 'Lô đất test', address: 'Test', price: '1000000000',
  };
```

Replace the two coordinate tests (lines 56-66):

```js
  test('stores valid map coordinates as numbers', () => {
    const payload = propertyPayload({ ...base, lat: '9.9345', lng: '106.3456' });
    expect(payload.attributes.lat).toBe(9.9345);
    expect(payload.attributes.lng).toBe(106.3456);
  });

  test('drops out-of-range map coordinates', () => {
    const payload = propertyPayload({ ...base, lat: '91', lng: '106.3456' });
    expect(payload.attributes.lat).toBeNull();
    expect(payload.attributes.lng).toBe(106.3456);
  });
```

with:

```js
  test('carries mapEmbedUrl through to attributes', () => {
    const payload = propertyPayload({ ...base, mapEmbedUrl: 'https://www.google.com/maps/embed?pb=abc' });
    expect(payload.attributes.mapEmbedUrl).toBe('https://www.google.com/maps/embed?pb=abc');
  });

  test('mapEmbedUrl is null when not set', () => {
    const payload = propertyPayload({ ...base, mapEmbedUrl: '' });
    expect(payload.attributes.mapEmbedUrl).toBeNull();
  });
```

Also drop `lat: '', lng: '',` from the `tro` describe block's `base` object (line 73) — it becomes just:

```js
  const base = {
    categorySlug: 'tro', transaction: 'rent', ward: 'phuong-tra-vinh',
    length: '', width: '', bedrooms: '', bathrooms: '', description: '', amenities: [],
    coverUrl: '', title: 'Dãy trọ test', address: 'Test', price: '1500000',
  };
```

Replace the rendered-form map tests (lines 154-188, from `'shows the LocationPicker map...'` through the end of `editing a listing with a saved position preloads it on the map'`):

```jsx
  test('shows the map embed paste field, no lat/lng number inputs', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByLabelText('Mã nhúng Google Maps')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vĩ độ (lat)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kinh độ (lng)')).not.toBeInTheDocument();
  });

  test('a new listing starts with an empty embed field and no preview', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const field = await screen.findByLabelText('Mã nhúng Google Maps');
    expect(field).toHaveValue('');
    expect(screen.queryByTitle('Xem trước vị trí')).not.toBeInTheDocument();
  });

  test('pasting a valid embed shows the preview iframe', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const field = await screen.findByLabelText('Mã nhúng Google Maps');
    await userEvent.type(field, '<iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>');
    const preview = await screen.findByTitle('Xem trước vị trí');
    expect(preview).toHaveAttribute('src', 'https://www.google.com/maps/embed?pb=abc');
  });

  test('pasting an invalid embed shows an error and no preview', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const field = await screen.findByLabelText('Mã nhúng Google Maps');
    await userEvent.type(field, 'not an iframe');
    expect(await screen.findByText('Mã nhúng không hợp lệ — hãy dán nguyên đoạn từ Google Maps (Chia sẻ → Nhúng bản đồ).')).toBeInTheDocument();
    expect(screen.queryByTitle('Xem trước vị trí')).not.toBeInTheDocument();
  });

  test('editing a listing with a saved embed preloads the field and preview', async () => {
    fetchBrokerDashboard.mockResolvedValueOnce({
      activeListings: 1,
      totalListings: 1,
      listings: [{
        id: 'p-with-embed', title: 'Nhà có bản đồ', address: 'Test', image: '', statusLabel: 'Đang hiển thị',
        rawStatus: 'AVAILABLE', priceLabel: '1 tỷ', area: 100, category: 'nha', rooms: [],
        mapEmbedUrl: 'https://www.google.com/maps/embed?pb=xyz',
      }],
    });
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Chỉnh sửa tin' }));
    const preview = await screen.findByTitle('Xem trước vị trí');
    expect(preview).toHaveAttribute('src', 'https://www.google.com/maps/embed?pb=xyz');
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: FAIL — form still renders `LocationPicker` (no `'Mã nhúng Google Maps'` label), `propertyPayload` still returns `lat`/`lng` attributes not `mapEmbedUrl`.

- [ ] **Step 3: Update `BrokerDashboard.jsx`**

Remove the `LocationPicker` import (line 11):

```js
import LocationPicker from '../components/broker/LocationPicker.jsx';
```

In `EMPTY_FORM`, replace `lat: '', lng: '',` (lines 48-49) with:

```js
  mapEmbedInput: '',
  mapEmbedUrl: '',
```

Add local state for the paste-field error, near the other `useState` declarations in the component body (after `const [quickSearch, setQuickSearch] = useState('');` at line 88):

```js
  const [mapEmbedError, setMapEmbedError] = useState('');
```

Add a handler function near `handleCoverChange`/`handleGalleryChange` (after `handleGalleryChange`, currently ending at line 437):

```js
  function handleMapEmbedChange(value) {
    setListingForm((current) => ({ ...current, mapEmbedInput: value }));
    if (!value.trim()) {
      setListingForm((current) => ({ ...current, mapEmbedUrl: '' }));
      setMapEmbedError('');
      return;
    }
    const src = extractGoogleMapsEmbedSrc(value);
    if (!src) {
      setListingForm((current) => ({ ...current, mapEmbedUrl: '' }));
      setMapEmbedError('Mã nhúng không hợp lệ — hãy dán nguyên đoạn từ Google Maps (Chia sẻ → Nhúng bản đồ).');
      return;
    }
    setListingForm((current) => ({ ...current, mapEmbedUrl: src }));
    setMapEmbedError('');
  }
```

Replace the `FormField label="Vị trí trên bản đồ"` block (lines 687-694):

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

with:

```jsx
                  <FormField label="Mã nhúng Google Maps" className="dashboard-listing-span2">
                    <textarea
                      className="input"
                      rows={3}
                      value={listingForm.mapEmbedInput}
                      onChange={(event) => handleMapEmbedChange(event.target.value)}
                      placeholder='Dán nguyên đoạn <iframe src="https://www.google.com/maps/embed?...">...'
                    />
                    {mapEmbedError && <p className="form-error">{mapEmbedError}</p>}
                    {listingForm.mapEmbedUrl && (
                      <iframe className="location-embed-preview" src={listingForm.mapEmbedUrl} title="Xem trước vị trí" loading="lazy" />
                    )}
                    <p className="form-hint">Trên Google Maps: bấm Chia sẻ → Nhúng bản đồ → Sao chép HTML, dán nguyên vào đây.</p>
                  </FormField>
```

In `editListing()` (lines 364-392), replace:

```js
      lat: coordinateFormValue(property.lat),
      lng: coordinateFormValue(property.lng),
```

with:

```js
      mapEmbedInput: property.mapEmbedUrl ? `<iframe src="${property.mapEmbedUrl}"></iframe>` : '',
      mapEmbedUrl: property.mapEmbedUrl || '',
```

In `propertyPayload()` (lines 1095-1135), replace:

```js
    lat: coordinateOrNull(form.lat, -90, 90),
    lng: coordinateOrNull(form.lng, -180, 180),
```

with:

```js
    mapEmbedUrl: form.mapEmbedUrl || null,
```

Remove `coordinateOrNull` and `coordinateFormValue` (lines 1143-1151):

```js
function coordinateOrNull(value, min, max) {
  const parsed = numericOrNull(value);
  return parsed != null && parsed >= min && parsed <= max ? parsed : null;
}

function coordinateFormValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '';
}
```

Note: `numericOrNull` itself stays — it's still used for `length`/`width`/`bedrooms`/etc.

- [ ] **Step 4: Update CSS**

In `frontend-react/src/styles.css`, replace lines 3277-3289:

```css
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

with:

```css
.location-embed-preview {
  display: block;
  width: 100%;
  height: 240px;
  border: 0;
  border-radius: var(--radius-md);
  margin-top: 8px;
  background: var(--color-surface-soft);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS (all tests in file).

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx frontend-react/src/styles.css
git commit -m "feat: replace broker LocationPicker with pasted Google Maps embed"
```

---

### Task 5: Remove `LocationPicker`, `PropertyMapSection`, and the Leaflet dependency chain

**Files:**
- Delete: `frontend-react/src/components/broker/LocationPicker.jsx`, `frontend-react/src/components/broker/LocationPicker.test.jsx`
- Delete: `frontend-react/src/components/home/PropertyMapSection.jsx`, `frontend-react/src/components/home/PropertyMapSection.test.jsx`
- Delete: `frontend-react/src/utils/mapConstants.js`, `frontend-react/src/utils/mapMarkerIcon.js`
- Modify: `frontend-react/src/pages/HomePage.jsx` (remove import, JSX, `mapProperties` state/effect)
- Modify: `frontend-react/src/pages/HomePage.test.jsx` (remove the map-related test)
- Modify: `frontend-react/package.json` (drop `leaflet`, `react-leaflet`)
- Modify: `frontend-react/src/main.jsx` (drop `leaflet/dist/leaflet.css` import)
- Modify: `frontend-react/src/styles/home.css` (remove `HOME — PROPERTY MAP` block, lines 406-468)

**Interfaces:**
- None — this is a pure deletion task. Prerequisite: Tasks 2-4 already stopped referencing `lat`/`lng`/`LocationPicker` so nothing in the app imports these files anymore.

- [ ] **Step 1: Confirm nothing still imports the files about to be deleted**

Run: `cd frontend-react && grep -rn "LocationPicker\|PropertyMapSection\|mapConstants\|mapMarkerIcon" src --include=*.jsx --include=*.js -l`
Expected output: only the files being deleted in this task (`components/broker/LocationPicker.jsx`, `LocationPicker.test.jsx`, `components/home/PropertyMapSection.jsx`, `PropertyMapSection.test.jsx`, `utils/mapConstants.js`, `utils/mapMarkerIcon.js`) plus `pages/HomePage.jsx` (still importing `PropertyMapSection` — fixed in Step 3 below). If any other file appears, stop and investigate before deleting.

- [ ] **Step 2: Delete the map component files**

```bash
git rm frontend-react/src/components/broker/LocationPicker.jsx frontend-react/src/components/broker/LocationPicker.test.jsx
git rm frontend-react/src/components/home/PropertyMapSection.jsx frontend-react/src/components/home/PropertyMapSection.test.jsx
git rm frontend-react/src/utils/mapConstants.js frontend-react/src/utils/mapMarkerIcon.js
```

- [ ] **Step 3: Remove `PropertyMapSection` from `HomePage.jsx`**

Remove the import (line 4):

```js
import PropertyMapSection from '../components/home/PropertyMapSection.jsx';
```

Remove the `mapProperties` state and its effect (lines 173-181):

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

Remove the render call (lines 298-299):

```jsx
      {/* 5. PROPERTY MAP */}
      <PropertyMapSection properties={mapProperties} />

```

- [ ] **Step 4: Update `HomePage.test.jsx`**

In `frontend-react/src/pages/HomePage.test.jsx`, delete the two mock blocks (lines 9-18):

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

leaving the `vi.mock('../services/api.js', ...)` block (lines 5-7) directly followed by `import HomePage from './HomePage.jsx';`.

Delete the last test in the file (lines 61-68):

```jsx
test('renders the property map when a listing has valid coordinates', async () => {
  const { fetchProperties } = await import('../services/api.js');
  fetchProperties.mockResolvedValue([
    { id: 'p1', title: 'Nhà phố A', lat: 9.93, lng: 106.34, image: 'a.jpg', priceLabel: '2 tỷ' },
  ]);
  render(<HomePage />);
  expect(await screen.findByText('Bất động sản trên bản đồ')).toBeInTheDocument();
});
```

The file should end with the `'every category card renders a visible icon...'` test (originally lines 49-59).

- [ ] **Step 5: Remove Leaflet dependencies**

In `frontend-react/package.json`, remove these two lines from `dependencies`:

```json
    "leaflet": "^1.9.4",
```
```json
    "react-leaflet": "^5.0.0",
```

Run: `cd frontend-react && npm install`
Expected: `package-lock.json` updates to drop `leaflet`/`react-leaflet` and their sub-dependencies.

- [ ] **Step 6: Remove the Leaflet CSS import**

In `frontend-react/src/main.jsx`, remove line 5:

```js
import 'leaflet/dist/leaflet.css';
```

- [ ] **Step 7: Remove home-map CSS**

In `frontend-react/src/styles/home.css`, delete the block from the `HOME — PROPERTY MAP` comment (line 406) through the `.leaflet-popup-tip` rule (line 468):

```css
/* ============================================================
   HOME — PROPERTY MAP
   ============================================================ */
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

.leaflet-popup-content-wrapper,
.leaflet-popup-tip {
  background: var(--color-canvas);
  color: var(--color-ink);
}
```

Leave everything before and after this block untouched.

- [ ] **Step 8: Run the full frontend test suite**

Run: `cd frontend-react && npx vitest run --environment jsdom`
Expected: PASS — no test references the deleted files or `leaflet` anymore.

- [ ] **Step 9: Commit**

```bash
git add -A frontend-react
git commit -m "chore: remove Leaflet map picker/homepage pin map and its dependency"
```

---

### Task 6: Daily activity chart

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (`buildActivitySeries`/`rollingMonthBuckets`/`sameMonth` → `buildDailyActivitySeries`, chart title/subtitle)
- Test: new test file `frontend-react/src/pages/BrokerDashboard.dailyActivity.test.jsx`

**Interfaces:**
- Produces: `export function buildDailyActivitySeries(listings, viewings, referenceDate = new Date()): Array<{label: string, current: number, previous: number}>` — one entry per day of `referenceDate`'s calendar month.

- [ ] **Step 1: Write the failing tests**

Create `frontend-react/src/pages/BrokerDashboard.dailyActivity.test.jsx`:

```jsx
import { expect, test } from 'vitest';
import { buildDailyActivitySeries } from './BrokerDashboard.jsx';

test('returns one bucket per day of the reference month, labeled by day number', () => {
  const referenceDate = new Date(2026, 1, 15); // Feb 2026 → 28 days
  const series = buildDailyActivitySeries([], [], referenceDate);
  expect(series).toHaveLength(28);
  expect(series[0].label).toBe('1');
  expect(series[27].label).toBe('28');
});

test('counts listings by createdAt day as current', () => {
  const referenceDate = new Date(2026, 6, 15); // July 2026
  const listings = [
    { createdAt: '2026-07-03T10:00:00' },
    { createdAt: '2026-07-03T18:00:00' },
    { createdAt: '2026-07-10T08:00:00' },
  ];
  const series = buildDailyActivitySeries(listings, [], referenceDate);
  expect(series.find((bucket) => bucket.label === '3').current).toBe(2);
  expect(series.find((bucket) => bucket.label === '10').current).toBe(1);
  expect(series.find((bucket) => bucket.label === '1').current).toBe(0);
});

test('counts only CONFIRMED viewings by requestedAt day as previous', () => {
  const referenceDate = new Date(2026, 6, 15);
  const viewings = [
    { status: 'CONFIRMED', requestedAt: '2026-07-05T09:00:00' },
    { status: 'PENDING', requestedAt: '2026-07-05T09:00:00' },
    { status: 'CONFIRMED', createdAt: '2026-07-06T09:00:00' },
  ];
  const series = buildDailyActivitySeries([], viewings, referenceDate);
  expect(series.find((bucket) => bucket.label === '5').previous).toBe(1);
  expect(series.find((bucket) => bucket.label === '6').previous).toBe(1);
});

test('ignores listings/viewings from a different month', () => {
  const referenceDate = new Date(2026, 6, 15);
  const listings = [{ createdAt: '2026-06-30T10:00:00' }];
  const series = buildDailyActivitySeries(listings, [], referenceDate);
  expect(series.every((bucket) => bucket.current === 0)).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.dailyActivity.test.jsx`
Expected: FAIL — `buildDailyActivitySeries is not a function`.

- [ ] **Step 3: Implement `buildDailyActivitySeries`, remove the old monthly builders**

In `frontend-react/src/pages/BrokerDashboard.jsx`, replace `buildActivitySeries`, `rollingMonthBuckets`, and `sameMonth` (lines 1171-1207):

```js
function buildActivitySeries(listings, viewings) {
  const buckets = rollingMonthBuckets();
  listings.forEach((listing) => {
    const date = new Date(listing.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.current += 1;
  });
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const date = new Date(viewing.requestedAt || viewing.createdAt || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const bucket = buckets.find((item) => sameMonth(item.date, date));
    if (bucket) bucket.previous += 1;
  });
  return trimLeadingEmptyMonths(buckets.map((bucket) => ({
    label: bucket.label,
    current: bucket.current || 0,
    previous: bucket.previous || 0,
  })));
}

function rollingMonthBuckets(referenceDate = new Date(), length = 12) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (length - 1 - index), 1);
    return {
      date,
      label: `T${date.getMonth() + 1}`,
      current: 0,
      previous: 0,
    };
  });
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
```

with:

```js
export function buildDailyActivitySeries(listings, viewings, referenceDate = new Date()) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const buckets = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    label: String(index + 1),
    current: 0,
    previous: 0,
  }));

  function bucketForDate(raw) {
    if (!raw) return null;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    if (date.getFullYear() !== year || date.getMonth() !== month) return null;
    return buckets[date.getDate() - 1];
  }

  listings.forEach((listing) => {
    const bucket = bucketForDate(listing.createdAt);
    if (bucket) bucket.current += 1;
  });
  viewings.forEach((viewing) => {
    if (viewing.status !== 'CONFIRMED') return;
    const bucket = bucketForDate(viewing.requestedAt || viewing.createdAt);
    if (bucket) bucket.previous += 1;
  });

  return buckets.map(({ label, current, previous }) => ({ label, current, previous }));
}
```

Remove the now-unused import (line 15) — `trimLeadingEmptyMonths` is still used by `pages/admin/OverviewSection.jsx` and `pages/admin/ReportsSection.jsx`, so only this import line goes, `utils/chartSeries.js` itself stays untouched:

```js
import { trimLeadingEmptyMonths } from '../utils/chartSeries.js';
```

Update the call site (line 182):

```js
  const activityChartData = useMemo(() => buildActivitySeries(listings, viewings), [listings, viewings]);
```

with:

```js
  const activityChartData = useMemo(() => buildDailyActivitySeries(listings, viewings), [listings, viewings]);
```

Update the chart title/subtitle in the JSX (lines 527-533):

```jsx
                <TrendBarLineChart
                  title="Hoạt động môi giới theo tháng"
                  subtitle="Số bài đăng mới và lịch hẹn đã xác nhận theo từng tháng, tính từ khi có dữ liệu thực tế"
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
```

with:

```jsx
                <TrendBarLineChart
                  title="Hoạt động môi giới theo ngày"
                  subtitle={`Số bài đăng mới và lịch hẹn đã xác nhận theo từng ngày trong tháng ${activityMonthLabel}`}
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.dailyActivity.test.jsx`
Expected: PASS (4 tests).

Run: `cd frontend-react && npx vitest run --environment jsdom`
Expected: PASS — no other test referenced `buildActivitySeries`/`rollingMonthBuckets`/`sameMonth`/the old chart title text (confirm with `grep -rn "Hoạt động môi giới theo tháng" frontend-react/src` returning no matches before this step, and no matches after).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.dailyActivity.test.jsx
git commit -m "feat: switch broker activity chart to daily buckets"
```

---

### Task 7: Broker notification bell parity with admin

**Files:**
- Create: `frontend-react/src/utils/brokerNotifications.js`
- Test: `frontend-react/src/utils/brokerNotifications.test.js`
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (export `isPendingListing`, wire in `NotificationBell`, remove the static bell markup)
- Modify: `frontend-react/src/styles.css:1413-1422` (remove now-unused `.dashboard-icon-dot` rule)

**Interfaces:**
- Consumes: `isPendingListing` exported from `BrokerDashboard.jsx`; `NotificationBell` from `components/dashboard/NotificationBell.jsx` (existing, unchanged — props: `{ notifications: Array<{id, icon, text, href?, tone}> }`).
- Produces: `export function buildBrokerNotifications({ listings, viewings }): Array<{id, icon, text, href, tone}>`.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/utils/brokerNotifications.test.js`:

```js
import { expect, test } from 'vitest';
import { buildBrokerNotifications } from './brokerNotifications.js';

test('collects pending listings and pending viewings', () => {
  const items = buildBrokerNotifications({
    listings: [{ rawStatus: 'PENDING' }, { rawStatus: 'AVAILABLE' }, { rawStatus: 'PENDING' }],
    viewings: [{ status: 'PENDING' }, { status: 'CONFIRMED' }],
  });

  expect(items).toEqual([
    { id: 'pending-listings', icon: 'Clock', text: '2 tin chờ duyệt', href: '#/broker/properties', tone: 'warning' },
    { id: 'pending-viewings', icon: 'Calendar', text: '1 lịch hẹn chờ xác nhận', href: '#/broker/viewings', tone: 'warning' },
  ]);
});

test('returns empty array when nothing needs attention', () => {
  expect(buildBrokerNotifications({ listings: [{ rawStatus: 'AVAILABLE' }], viewings: [] })).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/utils/brokerNotifications.test.js`
Expected: FAIL — module `./brokerNotifications.js` does not exist.

- [ ] **Step 3: Export `isPendingListing` from `BrokerDashboard.jsx`**

In `frontend-react/src/pages/BrokerDashboard.jsx`, change (line 1277):

```js
function isPendingListing(listing) {
```

to:

```js
export function isPendingListing(listing) {
```

- [ ] **Step 4: Implement `buildBrokerNotifications`**

Create `frontend-react/src/utils/brokerNotifications.js`:

```js
import { isPendingListing } from '../pages/BrokerDashboard.jsx';

export function buildBrokerNotifications({ listings = [], viewings = [] }) {
  const items = [];
  const pendingListings = listings.filter((listing) => isPendingListing(listing)).length;
  const pendingViewings = viewings.filter((viewing) => viewing.status === 'PENDING').length;

  if (pendingListings > 0) {
    items.push({ id: 'pending-listings', icon: 'Clock', text: `${pendingListings} tin chờ duyệt`, href: '#/broker/properties', tone: 'warning' });
  }
  if (pendingViewings > 0) {
    items.push({ id: 'pending-viewings', icon: 'Calendar', text: `${pendingViewings} lịch hẹn chờ xác nhận`, href: '#/broker/viewings', tone: 'warning' });
  }
  return items;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/utils/brokerNotifications.test.js`
Expected: PASS (2 tests).

- [ ] **Step 6: Wire `NotificationBell` into `BrokerDashboard.jsx`**

Add imports near the top of `frontend-react/src/pages/BrokerDashboard.jsx` (after the `DateRangeFilter` import, line 7):

```js
import NotificationBell from '../components/dashboard/NotificationBell.jsx';
import { buildBrokerNotifications } from '../utils/brokerNotifications.js';
```

Add a memo near `wardChart` (after line 162):

```js
  const brokerNotifications = useMemo(() => buildBrokerNotifications({ listings, viewings }), [listings, viewings]);
```

Replace the static bell button (lines 456-460):

```jsx
            <button className="dashboard-icon-btn" type="button" aria-label="Thông báo">
              <Icon name="Bell" size={18} />
              {(dashboardStats.pendingListings || viewings.length) > 0 && <span className="dashboard-icon-dot" />}
            </button>
```

with:

```jsx
            <NotificationBell notifications={brokerNotifications} />
```

- [ ] **Step 7: Remove the now-unused `.dashboard-icon-dot` CSS rule**

Run: `cd frontend-react && grep -rn "dashboard-icon-dot" src`
Expected: no matches left in any `.jsx` file (confirm before deleting the CSS).

In `frontend-react/src/styles.css`, delete lines 1413-1422:

```css
.dashboard-icon-dot {
  position: absolute;
  top: 9px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-gold);
  box-shadow: 0 0 0 2px var(--color-canvas);
}

```

- [ ] **Step 8: Run the full frontend test suite**

Run: `cd frontend-react && npx vitest run --environment jsdom`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/utils/brokerNotifications.js frontend-react/src/utils/brokerNotifications.test.js frontend-react/src/styles.css
git commit -m "feat: give broker notification bell dropdown parity with admin"
```

---

### Task 8: Swap "Loại hình BĐS" and "Lịch hẹn sắp tới" dashboard cards

**Files:**
- Modify: `frontend-react/src/components/Charts.jsx:183-201` (`ThreeDDonutChart` — add `compact` prop)
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx` (JSX reorder in the `section === 'dashboard'` block, lines 526-549)
- Modify: `frontend-react/src/styles/dashboard.css` (compact donut layout CSS, near line 76-81)
- Modify: `frontend-react/src/styles.css` (remove now-unused `.dashboard-live-row` rule, lines 1526-1531, if confirmed unused)

**Interfaces:**
- Produces: `ThreeDDonutChart({ title, subtitle, data, centerLabel, compact = false })` — new optional prop, default preserves existing admin behavior at `pages/admin/ReportsSection.jsx`.

- [ ] **Step 1: Write the failing test for the `compact` prop**

Find or create a Charts test file — check first:

Run: `cd frontend-react && grep -rln "ThreeDDonutChart" src --include=*.test.jsx`

If a `Charts.test.jsx` already covers `ThreeDDonutChart`, add the test there. Otherwise create `frontend-react/src/components/Charts.compact.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ThreeDDonutChart } from './Charts.jsx';

afterEach(cleanup);

const data = [{ label: 'Trọ', value: 2 }, { label: 'Nhà', value: 1 }];

test('compact prop adds the compact layout class', () => {
  const { container } = render(<ThreeDDonutChart title="Loại hình BĐS" data={data} compact />);
  expect(container.querySelector('.chart3d-donut-layout--compact')).not.toBeNull();
});

test('without compact prop, the compact layout class is absent', () => {
  const { container } = render(<ThreeDDonutChart title="Loại hình BĐS" data={data} />);
  expect(container.querySelector('.chart3d-donut-layout--compact')).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/components/Charts.compact.test.jsx`
Expected: FAIL — `.chart3d-donut-layout--compact` never renders (prop not implemented yet).

- [ ] **Step 3: Add the `compact` prop to `ThreeDDonutChart`**

In `frontend-react/src/components/Charts.jsx`, replace lines 183-201:

```js
export function ThreeDDonutChart({ title, subtitle, data, centerLabel = 'tổng' }) {
  const [mode, setMode] = useState('3d');
  const normalized = withColors(data);
  const total = normalized.reduce((sum, item) => sum + item.value, 0);

  return (
    <ThreeDChartPanel title={title} subtitle={subtitle} mode={mode} onModeChange={setMode}>
      <div className="chart3d-donut-layout">
        <div className="chart3d-donut" style={{ background: conicGradientFor(normalized, total || 1) }}>
          <div className="chart3d-donut-hole">
            <span className="chart3d-donut-total">{formatChartNumber(total)}</span>
            <span className="chart3d-donut-label">{centerLabel}</span>
          </div>
        </div>
        <Legend data={normalized} total={total || 1} />
      </div>
    </ThreeDChartPanel>
  );
}
```

with:

```js
export function ThreeDDonutChart({ title, subtitle, data, centerLabel = 'tổng', compact = false }) {
  const [mode, setMode] = useState('3d');
  const normalized = withColors(data);
  const total = normalized.reduce((sum, item) => sum + item.value, 0);
  const layoutClass = `chart3d-donut-layout${compact ? ' chart3d-donut-layout--compact' : ''}`;

  return (
    <ThreeDChartPanel title={title} subtitle={subtitle} mode={mode} onModeChange={setMode}>
      <div className={layoutClass}>
        <div className="chart3d-donut" style={{ background: conicGradientFor(normalized, total || 1) }}>
          <div className="chart3d-donut-hole">
            <span className="chart3d-donut-total">{formatChartNumber(total)}</span>
            <span className="chart3d-donut-label">{centerLabel}</span>
          </div>
        </div>
        <Legend data={normalized} total={total || 1} />
      </div>
    </ThreeDChartPanel>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/components/Charts.compact.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Add compact layout CSS**

In `frontend-react/src/styles/dashboard.css`, add this new rule immediately after the existing `.chart3d-donut-layout` rule (after line 81, before `.chart3d-donut`):

```css
.chart3d-donut-layout--compact {
  grid-template-columns: 1fr;
}

.chart3d-donut-layout--compact .chart3d-donut {
  width: min(140px, 100%);
  margin: 8px auto 16px;
}
```

- [ ] **Step 6: Swap the cards in `BrokerDashboard.jsx`**

Replace the two `dashboard-*-row` blocks (lines 526-549):

```jsx
              <div className="dashboard-live-row">
                <TrendBarLineChart
                  title="Hoạt động môi giới theo ngày"
                  subtitle={`Số bài đăng mới và lịch hẹn đã xác nhận theo từng ngày trong tháng ${activityMonthLabel}`}
                  data={activityChartData}
                  currentLabel="Bài đăng"
                  previousLabel="Lịch hẹn xác nhận"
                />
                <ThreeDDonutChart
                  title="Loại hình BĐS đang quản lý"
                  subtitle="Trọ, nhà và đất đang quản lý"
                  data={managedTypeData}
                  centerLabel="tin"
                />
              </div>

              <div className="dashboard-charts-row">
                <div className="dashboard-chart-span-2">
                  <WardBarChart title="Tin đăng theo phường" data={wardChart} />
                </div>
                <DashboardPanel title="Lịch hẹn sắp tới" count={viewingsLoading ? 'Đang tải' : `${upcomingViewings.length} lịch`}>
                  <UpcomingViewingsSummary viewings={upcomingViewings} loading={viewingsLoading} />
                </DashboardPanel>
              </div>
```

with:

```jsx
              <div className="dashboard-charts-row">
                <div className="dashboard-chart-span-2">
                  <TrendBarLineChart
                    title="Hoạt động môi giới theo ngày"
                    subtitle={`Số bài đăng mới và lịch hẹn đã xác nhận theo từng ngày trong tháng ${activityMonthLabel}`}
                    data={activityChartData}
                    currentLabel="Bài đăng"
                    previousLabel="Lịch hẹn xác nhận"
                  />
                </div>
                <DashboardPanel title="Lịch hẹn sắp tới" count={viewingsLoading ? 'Đang tải' : `${upcomingViewings.length} lịch`}>
                  <UpcomingViewingsSummary viewings={upcomingViewings} loading={viewingsLoading} />
                </DashboardPanel>
              </div>

              <div className="dashboard-charts-row">
                <div className="dashboard-chart-span-2">
                  <WardBarChart title="Tin đăng theo phường" data={wardChart} />
                </div>
                <ThreeDDonutChart
                  title="Loại hình BĐS đang quản lý"
                  subtitle="Trọ, nhà và đất đang quản lý"
                  data={managedTypeData}
                  centerLabel="tin"
                  compact
                />
              </div>
```

- [ ] **Step 7: Remove the now-unused `.dashboard-live-row` CSS rule**

Run: `cd frontend-react && grep -rn "dashboard-live-row" src`
Expected: no matches left in any `.jsx` file (only the CSS rule itself, about to be removed).

In `frontend-react/src/styles.css`, delete lines 1526-1531:

```css
.dashboard-live-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

```

Also update the selector list at lines 1533-1535 to drop `.dashboard-live-row >`:

```css
.dashboard-live-row > *,
.dashboard-charts-row > *,
.dashboard-panels-row > *,
```

becomes:

```css
.dashboard-charts-row > *,
.dashboard-panels-row > *,
```

- [ ] **Step 8: Run the full frontend test suite**

Run: `cd frontend-react && npx vitest run --environment jsdom`
Expected: PASS.

- [ ] **Step 9: Manually verify in the browser**

Run: `cd frontend-react && npm run dev`, log in as a broker (mock API: any email containing `broker`), open `#/broker/dashboard`. Confirm: "Lịch hẹn sắp tới" now sits beside the daily activity chart in the first row; "Loại hình BĐS đang quản lý" now sits beside "Tin đăng theo phường" in the second row, rendered compact (donut stacked above its legend, not overflowing the narrow column). Stop the dev server after checking (Ctrl+C).

- [ ] **Step 10: Commit**

```bash
git add frontend-react/src/components/Charts.jsx frontend-react/src/components/Charts.compact.test.jsx frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/styles/dashboard.css frontend-react/src/styles.css
git commit -m "feat: swap broker dashboard property-type and upcoming-appointments cards"
```

---

## Final verification

- [ ] Run the complete frontend suite once more end to end: `cd frontend-react && npx vitest run --environment jsdom` — expect all green.
- [ ] Run `cd frontend-react && npm run build` to confirm the Leaflet removal didn't break the production bundle.
- [ ] Re-read `docs/superpowers/specs/2026-07-15-broker-dashboard-revamp-design.md` section by section and confirm each of the 5 numbered changes has a corresponding completed task above.
