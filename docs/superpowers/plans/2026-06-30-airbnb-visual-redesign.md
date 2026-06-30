# Airbnb Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển toàn bộ frontend từ Mintlify-inspired (navy/green, dark footer, large typography) sang Airbnb-inspired (white canvas, #ff385c single accent, modest 28px-max display type, rounded pill search, photo-first cards).

**Architecture:** 4 tasks chạy tuần tự — tokens trước, layout sau, components sau cùng, cleanup kết thúc. Sau Task 1 site sẽ trông thiếu màu tạm thời (old vars deleted, secondary CSS files not yet updated) — đây là intermediate state bình thường, sẽ fix hoàn toàn trong Task 4.

**Tech Stack:** React 19, Vite, CSS Custom Properties (no CSS-in-JS), lucide-react icons.

## Global Constraints

- Không hard-code `#hex` trong JSX — chỉ CSS variable (ngoại lệ: Chart TRACK_COLOR giữ nguyên là pre-existing debt).
- Không `inline style` — fix tất cả inline styles có token cũ sang token mới, nhưng không refactor cấu trúc JSX ngoài scope.
- Chỉ dùng `lucide-react` cho icon.
- Không import thư viện UI ngoài.
- Commit message: conventional commits, tiếng Anh, không có Co-Authored-By.
- Test command: `cd frontend-react && npm test -- --run` (expected: 37/37 pass không đổi — redesign không đụng đến business logic).
- Dev server: `cd frontend-react && npm run dev` → http://localhost:5173.
- Build check: `cd frontend-react && npm run build`.

---

### Task 1: CSS Tokens — Rewrite `:root` + `styles.css` utilities

**Files:**
- Modify: `frontend-react/src/styles.css` (toàn bộ file)
- Modify: `frontend-react/src/pages/HomePage.jsx` (3 dòng typography class)
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx` (1 dòng typography class)
- Modify: `frontend-react/src/pages/SearchPage.jsx` (1 dòng typography class)

**Interfaces:**
- Produces: CSS variables `--color-primary`, `--color-canvas`, `--color-ink`, `--color-muted`, `--color-hairline`, `--color-surface-soft`, `--color-surface-strong`, `--shadow-card`, `--shadow-dropdown`, `--radius-sm: 8px`, `--radius-md: 14px`, `--radius-lg: 20px`, `--radius-xl: 32px`, `--section-py: 64px` — được dùng bởi tất cả tasks sau.
- Produces: typography classes `.text-display-xl`, `.text-display-md`, `.text-display-lg`, `.text-display-sm`, `.text-title-md`, `.text-body-sm`, `.text-caption`.

---

- [ ] **Step 1: Rewrite `:root` block trong `styles.css`**

Thay toàn bộ block `:root { ... }` (hiện từ dòng 4–62) bằng:

```css
:root {
  /* Brand accent — single voltage */
  --color-primary:          #ff385c;
  --color-primary-active:   #e00b41;
  --color-primary-disabled: #ffd1da;

  /* Canvas & surfaces */
  --color-canvas:           #ffffff;
  --color-surface-soft:     #f7f7f7;
  --color-surface-strong:   #f2f2f2;

  /* Text */
  --color-ink:              #222222;
  --color-body:             #3f3f3f;
  --color-muted:            #6a6a6a;
  --color-muted-soft:       #929292;
  --color-on-primary:       #ffffff;

  /* Borders */
  --color-hairline:         #dddddd;
  --color-hairline-soft:    #ebebeb;
  --color-border-strong:    #c1c1c1;

  /* Semantic */
  --color-success:          #16a34a;
  --color-success-bg:       #dcfce7;
  --color-warning:          #d97706;
  --color-warning-bg:       #fef3c7;
  --color-error:            #c13515;
  --color-error-bg:         #fee2e2;
  --color-zalo:             #0068ff;
  --color-scrim:            #000000;

  /* Shadows — single tier */
  --shadow-card:     rgba(0,0,0,0.02) 0 0 0 1px,
                     rgba(0,0,0,0.04) 0 2px 6px 0,
                     rgba(0,0,0,0.10) 0 4px 8px 0;
  --shadow-dropdown: 0 4px 16px rgba(0,0,0,0.12);

  /* Radii */
  --radius-none: 0px;
  --radius-xs:   4px;
  --radius-sm:   8px;
  --radius-md:   14px;
  --radius-lg:   20px;
  --radius-xl:   32px;
  --radius-full: 9999px;

  /* Layout */
  --container-max:     1280px;
  --section-py:        64px;
  --section-py-mobile: 48px;
}
```

- [ ] **Step 2: Update `body` base styles**

Thay block `body { ... }`:

```css
body {
  font-family: 'Be Vietnam Pro', system-ui, -apple-system, sans-serif;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  margin: 0;
}
```

- [ ] **Step 3: Replace typography classes (TYPOGRAPHY block)**

Thay toàn bộ TYPOGRAPHY block (`.text-display` đến `.text-xs`):

```css
/* ============================================================
   TYPOGRAPHY
   ============================================================ */
