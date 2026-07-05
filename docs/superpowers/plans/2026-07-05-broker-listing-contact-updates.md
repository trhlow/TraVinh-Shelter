# Broker Listing Fields & Contact Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin listing form's single "Diện tích (m²)" input with "Chiều dài (m)" / "Chiều rộng (m)" (area auto-computed), rename "Phòng tắm" to "Nhà vệ sinh" everywhere it appears, hide bedroom/bathroom fields for the Đất category, remove Facebook/TikTok/Youtube from the footer, add a broker Facebook link to the property detail contact card, add Zalo/Facebook links to the public broker directory cards (while hiding the broker's email), and strip the "đặt lịch xem" booking form down to name/phone/note only.

**Architecture:** Frontend changes to the React 19 app (`frontend-react`), plus a small backend addition (Spring Boot `User` entity + Flyway migration + `BrokerSummaryResponse` DTO) so brokers can carry a stored Zalo/Facebook link end-to-end instead of deriving one from the phone number. No new broker-facing edit UI is added for the new fields in this pass — they are seeded via demo data and mock data only; a future task can add profile-editing for them.

**Tech Stack:** React 19, Vite 8, Vitest + Testing Library, lucide-react icons, Spring Boot 3 / Java 21, Flyway, PostgreSQL 16.

## Global Constraints

