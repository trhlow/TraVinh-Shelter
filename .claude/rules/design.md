---
description: Design system — Airbnb-inspired, light-only. Màu sắc, typography, spacing, shadow, component conventions cho Công Tín Land.
paths: ["frontend-react/src/**"]
---

# Design System — Công Tín Land (Airbnb-inspired)

## Triết lý

Lấy cảm hứng từ Airbnb: **generous, photography-led, warm marketplace**.

- **Light only** — canvas trắng (#ffffff) là nền mặc định cho mọi section; không có nền tối
- **Single accent** — chỉ một màu nhấn (`--color-primary`) cho mọi CTA, search orb, và brand moment
- **Modest typography** — hero headline tối đa 28px; ảnh và card card tạo visual weight, không phải chữ to
- **Rounded everything** — pill search bar, card 14px, button 8px; không có góc vuông trên interactive element
- **Photography-first** — PropertyCard phải prioritize ảnh; meta text nhỏ, nằm dưới ảnh
- **Marketplace density** — card grid sát nhau (gap 16px); section padding 64px, không phải 80px+

## Bảng màu (CSS Custom Properties)

```css
/* Brand accent — single voltage */
--color-primary:          #ff385c;   /* Rausch — CTA, search orb, heart save, brand links */
--color-primary-active:   #e00b41;   /* Press / pointer-down state */
--color-primary-disabled: #ffd1da;   /* Disabled CTA */

/* Canvas & surfaces */
--color-canvas:           #ffffff;
--color-surface-soft:     #f7f7f7;   /* Disabled fields, sub-nav hover, filter band */
--color-surface-strong:   #f2f2f2;   /* Icon-button circle surface */

/* Text */
--color-ink:              #222222;   /* Headlines, body, primary nav links */
--color-body:             #3f3f3f;   /* Running-text trong review / amenity copy */
--color-muted:            #6a6a6a;   /* Sub-labels, inactive tabs, footer sub-labels */
--color-muted-soft:       #929292;   /* Disabled link text */
--color-on-primary:       #ffffff;   /* Text trên Rausch CTA */

/* Borders */
--color-hairline:         #dddddd;   /* Default 1px divider */
--color-hairline-soft:    #ebebeb;   /* Editorial separator */
--color-border-strong:    #c1c1c1;   /* Disabled outline, focused input */

/* Semantic */
--color-error:            #c13515;
--color-error-hover:      #b32505;

/* Scrim — apply opacity at render time */
--color-scrim:            #000000;   /* Modal backdrop tại 50% opacity */
```

Không bao giờ hard-code `#hex` trong JSX — chỉ dùng CSS variable.

## Typography

Font stack: `'Be Vietnam Pro', system-ui, -apple-system, sans-serif`

(Be Vietnam Pro thay cho Airbnb Cereal VF — cùng weight scale, đầy đủ dấu tiếng Việt)

| Token | Size | Weight | Line-height | Letter-spacing | Dùng cho |
|---|---|---|---|---|---|
| display-xl | 28px | 700 | 1.43 | 0 | Hero h1 |
| display-lg | 22px | 500 | 1.18 | -0.44px | Property detail h1 |
| display-md | 21px | 700 | 1.43 | 0 | Section heads ("Tin nổi bật") |
| display-sm | 20px | 600 | 1.20 | -0.18px | Sub-section titles |
| title-md | 16px | 600 | 1.25 | 0 | Card title, ward link |
| title-sm | 16px | 500 | 1.25 | 0 | Footer column heads |
| body-md | 16px | 400 | 1.50 | 0 | Running text |
| body-sm | 14px | 400 | 1.43 | 0 | Card meta, date, price, distance |
| caption | 14px | 500 | 1.29 | 0 | Search field labels (Địa điểm / Loại) |
| caption-sm | 13px | 400 | 1.23 | 0 | Footer legal text |
| badge | 11px | 600 | 1.18 | 0 | Floating badge text |
| micro-label | 12px | 700 | 1.33 | 0 | Card amenity micro-labels |
| button-md | 16px | 500 | 1.25 | 0 | Primary CTA label |
| button-sm | 14px | 500 | 1.29 | 0 | Pill button label |
| nav-link | 16px | 600 | 1.25 | 0 | Top nav labels |

**Nguyên tắc**: Không dùng heading to hơn 28px. Ảnh và card tạo hierarchy — typography chỉ hỗ trợ.

## Spacing

Base unit: 4px (micro-step 2px).

| Token | Value |
|---|---|
| xxs | 2px |
| xs | 4px |
| sm | 8px |
| md | 12px |
| base | 16px |
| lg | 24px |
| xl | 32px |
| xxl | 48px |
| section | 64px |

Section padding: `64px 0` desktop / `48px 0` mobile.  
Card grid gap: `16px`. Footer column gutter: `24px`.

## Elevation

Chỉ **một shadow tier** duy nhất trong toàn hệ thống:

```css
--shadow-card: rgba(0, 0, 0, 0.02) 0 0 0 1px,
               rgba(0, 0, 0, 0.04) 0 2px 6px 0,
               rgba(0, 0, 0, 0.10) 0 4px 8px 0;
```

Dùng cho: hover state của property card, search bar at rest, dropdown menu.  
Phần lớn surface là **flat (no shadow)**. Không có progressive tiers.

## Border radius

```css
--radius-none: 0px;
--radius-xs:   4px;
--radius-sm:   8px;    /* Button */
--radius-md:   14px;   /* Property card, host card, dropdown */
--radius-lg:   20px;
--radius-xl:   32px;   /* Category strip pill */
--radius-full: 9999px; /* Search bar, search orb, badge, date-picker day */
```

Không có góc vuông trên bất kỳ interactive element nào.

## Responsive breakpoints

```css
/* mobile:  default (< 744px)  */
/* tablet:  min-width: 744px   */
/* desktop: min-width: 1128px  */
/* wide:    min-width: 1440px  */
```

Mobile-first. Không dùng `inline style`.  
Property card grid: 1-up mobile → 2-up tablet → 3–4-up desktop.

## Component primitives

```jsx
<Button variant="primary|secondary|tertiary" size="sm|md" />
<SearchBarPill />                  // pill-shaped, segments + search orb
<PropertyCard property={...} />    // photo-first, rounded-md, meta bên dưới
<BrokerCard broker={...} />
<Badge variant="guest-favorite|new|status" />
<CategoryStrip />                  // horizontal scroll, pill-shaped tabs
```

- Chỉ dùng `lucide-react` cho icon
- Image BĐS: `aspect-ratio: 1/1` hoặc `4/3`, `object-fit: cover`, `border-radius: var(--radius-md)`
- Không import thư viện UI ngoài (MUI, Ant Design, Chakra)
- Border mặc định: `1px solid var(--color-hairline)`
- Text input: focus state dùng `2px solid var(--color-ink)` — không dùng glow hay ring màu

## Cấu trúc trang (light-only)

1. **Navbar** — sticky, `--color-canvas`, 80px height, 1px bottom hairline; logo trái / links / account phải
2. **Hero** — canvas trắng, search bar pill nhúng, headline display-xl (28px), không gradient nặng
3. **Category Strip** — horizontal scroll pill tabs (Trọ / Nhà / Đất / ...)
4. **Featured rows** — per-category showcase, card grid 3–4 cột
5. **Footer** — canvas trắng, 3–4 cột link, legal band bên dưới

**Không bao giờ** dùng: nền tối, coral section, dark CTA band, gradient nặng.  
Toàn trang là white canvas với một accent màu `--color-primary`.
