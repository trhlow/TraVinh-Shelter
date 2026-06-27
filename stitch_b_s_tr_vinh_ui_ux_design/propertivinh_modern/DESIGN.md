---
name: PropertiVinh Modern
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#43474f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#00240b'
  on-tertiary: '#ffffff'
  tertiary-container: '#003c16'
  on-tertiary-container: '#00b351'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#6bff8f'
  tertiary-fixed-dim: '#4ae176'
  on-tertiary-fixed: '#002109'
  on-tertiary-fixed-variant: '#005321'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
  trust-navy: '#003366'
  action-orange: '#F97316'
  success-green: '#22C55E'
  surface-gray: '#F3F4F6'
  text-main: '#1F2937'
  text-muted: '#6B7280'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
  price-display:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is engineered to project unwavering trust and professional authority within the Trà Vinh real estate market. It evolves the traditional property portal aesthetic into a refined, high-performance platform that balances local reliability with international UX standards.

The visual direction follows a **Corporate / Modern** aesthetic. It prioritizes clarity over ornamentation, utilizing generous whitespace and a rigid structural grid to organize dense property data. The experience should feel efficient, secure, and transparent, catering to both high-stakes investors and first-time homebuyers. By stripping away legacy clutter, the system ensures that property photography and critical financial data remain the focal points.

## Colors

The palette is anchored by **Trust Navy**, used for global navigation, headers, and primary branding to establish institutional credibility. **Action Orange** serves as the high-visibility driver for "Post News" and urgent conversion points, while **Success Green** is reserved for "Call Now" and "Verified" status indicators, leveraging its psychological association with growth and safety.

The background uses a tiered approach: pure white for primary content surfaces and **Surface Gray** for layout containment and background depth. Text utilizes a scale of high-contrast grays rather than pure black to maintain readability over long browsing sessions.

## Typography

This design system utilizes **Inter** exclusively for its exceptional legibility and neutral, modern character. The typographic hierarchy is strictly enforced to help users parse complex listings.

- **Headlines:** Use semi-bold and bold weights with tighter letter spacing for a grounded, editorial feel.
- **Price Points:** Always rendered in `price-display` style, using the primary Navy color to emphasize value.
- **Labels:** Small caps or bolded labels are used for property attributes (sqm, bedrooms, location) to differentiate them from descriptions.
- **Scaling:** On mobile, large headlines scale down to prevent excessive line wrapping, while body text maintains a minimum 16px size for accessibility.

## Layout & Spacing

The system operates on a **12-column fluid grid** for desktop, transitioning to a single column for mobile. 

- **Desktop:** 12 columns with 24px gutters. Property cards typically span 3 or 4 columns.
- **Tablet:** 8 columns. Property cards span 4 columns (2 per row).
- **Mobile:** Single column with 16px side margins. 

The vertical rhythm uses an 8px base unit. Property cards and content sections are separated by `stack-lg` (32px) to provide visual breathing room and reduce cognitive load during search.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** supplemented by subtle, ambient shadows. 

- **Level 0 (Background):** Surface Gray (#F3F4F6) acts as the canvas.
- **Level 1 (Cards/Content):** White (#FFFFFF) surfaces with a very soft, 4% opacity black shadow (10px blur, 2px offset) to create a "lifted" effect without looking heavy.
- **Level 2 (Hover/Active):** Increased shadow intensity (8% opacity) and a 1px border in the Primary Navy color to denote interactivity.
- **Level 3 (Modals/Overlays):** High-diffused shadows to isolate the element from the background, which is dimmed with a 40% Navy overlay.

## Shapes

The design system employs a **Soft** shape language. 

- **Standard Elements:** Buttons, input fields, and small cards use a 4px (0.25rem) radius to maintain a professional, sharp look while appearing modern.
- **Property Cards:** Use a larger 8px (0.5rem) radius to soften the visual density of the image-heavy feed.
- **Search Bars:** Utilize a slightly more rounded 12px radius to make them feel inviting and distinct from the structural elements of the page.

## Components

### Property Cards
The primary vehicle of the platform. Featured elements include:
- **Image:** 4:3 aspect ratio with a subtle inner gradient at the bottom for white text legibility.
- **Price Tag:** Positioned at the top-left of the content area in Primary Navy.
- **Status Labels:** High-contrast chips (e.g., "Selling", "For Rent") using `label-bold`.

### Buttons
- **Primary:** Solid Navy with white text for main navigation.
- **Action (CTA):** Solid Green ("Call Now") or Orange ("Post News") with bold typography.
- **Ghost:** 1px Navy border with Navy text for secondary filters or "View More".

### Input Fields
- White background with a 1px Light Gray border. 
- On focus, the border transitions to Primary Navy with a subtle 2px glow.
- Search inputs include high-visibility icons in Navy.

### Contact Sidebar
Sticky component on desktop property pages featuring the broker's photo (circular), name, and a high-contrast Success Green button for immediate contact.