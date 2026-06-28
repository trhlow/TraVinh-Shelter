# Website Redesign — Công Tín Land

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the entire Công Tín Land frontend to match Mintlify-inspired design (dark navy hero + white content sections, minimal, professional) using CSS custom properties and lucide-react icons throughout.

**Architecture:** Approach C — Layer 1 (CSS tokens + icon wrapper) → Layer 2 (primitives + layout) → Layer 3 (pages). Each layer uses only things defined in earlier layers. Existing tests (App.test.jsx) check heading text and routing — not CSS — so they must stay green after every task.

**Tech Stack:** React 19, Vite 8, lucide-react (already installed), plain CSS custom properties, no CSS framework.

## Global Constraints

- No inline styles in JSX — use CSS classes defined in styles.css or component-local `<style>` blocks
- No additional npm packages beyond what's in package.json
- No hard-coded `#hex` colors in JSX — always reference CSS variables
- All UI text stays in Vietnamese (preserve existing text strings exactly)
- `window.location.hash` navigation — no React Router
- lucide-react icons only — `import { IconName } from 'lucide-react'`
- Run `npm test -- --run` after every task; all 13 tests must stay green
- Font: Inter (already loaded via body CSS)

---

## File Map

| File | Action |
|---|---|
| `src/styles.css` | Full rebuild — new CSS custom properties + utility classes |
| `index.html` | Remove Material Icons `<link>` tag |
| `src/components/ui/Icon.jsx` | Create — lucide-react name→component map |
| `src/components/ui/Button.jsx` | Create — primary / secondary / ghost variants |
| `src/components/ui/Badge.jsx` | Create — success / warning / error / neutral |
| `src/components/ui/Card.jsx` | Create — base card wrapper |
| `src/components/ui/Input.jsx` | Create — styled input/textarea |
| `src/components/MaterialIcon.jsx` | Replace body with shim → Icon |
| `src/components/PropertyCard.jsx` | Full redesign |
| `src/layouts/MainLayout.jsx` | Redesign Navbar + Footer, keep all logic |
| `src/pages/HomePage.jsx` | Full rebuild — 9 sections |
| `src/pages/SearchPage.jsx` | Visual redesign, keep filter logic |
| `src/pages/PropertyDetailPage.jsx` | Visual redesign, keep data logic |
| `src/pages/BrokersPage.jsx` | Visual redesign |
| `src/pages/ProjectsPage.jsx` | Visual redesign |
| `src/pages/LoginPage.jsx` | Visual redesign, keep auth logic |
| `src/pages/UserProfilePage.jsx` | Visual redesign, keep form logic |
| `src/pages/BrokerDashboard.jsx` | Redesign sidebar + content |
| `src/pages/AdminDashboard.jsx` | Redesign sidebar + content |

---

## Task 1: CSS Design Tokens + Global Styles

**Files:**
- Modify: `frontend-react/src/styles.css` (full rebuild)
- Modify: `frontend-react/index.html` (remove Material Icons link)

**Interfaces:**
- Produces: All CSS custom properties consumed by every subsequent task

- [ ] **Step 1: Back up and clear styles.css, write new token system**

Replace the entire contents of `frontend-react/src/styles.css` with:

```css
/* ============================================================
   DESIGN TOKENS
   ============================================================ */
:root {
  /* Brand */
  --color-brand: #0A2540;
  --color-brand-mid: #1A3F6F;
  --color-accent: #16A34A;
  --color-accent-light: #DCFCE7;
  --color-accent-hover: #15803D;

  /* Backgrounds */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F8FAFC;
  --color-bg-muted: #F1F5F9;

  /* Borders */
  --color-border: #E2E8F0;
  --color-border-strong: #CBD5E1;

  /* Text */
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #94A3B8;
  --color-text-inverse: #FFFFFF;

  /* Dark sections (hero, footer, CTA) */
  --color-dark-bg: #0A2540;
  --color-dark-surface: #112B4F;
  --color-dark-border: #1E3A5F;

  /* Semantic */
  --color-success: #16A34A;
  --color-success-bg: #DCFCE7;
  --color-warning: #D97706;
  --color-warning-bg: #FEF3C7;
  --color-error: #DC2626;
  --color-error-bg: #FEE2E2;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -2px rgb(0 0 0 / 0.04);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 9999px;

  /* Layout */
  --container-max: 1200px;
  --section-py: 80px;
  --section-py-mobile: 48px;
}

/* ============================================================
   RESET & BASE
   ============================================================ */
*, *::before, *::after { box-sizing: border-box; }

html, body, #root { min-height: 100%; }

body {
  font-family: Inter, system-ui, -apple-system, sans-serif;
  background: var(--color-bg);
  color: var(--color-text-primary);
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  margin: 0;
}

a { text-decoration: none; color: inherit; }
button { cursor: pointer; border: none; background: none; font: inherit; }
img { display: block; max-width: 100%; }

/* ============================================================
   SCROLLBAR UTILITY
   ============================================================ */
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

/* ============================================================
   LAYOUT CONTAINERS
   ============================================================ */
.container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 767px) {
  .container { padding: 0 16px; }
}

.section {
  padding: var(--section-py) 0;
}

.section-subtle {
  padding: var(--section-py) 0;
  background: var(--color-bg-subtle);
}

.section-dark {
  padding: var(--section-py) 0;
  background: var(--color-dark-bg);
  color: var(--color-text-inverse);
}

@media (max-width: 767px) {
  .section, .section-subtle, .section-dark {
    padding: var(--section-py-mobile) 0;
  }
}

/* ============================================================
   TYPOGRAPHY
   ============================================================ */
.text-display {
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.text-h1 {
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.text-h2 {
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 600;
  line-height: 1.25;
}

.text-h3 {
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 600;
  line-height: 1.35;
}

.text-body-lg {
  font-size: 18px;
  line-height: 1.7;
}

.text-body {
  font-size: 16px;
  line-height: 1.65;
}

.text-sm {
  font-size: 14px;
  line-height: 1.5;
}

.text-xs {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
}

/* ============================================================
   BUTTONS
   ============================================================ */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: background 160ms ease, border-color 160ms ease,
              color 160ms ease, box-shadow 160ms ease;
  white-space: nowrap;
}

.btn-sm  { padding: 8px 16px;  font-size: 13px; min-height: 36px; }
.btn-md  { padding: 10px 20px; font-size: 14px; min-height: 44px; }
.btn-lg  { padding: 14px 28px; font-size: 16px; min-height: 52px; }

.btn-primary {
  background: var(--color-accent);
  color: #fff;
  border: 1px solid var(--color-accent);
}
.btn-primary:hover {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}

.btn-secondary {
  background: var(--color-bg);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-strong);
}
.btn-secondary:hover {
  background: var(--color-bg-subtle);
  border-color: var(--color-border-strong);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid transparent;
}
.btn-ghost:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
}

.btn-outline-white {
  background: transparent;
  color: #fff;
  border: 1px solid rgb(255 255 255 / 0.4);
}
.btn-outline-white:hover {
  background: rgb(255 255 255 / 0.1);
  border-color: #fff;
}

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
.badge-neutral { background: var(--color-bg-muted);   color: var(--color-text-secondary); }
.badge-brand   { background: var(--color-brand);      color: #fff; }
.badge-accent  { background: var(--color-accent);     color: #fff; }

/* ============================================================
   CARDS
   ============================================================ */
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 180ms ease, border-color 180ms ease;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-strong);
}

/* ============================================================
   INPUTS
   ============================================================ */
.input {
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-primary);
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.input::placeholder { color: var(--color-text-muted); }

.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgb(22 163 74 / 0.12);
}

/* ============================================================
   NAVBAR
   ============================================================ */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: rgb(255 255 255 / 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
}

.navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 64px;
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
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color 160ms ease, background 160ms ease;
}

.navbar-link:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-subtle);
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
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
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
  border-left: 1px solid var(--color-border);
}

.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 60;
  grid-template-columns: repeat(5, 1fr);
  background: rgb(255 255 255 / 0.97);
  border-top: 1px solid var(--color-border);
  backdrop-filter: blur(14px);
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
  color: var(--color-text-muted);
}

.mobile-nav-item.is-active { color: var(--color-accent); }

@media (max-width: 767px) {
  .mobile-nav { display: grid; }
  .navbar-nav { display: none; }
  .navbar-desktop-only { display: none; }
  body { padding-bottom: 60px; }
}

/* ============================================================
   FOOTER
   ============================================================ */
.footer {
  background: var(--color-dark-bg);
  color: rgb(255 255 255 / 0.8);
}

.footer-top {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 40px 0 32px;
  border-bottom: 1px solid var(--color-dark-border);
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
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.footer-link {
  display: block;
  font-size: 14px;
  color: rgb(255 255 255 / 0.65);
  padding: 3px 0;
  transition: color 160ms ease;
}

.footer-link:hover { color: #fff; }

.footer-bottom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 0;
  border-top: 1px solid var(--color-dark-border);
  font-size: 13px;
  color: rgb(255 255 255 / 0.5);
}

@media (min-width: 768px) {
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

.footer-email-input {
  flex: 1;
  min-height: 40px;
  padding: 8px 14px;
  background: rgb(255 255 255 / 0.08);
  border: 1px solid var(--color-dark-border);
  border-radius: var(--radius-md);
  color: #fff;
  font-size: 14px;
}

.footer-email-input::placeholder { color: rgb(255 255 255 / 0.4); }
.footer-email-input:focus { outline: none; border-color: var(--color-accent); }

/* ============================================================
   PROPERTY CARD
   ============================================================ */
.property-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.property-card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--color-border-strong);
  transform: translateY(-2px);
}

.property-card-image {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
}

.property-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 300ms ease;
}

.property-card:hover .property-card-image img {
  transform: scale(1.03);
}

.property-card-body {
  padding: 16px;
}

.property-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
  margin-top: 8px;
}

.property-card-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.property-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.property-card-broker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.broker-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

/* ============================================================
   HOME — HERO
   ============================================================ */
.hero {
  background: var(--color-dark-bg);
  min-height: 640px;
  display: flex;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgb(22 163 74 / 0.15) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgb(26 63 111 / 0.6) 0%, transparent 60%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgb(22 163 74 / 0.15);
  border: 1px solid rgb(22 163 74 / 0.3);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  color: #4ade80;
  margin-bottom: 24px;
}

.hero-title {
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #fff;
  margin-bottom: 20px;
}

.hero-subtitle {
  font-size: clamp(16px, 2vw, 20px);
  color: rgb(255 255 255 / 0.65);
  line-height: 1.6;
  margin-bottom: 36px;
  max-width: 560px;
  margin-left: auto;
  margin-right: auto;
}

.hero-ctas {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 48px;
}

/* ============================================================
   HOME — SEARCH BAR
   ============================================================ */
.hero-search {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  max-width: 640px;
  margin: 0 auto;
}

.hero-search-input {
  flex: 1;
  min-height: 56px;
  border: none;
  background: transparent;
  padding: 0 20px;
  font-size: 15px;
  color: var(--color-text-primary);
}

.hero-search-input::placeholder { color: var(--color-text-muted); }
.hero-search-input:focus { outline: none; }

.hero-search-btn {
  min-height: 56px;
  padding: 0 24px;
  background: var(--color-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 160ms ease;
  flex-shrink: 0;
}

.hero-search-btn:hover { background: var(--color-accent-hover); }

/* ============================================================
   HOME — STATS
   ============================================================ */
.stats-bar {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  padding: 40px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  text-align: center;
}

@media (min-width: 640px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}

.stat-number {
  font-size: 40px;
  font-weight: 700;
  color: var(--color-brand);
  line-height: 1;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

/* ============================================================
   HOME — SECTION HEADERS
   ============================================================ */
.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 40px;
}

.section-header-text h2 { color: var(--color-text-primary); margin: 0 0 6px; }
.section-header-text p  { color: var(--color-text-secondary); margin: 0; font-size: 16px; }

.section-header-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-accent);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-header-link:hover { text-decoration: underline; }

/* ============================================================
   HOME — FEATURES GRID
   ============================================================ */
.features-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 640px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .features-grid { grid-template-columns: repeat(3, 1fr); }
}

.feature-card {
  padding: 28px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: box-shadow 180ms ease;
}

.feature-card:hover { box-shadow: var(--shadow-md); }

.feature-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-accent-light);
  color: var(--color-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

/* ============================================================
   HOME — BROKERS
   ============================================================ */
.broker-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  text-align: center;
  transition: box-shadow 180ms ease;
}

.broker-card:hover { box-shadow: var(--shadow-md); }

.broker-avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  background: var(--color-brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  margin: 0 auto 12px;
}

/* ============================================================
   HOME — TESTIMONIALS
   ============================================================ */
.testimonial-card {
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 28px;
}

.testimonial-quote {
  font-size: 15px;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  font-style: italic;
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ============================================================
   GRIDS
   ============================================================ */
.grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

@media (min-width: 640px) { .grid-3 { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } }

.grid-4 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (min-width: 768px)  { .grid-4 { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .grid-4 { grid-template-columns: repeat(4, 1fr); } }

/* ============================================================
   AUTH PAGES
   ============================================================ */
.auth-shell {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-subtle);
  padding: 48px 16px;
}

.auth-card {
  width: min(100%, 480px);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  padding: 48px 40px;
}

@media (max-width: 480px) {
  .auth-card { padding: 32px 20px; border-radius: var(--radius-lg); }
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  text-align: center;
  margin: 0 0 8px;
}

.auth-subtitle {
  font-size: 15px;
  color: var(--color-text-secondary);
  text-align: center;
  margin: 0 0 32px;
}

.auth-btn {
  width: 100%;
  min-height: 48px;
  background: var(--color-accent);
  color: #fff;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 160ms ease;
}

.auth-btn:hover { background: var(--color-accent-hover); }

.auth-link {
  color: var(--color-accent);
  font-size: 14px;
  font-weight: 600;
}

.auth-link:hover { text-decoration: underline; }

.auth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
  margin: 20px 0;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border);
}

/* ============================================================
   DASHBOARD LAYOUT
   ============================================================ */
.dashboard-shell {
  display: flex;
  min-height: 100dvh;
}

.dashboard-sidebar {
  width: 240px;
  background: var(--color-dark-bg);
  color: rgb(255 255 255 / 0.8);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
}

.dashboard-sidebar-header {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--color-dark-border);
}

.dashboard-sidebar-nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: rgb(255 255 255 / 0.65);
  transition: color 160ms ease, background 160ms ease;
}

.sidebar-item:hover {
  color: #fff;
  background: rgb(255 255 255 / 0.06);
}

.sidebar-item.is-active {
  color: #fff;
  background: rgb(255 255 255 / 0.1);
  border-right: 2px solid var(--color-accent);
}

.dashboard-content {
  margin-left: 240px;
  flex: 1;
  background: var(--color-bg-subtle);
  min-height: 100dvh;
}

.dashboard-topbar {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-main {
  padding: 32px;
  max-width: 1184px;
}

.dashboard-page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 24px;
}

.dashboard-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 28px;
  overflow-x: auto;
}

.dashboard-tab {
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: color 160ms ease, border-color 160ms ease;
}

.dashboard-tab.is-active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.dashboard-tab:hover { color: var(--color-text-primary); }

.stat-card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.stat-card-number {
  font-size: 36px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.stat-card-label {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.dashboard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.dashboard-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg-subtle);
}

.dashboard-table td {
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.dashboard-table tr:last-child td { border-bottom: none; }
.dashboard-table tr:hover td { background: var(--color-bg-subtle); }

@media (max-width: 767px) {
  .dashboard-sidebar { display: none; }
  .dashboard-content { margin-left: 0; }
  .dashboard-main { padding: 16px; }
}
```