.text-display-xl  { font-size: 28px; font-weight: 700; line-height: 1.43; letter-spacing: 0; }
.text-display-lg  { font-size: 22px; font-weight: 500; line-height: 1.18; letter-spacing: -0.44px; }
.text-display-md  { font-size: 21px; font-weight: 700; line-height: 1.43; letter-spacing: 0; }
.text-display-sm  { font-size: 20px; font-weight: 600; line-height: 1.20; letter-spacing: -0.18px; }
.text-title-md    { font-size: 16px; font-weight: 600; line-height: 1.25; letter-spacing: 0; }
.text-title-sm    { font-size: 16px; font-weight: 500; line-height: 1.25; letter-spacing: 0; }
.text-body-md     { font-size: 16px; font-weight: 400; line-height: 1.50; letter-spacing: 0; }
.text-body-sm     { font-size: 14px; font-weight: 400; line-height: 1.43; letter-spacing: 0; }
.text-caption     { font-size: 14px; font-weight: 500; line-height: 1.29; letter-spacing: 0; }
.text-caption-sm  { font-size: 13px; font-weight: 400; line-height: 1.23; letter-spacing: 0; }
.text-badge       { font-size: 11px; font-weight: 600; line-height: 1.18; letter-spacing: 0; }
.text-micro       { font-size: 12px; font-weight: 700; line-height: 1.33; letter-spacing: 0; }
```

- [ ] **Step 4: Update BUTTONS block**

Thay toàn bộ BUTTONS block:

```css
/* ============================================================
   BUTTONS
   ============================================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
  white-space: nowrap;
}

.btn-sm  { padding: 8px 16px;  font-size: 14px; min-height: 36px; }
.btn-md  { padding: 10px 20px; font-size: 16px; min-height: 44px; }
.btn-lg  { padding: 14px 24px; font-size: 16px; min-height: 48px; }

.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: 1px solid var(--color-primary);
}
.btn-primary:hover {
  background: var(--color-primary-active);
  border-color: var(--color-primary-active);
}
.btn-primary:disabled {
  background: var(--color-primary-disabled);
  border-color: var(--color-primary-disabled);
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
}
.btn-secondary:hover {
  background: var(--color-surface-soft);
}

.btn-ghost {
  background: transparent;
  color: var(--color-muted);
  border: 1px solid transparent;
}
.btn-ghost:hover {
  background: var(--color-surface-soft);
  color: var(--color-ink);
}

.btn-pill {
  border-radius: var(--radius-full);
}
```

- [ ] **Step 5: Update BADGES block**

Thay toàn bộ BADGES block:

```css
/* ============================================================
   BADGES
   ============================================================ */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.badge-success { background: var(--color-success-bg); color: var(--color-success); }
.badge-warning { background: var(--color-warning-bg); color: var(--color-warning); }
.badge-error   { background: var(--color-error-bg);   color: var(--color-error);   }
.badge-neutral { background: var(--color-surface-strong); color: var(--color-muted); }
.badge-accent  { background: var(--color-primary);    color: var(--color-on-primary); }
```

- [ ] **Step 6: Update CARDS block**

Thay toàn bộ CARDS block:

```css
/* ============================================================
   CARDS
   ============================================================ */
.card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  transition: box-shadow 200ms ease;
}

.card:hover {
  box-shadow: var(--shadow-card);
}
```

- [ ] **Step 7: Update INPUTS block**

Thay toàn bộ INPUTS block:

```css
/* ============================================================
   INPUTS
   ============================================================ */
.input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-ink);
  transition: border-color 160ms ease;
}

.input::placeholder { color: var(--color-muted); }

.input:focus {
  outline: none;
  border-color: var(--color-ink);
  border-width: 2px;
}
```

- [ ] **Step 8: Update NAVBAR block**

Thay toàn bộ NAVBAR block (`.navbar` đến `.navbar-desktop-only`):

```css
/* ============================================================
   NAVBAR
   ============================================================ */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 80px;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 24px;
}

.navbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navbar-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
  transition: color 160ms ease, background 160ms ease;
}

.navbar-link:hover {
  background: var(--color-surface-soft);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.navbar-dropdown {
  position: relative;
}

.navbar-dropdown-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 560px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-dropdown);
  display: none;
  z-index: 100;
}