- UI text is **Tiếng Việt**; code identifiers, functions, and comments are **English** (`.claude/rules/workflow.md`).
- Commit messages: **English, conventional commits** (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`). Do **not** add a "Co-Authored-By" line.
- No inline styles; no hard-coded `#hex` in JSX — only CSS classes / CSS custom properties (`.claude/rules/design.md`).
- Only `lucide-react` icons via `components/ui/Icon.jsx`.
- Mock API mode (`VITE_USE_MOCK_API=true`) is the default dev path — verify behavior against mock data.
- JPA runs in `validate` mode (`.claude/rules/tech-defaults.md`) — every new entity column needs a matching Flyway migration, in the same task.
- Property soft attributes (ward, houseType, area, bedrooms, bathrooms, ...) live in the `attributes` JSONB column, not as new SQL columns — `length`/`width` follow the same convention.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `backend-springboot/src/main/resources/db/migration/V14__add_broker_social_links.sql` | Schema | **Create** — add `zalo_url`/`facebook_url` to `users`, seed demo broker |
| `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java` | Entity | Add `zaloUrl`/`facebookUrl` fields + getters |
| `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java` | DTO | Add `zaloUrl`/`facebookUrl` passthrough |
| `frontend-react/src/services/api.js` | `normalizeProperty` | Passthrough `broker.zalo`/`broker.facebook`, `property.length`/`property.width` |
| `frontend-react/src/services/mockData.js` | Mock data | Add `zalo`/`facebook` per broker; add `length`/`width` to the 5 properties that already have an `"L x Wm"` `size` string |
| `frontend-react/src/pages/BrokerDashboard.jsx` | Listing create/edit form | Dài×rộng replaces Diện tích (m²); "Nhà vệ sinh" replaces "Phòng tắm"; hide Phòng ngủ/Nhà vệ sinh for Đất; export `propertyPayload` for testing |
| `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` | Test | **Create** |
| `frontend-react/src/layouts/MainLayout.jsx` | Footer | Remove Facebook/TikTok/Youtube social icons + now-dead `TikTokIcon`/`FOOTER_SOCIALS` |
| `frontend-react/src/layouts/MainLayout.test.jsx` | Test | **Create** |
| `frontend-react/src/pages/PropertyDetailPage.jsx` | Contact card + specs | Add Facebook link below phone/Zalo; rename "Phòng tắm" label; drop dead `selectedRoom` state/wiring |
| `frontend-react/src/pages/PropertyDetailPage.test.jsx` | Test | **Create** |
| `frontend-react/src/pages/BrokersPage.jsx` | Public broker directory | Add Zalo/Facebook icons beside "Xem tất cả"; hide broker email; carry `zalo`/`facebook` through `brokerStatsFrom` |
| `frontend-react/src/pages/BrokersPage.test.jsx` | Test | **Create** |
| `frontend-react/src/components/property/BookingForm.jsx` | Viewing request form | Keep only tên khách hàng / số điện thoại / ghi chú |
| `frontend-react/src/components/property/BookingForm.test.jsx` | Test | Rewrite |
| `frontend-react/src/styles.css` | Design tokens + components | Add `--color-facebook`; add `.contact-btn-facebook`; add `.broker-card-socials`/`.broker-card-social-icon`; update `.broker-card-footer`; remove `.footer-social-icon*` |

---

### Task 1: Backend — broker Zalo/Facebook fields

**Files:**
- Create: `backend-springboot/src/main/resources/db/migration/V14__add_broker_social_links.sql`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`
- Modify: `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java`

**Interfaces:**
- Produces: `User.getZaloUrl(): String`, `User.getFacebookUrl(): String` (nullable); `BrokerSummaryResponse(id, fullName, phone, avatarUrl, email, zaloUrl, facebookUrl)` — consumed by `PropertyResponse.broker` → the frontend's `item.broker.zaloUrl`/`item.broker.facebookUrl` (Task 2).

This is a plain schema + DTO addition with no new branching logic, so there is no RED test step — the existing Testcontainers-backed test suite is the regression guard (JPA `validate` mode fails fast if the entity and schema disagree).

- [ ] **Step 1: Add the migration**

Create `backend-springboot/src/main/resources/db/migration/V14__add_broker_social_links.sql`:

```sql
ALTER TABLE users ADD COLUMN zalo_url VARCHAR(2048);
ALTER TABLE users ADD COLUMN facebook_url VARCHAR(2048);

UPDATE users
SET zalo_url = 'https://zalo.me/84912345678',
    facebook_url = 'https://facebook.com/congtinland.broker'
WHERE email = 'broker@congtinland.vn';
```

- [ ] **Step 2: Add the fields to the `User` entity**

In `backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java`, add after the `avatarUrl` field (currently line 40-41):

```java
    @Column(name = "avatar_url", length = 2048)
    private String avatarUrl;

    @Column(name = "zalo_url", length = 2048)
    private String zaloUrl;

    @Column(name = "facebook_url", length = 2048)
    private String facebookUrl;
```

And add getters after `getAvatarUrl()` (currently line 105):

```java
    public String getAvatarUrl() { return avatarUrl; }
    public String getZaloUrl() { return zaloUrl; }
    public String getFacebookUrl() { return facebookUrl; }
```

- [ ] **Step 3: Passthrough in `BrokerSummaryResponse`**

Replace the full contents of `backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java`:

```java
package com.travinh.realty.modules.property.dto;

import com.travinh.realty.modules.user.model.User;
import java.util.UUID;

public record BrokerSummaryResponse(UUID id, String fullName, String phone, String avatarUrl, String email,
                                     String zaloUrl, String facebookUrl) {
    public static BrokerSummaryResponse from(User broker) {
        return new BrokerSummaryResponse(broker.getId(), broker.getFullName(), broker.getPhone(),
                broker.getAvatarUrl(), broker.getEmail(), broker.getZaloUrl(), broker.getFacebookUrl());
    }
}
```

- [ ] **Step 4: Run the backend test suite to confirm nothing broke**

Run: `cd backend-springboot && mvn test`
Expected: PASS — Flyway migrates cleanly, `User`/`BrokerSummaryResponse` still match the schema, no existing test references the old 5-arg `BrokerSummaryResponse` constructor.

- [ ] **Step 5: Commit**

```bash
git add backend-springboot/src/main/resources/db/migration/V14__add_broker_social_links.sql backend-springboot/src/main/java/com/travinh/realty/modules/user/model/User.java backend-springboot/src/main/java/com/travinh/realty/modules/property/dto/BrokerSummaryResponse.java
git commit -m "feat(backend): add broker zalo/facebook link fields"
```

---

### Task 2: Frontend — passthrough broker social links & land dimensions

**Files:**
- Modify: `frontend-react/src/services/api.js:305-353` (`normalizeProperty`)
- Modify: `frontend-react/src/services/mockData.js`

**Interfaces:**
- Consumes: `item.broker.zaloUrl`/`item.broker.facebookUrl` (Task 1's `BrokerSummaryResponse`), `item.attributes.length`/`item.attributes.width` (JSONB, written by Task 3's `propertyPayload`).
- Produces: `property.broker.zalo: string`, `property.broker.facebook: string`, `property.length: number`, `property.width: number` — consumed by Task 3 (`editListing`), Task 5 (`PropertyDetailPage`), Task 6 (`BrokersPage`/`brokerStatsFrom`).

No dedicated test: `normalizeProperty` is unexported, untested elsewhere in the codebase, and this is a straight fallback-passthrough matching the existing fields immediately around it (`area`, `bedrooms`, `email`, `avatarUrl`). The full frontend suite (Task 8) is the regression guard.

- [ ] **Step 1: Add `length`/`width` and broker social passthrough to `normalizeProperty`**

In `frontend-react/src/services/api.js`, replace lines 327-330:

```js
    area: Number(attributes.area || 0),
    size: attributes.size || (attributes.area ? `${attributes.area}m²` : 'Đang cập nhật'),
    bedrooms: Number(attributes.bedrooms || 0),
    bathrooms: Number(attributes.bathrooms || 0),
```

with:

```js
    area: Number(attributes.area || 0),
    length: Number(attributes.length || 0),
    width: Number(attributes.width || 0),
    size: attributes.size || (attributes.area ? `${attributes.area}m²` : 'Đang cập nhật'),
    bedrooms: Number(attributes.bedrooms || 0),
    bathrooms: Number(attributes.bathrooms || 0),
```

Then replace the `broker` block (lines 343-351):

```js
    broker: {
      id: item.broker?.id,
      name: item.broker?.fullName || 'Môi giới Công Tín Land',
      phone: item.broker?.phone || '02943999888',
      email: item.broker?.email || 'support@congtinland.vn',
      avatarUrl: item.broker?.avatarUrl || '',
      rating: 'Đã xác minh',
      responseTime: '15 phút',
    },
```

with:

```js
    broker: {
      id: item.broker?.id,
      name: item.broker?.fullName || 'Môi giới Công Tín Land',
      phone: item.broker?.phone || '02943999888',
      email: item.broker?.email || 'support@congtinland.vn',
      avatarUrl: item.broker?.avatarUrl || '',
      zalo: item.broker?.zaloUrl || '',
      facebook: item.broker?.facebookUrl || '',
      rating: 'Đã xác minh',
      responseTime: '15 phút',
    },
```

- [ ] **Step 2: Add `zalo`/`facebook` to each mock broker**

In `frontend-react/src/services/mockData.js`, there are 5 distinct brokers, each appearing on 1-2 property records. Update every occurrence (use `replace_all` — the broker lines are byte-identical across repeats):

Replace:
```js
    broker: { name: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'toan@congtinland.vn', rating: '4.9 (128 đánh giá)', responseTime: '5 phút' },
```
with:
```js
    broker: { name: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'toan@congtinland.vn', zalo: 'https://zalo.me/84912345678', facebook: 'https://facebook.com/toan.congtinland', rating: '4.9 (128 đánh giá)', responseTime: '5 phút' },
```
(appears at lines 19 and 137 — use `replace_all: true`)

Replace:
```js
    broker: { name: 'Trần Mỹ Linh', phone: '0908899777', email: 'linh@congtinland.vn', rating: '4.8 (76 đánh giá)', responseTime: '8 phút' },
```
with:
```js
    broker: { name: 'Trần Mỹ Linh', phone: '0908899777', email: 'linh@congtinland.vn', zalo: 'https://zalo.me/84908899777', facebook: 'https://facebook.com/linh.congtinland', rating: '4.8 (76 đánh giá)', responseTime: '8 phút' },
```
(appears at lines 44 and 118 — use `replace_all: true`)

Replace:
```js
    broker: { name: 'Lê Minh Khang', phone: '0934567890', email: 'khang@congtinland.vn', rating: '4.7 (54 đánh giá)', responseTime: '10 phút' },
```
with:
```js
    broker: { name: 'Lê Minh Khang', phone: '0934567890', email: 'khang@congtinland.vn', zalo: 'https://zalo.me/84934567890', facebook: 'https://facebook.com/khang.congtinland', rating: '4.7 (54 đánh giá)', responseTime: '10 phút' },
```
(appears at lines 68 and 156 — use `replace_all: true`)

Replace (line 93):
```js
    broker: { name: 'Phạm Quốc Huy', phone: '0987654321', email: 'huy@congtinland.vn', rating: '4.9 (91 đánh giá)', responseTime: '4 phút' },
```
with:
```js
    broker: { name: 'Phạm Quốc Huy', phone: '0987654321', email: 'huy@congtinland.vn', zalo: 'https://zalo.me/84987654321', facebook: 'https://facebook.com/huy.congtinland', rating: '4.9 (91 đánh giá)', responseTime: '4 phút' },
```

Replace (line 202):
```js
    broker: { name: 'Võ Hoàng Nam', phone: '0923456789', email: 'nam@congtinland.vn', rating: '4.8 (39 đánh giá)', responseTime: '7 phút' },
```
with:
```js
    broker: { name: 'Võ Hoàng Nam', phone: '0923456789', email: 'nam@congtinland.vn', zalo: 'https://zalo.me/84923456789', facebook: 'https://facebook.com/nam.congtinland', rating: '4.8 (39 đánh giá)', responseTime: '7 phút' },
```

- [ ] **Step 3: Add `length`/`width` to the 5 properties that already show an `"L x Wm"` size string**

Replace (line 12-13):
```js
    area: 100,
    size: '5 x 20m',
```
with:
```js
    area: 100,
    size: '5 x 20m',
    length: 5,
    width: 20,
```

Replace (line 37-38):
```js
    area: 150,
    size: '5 x 30m',
```
with:
```js
    area: 150,
    size: '5 x 30m',
    length: 5,
    width: 30,
```

Replace (line 86-87):
```js
    area: 120,
    size: '6 x 20m',
```
with:
```js
    area: 120,
    size: '6 x 20m',
    length: 6,
    width: 20,
```

Replace (line 111-112):
```js
    area: 300,
    size: '10 x 30m',
```
with:
```js
    area: 300,
    size: '10 x 30m',
    length: 10,
    width: 30,
```

Replace (line 130-131):
```js
    area: 80,
    size: '4 x 20m',
```
with:
```js
    area: 80,
    size: '4 x 20m',
    length: 4,
    width: 20,
```

- [ ] **Step 4: Commit**

```bash
git add frontend-react/src/services/api.js frontend-react/src/services/mockData.js
git commit -m "feat(properties): passthrough broker zalo/facebook and land length/width"
```

---

### Task 3: Broker listing form — dài×rộng, "Nhà vệ sinh", hide fields for Đất

**Files:**
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Test: `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx` (create)

**Interfaces:**
- Consumes: `property.length`/`property.width` (Task 2's `normalizeProperty`).
- Produces: `propertyPayload(form): { categorySlug, title, address, price, attributes }` (now exported) where `attributes.length`, `attributes.width`, `attributes.area` (= length × width, or `null` if either is missing) always exist, and `attributes.bedrooms`/`attributes.bathrooms` only exist when `categorySlug !== 'dat'`.

- [ ] **Step 1: Write the failing unit tests for `propertyPayload`**

Create `frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrokerDashboard, { propertyPayload } from './BrokerDashboard.jsx';

describe('propertyPayload — area from length × width', () => {
  const base = {
    categorySlug: 'dat', transaction: 'sale', ward: 'phuong-tra-vinh',
    length: '5', width: '20', bedrooms: '', bathrooms: '', description: '', amenities: [],
    coverUrl: '', title: 'Lô đất test', address: 'Test', price: '1000000000',
  };

  test('computes area as length × width', () => {
    const payload = propertyPayload(base);
    expect(payload.attributes.length).toBe(5);
    expect(payload.attributes.width).toBe(20);
    expect(payload.attributes.area).toBe(100);
  });

  test('area is null when length or width is missing', () => {
    const payload = propertyPayload({ ...base, width: '' });
    expect(payload.attributes.area).toBeNull();
  });

  test('drops bedrooms/bathrooms attributes for Đất', () => {
    const payload = propertyPayload({ ...base, bedrooms: '3', bathrooms: '2' });
    expect('bedrooms' in payload.attributes).toBe(false);
    expect('bathrooms' in payload.attributes).toBe(false);
  });

  test('keeps bedrooms/bathrooms attributes for Nhà', () => {
    const payload = propertyPayload({ ...base, categorySlug: 'nha', bedrooms: '3', bathrooms: '2' });
    expect(payload.attributes.bedrooms).toBe(3);
    expect(payload.attributes.bathrooms).toBe(2);
  });
});

// ── Rendered form ────────────────────────────────────────────────────────────
vi.mock('../services/api.js', () => ({
  fetchCurrentUser: vi.fn().mockResolvedValue({
    id: 'broker-id', fullName: 'Nguyễn Văn Toàn', phone: '0912345678', email: 'broker@congtinland.vn', avatarUrl: '',
  }),
  fetchBrokerDashboard: vi.fn().mockResolvedValue({ activeListings: 0, totalListings: 0, pendingLeads: 0, listings: [] }),
  fetchBrokerViewings: vi.fn().mockResolvedValue([]),
  changePassword: vi.fn(),
  createProperty: vi.fn(),
  deleteProperty: vi.fn(),
  uploadCurrentUserAvatar: vi.fn(),
  uploadPropertyImage: vi.fn(),
  updateCurrentProfile: vi.fn(),
  updateProperty: vi.fn(),
  updatePropertyStatus: vi.fn(),
  updateBrokerViewingStatus: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.setItem('travinh-realty-session', JSON.stringify({
    token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id',
  }));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});
afterEach(() => { cleanup(); window.localStorage.clear(); vi.unstubAllGlobals(); });

const session = { token: 'test-token', email: 'broker@congtinland.vn', role: 'BROKER', userId: 'broker-id' };

describe('Listing form — field visibility', () => {
  test('always shows Chiều dài / Chiều rộng, never Diện tích (m²)', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Chiều dài (m)')).toBeInTheDocument();
    expect(screen.getByText('Chiều rộng (m)')).toBeInTheDocument();
    expect(screen.queryByText('Diện tích (m²)')).not.toBeInTheDocument();
  });

  test('renames Phòng tắm to Nhà vệ sinh', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Nhà vệ sinh')).toBeInTheDocument();
    expect(screen.queryByText('Phòng tắm')).not.toBeInTheDocument();
  });

  test('shows Phòng ngủ / Nhà vệ sinh for the default (Trọ) category', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    expect(await screen.findByText('Phòng ngủ')).toBeInTheDocument();
    expect(screen.getByText('Nhà vệ sinh')).toBeInTheDocument();
  });

  test('hides Phòng ngủ / Nhà vệ sinh when category is Đất', async () => {
    render(<BrokerDashboard session={session} section="properties" currentPath="/broker/properties" />);
    const categoryField = (await screen.findByText('Danh mục')).closest('.auth-field');
    await userEvent.selectOptions(within(categoryField).getByRole('combobox'), 'Đất');
    expect(screen.queryByText('Phòng ngủ')).not.toBeInTheDocument();
    expect(screen.queryByText('Nhà vệ sinh')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: FAIL — `propertyPayload` isn't exported yet, and the form still shows "Diện tích (m²)" / "Phòng tắm" unconditionally.

- [ ] **Step 3: Update `EMPTY_FORM` and `editListing`**

In `frontend-react/src/pages/BrokerDashboard.jsx`, replace line 42 (inside `EMPTY_FORM`):

```js
  area: '',
```

with:

```js
  length: '',
  width: '',
```

Replace line 336 (inside `editListing`):

```js
      area: property.area ? String(property.area) : '',
```

with:

```js
      length: property.length ? String(property.length) : '',
      width: property.width ? String(property.width) : '',
```

- [ ] **Step 4: Replace the "Diện tích (m²)" field with "Chiều dài (m)" / "Chiều rộng (m)"**

Replace lines 570-572:

```jsx
                  <FormField label="Diện tích (m²)">
                    <input className="input" type="number" min="0" value={listingForm.area} onChange={(event) => setListingValue('area', event.target.value, setListingForm)} />
                  </FormField>
```

with:

```jsx
                  <FormField label="Chiều dài (m)">
                    <input className="input" type="number" min="0" step="0.01" value={listingForm.length} onChange={(event) => setListingValue('length', event.target.value, setListingForm)} />
                  </FormField>
                  <FormField label="Chiều rộng (m)">
                    <input className="input" type="number" min="0" step="0.01" value={listingForm.width} onChange={(event) => setListingValue('width', event.target.value, setListingForm)} />
                  </FormField>
```

- [ ] **Step 5: Rename "Phòng tắm" and hide both fields for Đất**

Replace lines 581-586:

```jsx
                  <FormField label="Phòng ngủ">
                    <input className="input" type="number" min="0" value={listingForm.bedrooms} onChange={(event) => setListingValue('bedrooms', event.target.value, setListingForm)} />
                  </FormField>
                  <FormField label="Phòng tắm">
                    <input className="input" type="number" min="0" value={listingForm.bathrooms} onChange={(event) => setListingValue('bathrooms', event.target.value, setListingForm)} />
                  </FormField>
```

with:

```jsx
                  {listingForm.categorySlug !== 'dat' && (
                    <>
                      <FormField label="Phòng ngủ">
                        <input className="input" type="number" min="0" value={listingForm.bedrooms} onChange={(event) => setListingValue('bedrooms', event.target.value, setListingForm)} />
                      </FormField>
                      <FormField label="Nhà vệ sinh">
                        <input className="input" type="number" min="0" value={listingForm.bathrooms} onChange={(event) => setListingValue('bathrooms', event.target.value, setListingForm)} />
                      </FormField>
                    </>
                  )}
```

- [ ] **Step 6: Update `propertyPayload` and export it**

Replace lines 868-880:

```js
function propertyPayload(form) {
  const attributes = {
    transaction: form.categorySlug === 'tro' ? 'rent' : form.transaction,
    ward: form.ward,
    area: numericOrNull(form.area),
    bedrooms: numericOrNull(form.bedrooms),
    bathrooms: numericOrNull(form.bathrooms),
    description: form.description,
    amenities: form.amenities,
  };
  if (form.categorySlug === 'nha' && form.transaction === 'rent') {
    attributes.houseType = form.houseType;
  }
```

with:

```js
export function propertyPayload(form) {
  const length = numericOrNull(form.length);
  const width = numericOrNull(form.width);
  const attributes = {
    transaction: form.categorySlug === 'tro' ? 'rent' : form.transaction,
    ward: form.ward,
    length,
    width,
    area: length != null && width != null ? Number((length * width).toFixed(2)) : null,
    description: form.description,
    amenities: form.amenities,
  };
  if (form.categorySlug !== 'dat') {
    attributes.bedrooms = numericOrNull(form.bedrooms);
    attributes.bathrooms = numericOrNull(form.bathrooms);
  }
  if (form.categorySlug === 'nha' && form.transaction === 'rent') {
    attributes.houseType = form.houseType;
  }
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokerDashboard.listingForm.test.jsx`
Expected: PASS

- [ ] **Step 8: Run the full frontend suite to check for regressions**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS (in particular `BrokerDashboard.filter.test.jsx`, which does not touch these fields)

- [ ] **Step 9: Commit**

```bash
git add frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/BrokerDashboard.listingForm.test.jsx
git commit -m "feat(broker): replace diện tích m² with chiều dài/rộng, rename phòng tắm, hide fields for đất"
```

---

### Task 4: Footer — remove Facebook/TikTok/Youtube

**Files:**
- Modify: `frontend-react/src/layouts/MainLayout.jsx`
- Modify: `frontend-react/src/styles.css`
- Test: `frontend-react/src/layouts/MainLayout.test.jsx` (create)

**Interfaces:**
- Produces: `Footer` (named export from `MainLayout.jsx`) no longer renders any element with `aria-label` of `Facebook`, `TikTok`, or `Youtube`.

- [ ] **Step 1: Write the failing test**

Create `frontend-react/src/layouts/MainLayout.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Footer } from './MainLayout.jsx';

afterEach(() => cleanup());

test('footer does not render Facebook, TikTok, or Youtube links', () => {
  render(<Footer />);
  expect(screen.queryByLabelText('Facebook')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('TikTok')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Youtube')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend-react && npx vitest run src/layouts/MainLayout.test.jsx`
Expected: FAIL — all three links currently render.

- [ ] **Step 3: Remove the social icons block and its now-dead helpers**

In `frontend-react/src/layouts/MainLayout.jsx`, delete the `TikTokIcon` function and `FOOTER_SOCIALS` constant (lines 4-28):

```jsx
// lucide-react has no TikTok mark — hand-drawn to match the surrounding
// lucide icons' size/stroke weight (currentColor so it themes automatically).
function TikTokIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const FOOTER_SOCIALS = [
  { label: 'Youtube', icon: 'Youtube' },
  { label: 'TikTok', icon: 'TikTok' },
  { label: 'Facebook', icon: 'Facebook' },
];
```

Delete the social icons `<div>` (lines 205-216):

```jsx
            <div className="footer-social-icons">
              {FOOTER_SOCIALS.map(({ label, icon }) => (
                <a
                  key={label}
                  href="#/"
                  aria-label={label}
                  className="footer-social-icon"
                >
                  {icon === 'TikTok' ? <TikTokIcon size={16} /> : <Icon name={icon} size={16} />}
                </a>
              ))}
            </div>
```

leaving the surrounding block as:

```jsx
          <div>
            <p className="footer-col-title">Công Tín Land</p>
            <p className="footer-about-text">
              Cổng thông tin bất động sản Trà Vinh, kết nối khách hàng với môi giới chuyên nghiệp.
            </p>
          </div>
```

- [ ] **Step 4: Remove the now-unused CSS**

In `frontend-react/src/styles.css`, delete the `.footer-social-icons` / `.footer-social-icon` / `.footer-social-icon:hover` rules (lines 601-621):

```css
.footer-social-icons {
  display: flex;
  gap: 12px;
}

.footer-social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  transition: color 160ms ease, border-color 160ms ease;
}

.footer-social-icon:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend-react && npx vitest run src/layouts/MainLayout.test.jsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend-react/src/layouts/MainLayout.jsx frontend-react/src/layouts/MainLayout.test.jsx frontend-react/src/styles.css
git commit -m "fix(footer): remove Facebook/TikTok/Youtube social links"
```

---

### Task 5: Property detail — Facebook link + "Nhà vệ sinh" label + booking-form prop cleanup

**Files:**
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx`
- Modify: `frontend-react/src/styles.css`
- Test: `frontend-react/src/pages/PropertyDetailPage.test.jsx` (create)

**Interfaces:**
- Consumes: `property.broker.facebook` (Task 2).
- Produces: no `selectedRoom` state — `RoomList` is called without `onSelectRoom` (so its "Chọn" button, whose only purpose was pre-filling the booking form's now-removed room dropdown, stops rendering); `BookingForm` is called with only `propertyId`/`propertyTitle` (matches Task 7's simplified props).

- [ ] **Step 1: Write the failing tests**

Create `frontend-react/src/pages/PropertyDetailPage.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchPropertyDetail: vi.fn(),
  fetchPropertyMedia: vi.fn().mockResolvedValue([]),
  createViewing: vi.fn().mockResolvedValue({ id: 'mock-viewing-1', status: 'PENDING' }),
}));

import { fetchPropertyDetail } from '../services/api.js';
import PropertyDetailPage from './PropertyDetailPage.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const baseProperty = {
  title: 'Nhà phố test', address: 'Test address', priceLabel: '1 tỷ', statusLabel: 'Đang bán',
  category: 'nha', area: 100, bedrooms: 3, bathrooms: 2, direction: 'Đông',
  description: 'Mô tả test',
  broker: { name: 'Broker Test', phone: '0901234567', email: 'broker@test.vn', avatarUrl: '' },
};