- [ ] **Step 2: Remove Material Icons from index.html**

In `frontend-react/index.html`, remove this line (or similar):
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```
Or any other Material Icons / Material Symbols font link.

- [ ] **Step 3: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass (styles don't affect DOM content tests).

- [ ] **Step 4: Commit**

```powershell
cd frontend-react
git add src/styles.css index.html
git commit -m "style: rebuild CSS with design tokens, remove Material Icons font"
```

---

## Task 2: Icon System — Icon.jsx + MaterialIcon shim

**Files:**
- Create: `frontend-react/src/components/ui/Icon.jsx`
- Modify: `frontend-react/src/components/MaterialIcon.jsx`

**Interfaces:**
- Produces: `<Icon name="MapPin" size={16} className="..." />` used by all subsequent tasks
- Produces: `<MaterialIcon>` still works as shim (maps string to lucide name)

- [ ] **Step 1: Create `src/components/ui/Icon.jsx`**

```jsx
import {
  Home, Building, Building2, Mountain, Search, MapPin, Maximize2,
  Bed, Bath, ChevronRight, ChevronDown, User, ShieldCheck,
  LayoutDashboard, Plus, IdCard, SlidersHorizontal, Sun, Moon,
  Youtube, Facebook, Twitter, Instagram, Linkedin, Ruler,
  Pencil, X, Trash2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Phone, Mail, Star, Heart, Share2, Upload, Image, FileText,
  AlertCircle, CheckCircle, Info, Clock, Filter, Grid,
  List, ChevronLeft, MoreHorizontal, LogOut, Settings,
  TrendingUp, Users, DollarSign, BarChart3, Crop,
} from 'lucide-react';

const ICON_MAP = {
  Home, Building, Building2, Mountain, Search, MapPin,
  Maximize2, Bed, Bath, ChevronRight, ChevronDown,
  User, ShieldCheck, LayoutDashboard, Plus, IdCard,
  SlidersHorizontal, Sun, Moon, Youtube, Facebook,
  Twitter, Instagram, Linkedin, Ruler, Pencil, X,
  Trash2, Check, ArrowLeft, ArrowRight, Eye, EyeOff,
  Phone, Mail, Star, Heart, Share2, Upload, Image,
  FileText, AlertCircle, CheckCircle, Info, Clock,
  Filter, Grid, List, ChevronLeft, MoreHorizontal,
  LogOut, Settings, TrendingUp, Users, DollarSign,
  BarChart3, Crop,
};

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.75 }) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} className={className} strokeWidth={strokeWidth} />;
}
```

- [ ] **Step 2: Replace MaterialIcon.jsx body with shim**

Replace the entire contents of `frontend-react/src/components/MaterialIcon.jsx`:

```jsx
import Icon from './ui/Icon.jsx';

const MATERIAL_TO_LUCIDE = {
  home: 'Home',
  home_work: 'Building2',
  landscape: 'Mountain',
  search: 'Search',
  location_on: 'MapPin',
  square_foot: 'Maximize2',
  bed: 'Bed',
  shower: 'Bath',
  crop: 'Crop',
  straighten: 'Ruler',
  chevron_right: 'ChevronRight',
  keyboard_arrow_down: 'ChevronDown',
  keyboard_arrow_left: 'ChevronLeft',
  account_circle: 'User',
  admin_panel_settings: 'ShieldCheck',
  dashboard: 'LayoutDashboard',
  add: 'Plus',
  person: 'User',
  badge: 'IdCard',
  apartment: 'Building',
  filter_list: 'SlidersHorizontal',
  light_mode: 'Sun',
  dark_mode: 'Moon',
  youtube: 'Youtube',
  facebook: 'Facebook',
  twitter: 'Twitter',
  instagram: 'Instagram',
  linkedin: 'Linkedin',
  edit: 'Pencil',
  close: 'X',
  delete: 'Trash2',
  check: 'Check',
  arrow_back: 'ArrowLeft',
  arrow_forward: 'ArrowRight',
  visibility: 'Eye',
  visibility_off: 'EyeOff',
  phone: 'Phone',
  email: 'Mail',
  star: 'Star',
  favorite: 'Heart',
  share: 'Share2',
  upload: 'Upload',
  image: 'Image',
  description: 'FileText',
  warning: 'AlertCircle',
  check_circle: 'CheckCircle',
  info: 'Info',
  schedule: 'Clock',
  logout: 'LogOut',
  settings: 'Settings',
  trending_up: 'TrendingUp',
  group: 'Users',
  payments: 'DollarSign',
  bar_chart: 'BarChart3',
  more_horiz: 'MoreHorizontal',
};

