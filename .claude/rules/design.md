---
description: Design system — Airbnb-inspired, dual-mode (light + dark). Màu sắc, typography, spacing, shadow, component conventions cho Công Tín Land.
paths: ["frontend-react/src/**"]
---

# Design System — Công Tín Land (Airbnb-inspired)

## Triết lý

Lấy cảm hứng từ Airbnb: **generous, photography-led, warm marketplace**.

- **Dual-mode** — light là mặc định (canvas trắng #ffffff); dark có sẵn qua `[data-theme="dark"]` và nút
  toggle ở navbar (`hooks/useTheme.js`). Mọi token semantic (`--color-canvas/ink/body/muted/hairline/surface-*`)
  đổi giá trị theo theme; component chỉ tham chiếu token, không tự if/else theo theme.
- **Single accent** — chỉ một màu nhấn (`--color-primary`) cho mọi CTA, search orb, và brand moment — giữ
  nguyên giá trị ở cả 2 theme (Rausch đủ tương phản trên cả nền sáng lẫn tối)
- **Modest typography** — hero headline tối đa 28px; ảnh và card card tạo visual weight, không phải chữ to
- **Rounded everything** — pill search bar, card 14px, button 8px; không có góc vuông trên interactive element
- **Photography-first** — PropertyCard phải prioritize ảnh; meta text nhỏ, nằm dưới ảnh
- **Marketplace density** — card grid sát nhau (gap 16px); section padding 64px, không phải 80px+

## Bảng màu (CSS Custom Properties)

Token semantic — đổi giá trị giữa 2 theme (`:root` = light, `[data-theme="dark"]` override):

| Token | Light | Dark | Dùng cho |
|---|---|---|---|
| `--color-primary` | `#ff385c` | *(giữ nguyên)* | CTA, search orb, brand links |
| `--color-primary-active` | `#e00b41` | *(giữ nguyên)* | Press / pointer-down state |
| `--color-primary-disabled` | `#ffd1da` | `#7a1e30` | Disabled CTA |
| `--color-canvas` | `#ffffff` | `#121212` | Nền mặc định mọi section |
| `--color-surface-soft` | `#f7f7f7` | `#1c1c1c` | Disabled fields, sub-nav hover |
| `--color-surface-strong` | `#f2f2f2` | `#262626` | Icon-button circle surface |
| `--color-ink` | `#222222` | `#f2f2f2` | Headlines, body, primary nav links |
| `--color-body` | `#3f3f3f` | `#d4d4d4` | Running-text |
| `--color-muted` | `#6a6a6a` | `#a3a3a3` | Sub-labels, inactive tabs |
| `--color-muted-soft` | `#929292` | `#737373` | Disabled link text |
| `--color-on-primary` | `#ffffff` | *(giữ nguyên)* | Text trên Rausch CTA |
| `--color-hairline` | `#dddddd` | `#333333` | Default 1px divider |
| `--color-hairline-soft` | `#ebebeb` | `#2a2a2a` | Editorial separator |
| `--color-border-strong` | `#c1c1c1` | `#525252` | Disabled outline, focused input |
| `--color-success` / `-bg` | `#16a34a` / `#dcfce7` | `#4ade80` / `#14532d` | Trạng thái thành công |
| `--color-warning` / `-bg` | `#d97706` / `#fef3c7` | `#fbbf24` / `#78350f` | Trạng thái cảnh báo |
| `--color-error` / `-bg` | `#c13515` / `#fee2e2` | `#f87171` / `#7f1d1d` | Trạng thái lỗi |
| `--color-zalo` | `#0068ff` | *(giữ nguyên)* | Brand bên thứ ba, cố định |
| `--color-scrim` | `#000000` | *(giữ nguyên)* | Modal backdrop tại 50% opacity |

Token **cố định** (không đổi theo theme — dùng cho chip/badge đè lên ảnh, hoặc navigation chrome
cố định tối theo chủ đích thiết kế):

| Token | Value | Dùng cho |
|---|---|---|
| `--color-sidebar-bg` | `#1a1a1a` | Dashboard sidebar (navigation rail luôn tối) |
| `--color-sidebar-text` | `rgb(255 255 255 / 0.8)` | Text trong sidebar |
| `--color-ink-fixed` | `#222222` | Badge đè lên ảnh, avatar fallback, page-header band |

Token **chart** (data-viz palette, tách khỏi single-accent vì chart cần nhiều màu phân biệt):
`--chart-1` đến `--chart-6`, xem `styles.css`. `--chart-2` tái dùng `var(--color-success)` để tự đổi theo theme.

Không bao giờ hard-code `#hex` trong JSX — chỉ dùng CSS variable. Ngoại lệ: SVG brand mark (`BrandLogo.jsx`)
được dùng `var(--color-primary)`/`var(--color-on-primary)` (không phải hex thô) nên vẫn tuân thủ quy tắc.

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

Chỉ **một shadow tier** duy nhất trong toàn hệ thống, giá trị khác nhau theo theme:

```css
/* light */
--shadow-card: rgba(0, 0, 0, 0.02) 0 0 0 1px,
               rgba(0, 0, 0, 0.04) 0 2px 6px 0,
               rgba(0, 0, 0, 0.10) 0 4px 8px 0;

/* dark — viền sáng mờ thay cho đổ bóng đen (không đọc được trên nền tối) */
--shadow-card: rgba(255, 255, 255, 0.06) 0 0 0 1px,
               rgba(0, 0, 0, 0.4) 0 2px 6px 0,
               rgba(0, 0, 0, 0.5) 0 4px 8px 0;
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
- Ảnh đại diện BĐS (property card, showcase card, dashboard listing thumb/cover preview): luôn
  `aspect-ratio: 1/1`, `object-fit: cover`, `object-position: center`, `border-radius: var(--radius-md)`.
  Chuẩn hóa bắt buộc — không phụ thuộc ảnh nguồn dọc/ngang, tránh lệch khung giữa các bài đăng.
  (Ngoại lệ: gallery chi tiết BĐS và banner carousel trang chủ giữ tỉ lệ rộng riêng.)
- Không import thư viện UI ngoài (MUI, Ant Design, Chakra)
- Border mặc định: `1px solid var(--color-hairline)`
- Text input: focus state dùng `2px solid var(--color-ink)` — không dùng glow hay ring màu

## Cấu trúc trang

1. **Navbar** — sticky, `--color-canvas`, 80px height, 1px bottom hairline; logo trái / links / account phải;
   nút toggle theme (icon Sun/Moon) nằm trong `navbar-actions`
2. **Hero** — `--color-canvas`, search bar pill nhúng, headline display-xl (28px), backdrop ảnh mờ + scrim
   dùng `var(--color-canvas)` (tự đổi theo theme), không gradient nặng
3. **Category Strip** — horizontal scroll pill tabs (Trọ / Nhà / Đất / ...)
4. **Featured rows** — per-category showcase, card grid 3–4 cột
5. **Footer** — `--color-canvas`, 3 cột link, legal band bên dưới

**Không bao giờ** dùng: coral section, dark CTA band tùy tiện, gradient nặng. Toàn trang là single-canvas
với một accent màu `--color-primary` — ở light mode canvas trắng, ở dark mode canvas tối (`#121212`), không
trộn lẫn 2 nền trong cùng section trừ các chip cố định đã liệt kê ở mục "Token cố định".

## Dark mode — vận hành

- Bật/tắt qua `hooks/useTheme.js`: đọc/ghi `localStorage['travinh-theme']`, mặc định theo
  `prefers-color-scheme` nếu chưa có lựa chọn lưu, set attribute `data-theme` trên `<html>`.
  Hook được gọi **một lần duy nhất** ở `App.jsx` (root) — đảm bảo áp dụng cho mọi route, kể cả trang
  không dùng `MainLayout` (VD: `LoginPage`). Các trang dùng `MainLayout` nhận `theme`/`onToggleTheme`
  qua props (cùng pattern với `session`/`onLogout`) để render nút toggle trong `Header`.
- Component **không** tự viết `if (theme === 'dark')` — chỉ tham chiếu token semantic; toàn bộ việc đổi
  màu nằm ở khối `[data-theme="dark"]` trong `styles.css`.
- Khi thêm màu mới: nếu là nền/chữ/border theo ngữ cảnh trang → thêm token semantic + override dark.
  Nếu là badge/chip đè lên ảnh hoặc navigation chrome cố định tối theo chủ đích (như sidebar) → dùng
  hoặc thêm token cố định (`--color-*-fixed`, `--color-sidebar-*`), không đổi theo theme.
