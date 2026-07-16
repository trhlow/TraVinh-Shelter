# Nhóm 4 — Admin đen-tím theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the `/admin` area's `.admin-theme` CSS scope in line with `design.md`'s documented đen-tím
(black-purple) spec — it currently renders as a light green-on-white workspace instead.

**Architecture:** One CSS-only task. Replace `.admin-theme`'s token block in `styles.css` with the đen-tím
palette, and fix 2 hardcoded-hex classes in `dashboard.css` that would otherwise render as jarring light
boxes under the new dark canvas. No JSX changes anywhere (confirmed via grep: zero hardcoded hex in
`pages/admin/*.jsx`, every admin component already reads tokens only).

**Tech Stack:** React 19, plain CSS custom properties (no CSS-in-JS, no preprocessor).

## Global Constraints

- Conventional commits, English commit messages, no `Co-Authored-By` trailer.
- Frontend tests: `cd frontend-react && npm test -- --run`. Baseline before this plan: 164/164 — this task
  adds and removes zero tests, so it must stay 164/164 after the change.
- No hard-coded `#hex` in JSX (not applicable here — no JSX changes), no new inline styles.
- This is a pure CSS-token change with no jsdom-testable behavior (custom-property cascade from a
  stylesheet isn't computed in the test environment). No browser-automation tool exists in this
  environment — verification of the visual result is manual, by the user, after this task lands.
- Every hex value below is exact and final — do not substitute similar-looking colors.

---

### Task 1: Replace `.admin-theme` palette + fix hardcoded chip colors

**Files:**
- Modify: `frontend-react/src/styles.css` (the `.admin-theme` block)
- Modify: `frontend-react/src/styles/dashboard.css` (`.kpi-chip-navy`, `.kpi-chip-green`)

**Interfaces:** None — this is a leaf CSS change. No other task in this plan depends on it, and nothing
downstream (JSX) needs to change to consume it, since every admin component already reads
`var(--color-*)` tokens rather than literal colors.

- [ ] **Step 1: Verify no existing test depends on the values being replaced**

Run: `cd "d:/TraVinh Shelter/frontend-react" && grep -rn "#eef3ee\|#1d5a44\|#101f19" src/ --include="*.test.jsx"`

Expected: no output (zero matches). This confirms swapping these values won't turn any existing test red.
If this grep finds something, STOP and report it — do not proceed with the edit until you've read what
that test asserts.

- [ ] **Step 2: Replace the `.admin-theme` token block**

In `frontend-react/src/styles.css`, find this block (locate it by the `.admin-theme {` selector — do not
rely on the line number below, other edits earlier in this branch's history may have shifted it):

```css
/* ── Admin area: light workspace with dark green sidebar ───────────────── */
.admin-theme {
  color-scheme: light;
  --color-canvas: #ffffff;
  --color-surface-soft: #f5f6f3;
  --color-surface-strong: #eef0ea;
  --color-ink: #16211c;
  --color-body: #33403a;
  --color-muted: #6b7671;
  --color-muted-soft: #8a938d;
  --color-primary: #1d5a44;
  --color-primary-active: #165038;
  --color-primary-disabled: #b8d4c8;
  --color-on-primary: #ffffff;
  --color-hairline: #e8eae4;
  --color-hairline-soft: #f0f1ec;
  --color-border-strong: #c7ccc3;
  --color-success: #1c7a4f;
  --color-success-bg: #e4f2ea;
  --color-warning: #a9781f;
  --color-warning-bg: #fbeccb;
  --color-error: #c13515;
  --color-error-bg: #fee2e2;
  --color-sidebar-bg: #101f19;
  --shadow-card: rgba(22, 33, 28, 0.02) 0 0 0 1px,
                 rgba(22, 33, 28, 0.04) 0 2px 6px 0,
                 rgba(22, 33, 28, 0.10) 0 4px 8px 0;
  --chart-1: #1d5a44;
  background: var(--color-canvas);
  color: var(--color-body);
}
```

Replace it entirely with:

```css
/* ── Admin area: fixed đen-tím theme, never follows the site's light/dark toggle ───── */
.admin-theme {
  color-scheme: dark;
  --color-canvas: #141218;
  --color-surface-soft: #1c1a24;
  --color-surface-strong: #262331;
  --color-ink: #f2f0f6;
  --color-body: #d6d0e0;
  --color-muted: #a89fc2;
  --color-muted-soft: #7a7195;
  --color-primary: #8b5cf6;
  --color-primary-active: #7c3aed;
  --color-primary-disabled: #4c3a7a;
  --color-on-primary: #ffffff;
  --color-hairline: #2e2a3d;
  --color-hairline-soft: #211f2b;
  --color-border-strong: #453f5c;
  --color-success: #4ade80;
  --color-success-bg: #14532d;
  --color-warning: #fbbf24;
  --color-warning-bg: #78350f;
  --color-error: #f87171;
  --color-error-bg: #7f1d1d;
  --color-sidebar-bg: #1a1625;
  --shadow-card: rgba(255, 255, 255, 0.06) 0 0 0 1px,
                 rgba(0, 0, 0, 0.4) 0 2px 6px 0,
                 rgba(0, 0, 0, 0.5) 0 4px 8px 0;
  --chart-1: #8b5cf6;
  background: var(--color-canvas);
  color: var(--color-body);
}
```

- [ ] **Step 3: Fix the 2 hardcoded-hex KPI chip classes**

In `frontend-react/src/styles/dashboard.css`, find this line (search for `.kpi-chip-navy` — do not rely on
the line number below):

```css
.kpi-chip-navy   { background: #eef3ee; color: var(--color-primary); }
.kpi-chip-orange { background: rgba(217, 119, 6, 0.10); color: var(--color-warning); }
.kpi-chip-green  { background: #eef3ee; color: var(--color-primary); }
.kpi-chip-red    { background: rgba(220, 38, 38, 0.10); color: var(--color-error); }
```

Replace only the `navy` and `green` lines (leave `orange`/`red` exactly as they are — they're already
token-relative via `rgba()`, not hardcoded hex, and out of this task's scope):

```css
.kpi-chip-navy   { background: color-mix(in srgb, var(--color-primary), transparent 84%); color: var(--color-primary); }
.kpi-chip-orange { background: rgba(217, 119, 6, 0.10); color: var(--color-warning); }
.kpi-chip-green  { background: color-mix(in srgb, var(--color-primary), transparent 84%); color: var(--color-primary); }
.kpi-chip-red    { background: rgba(220, 38, 38, 0.10); color: var(--color-error); }
```

- [ ] **Step 4: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 164/164 (no tests added or removed by this task; Step 1 already confirmed nothing
references the old hex values).

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/styles.css frontend-react/src/styles/dashboard.css
git commit -m "style(admin): apply the đen-tím theme design.md specifies for /admin"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: 164/164 (unchanged — this plan adds and removes zero tests).

Manual check (no browser-automation tool available in this environment, per every prior batch this
session — report this limitation rather than claiming a visual verification that didn't happen):
`npm run dev` (mock API mode is default), log in as admin (mock: email containing "admin" → ADMIN role),
visit `/admin` and its sub-sections (Tổng quan / Môi giới / Tài khoản / Bất động sản / Lịch hẹn / Nhật ký):
- Canvas is near-black (`#141218`), sidebar is unified purple-black (`#1a1625`), primary accent (buttons,
  active nav item, links) is purple, not green.
- KPI stat-card icon chips (navy/green tone) show a soft purple tint, not a light mint box.
- Any filter `<select>` dropdown (ward/category/status) opens with a dark background and readable text.
- `/broker/*` pages are visually unchanged (still the site's normal light green+gold theme) — this theme
  change is scoped to `.admin-theme` only.
