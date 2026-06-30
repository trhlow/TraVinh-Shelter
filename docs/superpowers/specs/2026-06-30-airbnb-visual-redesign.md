# Pass 5 — Full Visual Redesign (Airbnb-inspired)

**Date:** 2026-06-30  
**Scope:** Toàn bộ frontend (public pages + dashboards get token updates; dashboard layout không đổi)  
**Branch:** `feat/pass-5-airbnb-redesign`

---

## Goal

Chuyển toàn bộ design system từ Mintlify-inspired (navy/green, dark sections, large typography) sang Airbnb-inspired (white canvas, single Rausch accent #ff385c, modest typography, rounded everything, light-only).

---

## Approach: Layered (4 tasks)

Thực hiện theo 4 lớp độc lập, mỗi lớp commit riêng:

1. **CSS Tokens** — update `:root` variables + typography + shadows + radii + section-py
2. **Global Layout** — Navbar CSS + Footer → white canvas
3. **Core Components** — PropertyCard (full Airbnb) + HeroSearchBar (pill)
4. **Remaining pages + Cleanup** — SearchPage, PropertyDetailPage, BrokersPage, ProjectsPage, Dashboards, xóa dead CSS

---

## Task 1 — CSS Tokens (`styles.css`)

### Variables mới (thay toàn bộ `:root`)

```css
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

/* Scrim */
--color-scrim:            #000000;

/* Shadows — single tier */
--shadow-card:    rgba(0,0,0,0.02) 0 0 0 1px,
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
--container-max: 1280px;
--section-py:    64px;
--section-py-mobile: 48px;
```

### Variables bị xóa

`--color-brand`, `--color-brand-mid`, `--color-accent`, `--color-accent-light`, `--color-accent-hover`,  
`--color-dark-bg`, `--color-dark-surface`, `--color-dark-border`,  
`--color-bg`, `--color-bg-subtle`, `--color-bg-muted`,  
`--color-border`, `--color-border-strong` (→ đổi tên thành `--color-hairline` / `--color-border-strong`),  
`--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-inverse`, `--color-text-inverse-muted`,  
`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`

### Typography classes (thay toàn bộ)

Xóa: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`, `text-sm`, `text-xs`

Thêm:

| Class | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| `.text-display-xl` | 28px | 700 | 1.43 | 0 |
| `.text-display-lg` | 22px | 500 | 1.18 | -0.44px |
| `.text-display-md` | 21px | 700 | 1.43 | 0 |
| `.text-display-sm` | 20px | 600 | 1.20 | -0.18px |
| `.text-title-md` | 16px | 600 | 1.25 | 0 |
| `.text-title-sm` | 16px | 500 | 1.25 | 0 |
| `.text-body-md` | 16px | 400 | 1.50 | 0 |
| `.text-body-sm` | 14px | 400 | 1.43 | 0 |
| `.text-caption` | 14px | 500 | 1.29 | 0 |
| `.text-caption-sm` | 13px | 400 | 1.23 | 0 |
| `.text-badge` | 11px | 600 | 1.18 | 0 |
| `.text-micro` | 12px | 700 | 1.33 | 0 |

### Button CSS (update)

- `.btn-primary`: background `--color-primary`, hover `--color-primary-active`
- `.btn-secondary`: white bg, ink text, `1px solid var(--color-hairline)`, hover `--color-surface-soft`
- `.btn-ghost`: transparent, ink text, hover `--color-surface-soft`
- Border-radius: `--radius-sm` (8px) cho tất cả buttons
- `.btn-pill`: thêm mới, `--radius-full`, dùng cho tag/filter chips

### Layout utilities (update)

- `.section`: padding `--section-py` 0 (64px, từ 80px)
- `.section-subtle`: đổi background `--color-surface-soft` (thay `--color-bg-subtle`)
- Xóa `.section-subtle` khỏi markup nếu không còn dùng

---

## Task 2 — Global Layout (Navbar + Footer)

### Navbar (`styles.css` — navbar block)

- Background: `--color-canvas`
- Border-bottom: `1px solid var(--color-hairline)` (bỏ box-shadow)
- Links: `--color-ink`, weight 600, hover: `opacity: 0.7`
- "Đăng nhập" button: ghost pill (`--radius-full`), border `1px solid var(--color-hairline)`
- "Đăng tin" button: `--color-primary` background, `--radius-full`
- Dropdown panel: white, `--shadow-dropdown`, `--radius-md`, border `1px solid var(--color-hairline)`
- Dropdown border dividers: đổi `var(--color-border)` → `var(--color-hairline)`

### Footer (`MainLayout.jsx` + `styles.css` — footer block)

**JSX changes:**
- Xóa `style={{ color: '#fff' }}` inline trên logo link → thêm class `.footer-logo`
- Logo: dùng dark version (không cần thay đổi nếu BrandLogo đã dùng SVG)

**CSS changes:**
- `.footer`: background `--color-canvas` (bỏ `--color-dark-bg`), color `--color-ink`
- `.footer-top`: border-top `1px solid var(--color-hairline)`
- `.footer-col-title`: color `--color-ink`
- `.footer-link`: color `--color-muted`, hover `--color-ink`
- `.footer-about-text`: color `--color-muted`
- `.footer-social-icon`: color `--color-ink`, hover `--color-primary`
- `.footer-bottom`: border-top `1px solid var(--color-hairline)`, color `--color-muted-soft`
- `.footer-copyright`: color `--color-muted-soft`, font-size 13px
- Xóa toàn bộ CSS references tới `--color-dark-*` trong footer block

---

## Task 3 — Core Components

### PropertyCard (`PropertyCard.jsx` + `styles.css`)

**Layout:**
- Ảnh: `aspect-ratio: 4/3`, `object-fit: cover`, `border-radius: var(--radius-md)`, overflow hidden
- Wrapper ảnh: `position: relative` (chứa badge + heart)
- Badge "Nổi bật" top-left: white pill, `padding: 4px 10px`, `--radius-full`, `--text-badge` (11px/600), `--shadow-card`
- Heart button top-right: 32×32px circle, `--color-surface-strong` bg, `--radius-full`, Rausch khi saved
- Meta block: `margin-top: 8px`, `display: flex; flex-direction: column; gap: 4px`
  - Line 1: title — `.text-title-md` (16px/600 `--color-ink`)
  - Line 2: ward + loại giao dịch — `.text-body-sm` (14px `--color-muted`)
  - Line 3: price — `.text-title-md` ink
  - Line 4: status badge — chỉ show khi PENDING/RENTED/SOLD (AVAILABLE ẩn)
- Card wrapper: no border, no shadow at rest; `--shadow-card` on `:hover`; `--radius-md`
- Transition: `box-shadow 200ms ease`

**TroShowcaseCard.jsx:** Apply cùng photo/meta style. Là visual variant — đổi sang dùng `aspect-ratio: 4/3` thay vì horizontal layout hiện tại.

### HeroSearchBar (`home.css`)

**Container (`.hero-search-panel`):**
- `border-radius: var(--radius-full)` desktop / `var(--radius-xl)` mobile
- background `--color-canvas`
- `box-shadow: var(--shadow-card)` at rest
- `border: 1px solid var(--color-hairline)`
- `max-width: 860px`
- `padding: 4px 4px 4px 8px` (tight, orb flush right)
- `display: flex; align-items: center`

**Segment (`.hero-search-segment`):**
- `flex: 1`
- `padding: 12px 16px`
- `border-right: 1px solid var(--color-hairline)` (trừ segment cuối)
- Label: `.text-caption` (14px/500 `--color-muted`), hiển thị trên
- Value/select: `.text-body-sm` (14px/400 `--color-ink`), `background: transparent`, `border: none`, `appearance: none`, `width: 100%`

**Search orb (`.hero-search-orb`):**
- `width: 48px; height: 48px`
- `background: var(--color-primary)`
- `border-radius: var(--radius-full)`
- Icon `Search` 20px white centered
- hover: `background: var(--color-primary-active)`

**Mobile (<744px):**
- Container: `border-radius: var(--radius-xl)` (32px)
- Segments: `flex-direction: column`
- Segment border: `border-right: none; border-bottom: 1px solid var(--color-hairline)`
- Orb: `width: 100%; border-radius: var(--radius-sm)`

---

## Task 4 — Remaining Pages + Cleanup

### SearchPage

- Filter bar: background `--color-surface-soft`, filter chips dùng `.btn-pill`
- Property grid: `gap: 16px`, breakpoints 1→2→3→4 cột
- Đổi tất cả `--color-accent` → `--color-primary`, `--color-border` → `--color-hairline`

### PropertyDetailPage (`detail.css`)

- H1 (property title): `.text-display-lg` (22px/500)
- Price: `.text-display-md` (21px/700)
- Booking form card: `--radius-md`, `1px solid var(--color-hairline)`, `--shadow-card`
- Section dividers: `1px solid var(--color-hairline-soft)`
- Xóa mọi `--color-brand` / `--color-accent` còn sót

### BrokersPage + ProjectsPage

- Token swap only: `--color-accent` → `--color-primary`, `--color-border` → `--color-hairline`
- Không đổi layout

### BrokerDashboard + AdminDashboard (`dashboard.css`)

- Token swap: `--color-accent` → `--color-primary`, `--color-brand` → `--color-ink`
- Stat cards: bỏ màu brand làm background → `--color-surface-soft`
- Sidebar: `--color-canvas` + `--color-hairline` border
- `CHART_COLORS` hex giữ nguyên (pre-existing, out of scope)

### Cleanup (`styles.css`)

Xóa sau khi tất cả references đã được đổi:
- Variables: tất cả listed trong Task 1 "Variables bị xóa"
- Typography classes: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body`, `text-sm`, `text-xs`
- Shadow variables: `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`
- Layout class: `.section-subtle` nếu không còn dùng
- CSS block: `.section-pastel`, `.section-coral`, `.coral-*` nếu còn sót

---

## Files bị ảnh hưởng

| File | Loại thay đổi |
|---|---|
| `frontend-react/src/styles.css` | Rewrite `:root` + typography + buttons + layout |
| `frontend-react/src/styles/home.css` | Rewrite HeroSearchBar |
| `frontend-react/src/styles/detail.css` | Token swap + typography |
| `frontend-react/src/styles/dashboard.css` | Token swap |
| `frontend-react/src/styles/carousel.css` | Token swap |
| `frontend-react/src/styles/gallery.css` | Token swap |
| `frontend-react/src/layouts/MainLayout.jsx` | Xóa inline style trên footer logo |
| `frontend-react/src/components/PropertyCard.jsx` | Redesign layout + badge + heart |
| `frontend-react/src/components/TroShowcaseCard.jsx` | Đổi sang 4/3 aspect |
| `frontend-react/src/pages/HomePage.jsx` | HeroSearchBar JSX (segment structure) |

---

## Out of scope

- `CHART_COLORS` hex trong AdminDashboard (pre-existing debt)
- Dashboard layout restructure
- BrokerDashboard / AdminDashboard component redesign
- Dark mode
- Animation / micro-interaction
- New pages
