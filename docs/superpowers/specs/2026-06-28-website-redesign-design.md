# Website Redesign — Công Tín Land
**Date:** 2026-06-28  
**Approach:** C — Design tokens → Primitives → Pages  
**Inspiration:** Mintlify.com (minimal, dark hero + light content, professional)

---

## Decisions

| Decision | Choice | Reason |
|---|---|---|
| Scope | All pages (public + auth + dashboard) | Full visual consistency |
| Icons | lucide-react (replace MaterialIcon) | Matches CLAUDE.md, no Google Fonts dep |
| CSS | CSS custom properties (rebuild) | Clean system, no mixed Tailwind-like utilities |
| Approach | Layer 1 → 2 → 3 | Testable incrementally |

---

## Layer 1 — CSS Design Tokens + Icon System

### `frontend-react/src/styles.css`
Replace all `--twc-*` variables with CLAUDE.md design tokens. Keep dark mode block (`.dark`) for dashboard compatibility. Keep utility classes that aren't token-related (`.no-scrollbar`, `.mobile-bottom-nav`, `.dashboard-*`, `.auth-*` — these are rewritten in Layer 3b).

New token set:
```css
:root {
  --color-brand: #0A2540;
  --color-brand-mid: #1A3F6F;
  --color-accent: #16A34A;
  --color-accent-light: #DCFCE7;
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F8FAFC;
  --color-bg-muted: #F1F5F9;
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  --color-text-inverse: #FFFFFF;
  --color-dark-bg: #0A2540;
  --color-dark-surface: #112B4F;
  --color-dark-border: #1E3A5F;
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -2px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;
}
```

### `frontend-react/src/components/ui/Icon.jsx`
Thin wrapper mapping string name → lucide-react component. Supports `size` (default 20) and `className`.

```jsx
// Usage: <Icon name="MapPin" size={16} className="text-accent" />
```

Map covers all icons used across the app (~30 icons). `MaterialIcon` component kept as deprecated shim pointing to Icon for any missed call sites.

### `frontend-react/index.html`
Remove Material Icons Google Fonts `<link>` tag.

---

## Layer 2 — Primitive Components + Layout

### `components/ui/Button.jsx`
```
variant: primary | secondary | ghost
size: sm | md | lg
```
- primary: `bg-[--color-accent]`, white text, `--radius-md`
- secondary: border `--color-border`, bg white, text `--color-text-primary`
- ghost: no border, no bg, text `--color-text-secondary`

### `components/ui/Badge.jsx`
```
variant: success | warning | error | neutral
```
Small pill label. Used for property status, broker verification.

### `components/ui/Card.jsx`
White bg, `--shadow-md`, `--radius-lg`, `--color-border`. Hover: `--shadow-lg`.

### `components/ui/Input.jsx`
Height 44px, `--radius-md`, border `--color-border`, focus ring `--color-accent`.

### `components/property/PropertyCard.jsx`
Redesign:
- Image `aspect-ratio: 3/2`, `object-fit: cover`, `--radius-lg` on image container
- Price badge: `--color-accent` bg, white text, top-left
- Status badge: top-right
- Title: `--color-text-primary`, 600 weight
- Meta row: area / beds / baths with lucide icons
- Broker footer: avatar initials + name + posted date

### `layouts/MainLayout.jsx` — Navbar
- Sticky top, `backdrop-filter: blur(12px)`, border-bottom `--color-border`
- Logo left (`BrandLogo`)
- Nav links center (Danh mục dropdown, Dự án, Môi giới) — weight 500, `--color-text-secondary`, hover `--color-text-primary`
- Right: Đăng nhập (ghost button) + Đăng ký (primary button, `--color-accent`)
- Authenticated: show role-based links

### `layouts/MainLayout.jsx` — Footer
- Background: `--color-dark-bg`
- 4 columns: Logo+tagline+social / Dịch vụ / Khu vực / Liên hệ
- Email subscription row at top of footer
- Copyright bar at bottom

---

## Layer 3a — Public Pages

### `pages/HomePage.jsx`
9 sections in order:

**1. Hero**
- Full-width, `min-height: 600px`, bg `--color-dark-bg`
- Centered content: eyebrow text (small green label), H1 display (56px, white, 700), subtitle (18px, `--color-text-muted` lightened), SearchBar embedded, 2 CTA buttons (primary accent + secondary outline white)
- Subtle background: radial gradient or abstract SVG pattern

