# Code splitting + page metadata (client-side)

**Date**: 2026-07-17
**Branch**: `feat/code-splitting-page-meta` (based on `devnguyen`)
**Scope**: frontend only (`frontend-react/`)

## Problem

Two measured defects in the current frontend:

1. **The whole app ships as one chunk.** A `vite build` on `devnguyen` produces a single
   `index-*.js` of **386.84 kB** (114.08 kB gzip) and a single `index-*.css` of **82.33 kB**
   (13.72 kB gzip). A visitor landing on the home page to browse rooms downloads
   `AdminDashboard`, `BrokerDashboard` (1330 lines) and `Charts.jsx` (824 lines) — code they
   will never execute. Most traffic for a Trà Vinh property site is mobile.

2. **Every page reports the same title.** `document.title` appears nowhere in `src/`. Browser
   tabs, bookmarks and history all read "Công Tín Land". There are no `description` or `robots`
   meta tags, so admin, broker and login pages are as indexable as public listings.

## Goals

- Cut the JS and CSS a first-time public visitor downloads.
- Give every route a correct, descriptive `<title>` and `<meta name="description">`.
- Keep private routes (`/admin/*`, `/broker/*`, `/login`, `/forgot-password`) out of search
  indexes via `<meta name="robots" content="noindex">`.

## Non-goals (deliberately deferred)

Each of these gets its own spec:

- **Replacing the hash router** with the History API. Prerequisite for real per-listing
  indexing; `nginx.conf` already has `try_files $uri $uri/ /index.html`, so no infrastructure
  work is needed when we do it.
- **Server-rendered Open Graph tags** for Zalo/Facebook link previews. Those crawlers do not
  execute JavaScript, so OG tags added by React are invisible to them. Delivering previews
  requires a component that renders HTML per property — an architecture change, since the
  frontend is a static nginx container today. **Nothing in this spec improves Zalo/Facebook
  sharing, and it should not be described as if it does.**
- Splitting `BrokerDashboard.jsx` (1330 lines), removing the unused `react-router-dom`
  dependency, collapsing the `MaterialIcon` adapter, breaking up `styles.css` (3274 lines).

### What this spec buys, honestly

Correct browser tabs, bookmarks and history; `noindex` on private routes; and a smaller
download for public visitors. Its effect on Google ranking is modest — Google executes JS and
will see the titles, but hash URLs (`/#/property/123`) are generally treated as the same
document as `/`, so per-listing indexing stays weak until the router work lands.

## Design

### 1. Metadata module

A pure module, `src/services/pageMeta.js`, with no DOM access:

```
buildPageMeta(routeKey, data) → { title, description, robots }
```

Pure input → output, so it is developed test-first (RED → GREEN → REFACTOR) per the project's
TDD rule. It is the only business logic here; everything else is wiring.

| Route | Title | robots |
|---|---|---|
| `/` | Công Tín Land — Bất động sản Trà Vinh: nhà, đất, phòng trọ | index |
| `/search` | Tìm kiếm bất động sản — Công Tín Land | index |
| `/property/:id` | `{property title} — Công Tín Land` | index |
| `/projects` | Dự án — Công Tín Land | index |
| `/brokers` | Đội ngũ môi giới — Công Tín Land | index |
| `/login`, `/forgot-password` | Đăng nhập — Công Tín Land | noindex |
| `/broker/*` | Bảng điều khiển môi giới — Công Tín Land | noindex |
| `/admin/*` | Quản trị — Công Tín Land | noindex |

Unknown paths fall back to the home page (`resolveRoute` already does this), and so inherit the
home metadata.

### 2. Rendering the metadata

React 19.2.7 hoists `<title>`, `<meta>` and `<link>` to `<head>` from anywhere in the tree, so
no library is needed — `react-helmet` exists to solve a problem React 19 removed.

**Constraint: exactly one component may render `<title>` per route.** React hoists every
`<title>` it finds without deduplicating; two of them means two tags in `<head>` and the browser
silently uses the first. Therefore metadata is rendered **only by page-level components**, never
by `MainLayout` or any shared child.

`PropertyDetailPage` fetches its property asynchronously. Before the data arrives it renders the
generic listing title; once loaded it renders the real one. This is ordinary conditional JSX.

### 3. Code splitting

In `src/routes/index.jsx`, `AdminDashboard` and `BrokerDashboard` become
`lazy(() => import(...))`. `App.jsx` wraps `<Page />` in a single
`<Suspense fallback={<PageLoader />}>`.

`PageLoader` is a new component: a centred spinner styled with existing CSS custom properties.
No hard-coded hex, no inline styles, per the project's design rules.

Home, search and property-detail stay in the main chunk. They are the primary entry paths;
lazying them would add a round-trip for exactly the users who matter most.

**CSS follows the split.** `main.jsx` currently imports all six stylesheets eagerly.
`styles/dashboard.css` (1191 lines) serves only the broker and admin dashboards; moving its
import into the dashboard chunk lets Vite emit it as a separate CSS file that public visitors
never fetch. `main.jsx` keeps `styles.css`, `home.css`, `carousel.css`, `gallery.css` and
`detail.css` for the public flow.

`Charts.jsx` (824 lines) is imported only by dashboard code, so it follows those chunks
automatically once they are lazy — no separate treatment needed.

## Testing

- `pageMeta.test.js` — unit tests for `buildPageMeta`, written first. Covers each route key,
  the dynamic property title, and the `robots` value for private routes.
- Existing tests that render `AdminDashboard` / `BrokerDashboard` directly are unaffected: they
  import the components, not the router.
- Tests that go through `App` or `resolveRoute` may need to await the lazy import. This is the
  main known risk; it will be handled where it surfaces.
- `npm test -- --run` must be green across all existing test files.

## Success criteria

Measured, not asserted:

- `npx vite build` re-run and compared against the recorded baseline of **386.84 kB JS /
  82.33 kB CSS in one chunk**. The main chunk must shrink, with separate admin/broker chunks
  emitted.
- Every route in the table renders its stated title, verified in a running browser.
- `npm test -- --run` green.
