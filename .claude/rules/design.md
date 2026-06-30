---
description: Design system — màu sắc, typography, spacing, shadow, component conventions cho Công Tín Land
paths: ["frontend-react/src/**"]
---

# Design System — Công Tín Land

## Triết lý

Lấy cảm hứng từ Mintlify.com: **tối giản, hiện đại, chuyên nghiệp**.

- **White space** rộng rãi — thở được
- **Typography** là trung tâm — text sắc nét, hierarchy rõ
- **Color** kiệm lời — chỉ accent để dẫn mắt, không decoration thừa
- **Motion** nhẹ nhàng — `transition` đơn giản; không dùng keyframe nhiều step
- **Light hero + Light content** — hero nền sáng (theo Mintlify), chữ tối, gradient pastel rất nhẹ; chỉ CTA cuối + footer dùng nền tối
- **Một section accent màu cam/coral** ở giữa trang tạo điểm nhấn thị giác

## Bảng màu (CSS Custom Properties)

```css
/* Brand */
--color-brand: #0A2540;
--color-brand-mid: #1A3F6F;
--color-accent: #16A34A;
--color-accent-light: #DCFCE7;

/* Neutrals */
--color-bg: #FFFFFF;
--color-bg-subtle: #F8FAFC;
--color-bg-muted: #F1F5F9;
--color-border: #E2E8F0;
--color-border-strong: #CBD5E1;

/* Text */
--color-text-primary: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
--color-text-inverse: #FFFFFF;

/* Dark sections */
--color-dark-bg: #0A2540;
--color-dark-surface: #112B4F;
--color-dark-border: #1E3A5F;

/* Semantic */
--color-success: #16A34A;
--color-warning: #D97706;
--color-error: #DC2626;
```

Không bao giờ hard-code `#hex` trong JSX — chỉ dùng CSS variable.

## Typography

Font stack: `'Inter', system-ui, -apple-system, sans-serif`

| Role | Size | Weight | Line-height |
|---|---|---|---|
| Display (hero H1) | 56–72px | 700 | 1.1 |
| H1 | 40–48px | 700 | 1.15 |
| H2 | 28–36px | 600 | 1.25 |
| H3 | 20–24px | 600 | 1.35 |
| Body large | 18px | 400 | 1.7 |
| Body | 16px | 400 | 1.65 |
| Small / caption | 14px | 400 | 1.5 |
| Label / badge | 12px | 500 | 1.4 |

## Spacing

Bội số 4px: `4 8 12 16 20 24 32 40 48 64 80 96 128`px  
Section padding: `80px 0` desktop / `48px 0` mobile.

## Shadows

```css
--shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04);
--shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -2px rgb(0 0 0 / 0.04);
--shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1),  0 10px 10px -5px rgb(0 0 0 / 0.04);
```

## Border radius

```css
--radius-sm:   6px;
--radius-md:   10px;
--radius-lg:   16px;
--radius-xl:   24px;
--radius-full: 9999px;
```

## Responsive breakpoints

```css
/* mobile:  default (< 768px)  */
/* tablet:  min-width: 768px   */
/* desktop: min-width: 1024px  */
/* wide:    min-width: 1280px  */
```

Mobile-first. Không dùng `inline style`.

## Component primitives

```jsx
<Button variant="primary|secondary|ghost" size="sm|md|lg" />
<Badge variant="success|warning|error|neutral" />
<PropertyCard property={...} />   // luôn có: image, price, title, location, badge trạng thái
<BrokerCard broker={...} />
```

- Chỉ dùng `lucide-react` cho icon
- Image BĐS: `aspect-ratio: 16/9` hoặc `3/2`, `object-fit: cover`
- Không import thư viện UI ngoài (MUI, Ant Design, Chakra)

## Cấu trúc trang Landing (thứ tự sections)

1. Navbar — sticky, backdrop-blur, logo trái / links giữa / CTA phải
2. Hero — nền sáng (`--color-bg`) + gradient pastel nhẹ, display heading chữ tối, search bar nhúng, 2 CTA
3. Featured Properties — grid 3 cột
4. Coral accent — section nền cam, stats + benefits
5. Brokers — horizontal scroll hoặc grid
6. Testimonials — card quote + avatar
7. News — grid 3 cột tin tức/blog
8. CTA Section — `--color-dark-bg`, 1 button
9. Footer — 4 cột