.navbar-dropdown:hover .navbar-dropdown-panel,
.navbar-dropdown:focus-within .navbar-dropdown-panel {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.navbar-dropdown-col {
  padding: 20px;
}

.navbar-dropdown-col + .navbar-dropdown-col {
  border-left: 1px solid var(--color-hairline);
}

.navbar-dropdown-cat-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.navbar-dropdown-cat-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.navbar-dropdown-cat-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0 0 2px;
}

.navbar-dropdown-cat-caption {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.navbar-dropdown-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: var(--color-body);
  border-bottom: 1px solid var(--color-hairline-soft);
  transition: color 160ms ease;
}

.navbar-dropdown-link:last-child {
  border-bottom: none;
}

.navbar-dropdown-link:hover {
  color: var(--color-ink);
}

.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 60;
  grid-template-columns: repeat(5, 1fr);
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
}

.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 60px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-muted);
}

.mobile-nav-item.is-active { color: var(--color-primary); }

@media (max-width: 743px) {
  .mobile-nav { display: grid; }
  .navbar-nav { display: none; }
  .navbar-desktop-only { display: none; }
  body { padding-bottom: 60px; }
}
```

- [ ] **Step 9: Update FOOTER block**

Thay toàn bộ FOOTER block:

```css
/* ============================================================
   FOOTER
   ============================================================ */
.footer {
  background: var(--color-canvas);
  color: var(--color-ink);
  border-top: 1px solid var(--color-hairline);
}

.footer-logo-link {
  display: flex;
  color: var(--color-ink);
}

.footer-top {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 40px 0 32px;
  border-bottom: 1px solid var(--color-hairline);
}

@media (min-width: 768px) {
  .footer-top {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  padding: 40px 0;
}

@media (min-width: 768px) {
  .footer-grid { grid-template-columns: repeat(4, 1fr); }
}

.footer-col-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
  margin-bottom: 16px;
  text-transform: none;
  letter-spacing: 0;
}

.footer-link {
  display: block;
  font-size: 14px;
  color: var(--color-muted);
  padding: 3px 0;
  transition: color 160ms ease;
}

.footer-link:hover { color: var(--color-ink); }

.footer-about-text {
  font-size: 14px;
  color: var(--color-muted);
  line-height: 1.6;
  margin: 0 0 16px;
}

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

.footer-bottom {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-top: 1px solid var(--color-hairline);
}

.footer-copyright {
  font-size: 13px;
  color: var(--color-muted-soft);
  text-align: center;
  margin: 0;
}
```

- [ ] **Step 10: Update PROPERTY CARD block**

Thay toàn bộ PROPERTY CARD block (`.property-card` đến `.broker-avatar`):

```css
/* ============================================================
   PROPERTY CARD
   ============================================================ */
.property-card {
  background: var(--color-canvas);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: box-shadow 200ms ease;
}

.property-card:hover {
  box-shadow: var(--shadow-card);
}

.property-card-image-wrap {
  display: block;
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--color-surface-strong);
}

.property-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}

.property-card:hover .property-card-img {
  transform: scale(1.03);
}

.property-card-featured-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.18;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-card);
  pointer-events: none;
}

.property-card-status-overlay {
  position: absolute;
  top: 10px;
  right: 10px;
}

.property-card-meta {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.property-card-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.property-card-title:hover {
  text-decoration: underline;
}

.property-card-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
  line-height: 1.43;
}

.property-card-price {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0;
}
```

- [ ] **Step 11: Update HERO block**

Thay toàn bộ HERO block và SECTION HEADERS block trong `styles.css`:

```css
/* ============================================================
   HOME — HERO
   ============================================================ */
.hero {
  background: var(--color-canvas);
  padding: 64px 0 48px;
  border-bottom: 1px solid var(--color-hairline);
}

.hero-content {
  text-align: center;
  max-width: 860px;
  margin: 0 auto;
}

.hero-headline {
  margin: 0 0 24px;
  color: var(--color-ink);
}

.hero-ctas {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

/* ============================================================
   HOME — SECTION HEADERS
   ============================================================ */
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 32px;
}

.section-header-text h2 { color: var(--color-ink); margin: 0 0 4px; }
.section-header-text p  { color: var(--color-body); margin: 0; font-size: 14px; }

.section-header-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-header-link:hover { text-decoration: underline; }
```

- [ ] **Step 12: Update `.section-subtle` và GRIDS block**

Tìm `.section-subtle` và đổi background:

```css
.section-subtle {
  padding: var(--section-py) 0;
  background: var(--color-surface-soft);
}