test('renders a Facebook link below phone and Zalo when broker.facebook is set', async () => {
  fetchPropertyDetail.mockResolvedValue({ ...baseProperty, broker: { ...baseProperty.broker, facebook: 'https://facebook.com/broker.test' } });
  render(<PropertyDetailPage propertyId="p-1" />);
  const link = await screen.findByRole('link', { name: /Facebook/i });
  expect(link).toHaveAttribute('href', 'https://facebook.com/broker.test');
});

test('does not render a Facebook link when broker.facebook is missing', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findByText(baseProperty.title);
  expect(screen.queryByRole('link', { name: /Facebook/i })).not.toBeInTheDocument();
});

test('uses "Nhà vệ sinh" instead of "Phòng tắm" for the bathroom spec label', async () => {
  fetchPropertyDetail.mockResolvedValue(baseProperty);
  render(<PropertyDetailPage propertyId="p-1" />);
  await screen.findByText(baseProperty.title);
  expect(screen.getByText('Nhà vệ sinh')).toBeInTheDocument();
  expect(screen.queryByText('Phòng tắm')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/PropertyDetailPage.test.jsx`
Expected: FAIL — no Facebook link exists yet, and the label still reads "Phòng tắm".

- [ ] **Step 3: Rename the bathroom label**

In `frontend-react/src/pages/PropertyDetailPage.jsx`, replace line 203:

```jsx
                      <span className="detail-meta-label">Phòng tắm</span>
```

with:

```jsx
                      <span className="detail-meta-label">Nhà vệ sinh</span>
```

- [ ] **Step 4: Add the Facebook contact link**

Replace line 135:

```js
  const brokerPhone = property.broker?.phone || '0901 234 567';
```

with:

```js
  const brokerPhone = property.broker?.phone || '0901 234 567';
  const brokerFacebook = property.broker?.facebook || '';
```

Replace the Zalo `<a>` block (lines 335-343):

```jsx
                <a
                  href={`https://zalo.me/${brokerPhone.replace(/\D/g, '').replace(/^0/, '84')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-btn-zalo"
                >
                  <Icon name="MessageCircle" size={18} />
                  Chat Zalo
                </a>
              </div>
```

with:

```jsx
                <a
                  href={`https://zalo.me/${brokerPhone.replace(/\D/g, '').replace(/^0/, '84')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-btn-zalo"
                >
                  <Icon name="MessageCircle" size={18} />
                  Chat Zalo
                </a>
                {brokerFacebook && (
                  <a
                    href={brokerFacebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-btn-facebook"
                  >
                    <Icon name="Facebook" size={18} />
                    Facebook
                  </a>
                )}
              </div>
```

- [ ] **Step 5: Add the `.contact-btn-facebook` style**

In `frontend-react/src/styles.css`, add `--color-facebook` next to `--color-zalo` (line 34):

```css
  --color-zalo:             #0068ff;
  --color-facebook:         #1877f2;
```

After the `.contact-btn-zalo:hover` rule (lines 2164-2166), add:

```css
.contact-btn-facebook {
  width: 100%;
  min-height: 44px;
  background: var(--color-facebook);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 160ms ease;
}

.contact-btn-facebook:hover {
  opacity: 0.9;
}
```

- [ ] **Step 6: Drop the now-dead `selectedRoom` wiring (needed by Task 7's simplified `BookingForm` props)**

Remove line 90:

```js
  const [selectedRoom, setSelectedRoom] = useState('');
```

Replace the `RoomList` call:

```jsx
                <RoomList
                  rooms={property.rooms}
                  onSelectRoom={(label) => setSelectedRoom(label)}
                />
```

with:

```jsx
                <RoomList rooms={property.rooms} />
```

Replace the `BookingForm` call:

```jsx
            <BookingForm
              propertyId={propertyId}
              category={property.category}
              propertyTitle={property.title}
              selectedRoom={selectedRoom}
              rooms={property.rooms || []}
            />
```

with:

```jsx
            <BookingForm
              propertyId={propertyId}
              propertyTitle={property.title}
            />
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/PropertyDetailPage.test.jsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/pages/PropertyDetailPage.jsx frontend-react/src/pages/PropertyDetailPage.test.jsx frontend-react/src/styles.css
git commit -m "feat(property-detail): add broker facebook link, rename phòng tắm label"
```

---

### Task 6: Broker directory — Zalo/Facebook icons, hide email

**Files:**
- Modify: `frontend-react/src/pages/BrokersPage.jsx`
- Modify: `frontend-react/src/styles.css`
- Test: `frontend-react/src/pages/BrokersPage.test.jsx` (create)

**Interfaces:**
- Consumes: `property.broker.zalo`/`property.broker.facebook` (Task 2).
- Produces: `brokerStatsFrom(properties)` items now also carry `zalo: string` / `facebook: string`.

- [ ] **Step 1: Write the failing tests**

Create `frontend-react/src/pages/BrokersPage.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

vi.mock('../services/api.js', () => ({
  fetchProperties: vi.fn().mockResolvedValue([
    {
      id: 'p-1', title: 'Nhà phố test', address: 'Test', ward: 'phuong-tra-vinh', category: 'nha',
      rawStatus: 'SOLD', statusLabel: 'Đã bán', image: '',
      broker: {
        name: 'Nguyễn Văn Toàn', email: 'toan@congtinland.vn', avatarUrl: '',
        zalo: 'https://zalo.me/84912345678', facebook: 'https://facebook.com/toan.congtinland',
      },
    },
  ]),
}));

import BrokersPage from './BrokersPage.jsx';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

test('does not render the broker\'s email/gmail account', async () => {
  render(<BrokersPage />);
  expect(await screen.findByText('Nguyễn Văn Toàn')).toBeInTheDocument();
  expect(screen.queryByText('toan@congtinland.vn')).not.toBeInTheDocument();
});

test('renders Zalo and Facebook links next to "Xem tất cả"', async () => {
  render(<BrokersPage />);
  const viewAll = await screen.findByText('Xem tất cả');
  const footer = viewAll.closest('.broker-card-footer');
  expect(within(footer).getByLabelText('Zalo')).toHaveAttribute('href', 'https://zalo.me/84912345678');
  expect(within(footer).getByLabelText('Facebook')).toHaveAttribute('href', 'https://facebook.com/toan.congtinland');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/pages/BrokersPage.test.jsx`
Expected: FAIL — the email still renders, and no Zalo/Facebook links exist.

- [ ] **Step 3: Carry `zalo`/`facebook` through `brokerStatsFrom`**

Replace lines 170-177:

```js
    const current = groups.get(email) || {
      name,
      email,
      avatarUrl: broker.avatarUrl || '',
      listings: [],
      wards: new Set(),
      categories: new Set(),
    };
```

with:

```js
    const current = groups.get(email) || {
      name,
      email,
      avatarUrl: broker.avatarUrl || '',
      zalo: broker.zalo || '',
      facebook: broker.facebook || '',
      listings: [],
      wards: new Set(),
      categories: new Set(),
    };
```

- [ ] **Step 4: Hide the email**

Replace line 98-99:

```jsx
                      <h2 className="broker-profile-name">{broker.name}</h2>
                      <p className="broker-profile-meta">{broker.email}</p>
```

with:

```jsx
                      <h2 className="broker-profile-name">{broker.name}</h2>
```

- [ ] **Step 5: Add Zalo/Facebook icons next to "Xem tất cả"**

Replace lines 137-145:

```jsx
              <div className="broker-card-footer">
                <a
                  className="broker-card-viewall"
                  href={`#/search?broker=${encodeURIComponent(broker.email)}&brokerName=${encodeURIComponent(broker.name)}`}
                >
                  Xem tất cả
                  <Icon name="ArrowRight" size={16} className="icon-brand" />
                </a>
              </div>
```

with:

```jsx
              <div className="broker-card-footer">
                <div className="broker-card-socials">
                  {broker.zalo && (
                    <a className="broker-card-social-icon" href={broker.zalo} target="_blank" rel="noopener noreferrer" aria-label="Zalo">
                      <Icon name="MessageCircle" size={16} />
                    </a>
                  )}
                  {broker.facebook && (
                    <a className="broker-card-social-icon" href={broker.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                      <Icon name="Facebook" size={16} />
                    </a>
                  )}
                </div>
                <a
                  className="broker-card-viewall"
                  href={`#/search?broker=${encodeURIComponent(broker.email)}&brokerName=${encodeURIComponent(broker.name)}`}
                >
                  Xem tất cả
                  <Icon name="ArrowRight" size={16} className="icon-brand" />
                </a>
              </div>
```

- [ ] **Step 6: Style the new footer layout**

In `frontend-react/src/styles.css`, replace the `.broker-card-footer` rule (lines 1948-1954):

```css
.broker-card-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-hairline-soft);
}
```

with:

```css
.broker-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-hairline-soft);
}

.broker-card-socials {
  display: flex;
  gap: 8px;
}

.broker-card-social-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-hairline);
  color: var(--color-ink);
  transition: color 160ms ease, border-color 160ms ease;
}

.broker-card-social-icon:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/pages/BrokersPage.test.jsx`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend-react/src/pages/BrokersPage.jsx frontend-react/src/pages/BrokersPage.test.jsx frontend-react/src/styles.css
git commit -m "feat(brokers): add zalo/facebook links, hide broker email"
```

---

### Task 7: Booking form — keep only tên khách hàng / số điện thoại / ghi chú

**Files:**
- Modify: `frontend-react/src/components/property/BookingForm.jsx`
- Test: `frontend-react/src/components/property/BookingForm.test.jsx` (rewrite)

**Interfaces:**
- Consumes: nothing new (still calls `createViewing(propertyId, payload)` from `services/api.js`).
- Produces: `BookingForm({ propertyId, propertyTitle })` — `category`, `selectedRoom`, `rooms` props are dropped (Task 5 already stopped passing them). `createViewing` payload is now exactly `{ propertyTitle, visitorName, visitorPhone, note }`.

- [ ] **Step 1: Rewrite the test file (RED)**

Replace the full contents of `frontend-react/src/components/property/BookingForm.test.jsx`:

```jsx
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingForm from './BookingForm.jsx';

vi.mock('../../services/api.js', () => ({
  createViewing: vi.fn(() => Promise.resolve({ id: 'mock-viewing-1', status: 'PENDING' })),
}));

import { createViewing } from '../../services/api.js';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderForm(overrides = {}) {
  return render(
    <BookingForm propertyId="p-test" propertyTitle="Nhà trọ test" {...overrides} />,
  );
}

describe('BookingForm', () => {
  test('renders only Tên khách hàng, Số điện thoại, and Ghi chú fields', () => {
    renderForm();
    expect(screen.getByLabelText(/Tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Số điện thoại/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ghi chú/i)).toBeInTheDocument();
  });

  test('does NOT render the removed fields', () => {
    renderForm();
    expect(screen.queryByLabelText(/Ngày.*muốn xem/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Dự kiến vào ở/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Phòng muốn xem/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Số người ở/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Số lượng xe/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Nuôi thú cưng/i)).not.toBeInTheDocument();
  });

  test('shows validation errors and does NOT call createViewing when name+phone empty', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Vui lòng nhập tên khách hàng/i)).toBeInTheDocument();
    expect(screen.getByText(/Vui lòng nhập số điện thoại/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('rejects an invalid VN mobile number and does not submit', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Nguyễn Văn A');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0123456789');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));
    expect(await screen.findByText(/Số điện thoại di động không hợp lệ/i)).toBeInTheDocument();
    expect(createViewing).not.toHaveBeenCalled();
  });

  test('calls createViewing once with only propertyTitle, visitorName, visitorPhone, note', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Trần Văn B');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0901234567');
    await userEvent.type(screen.getByLabelText(/Ghi chú/i), 'Xem vào cuối tuần');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    await waitFor(() => expect(createViewing).toHaveBeenCalledTimes(1));
    const [calledId, calledPayload] = createViewing.mock.calls[0];
    expect(calledId).toBe('p-test');
    expect(calledPayload).toEqual({
      propertyTitle: 'Nhà trọ test',
      visitorName: 'Trần Văn B',
      visitorPhone: '0901234567',
      note: 'Xem vào cuối tuần',
    });
  });

  test('shows success message after valid submit', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText(/Tên khách hàng/i), 'Lê Thị C');
    await userEvent.type(screen.getByLabelText(/Số điện thoại/i), '0912345678');
    await userEvent.click(screen.getByRole('button', { name: /Đặt lịch hẹn/i }));

    expect(await screen.findByText(/Đã gửi yêu cầu đặt lịch/i)).toBeInTheDocument();
  });

  test('never renders commission-related text', () => {
    renderForm();
    expect(screen.queryByText(/hoa hồng/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/commission/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend-react && npx vitest run src/components/property/BookingForm.test.jsx`
Expected: FAIL — the current component still requires `category`/`rooms` props and renders the removed fields.

- [ ] **Step 3: Rewrite `BookingForm.jsx`**

Replace the full contents of `frontend-react/src/components/property/BookingForm.jsx`:

```jsx
import { useState } from 'react';
import Icon from '../ui/Icon.jsx';
import { createViewing } from '../../services/api.js';
import { VN_MOBILE_PATTERN } from '../../utils/validation.js';

function validate(fields) {
  const errors = {};
  if (!fields.visitorName.trim()) errors.visitorName = 'Vui lòng nhập tên khách hàng.';
  if (!fields.visitorPhone.trim()) {
    errors.visitorPhone = 'Vui lòng nhập số điện thoại.';
  } else if (!VN_MOBILE_PATTERN.test(fields.visitorPhone.trim())) {
    errors.visitorPhone = 'Số điện thoại di động không hợp lệ.';
  }
  return errors;
}

export default function BookingForm({ propertyId, propertyTitle }) {
  const [fields, setFields] = useState({
    visitorName: '',
    visitorPhone: '',
    note: '',
  });

  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSending(true);
    setSubmitError('');

    try {
      await createViewing(propertyId, {
        propertyTitle,
        visitorName: fields.visitorName.trim(),
        visitorPhone: fields.visitorPhone.trim(),
        note: fields.note.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      setSubmitError('Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ trực tiếp.');
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="booking-form-success">
        <Icon name="CalendarCheck" size={32} className="icon-accent" />
        <p className="booking-form-success-text">
          Đã gửi yêu cầu đặt lịch, môi giới sẽ liên hệ bạn sớm.
        </p>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit} noValidate>
      <h3 className="booking-form-title">
        <Icon name="Calendar" size={18} className="icon-accent" />
        Đặt lịch xem
      </h3>

      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-visitorName">
          Tên khách hàng <span className="booking-form-required">*</span>
        </label>
        <input
          id="bf-visitorName"
          name="visitorName"
          type="text"
          placeholder="Nguyễn Văn A"
          className={`booking-form-input${errors.visitorName ? ' booking-form-input--error' : ''}`}
          value={fields.visitorName}
          onChange={handleChange}
        />
        {errors.visitorName && (
          <p className="booking-form-error">{errors.visitorName}</p>
        )}
      </div>

      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-visitorPhone">
          Số điện thoại <span className="booking-form-required">*</span>
        </label>
        <input
          id="bf-visitorPhone"
          name="visitorPhone"
          type="tel"
          placeholder="0901 234 567"
          className={`booking-form-input${errors.visitorPhone ? ' booking-form-input--error' : ''}`}
          value={fields.visitorPhone}
          onChange={handleChange}
        />
        {errors.visitorPhone && (
          <p className="booking-form-error">{errors.visitorPhone}</p>
        )}
      </div>

      <div className="booking-form-field">
        <label className="booking-form-label" htmlFor="bf-note">
          Ghi chú
        </label>
        <textarea
          id="bf-note"
          name="note"
          rows={3}
          placeholder="Yêu cầu thêm..."
          className="booking-form-input booking-form-textarea"
          value={fields.note}
          onChange={handleChange}
        />
      </div>

      {submitError && (
        <p className="booking-form-error booking-form-error--submit">{submitError}</p>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-md btn-full booking-form-submit"
        disabled={sending}
      >
        {sending ? (
          <>
            <Icon name="Clock" size={16} />
            Đang gửi...
          </>
        ) : (
          <>
            <Icon name="CalendarCheck" size={16} />
            Đặt lịch hẹn
          </>
        )}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend-react && npx vitest run src/components/property/BookingForm.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/components/property/BookingForm.jsx frontend-react/src/components/property/BookingForm.test.jsx
git commit -m "feat(booking): simplify đặt lịch xem to tên khách hàng, số điện thoại, ghi chú"
```

---

### Task 8: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend suite**

Run: `cd frontend-react && npm test -- --run`
Expected: PASS — all suites green, including the new/rewritten files from Tasks 3-7 and unrelated suites (`BrokerDashboard.filter.test.jsx`, `App.test.jsx`, admin section tests) unaffected.

- [ ] **Step 2: Run the full backend suite**

Run: `cd backend-springboot && mvn test`
Expected: PASS — Flyway migration V14 applies cleanly against the Testcontainers Postgres instance, entity/DTO changes don't break existing property/user tests.

- [ ] **Step 3: Manual smoke check (mock mode)**

Run: `cd frontend-react && npm run dev`, open `http://localhost:5173`, and check:
- `/#/broker/properties` — create/edit form shows "Chiều dài (m)" / "Chiều rộng (m)" and "Nhà vệ sinh"; selecting "Đất" hides Phòng ngủ/Nhà vệ sinh.
- Any page with the footer — no Facebook/TikTok/Youtube icons.
- `/#/property/p-586` (or any mock property id) — Facebook button appears below "Chat Zalo"; "Nhà vệ sinh" label in the specs row; "Đặt lịch xem" form only has 3 fields.
- `/#/brokers` — cards show Zalo/Facebook icons beside "Xem tất cả"; no email text under the broker name.

- [ ] **Step 4: Commit (only if smoke-check fixes were needed)**

If Step 3 surfaces no issues, there is nothing to commit here — Tasks 1-7 already captured all changes.