export default function MaterialIcon({ children, className = '', style }) {
  const lucideName = MATERIAL_TO_LUCIDE[children] || 'AlertCircle';
  const sizeMatch = className.match(/text-(\w+)/);
  const sizeMap = { sm: 14, base: 16, lg: 20, xl: 24, '2xl': 28 };
  const size = sizeMap[sizeMatch?.[1]] || 20;
  return <Icon name={lucideName} size={size} className={className} />;
}
```

- [ ] **Step 3: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass.

- [ ] **Step 4: Commit**

```powershell
git add src/components/ui/Icon.jsx src/components/MaterialIcon.jsx
git commit -m "feat: add lucide-react Icon wrapper, shim MaterialIcon"
```

---

## Task 3: UI Primitive Components

**Files:**
- Create: `frontend-react/src/components/ui/Button.jsx`
- Create: `frontend-react/src/components/ui/Badge.jsx`
- Create: `frontend-react/src/components/ui/Card.jsx`
- Create: `frontend-react/src/components/ui/Input.jsx`

**Interfaces:**
- Produces: `<Button variant="primary|secondary|ghost|outline-white" size="sm|md|lg">`
- Produces: `<Badge variant="success|warning|error|neutral|brand|accent">`
- Produces: `<Card className="">` — wrapper div with `.card` class
- Produces: `<Input type="text" placeholder="" value="" onChange="">` — styled input

- [ ] **Step 1: Create Button.jsx**

```jsx
export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  type = 'button',
  onClick,
  disabled,
  as: Tag = 'button',
  href,
}) {
  const cls = `btn btn-${variant} btn-${size} ${className}`.trim();
  if (Tag === 'a' || href) {
    return <a href={href} className={cls}>{children}</a>;
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create Badge.jsx**

```jsx
export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Create Card.jsx**

```jsx
export default function Card({ children, className = '', as: Tag = 'div', href, onClick }) {
  const cls = `card ${className}`.trim();
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <Tag className={cls} onClick={onClick}>{children}</Tag>;
}
```

- [ ] **Step 4: Create Input.jsx**

```jsx
export default function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  id,
  name,
  required,
  autoComplete,
  rows,
}) {
  const cls = `input ${className}`.trim();
  if (type === 'textarea') {
    return (
      <textarea
        id={id} name={name} className={cls} placeholder={placeholder}
        value={value} onChange={onChange} required={required} rows={rows || 4}
      />
    );
  }
  return (
    <input
      id={id} name={name} type={type} className={cls} placeholder={placeholder}
      value={value} onChange={onChange} required={required} autoComplete={autoComplete}
    />
  );
}
```

- [ ] **Step 5: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/components/ui/
git commit -m "feat: add Button, Badge, Card, Input primitive components"
```

---

## Task 4: PropertyCard Redesign

**Files:**
- Modify: `frontend-react/src/components/PropertyCard.jsx`

**Interfaces:**
- Consumes: `Icon` from `./ui/Icon.jsx`, `Badge` from `./ui/Badge.jsx`
- Produces: `<PropertyCard property={...} compact={bool}>` — same API, new visual

- [ ] **Step 1: Rewrite PropertyCard.jsx**