@media (max-width: 743px) {
  .section-subtle { padding: var(--section-py-mobile) 0; }
}
```

Tìm `.grid-3` và `.grid-4` — đổi gap:

```css
.grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 640px) { .grid-3 { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } }

.grid-4 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (min-width: 1024px) { .grid-4 { grid-template-columns: repeat(4, 1fr); } }
```

- [ ] **Step 13: Xóa dead CSS khỏi `styles.css`**

Xóa các blocks sau (không còn dùng sau redesign):
- `.btn-outline-white` block (was for dark sections)
- `.badge-brand` class (dùng `--color-brand` đã xóa)
- `.hero::before` (gradient cũ)
- `.section-pastel` block
- `.news-card*` blocks (section đã bị remove trong Pass 7)
- `.testimonial-card`, `.testimonial-quote`, `.testimonial-author` blocks (section đã bị remove)

- [ ] **Step 14: Update typography class refs trong JSX**

**`frontend-react/src/pages/HomePage.jsx`** — đổi 2 chỗ `text-h2` → `text-display-md`:
```jsx
// dòng 157
<h2 className="text-display-md">Tin nổi bật</h2>
// dòng 177
<h2 className="text-display-md">{title}</h2>
```

**`frontend-react/src/pages/PropertyDetailPage.jsx`** — đổi 1 chỗ:
```jsx
// tìm: className="text-h2 mb-12"
// đổi thành:
className="text-display-lg mb-12"
```

**`frontend-react/src/pages/SearchPage.jsx`** — đổi 1 chỗ:
```jsx
// tìm: className="text-h3 filter-sidebar-heading"
// đổi thành:
className="text-display-sm filter-sidebar-heading"
```

- [ ] **Step 15: Chạy test + dev server**

```powershell
cd frontend-react && npm test -- --run
```
Expected: 37 passed.

```powershell
cd frontend-react && npm run dev
```
Mở http://localhost:5173. Verify: navbar trắng, buttons đỏ (#ff385c), footer trắng (nhưng logo link màu không đúng — sẽ fix Task 2), section padding nhỏ hơn. Một số secondary CSS files vẫn còn token cũ (carousel, dashboard) → màu thiếu tạm thời — bình thường.

- [ ] **Step 16: Commit**

```powershell
git add frontend-react/src/styles.css frontend-react/src/pages/HomePage.jsx frontend-react/src/pages/PropertyDetailPage.jsx frontend-react/src/pages/SearchPage.jsx
git commit -m "style: rewrite CSS tokens to Airbnb design system (white canvas, Rausch accent)"
```

---

### Task 2: Global Layout — Navbar + Footer

**Files:**
- Modify: `frontend-react/src/layouts/MainLayout.jsx`

**Interfaces:**
- Consumes: `--color-hairline`, `--color-canvas`, `--color-primary`, `.footer-logo-link` (from Task 1)
- Produces: Footer white canvas, navbar hairline border, no inline styles referencing old tokens.

---

- [ ] **Step 1: Fix inline styles trong `MainLayout.jsx`**

Trong `Header` component, tìm dòng:
```jsx
style={i > 0 ? { borderLeft: '1px solid var(--color-border)' } : {}}
```
Đổi thành:
```jsx
style={i > 0 ? { borderLeft: '1px solid var(--color-hairline)' } : {}}
```

Trong `Footer` component, tìm dòng:
```jsx
<a href="#/" aria-label={BRAND_NAME} style={{ color: '#fff', display: 'flex' }}>
```
Đổi thành:
```jsx
<a href="#/" aria-label={BRAND_NAME} className="footer-logo-link">
```

- [ ] **Step 2: Chạy dev server và verify**

```powershell
cd frontend-react && npm run dev
```
Verify:
- Footer logo hiển thị đúng màu (ink, không phải trắng trên trắng)
- Navbar border-bottom = hairline (#dddddd), không có blur/shadow
- Navbar height = 80px
- Footer nền trắng, text tối, 4 cột links
- Social icons có border vòng tròn, hover → đỏ

- [ ] **Step 3: Commit**

```powershell
git add frontend-react/src/layouts/MainLayout.jsx
git commit -m "style: convert footer to white canvas, fix navbar inline token reference"
```

---

### Task 3: PropertyCard + TroShowcaseCard + HeroSearchBar

**Files:**
- Modify: `frontend-react/src/components/PropertyCard.jsx`
- Modify: `frontend-react/src/components/TroShowcaseCard.jsx` (CSS only via home.css)
- Modify: `frontend-react/src/pages/HomePage.jsx` (HeroSearchBar JSX + hero h1)
- Modify: `frontend-react/src/styles/home.css`

**Interfaces:**
- Consumes: `--color-primary`, `--color-canvas`, `--color-ink`, `--color-muted`, `--color-hairline`, `--color-surface-strong`, `--shadow-card`, `--radius-md`, `--radius-full`, `--radius-sm`, `--radius-xl` (all from Task 1).
- Produces: `PropertyCard` với layout Airbnb (4/3 photo, floating badge "Nổi bật", meta text bên dưới, no broker footer); `HeroSearchBar` pill với 3 segments + search orb.

---

- [ ] **Step 1: Rewrite `PropertyCard.jsx`**

Thay toàn bộ nội dung file:

```jsx
import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const STATUS_VARIANT = {
  'Đang hiển thị': 'success',
  AVAILABLE:       'success',
  'Đã bán':        'neutral',
  SOLD:            'neutral',
  'Đã thuê':       'neutral',
  RENTED:          'neutral',
  'Đã ẩn':         'error',
  PENDING:         'warning',
};