**2. Stats Bar**
- White bg, `border-bottom: --color-border`
- 4 stats: số BĐS / môi giới / giao dịch thành công / năm kinh nghiệm
- Large number (40px, `--color-brand`, 700) + label below

**3. Featured Properties**
- bg `--color-bg-subtle`
- Section heading H2 + "Xem tất cả →" link
- 3-column grid `PropertyCard`

**4. Services / Features**
- bg white
- H2 centered
- 3-column grid: icon (lucide, `--color-accent`) + H3 + body text

**5. Brokers Highlight**
- bg `--color-bg-subtle`
- Horizontal scroll on mobile, 4-column grid on desktop
- BrokerCard: avatar circle, name, chuyên khu, số tin
- "Xem tất cả môi giới →" CTA

**6. Testimonials**
- bg white
- 3 quote cards: avatar + name + role + quote text

**7. CTA Dark Section**
- bg `--color-dark-bg`, centered text, 1 button (accent)

**8. Footer** (via MainLayout)

### `pages/SearchPage.jsx`
- Filter bar (category + transaction + ward) — redesign using new Input/Button primitives
- Property grid: 3 cols desktop, 1 col mobile
- Keep all filter logic unchanged

### `pages/PropertyDetailPage.jsx`
- Gallery top (ImageGallery component, keep logic)
- 2-col below: info left (title, price, meta, description) + broker contact card right
- Breadcrumb nav

### `pages/BrokersPage.jsx`
- Hero banner (dark, small)
- Grid of BrokerCard

### `pages/ProjectsPage.jsx`
- Similar structure to BrokersPage

---

## Layer 3b — Auth + Dashboard Pages

### `pages/LoginPage.jsx` / Register / ForgotPassword
- Centered card, bg `--color-bg-subtle`
- Card: white, `--shadow-xl`, `--radius-xl`, padding 48px
- Logo top, H2, subtitle, form fields (new Input), primary CTA button
- Keep all existing auth logic (modes: login/register/forgot)

### `pages/UserProfilePage.jsx`
- Simple form layout, avatar upload, fields using new Input
- Primary button to save

### `pages/BrokerDashboard.jsx`
- Sidebar: bg `--color-dark-bg`, white text, accent active state
- Content: white bg, section headers H2 `--color-text-primary`
- Stats cards using new Card primitive
- Keep all existing section logic (dashboard/profile/properties tabs)

### `pages/AdminDashboard.jsx`
- Same sidebar pattern as BrokerDashboard
- Tables: use new `--color-border` for borders, subtle header bg
- Keep all admin logic unchanged

---

## Test Strategy

After each layer:
```powershell
cd frontend-react && npm test -- --run
```

All 13 existing tests in `App.test.jsx` must pass — they test text headings and routing, not visual CSS, so they should be unaffected by styling changes.

After full implementation:
- Start dev server: `npm run dev`
- Take screenshot of homepage
- Compare against `www.mintlify.com_ (1).png`
- Iterate on spacing/typography/color until visually aligned

---

## File Change Summary

| File | Action |
|---|---|
| `src/styles.css` | Rebuild with CSS vars |
| `src/index.html` | Remove Material Icons font link |
| `src/components/ui/Icon.jsx` | Create — lucide wrapper |
| `src/components/ui/Button.jsx` | Create |
| `src/components/ui/Badge.jsx` | Create |
| `src/components/ui/Card.jsx` | Create |
| `src/components/ui/Input.jsx` | Create |
| `src/components/MaterialIcon.jsx` | Keep as deprecated shim |
| `src/components/PropertyCard.jsx` | Redesign |
| `src/layouts/MainLayout.jsx` | Redesign Navbar + Footer |
| `src/pages/HomePage.jsx` | Full rebuild (9 sections) |
| `src/pages/SearchPage.jsx` | Redesign visual, keep logic |
| `src/pages/PropertyDetailPage.jsx` | Redesign |
| `src/pages/BrokersPage.jsx` | Redesign |
| `src/pages/ProjectsPage.jsx` | Redesign |
| `src/pages/LoginPage.jsx` | Redesign, keep auth logic |
| `src/pages/UserProfilePage.jsx` | Redesign |
| `src/pages/BrokerDashboard.jsx` | Redesign sidebar + content |
| `src/pages/AdminDashboard.jsx` | Redesign sidebar + content |