```jsx
import Icon from './ui/Icon.jsx';
import Badge from './ui/Badge.jsx';

const STATUS_VARIANT = {
  'Đang hiển thị': 'success',
  'Đã bán': 'neutral',
  'Đã thuê': 'neutral',
  'Đã ẩn': 'error',
};

export default function PropertyCard({ property, compact = false }) {
  const price = property.priceLabel || property.price;
  const location = property.address || property.location;
  const area = property.area
    ? `${property.area}${Number.isFinite(Number(property.area)) ? 'm²' : ''}`
    : property.size;
  const beds = property.bedrooms ?? property.beds;
  const baths = property.bathrooms ?? property.baths;
  const broker = property.broker?.name || property.broker;
  const brokerInitial = property.brokerInitial || broker?.charAt(0) || 'B';
  const postedAt = property.postedAt || 'Mới cập nhật';
  const href = property.id ? `#/property/${property.id}` : '#/property';
  const statusVariant = STATUS_VARIANT[property.status] || 'neutral';

  return (
    <article className="property-card">
      <a href={href} className="property-card-image">
        <img src={property.image} alt={property.title} />
        <span
          style={{
            position: 'absolute', top: 12, left: 12,
            background: 'var(--color-accent)', color: '#fff',
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            fontSize: 13, fontWeight: 700,
          }}
        >
          {price}
        </span>
        {property.status && (
          <span style={{ position: 'absolute', top: 12, right: 12 }}>
            <Badge variant={statusVariant}>{property.status}</Badge>
          </span>
        )}
      </a>
      <div className="property-card-body">
        <a href={href}>
          <h3
            style={{
              fontSize: compact ? 14 : 16,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 8px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {property.title}
          </h3>
        </a>
        <p className="property-card-meta" style={{ marginBottom: 8 }}>
          <span className="property-card-meta-item">
            <Icon name="MapPin" size={13} />
            {location}
          </span>
        </p>
        <div className="property-card-meta">
          {area && (
            <span className="property-card-meta-item">
              <Icon name="Maximize2" size={13} /> {area}
            </span>
          )}
          {beds > 0 && (
            <span className="property-card-meta-item">
              <Icon name="Bed" size={13} /> {beds}
            </span>
          )}
          {baths > 0 && (
            <span className="property-card-meta-item">
              <Icon name="Bath" size={13} /> {baths}
            </span>
          )}
        </div>
        {!compact && (
          <div className="property-card-footer">
            <div className="property-card-broker">
              <div className="broker-avatar">{brokerInitial}</div>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {broker}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {postedAt}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass.

- [ ] **Step 3: Commit**

```powershell
git add src/components/PropertyCard.jsx
git commit -m "feat: redesign PropertyCard with new design system"
```

---

## Task 5: Navbar + Footer Redesign (MainLayout)

**Files:**
- Modify: `frontend-react/src/layouts/MainLayout.jsx`

**Interfaces:**
- Consumes: `Icon` from `../components/ui/Icon.jsx`, `Button` from `../components/ui/Button.jsx`
- Produces: `<MainLayout session onLogout>`, `<Header session onLogout>`, `<Footer>`

- [ ] **Step 1: Rewrite MainLayout.jsx**

Replace the entire file:

```jsx
import { useState } from 'react';
import BrandLogo, { BRAND_NAME } from '../components/BrandLogo.jsx';
import Icon from '../components/ui/Icon.jsx';
import useTheme from '../hooks/useTheme.js';

const NAV_CATEGORIES = [
  {
    title: 'Trọ', icon: 'Home', caption: 'Giá trọ, khu vực',
    links: [{ label: 'Xem phòng trọ', href: '#/search?category=tro&transaction=rent' }],
  },
  {
    title: 'Nhà', icon: 'Building2', caption: 'Thuê nhà, mua nhà',
    links: [
      { label: 'Thuê nhà', href: '#/search?category=nha&transaction=rent' },
      { label: 'Mua nhà', href: '#/search?category=nha&transaction=sale' },
    ],
  },
  {
    title: 'Đất', icon: 'Mountain', caption: 'Thuê đất, mua đất',
    links: [
      { label: 'Thuê đất', href: '#/search?category=dat&transaction=rent' },
      { label: 'Mua đất', href: '#/search?category=dat&transaction=sale' },
    ],
  },
];

const FOOTER_COLS = [
  {
    title: 'Danh mục',
    links: [
      ['Phòng trọ', '#/search?category=tro&transaction=rent'],
      ['Nhà cho thuê', '#/search?category=nha&transaction=rent'],
      ['Nhà đất bán', '#/search?category=nha&transaction=sale'],
      ['Đất Trà Vinh', '#/search?category=dat&transaction=sale'],
    ],
  },
  {
    title: 'Công cụ',
    links: [
      ['Tìm kiếm', '#/search'],
      ['Dự án', '#/projects'],
      ['Môi giới', '#/brokers'],
      ['Đăng nhập', '#/login'],
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      ['Điều khoản sử dụng', '#/'],
      ['Chính sách bảo mật', '#/'],
      ['Liên hệ quảng cáo', '#/'],
      ['Góp ý dịch vụ', '#/'],
    ],
  },
];

export function Header({ session, onLogout }) {
  const isBroker = session?.role === 'BROKER';
  const isAdmin = session?.role === 'ADMIN';
  const isUser = session?.role === 'USER';
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <a href="#/" aria-label={BRAND_NAME} style={{ display: 'flex', alignItems: 'center' }}>
          <BrandLogo />
        </a>

        {/* Nav links */}
        <nav className="navbar-nav" aria-label="Điều hướng chính">
          <div className="navbar-dropdown">
            <button
              className="navbar-link"
              type="button"
              style={{ background: 'none', border: 'none' }}
            >
              <Icon name="SlidersHorizontal" size={16} />
              Danh mục
              <Icon name="ChevronDown" size={14} />
            </button>
            <div className="navbar-dropdown-panel">
              {NAV_CATEGORIES.map((cat, i) => (
                <div
                  key={cat.title}
                  className="navbar-dropdown-col"
                  style={i > 0 ? { borderLeft: '1px solid var(--color-border)' } : {}}
                >
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon name={cat.icon} size={18} />
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>{cat.title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>{cat.caption}</p>
                    </div>
                  </div>
                  {cat.links.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                        fontSize: 13, color: 'var(--color-text-secondary)',
                        transition: 'background 160ms, color 160ms',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                    >
                      {link.label}
                      <Icon name="ChevronRight" size={13} />
                    </a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <a className="navbar-link" href="#/projects">
            <Icon name="Building" size={16} /> Dự án
          </a>
          <a className="navbar-link" href="#/brokers">
            <Icon name="IdCard" size={16} /> Môi giới
          </a>
        </nav>

        {/* Right actions */}
        <div className="navbar-actions">
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
            style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-text-secondary)', background: 'none', border: 'none',
              cursor: 'pointer', transition: 'background 160ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-subtle)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <Icon name={isDark ? 'Sun' : 'Moon'} size={18} />
          </button>

          {!session && (
            <>
              <a href="#/login" className="btn btn-ghost btn-sm">
                <Icon name="User" size={15} /> Đăng nhập
              </a>
              <a href="#/register" className="btn btn-primary btn-sm navbar-desktop-only">
                Đăng ký
              </a>
            </>
          )}
          {isAdmin && (
            <a href="#/admin/overview" className="btn btn-ghost btn-sm navbar-desktop-only">
              <Icon name="ShieldCheck" size={15} /> Admin
            </a>
          )}
          {isBroker && (
            <>
              <a href="#/broker/dashboard" className="btn btn-ghost btn-sm navbar-desktop-only">
                <Icon name="LayoutDashboard" size={15} /> Bảng điều khiển
              </a>
              <a href="#/broker/properties" className="btn btn-primary btn-sm navbar-desktop-only">
                <Icon name="Plus" size={15} /> Đăng tin
              </a>
            </>
          )}
          {isUser && (
            <a href="#/profile" className="btn btn-ghost btn-sm navbar-desktop-only">
              <Icon name="User" size={15} /> Hồ sơ
            </a>
          )}
          {session && (
            <button type="button" onClick={onLogout} className="btn btn-ghost btn-sm">
              Đăng xuất
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const [email, setEmail] = useState('');
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <a href="#/" aria-label={BRAND_NAME} style={{ color: '#fff', display: 'flex' }}>
            <BrandLogo />
          </a>
          <div style={{ display: 'flex', gap: 8, maxWidth: 380, width: '100%' }}>
            <label htmlFor="footer-email" className="sr-only">Email nhận tin</label>
            <input
              id="footer-email"
              type="email"
              className="footer-email-input"
              placeholder="Nhập email để nhận tin mới..."
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              Theo dõi
            </button>
          </div>
        </div>

        <div className="footer-grid">
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <p className="footer-col-title">{col.title}</p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a className="footer-link" href={href}>{label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="footer-col-title">Công Tín Land</p>
            <p style={{ fontSize: 14, color: 'rgb(255 255 255 / 0.6)', lineHeight: 1.6, margin: '0 0 20px' }}>
              Cổng thông tin bất động sản Trà Vinh, kết nối khách hàng với môi giới chuyên nghiệp.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                ['Youtube', 'Youtube'], ['Facebook', 'Facebook'],
                ['Twitter', 'Twitter'], ['Instagram', 'Instagram'], ['Linkedin', 'Linkedin'],
              ].map(([icon, label]) => (
                <a
                  key={label}
                  href="#/"
                  aria-label={label}
                  style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-dark-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgb(255 255 255 / 0.6)', transition: 'color 160ms, border-color 160ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgb(255 255 255 / 0.6)'; e.currentTarget.style.borderColor = 'var(--color-dark-border)'; }}
                >
                  <Icon name={icon} size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p style={{ margin: 0 }}>{BRAND_NAME} © 2025. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Trang chủ', '#/'], ['Dự án', '#/projects'], ['Môi giới', '#/brokers']].map(([label, href]) => (
              <a key={label} className="footer-link" href={href} style={{ padding: 0 }}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function MainLayout({ children, session, onLogout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header session={session} onLogout={onLogout} />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
      <nav className="mobile-nav" aria-label="Điều hướng mobile">
        {[
          { href: '#/', icon: 'Home', label: 'Home' },
          { href: '#/search', icon: 'Search', label: 'Tìm kiếm' },
          { href: '#/projects', icon: 'Building', label: 'Dự án' },
          { href: '#/brokers', icon: 'IdCard', label: 'Môi giới' },
          {
            href: session?.role === 'BROKER' ? '#/broker/properties' : session ? '#/profile' : '#/login',
            icon: session?.role === 'BROKER' ? 'Plus' : 'User',
            label: session?.role === 'BROKER' ? 'Đăng tin' : 'Tài khoản',
          },
        ].map(item => (
          <a key={item.href} href={item.href} className="mobile-nav-item">
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass.

- [ ] **Step 3: Start dev server and visually check navbar/footer**

```powershell
cd frontend-react && npm run dev
```
Open `http://localhost:5173`. Verify: sticky navbar with logo/links/buttons, dark footer with columns.

- [ ] **Step 4: Commit**

```powershell
git add src/layouts/MainLayout.jsx
git commit -m "feat: redesign Navbar and Footer with new design system"
```

---

## Task 6: HomePage — 9 Sections

**Files:**
- Modify: `frontend-react/src/pages/HomePage.jsx`

**Interfaces:**
- Consumes: `PropertyCard`, `Icon`, `Button`, `MainLayout`
- Consumes: `fetchProperties` from `../services/api.js`
- Consumes: `featuredProperties` from `../data/templateData.js`

- [ ] **Step 1: Rewrite HomePage.jsx**

```jsx
import { useEffect, useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import Icon from '../components/ui/Icon.jsx';
import Button from '../components/ui/Button.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import { featuredProperties } from '../data/templateData.js';
import { fetchProperties } from '../services/api.js';

const STATS = [
  { number: '500+', label: 'Bất động sản' },
  { number: '50+', label: 'Môi giới chuyên nghiệp' },
  { number: '1,200+', label: 'Giao dịch thành công' },
  { number: '5+', label: 'Năm kinh nghiệm' },
];

const SERVICES = [
  {
    icon: 'Search',
    title: 'Tìm kiếm thông minh',
    desc: 'Lọc bất động sản theo khu vực, giá, diện tích và loại hình một cách dễ dàng.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Môi giới uy tín',
    desc: 'Đội ngũ môi giới được xác minh và quản lý chặt chẽ bởi Công Tín Land.',
  },
  {
    icon: 'TrendingUp',
    title: 'Thông tin thị trường',
    desc: 'Cập nhật giá cả và xu hướng thị trường bất động sản Trà Vinh liên tục.',
  },
  {
    icon: 'Phone',
    title: 'Hỗ trợ trực tiếp',
    desc: 'Kết nối ngay với môi giới qua điện thoại hoặc nhắn tin trong vài giây.',
  },
  {
    icon: 'FileText',
    title: 'Hồ sơ pháp lý rõ ràng',
    desc: 'Tất cả bất động sản đều được kiểm tra hồ sơ pháp lý trước khi đăng.',
  },
  {
    icon: 'DollarSign',
    title: 'Miễn phí cho người mua',
    desc: 'Người mua và thuê không mất phí khi sử dụng nền tảng Công Tín Land.',
  },
];

const MOCK_BROKERS = [
  { name: 'Nguyễn Văn An', area: 'TP. Trà Vinh', listings: 24, initial: 'A' },
  { name: 'Trần Thị Bình', area: 'Châu Thành', listings: 18, initial: 'B' },
  { name: 'Lê Văn Cường', area: 'Cầu Ngang', listings: 15, initial: 'C' },
  { name: 'Phạm Thị Dung', area: 'Tiểu Cần', listings: 12, initial: 'D' },
];

const TESTIMONIALS = [
  {
    quote: 'Nhờ Công Tín Land tôi tìm được nhà ưng ý trong vòng 2 tuần. Môi giới nhiệt tình, thông tin rõ ràng.',
    name: 'Chị Hoa Nguyễn',
    role: 'Khách hàng mua nhà',
  },
  {
    quote: 'Đăng tin chỉ mất 5 phút, có khách liên hệ ngay trong ngày đầu. Rất hiệu quả cho môi giới.',
    name: 'Anh Tuấn Phạm',
    role: 'Môi giới bất động sản',
  },
  {
    quote: 'Giao diện dễ dùng, lọc khu vực và giá rất tiện. Tìm được phòng trọ vừa ý chỉ sau 30 phút.',
    name: 'Bạn Minh Trần',
    role: 'Sinh viên tìm trọ',
  },
];

function HeroSearchBar() {
  const [query, setQuery] = useState('');
  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('query', query.trim());
    window.location.hash = params.toString() ? `#/search?${params}` : '#/search';
  }
  return (
    <form className="hero-search" onSubmit={handleSearch}>
      <Icon name="Search" size={18} style={{ margin: '0 0 0 20px', color: 'var(--color-text-muted)', flexShrink: 0 }} />
      <input
        className="hero-search-input"
        placeholder="Tìm theo khu vực, giá, loại bất động sản..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <button type="submit" className="hero-search-btn">
        <Icon name="Search" size={16} /> Tìm kiếm
      </button>
    </form>
  );
}

export default function HomePage({ session, onLogout }) {
  const [properties, setProperties] = useState(featuredProperties);

  useEffect(() => {
    let alive = true;
    fetchProperties({ category: 'all', transaction: 'all' })
      .then(items => { if (alive && items.length > 0) setProperties(items.slice(0, 3)); })
      .catch(() => { if (alive) setProperties(featuredProperties); });
    return () => { alive = false; };
  }, []);

  return (
    <MainLayout session={session} onLogout={onLogout}>
      {/* 1. HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-eyebrow">
              <Icon name="MapPin" size={14} />
              Bất động sản Trà Vinh
            </div>
            <h1 className="hero-title">
              Công Tín Land - tìm nhà trọ, bất động sản Trà Vinh nhanh chóng
            </h1>
            <p className="hero-subtitle">
              Kết nối người mua — người bán — môi giới uy tín. Hàng trăm bất động sản được cập nhật hằng ngày tại Trà Vinh.
            </p>
            <div className="hero-ctas">
              <Button as="a" href="#/search" variant="primary" size="lg">
                <Icon name="Search" size={18} /> Tìm bất động sản
              </Button>
              <Button as="a" href="#/brokers" variant="outline-white" size="lg">
                Xem môi giới
              </Button>
            </div>
            <HeroSearchBar />
          </div>
        </div>
      </section>

      {/* 2. STATS */}
      <div className="stats-bar">
        <div className="container">
          <div className="stats-grid">
            {STATS.map(stat => (
              <div key={stat.label}>
                <div className="stat-number">{stat.number}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. FEATURED PROPERTIES */}
      <section className="section-subtle">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Tin nổi bật</h2>
              <p>Khám phá các bất động sản tốt nhất tại Trà Vinh</p>
            </div>
            <a href="#/search" className="section-header-link">
              Xem tất cả <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <div className="grid-3">
            {properties.map((property, i) => (
              <PropertyCard key={property.id || property.title || i} property={property} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. SERVICES */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 48px' }}>
            <h2 className="text-h2" style={{ marginBottom: 12 }}>Tại sao chọn Công Tín Land?</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>
              Nền tảng bất động sản địa phương với đội ngũ môi giới được kiểm duyệt chặt chẽ.
            </p>
          </div>
          <div className="features-grid">
            {SERVICES.map(svc => (
              <div key={svc.title} className="feature-card">
                <div className="feature-icon">
                  <Icon name={svc.icon} size={22} />
                </div>
                <h3 className="text-h3" style={{ marginBottom: 8 }}>{svc.title}</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                  {svc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. BROKERS */}
      <section className="section-subtle">
        <div className="container">
          <div className="section-header">
            <div className="section-header-text">
              <h2 className="text-h2">Đội ngũ môi giới</h2>
              <p>Môi giới được xác minh và đào tạo bởi Công Tín Land</p>
            </div>
            <a href="#/brokers" className="section-header-link">
              Xem tất cả môi giới <Icon name="ArrowRight" size={15} />
            </a>
          </div>
          <div className="grid-4">
            {MOCK_BROKERS.map(broker => (
              <div key={broker.name} className="broker-card">
                <div className="broker-avatar-lg">{broker.initial}</div>
                <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px', color: 'var(--color-text-primary)' }}>
                  {broker.name}
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '0 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Icon name="MapPin" size={12} /> {broker.area}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>
                  {broker.listings} tin đăng
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto 48px' }}>
            <h2 className="text-h2" style={{ marginBottom: 12 }}>Khách hàng nói gì?</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 16 }}>
              Hàng nghìn giao dịch thành công trong 5 năm qua.
            </p>
          </div>
          <div className="grid-3">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="testimonial-card">
                <p className="testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-author">
                  <div className="broker-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                    {t.name.charAt(t.name.indexOf(' ') + 1)}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>{t.name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. DARK CTA */}
      <section className="section-dark">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
            <h2 className="text-h2" style={{ color: '#fff', marginBottom: 16 }}>
              Bắt đầu tìm bất động sản ngay hôm nay
            </h2>
            <p style={{ color: 'rgb(255 255 255 / 0.65)', fontSize: 16, marginBottom: 32 }}>
              Đăng ký miễn phí để lưu tin yêu thích và nhận thông báo khi có bất động sản mới.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button as="a" href="#/register" variant="primary" size="lg">
                Đăng ký miễn phí
              </Button>
              <Button as="a" href="#/search" variant="outline-white" size="lg">
                Khám phá ngay
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
```

- [ ] **Step 2: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass (heading "Công Tín Land - tìm nhà trọ..." and "Tin nổi bật" are preserved).

- [ ] **Step 3: Start dev server and verify**

```powershell
npm run dev
```
Open `http://localhost:5173`. Compare against `www.mintlify.com_ (1).png`. Check: dark hero, green accent, stats bar, property grid, feature cards.

- [ ] **Step 4: Commit**

```powershell
git add src/pages/HomePage.jsx
git commit -m "feat: rebuild HomePage with 9 sections, Mintlify-inspired design"
```

---

## Task 7: Secondary Public Pages (Search, PropertyDetail, Brokers, Projects)

**Files:**
- Modify: `frontend-react/src/pages/SearchPage.jsx`
- Modify: `frontend-react/src/pages/PropertyDetailPage.jsx`
- Modify: `frontend-react/src/pages/BrokersPage.jsx`
- Modify: `frontend-react/src/pages/ProjectsPage.jsx`

For each page: preserve all existing logic (data fetching, filtering, state), redesign only the JSX structure using the new CSS classes and Icon component.

- [ ] **Step 1: Read current SearchPage to understand its logic**

Read `frontend-react/src/pages/SearchPage.jsx` fully before editing.

- [ ] **Step 2: Redesign SearchPage.jsx**

Keep all state/filter logic. Replace layout with:
- Page wrapper: `<MainLayout>`
- Header section: `<div style={{ background: 'var(--color-brand)', padding: '32px 0', color: '#fff' }}>` with title "Nhà đất bán tại Trà Vinh"
- Filter bar below header: horizontal row of select/input using `.input` class
- Results: `<div data-testid="property-grid" className="grid-3">` wrapping `<PropertyCard>` items

Critical: the testid `property-grid` must remain — `App.test.jsx` checks for it.
Critical: the heading text "Nhà đất bán tại Trà Vinh" must remain.

Example structure:
```jsx
return (
  <MainLayout session={session} onLogout={onLogout}>
    <div style={{ background: 'var(--color-brand)', padding: '40px 0', color: '#fff' }}>
      <div className="container">
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Nhà đất bán tại Trà Vinh</h1>
      </div>
    </div>
    <div className="container" style={{ padding: '32px 24px' }}>
      {/* filter bar */}
      <div data-testid="property-grid" className="grid-3" style={{ marginTop: 32 }}>
        {properties.map((p, i) => <PropertyCard key={p.id || i} property={p} />)}
      </div>
    </div>
  </MainLayout>
);
```

- [ ] **Step 3: Read current BrokersPage.jsx, then redesign it**

Keep broker data fetching. Use `.grid-4` for broker cards. Keep heading "Hồ sơ môi giới Công Tín Land".

- [ ] **Step 4: Read current ProjectsPage.jsx, then redesign it**

Keep project data. Use `.grid-3` for project cards. Keep heading "Khu đô thị và dự án nổi bật".

- [ ] **Step 5: Read current PropertyDetailPage.jsx, then redesign it**

Keep all data fetching and gallery logic. Layout: `ImageGallery` full-width top, then 2-col below (info left, broker contact right at desktop).

- [ ] **Step 6: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass.

- [ ] **Step 7: Commit**

```powershell
git add src/pages/SearchPage.jsx src/pages/PropertyDetailPage.jsx \
        src/pages/BrokersPage.jsx src/pages/ProjectsPage.jsx
git commit -m "feat: redesign public secondary pages with new design system"
```

---

## Task 8: Auth + Dashboard Pages

**Files:**
- Modify: `frontend-react/src/pages/LoginPage.jsx`
- Modify: `frontend-react/src/pages/UserProfilePage.jsx`
- Modify: `frontend-react/src/pages/BrokerDashboard.jsx`
- Modify: `frontend-react/src/pages/AdminDashboard.jsx`

- [ ] **Step 1: Read current LoginPage.jsx fully before editing**

- [ ] **Step 2: Redesign LoginPage.jsx**

Keep all state/auth logic (modes: login, register, forgot). Change layout to:

```jsx
<div className="auth-shell">
  <div className="auth-card">
    <a href="#/" style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <BrandLogo />
    </a>
    <h1 className="auth-title">{title}</h1>
    <p className="auth-subtitle">{subtitle}</p>
    {/* form fields using .input class */}
    {/* submit using .auth-btn class */}
  </div>
</div>
```

Critical: preserve these exact heading texts (tested in App.test.jsx):
- Login mode: any text with button "Đăng nhập"
- Register mode: heading "Đăng ký miễn phí", button "Tạo tài khoản user"
- Forgot mode: heading "Quên mật khẩu?", button "Gửi liên kết đặt lại"

- [ ] **Step 3: Read current UserProfilePage.jsx, then redesign it**

Keep heading "Cập nhật hồ sơ". Simple form card using `.auth-card` style.

- [ ] **Step 4: Read current BrokerDashboard.jsx fully before editing**

- [ ] **Step 5: Redesign BrokerDashboard.jsx**

Keep all section/tab logic. Use `.dashboard-shell` layout:

```jsx
<div className="dashboard-shell">
  <aside className="dashboard-sidebar">
    <div className="dashboard-sidebar-header">
      <a href="#/"><BrandLogo /></a>
    </div>
    <nav className="dashboard-sidebar-nav">
      {sidebarItems.map(item => (
        <a
          key={item.href}
          href={item.href}
          className={`sidebar-item ${currentPath === item.href ? 'is-active' : ''}`}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </a>
      ))}
    </nav>
  </aside>
  <div className="dashboard-content">
    <div className="dashboard-main">
      {/* section content */}
    </div>
  </div>
</div>
```

Sidebar items for broker:
```js
[
  { href: '#/broker/dashboard', icon: 'LayoutDashboard', label: 'Bảng điều khiển' },
  { href: '#/broker/profile', icon: 'User', label: 'Hồ sơ môi giới' },
  { href: '#/broker/properties', icon: 'Building', label: 'Tin đăng của tôi' },
]
```

Critical: preserve headings (tested): "Bảng điều khiển", "Hồ sơ môi giới", "Tin đăng của tôi".

- [ ] **Step 6: Read current AdminDashboard.jsx fully before editing**

- [ ] **Step 7: Redesign AdminDashboard.jsx**

Same sidebar pattern. Sidebar items for admin:
```js
[
  { href: '#/admin/overview', icon: 'BarChart3', label: 'Tổng quan' },
  { href: '#/admin/users', icon: 'Users', label: 'Tài khoản users' },
  { href: '#/admin/brokers', icon: 'IdCard', label: 'Môi giới' },
  { href: '#/admin/properties', icon: 'Building', label: 'Bài đăng' },
]
```

Critical: preserve headings (tested): "Tổng quan", "Tài khoản users", "Môi giới", "Bài đăng".

- [ ] **Step 8: Run tests**

```powershell
cd frontend-react && npm test -- --run
```
Expected: all 13 tests pass.

- [ ] **Step 9: Start dev server and visually verify all pages**

```powershell
npm run dev
```
Navigate: `/`, `/search`, `/brokers`, `/projects`, `/login`, `/register`, `/forgot-password`.
Mock login as broker: `broker@test.com` / any password → check `/broker/dashboard`.
Mock login as admin: `admin@test.com` / any password → check `/admin/overview`.

- [ ] **Step 10: Final commit**

```powershell
git add src/pages/LoginPage.jsx src/pages/UserProfilePage.jsx \
        src/pages/BrokerDashboard.jsx src/pages/AdminDashboard.jsx
git commit -m "feat: redesign auth and dashboard pages with new design system"
```

---

## Self-Review

**Spec coverage:**
- ✅ CSS custom properties (Task 1)
- ✅ lucide-react Icon system + MaterialIcon shim (Task 2)
- ✅ Button, Badge, Card, Input primitives (Task 3)
- ✅ PropertyCard redesign (Task 4)
- ✅ Navbar + Footer (Task 5)
- ✅ HomePage 9 sections (Task 6)
- ✅ SearchPage, PropertyDetailPage, BrokersPage, ProjectsPage (Task 7)
- ✅ LoginPage, UserProfilePage, BrokerDashboard, AdminDashboard (Task 8)
- ✅ Tests must pass after every task (specified in each task)
- ✅ Screenshot + compare step in Task 6

**Placeholder scan:** No TBD, no TODO. Task 7 steps 1/3/4/5 and Task 8 steps 1/4/6 include explicit "Read before editing" steps to prevent blind rewrites.

**Type consistency:** `Icon name` prop uses PascalCase strings throughout (MapPin, not map-pin). `className` pattern `btn btn-primary btn-md` consistent across Tasks 3–8.

**Gap found and fixed:** Task 7 explicitly calls out the `data-testid="property-grid"` requirement — this was tested in App.test.jsx but easy to miss during redesign.