const NON_FEATURED = new Set(['Đã bán', 'SOLD', 'Đã thuê', 'RENTED', 'Đã ẩn', 'PENDING']);

export default function PropertyCard({ property, compact = false }) {
  const price = property.priceLabel || property.price;
  const location = property.address || property.location;
  const href = property.id ? `#/property/${property.id}` : '#/property';
  const showFeatured = !NON_FEATURED.has(property.status);
  const showStatus   = NON_FEATURED.has(property.status);

  return (
    <article className="property-card">
      <a href={href} className="property-card-image-wrap">
        <img
          className="property-card-img"
          src={property.image}
          alt={property.title}
          loading="lazy"
        />
        {showFeatured && (
          <span className="property-card-featured-badge">Nổi bật</span>
        )}
        {showStatus && (
          <span className="property-card-status-overlay">
            <Badge variant={STATUS_VARIANT[property.status] || 'neutral'}>
              {property.status}
            </Badge>
          </span>
        )}
      </a>
      <div className="property-card-meta">
        <a href={href} className="property-card-title">{property.title}</a>
        {location && (
          <p className="property-card-location">
            <Icon name="MapPin" size={13} /> {location}
          </p>
        )}
        {price && <p className="property-card-price">{price}</p>}
      </div>
    </article>
  );
}
```

Lưu ý: `compact` prop giữ nguyên signature (SearchPage vẫn truyền `compact`) nhưng không còn ảnh hưởng layout — broker footer đã xóa hoàn toàn.

- [ ] **Step 2: Update `home.css` — TroShowcaseCard CSS**

Tìm block `.tro-showcase-card` đến cuối file và thay toàn bộ với:

```css
/* ============================================================
   HOME — SHOWCASE CARDS (Trọ / Nhà / Đất rows)
   ============================================================ */
.tro-showcase-row {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}

.tro-showcase-card {
  display: flex;
  flex-direction: column;
  flex: 0 0 260px;
  scroll-snap-align: start;
  background: var(--color-canvas);
  border-radius: var(--radius-md);
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 200ms ease;
}

.tro-showcase-card:hover {
  box-shadow: var(--shadow-card);
}

.tro-showcase-image {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: var(--color-surface-strong);
}

.tro-showcase-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 300ms ease;
}

.tro-showcase-card:hover .tro-showcase-image img {
  transform: scale(1.03);
}

.tro-showcase-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tro-showcase-rooms {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-ink);
  color: var(--color-on-primary);
  font-size: 12px;
  font-weight: 500;
}

.tro-showcase-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
}

.tro-showcase-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--color-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tro-showcase-address {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  font-size: 14px;
  color: var(--color-muted);
}

.tro-showcase-price {
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-ink);
}

.tro-showcase-total {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted);
}
```

- [ ] **Step 3: Update `home.css` — Hero search bar CSS**

Tìm block `.hero-search-panel` đến `.hero-search-submit` và thay toàn bộ với:

```css
/* ============================================================
   HOME — HERO SEARCH BAR (pill)
   ============================================================ */
.search-pill {
  display: flex;
  align-items: center;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-card);
  max-width: 860px;
  margin: 0 auto;
  overflow: hidden;
}

.search-pill-segment {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 20px;
  border-right: 1px solid var(--color-hairline);
  min-width: 0;
  cursor: pointer;
}

.search-pill-segment:hover {
  background: var(--color-surface-soft);
}

.search-pill-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.2;
  margin-bottom: 2px;
  pointer-events: none;
}

.search-pill-select {
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--color-muted);
  cursor: pointer;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  line-height: 1.4;
  font-family: inherit;
}

.search-pill-select:focus {
  outline: none;
  color: var(--color-ink);
}

.search-pill-orb-wrap {
  padding: 6px;
  flex-shrink: 0;
}

.search-pill-orb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--color-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 160ms ease;
}

.search-pill-orb:hover {
  background: var(--color-primary-active);
}

@media (max-width: 743px) {
  .search-pill {
    flex-direction: column;
    border-radius: var(--radius-xl);
    overflow: visible;
  }

  .search-pill-segment {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-hairline);
  }

  .search-pill-orb-wrap {
    width: 100%;
    padding: 8px;
  }

  .search-pill-orb {
    width: 100%;
    height: 48px;
    border-radius: var(--radius-sm);
    gap: 8px;
  }

  .search-pill-orb::after {
    content: 'Tìm kiếm';
    font-size: 15px;
    font-weight: 600;
  }
}
```

- [ ] **Step 4: Rewrite `HeroSearchBar` trong `HomePage.jsx`**

Tìm `function HeroSearchBar()` và thay toàn bộ function:

```jsx
function HeroSearchBar() {
  const [ward, setWard] = useState('all');
  const [category, setCategory] = useState('all');
  const [priceIndex, setPriceIndex] = useState('0');

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (ward !== 'all') params.set('ward', ward);
    const range = HERO_PRICE_RANGES[Number(priceIndex)] || HERO_PRICE_RANGES[0];
    if (range.min) params.set('minPrice', range.min);
    if (range.max) params.set('maxPrice', range.max);
    const qs = params.toString();
    window.location.hash = qs ? `#/search?${qs}` : '#/search';
  }

  return (
    <form className="search-pill" onSubmit={handleSearch}>
      <div className="search-pill-segment">
        <span className="search-pill-label">Khu vực</span>
        <select
          className="search-pill-select"
          value={ward}
          onChange={e => setWard(e.target.value)}
        >
          {WARDS.map(item => (
            <option key={item.code} value={item.code}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-segment">
        <span className="search-pill-label">Loại hình</span>
        <select
          className="search-pill-select"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="all">Tất cả</option>
          {CATEGORIES.map(item => (
            <option key={item.slug} value={item.slug}>{item.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-segment">
        <span className="search-pill-label">Khoảng giá</span>
        <select
          className="search-pill-select"
          value={priceIndex}
          onChange={e => setPriceIndex(e.target.value)}
        >
          {HERO_PRICE_RANGES.map((range, index) => (
            <option key={range.label} value={String(index)}>{range.label}</option>
          ))}
        </select>
      </div>

      <div className="search-pill-orb-wrap">
        <button type="submit" className="search-pill-orb" aria-label="Tìm kiếm">
          <Icon name="Search" size={20} />
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Thêm hero headline và update hero section trong `HomePage.jsx`**

Tìm block `{/* 1. HERO */}` và thay:

```jsx
{/* 1. HERO */}
<section className="hero">
  <div className="container">
    <div className="hero-content">
      <h1 className="text-display-xl hero-headline">
        Tìm bất động sản tại Trà Vinh
      </h1>
      <div className="hero-ctas">
        <Button as="a" href="#/search" variant="primary" size="lg">
          <Icon name="Search" size={18} /> Tìm kiếm ngay
        </Button>
        <Button as="a" href="#/brokers" variant="secondary" size="lg">
          Xem môi giới
        </Button>
      </div>
      <HeroSearchBar />
    </div>
  </div>
</section>
```

- [ ] **Step 6: Remove unused Icon import nếu có (kiểm tra)**

`HeroSearchBar` vẫn dùng `Icon` (search orb). Không cần thay đổi imports.

- [ ] **Step 7: Chạy test + visual check**

```powershell
cd frontend-react && npm test -- --run
```
Expected: 37 passed.

```powershell
cd frontend-react && npm run dev
```
Verify:
- Hero: headline "Tìm bất động sản tại Trà Vinh" 28px, search pill bên dưới
- Search pill: 3 segments chia bởi hairline, search orb đỏ bên phải
- PropertyCard: ảnh 4/3, badge "Nổi bật" white pill top-left, meta text 14px bên dưới, không có broker footer
- TroShowcaseCard: ảnh 4/3, không có border, hover shadow

- [ ] **Step 8: Commit**

```powershell
git add frontend-react/src/components/PropertyCard.jsx frontend-react/src/pages/HomePage.jsx frontend-react/src/styles/home.css
git commit -m "style: Airbnb PropertyCard layout (4/3, floating badge) + pill HeroSearchBar"
```

---

### Task 4: Remaining CSS Files + Accent Colors + Cleanup

**Files:**
- Modify: `frontend-react/src/styles/carousel.css`
- Modify: `frontend-react/src/styles/dashboard.css`
- Modify: `frontend-react/src/styles/detail.css`
- Modify: `frontend-react/src/styles/gallery.css`
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/AdminDashboard.jsx`
- Modify: `frontend-react/src/components/DashboardWidgets.jsx`
- Modify: `frontend-react/src/components/Charts.jsx`

**Interfaces:**
- Consumes: tất cả tokens từ Task 1.
- Produces: site fully on new token system, zero references to old deleted tokens.

**Token mapping reference** (dùng khi tìm-và-thay trong từng file):

| Old token | New token |
|---|---|
| `--color-accent` | `--color-primary` |
| `--color-accent-hover` | `--color-primary-active` |
| `--color-accent-light` | `--color-surface-soft` |
| `--color-brand` | `--color-ink` |
| `--color-bg\b` | `--color-canvas` |
| `--color-bg-subtle` | `--color-surface-soft` |
| `--color-bg-muted` | `--color-surface-strong` |
| `--color-border\b` | `--color-hairline` |
| `--color-text-primary` | `--color-ink` |
| `--color-text-secondary` | `--color-body` |
| `--color-text-muted` | `--color-muted` |
| `--color-text-inverse` | `--color-on-primary` |
| `--shadow-sm` | (xóa — dùng flat, no shadow) |
| `--shadow-md` | `--shadow-card` |
| `--shadow-lg` | `--shadow-card` |
| `--shadow-xl` | `--shadow-dropdown` |

---

- [ ] **Step 1: Token swap trong `carousel.css`**

Mở `frontend-react/src/styles/carousel.css`. Áp dụng mapping ở trên cho toàn bộ file. Cụ thể các dòng cần đổi:
- `var(--color-bg-muted)` → `var(--color-surface-strong)` (placeholder background)
- `box-shadow: var(--shadow-lg)` → `box-shadow: var(--shadow-card)`
- `var(--color-bg)` → `var(--color-canvas)`
- `var(--color-text-primary)` → `var(--color-ink)`
- `var(--color-text-secondary)` → `var(--color-body)`
- `var(--color-text-muted)` → `var(--color-muted)`
- `var(--color-accent)` (dot active indicator) → `var(--color-primary)`
- `var(--color-border)` → `var(--color-hairline)`
- `box-shadow: var(--shadow-md)` → `box-shadow: var(--shadow-card)`
- `var(--color-bg-subtle)` → `var(--color-surface-soft)`
- `outline: 2px solid var(--color-accent)` → `outline: 2px solid var(--color-primary)`
- `var(--color-border-strong)` → giữ nguyên tên, value đã đổi trong `:root`
- `background: var(--color-accent)` (dot active) → `background: var(--color-primary)`

- [ ] **Step 2: Token swap trong `dashboard.css`**

Mở `frontend-react/src/styles/dashboard.css`. Áp dụng mapping. Cụ thể:
- Tất cả `var(--color-bg)` → `var(--color-canvas)`
- Tất cả `var(--color-border)` → `var(--color-hairline)`
- `box-shadow: var(--shadow-sm)` → xóa dòng shadow hoặc `box-shadow: none`
- Tất cả `var(--color-text-primary)` → `var(--color-ink)`
- Tất cả `var(--color-text-secondary)` → `var(--color-body)`
- Tất cả `var(--color-text-muted)` → `var(--color-muted)`
- `var(--color-bg-muted)` → `var(--color-surface-strong)`
- `var(--color-bg-subtle)` → `var(--color-surface-soft)`
- `var(--color-accent-light)` → `var(--color-surface-soft)`
- `var(--color-accent)` → `var(--color-primary)`
- `.kpi-chip-navy { background: rgba(10, 37, 64, 0.10); color: var(--color-brand); }` → `.kpi-chip-navy { background: var(--color-surface-strong); color: var(--color-ink); }`
- `.kpi-chip-green { background: rgba(22, 163, 74, 0.10); color: var(--color-accent); }` → `.kpi-chip-green { background: rgba(255, 56, 92, 0.10); color: var(--color-primary); }`

- [ ] **Step 3: Token swap trong `detail.css`**

Mở `frontend-react/src/styles/detail.css`. Áp dụng mapping:
- `var(--color-bg-subtle)` → `var(--color-surface-soft)`
- `var(--color-border)` → `var(--color-hairline)`
- `var(--color-text-secondary)` → `var(--color-body)`
- `var(--color-text-primary)` → `var(--color-ink)`
- `var(--color-text-muted)` → `var(--color-muted)`
- `var(--color-accent-light)` → `var(--color-surface-soft)`
- `var(--color-accent)` (borders, backgrounds, focus) → `var(--color-primary)`
- `var(--color-text-inverse)` → `var(--color-on-primary)`
- `var(--color-bg)` → `var(--color-canvas)`
- `box-shadow: 0 0 0 3px var(--color-accent-light)` → xóa (focus dùng ink border thay ring)

- [ ] **Step 4: Token swap trong `gallery.css`**

Mở `frontend-react/src/styles/gallery.css`. Áp dụng mapping:
- `box-shadow: var(--shadow-md)` → `box-shadow: var(--shadow-card)`
- `var(--color-bg-muted)` → `var(--color-surface-strong)`
- `var(--color-text-primary)` → `var(--color-ink)`
- `box-shadow: var(--shadow-sm)` → `box-shadow: none`
- `var(--color-text-inverse)` → `var(--color-on-primary)`
- `var(--color-border-strong)` → giữ nguyên tên
- `border-color: var(--color-accent)` → `border-color: var(--color-primary)`
- `var(--color-text-muted)` → `var(--color-muted)`
- `accent-color: var(--color-accent)` → `accent-color: var(--color-primary)`
- `var(--color-accent-light)` → `var(--color-surface-soft)`

- [ ] **Step 5: Update hardcoded accent colors trong Dashboard JSX files**

**`frontend-react/src/pages/BrokerDashboard.jsx`** — tìm và đổi:
```js
// tìm:
accent: '#16A34A',   // --color-accent
// đổi thành:
accent: '#ff385c',   // --color-primary
```

**`frontend-react/src/pages/AdminDashboard.jsx`** — tìm và đổi:
```js
// tìm:
accent: '#16A34A',   // --color-accent
// đổi thành:
accent: '#ff385c',   // --color-primary
```

- [ ] **Step 6: Fix `Charts.jsx` track color**

```js
// tìm:
const TRACK_COLOR = '#E2E8F0'; // = --color-border
// đổi thành:
const TRACK_COLOR = '#dddddd'; // = --color-hairline
```

- [ ] **Step 7: Fix `DashboardWidgets.jsx` inline style**

Tìm dòng có `color: 'var(--color-text-secondary)'` (khoảng line 113):
```jsx
// tìm:
style={{ marginTop: 8, fontSize: 15, color: 'var(--color-text-secondary)' }}
// đổi thành:
style={{ marginTop: 8, fontSize: 15, color: 'var(--color-body)' }}
```

- [ ] **Step 8: Verify không còn old token refs**

```powershell
cd frontend-react/src && grep -r "color-accent\b\|color-brand\b\|color-bg\b\|color-bg-subtle\|color-bg-muted\|color-border\b\|color-text-primary\|color-text-secondary\|color-text-muted\|color-text-inverse\b\|color-dark-bg\|shadow-sm\b\|shadow-md\b\|shadow-lg\b\|shadow-xl\b" --include="*.css" --include="*.jsx" .
```

Expected: chỉ còn các hits trong comments (nếu có) hoặc zero hits trong code. Nếu còn hits → fix trước khi commit.

- [ ] **Step 9: Chạy test + build**

```powershell
cd frontend-react && npm test -- --run
```
Expected: 37 passed.

```powershell
cd frontend-react && npm run build
```
Expected: build thành công, không có errors.

- [ ] **Step 10: Visual verification checklist**

```powershell
cd frontend-react && npm run dev
```

Mở http://localhost:5173 và verify:
- [ ] Navbar: trắng, hairline bottom, links ink-colored, "Đăng tin" đỏ pill
- [ ] Hero: h1 "Tìm bất động sản tại Trà Vinh" 28px, search pill đầy đủ 3 segments + orb đỏ
- [ ] PropertyCard trên HomePage: 4/3 ảnh, badge "Nổi bật" top-left, no broker footer
- [ ] Section padding nhỏ hơn (~64px vs 80px cũ)
- [ ] Footer: trắng, 4 cột text tối, social icons có border circle
- [ ] Mở http://localhost:5173/#/broker/dashboard — stat cards không còn navy/green
- [ ] Mở http://localhost:5173/#/admin/overview — donut chart accent đỏ

- [ ] **Step 11: Commit**

```powershell
git add frontend-react/src/styles/carousel.css frontend-react/src/styles/dashboard.css frontend-react/src/styles/detail.css frontend-react/src/styles/gallery.css frontend-react/src/pages/BrokerDashboard.jsx frontend-react/src/pages/AdminDashboard.jsx frontend-react/src/components/DashboardWidgets.jsx frontend-react/src/components/Charts.jsx
git commit -m "style: token swap all CSS files + update dashboard accent to Rausch"
```
