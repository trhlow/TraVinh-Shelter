# Item 9 — Homepage banner trust-chips visibility fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the homepage hero section's 4 "trust chip" lines ("Pháp lý đã kiểm tra" etc.), which are
nearly invisible because both the section's own background and the chip text color are hardcoded hex values
tuned for the wrong contrast pairing.

**Architecture:** One CSS-only task, 2 one-line changes in the same file. No JSX changes — the DOM structure
is already correct (the hero photo never overlapped the trust chips; the bug is purely a hardcoded-color
mismatch).

**Tech Stack:** React 19, plain CSS custom properties.

## Global Constraints

- Conventional commits, English commit messages, no `Co-Authored-By` trailer.
- Frontend tests: `cd frontend-react && npm test -- --run`. Baseline before this plan: 164/164 — this task
  adds and removes zero tests, so it must stay 164/164 after the change.
- No hard-coded `#hex` in JSX (not applicable — no JSX changes), no new inline styles.
- Pure CSS-token change, no jsdom-testable behavior. No browser-automation tool exists in this environment —
  verification of the visual result is manual, by the user, after this task lands.
- Every value below is exact and final — do not substitute similar-looking colors.

---

### Task 1: Fix `.hero` background and `.hero-trust-chip` text color

**Files:**
- Modify: `frontend-react/src/styles.css` (`.hero` and `.hero-trust-chip` rules)

**Interfaces:** None — leaf CSS change, no other task depends on it.

- [ ] **Step 1: Verify no existing test depends on the values being replaced**

Run: `cd "d:/TraVinh Shelter/frontend-react" && grep -rn "#0f1c17\|#5a655e" src/ --include="*.test.jsx"`

Expected: no output (zero matches). This confirms swapping these values won't turn any existing test red.
If this grep finds something, STOP and report it — do not proceed with the edit until you've read what
that test asserts.

- [ ] **Step 2: Fix `.hero`'s background**

In `frontend-react/src/styles.css`, find the `.hero` rule (search for `.hero {` — do not rely on the line
number below, other edits earlier in this branch's history may have shifted it):

```css
.hero {
  position: relative;
  overflow: hidden;
  background: #0f1c17;
  padding: 0;
  border-bottom: none;
}
```

Change only the `background` line, to:

```css
.hero {
  position: relative;
  overflow: hidden;
  background: var(--color-canvas);
  padding: 0;
  border-bottom: none;
}
```

- [ ] **Step 3: Fix `.hero-trust-chip`'s text color**

In the same file, find the `.hero-trust-chip` rule (search for `.hero-trust-chip {`):

```css
.hero-trust-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: #5a655e;
  font-weight: 500;
}
```

Change only the `color` line, to:

```css
.hero-trust-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  color: var(--color-muted);
  font-weight: 500;
}
```

- [ ] **Step 4: Run the full frontend suite**

Run: `cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run`
Expected: PASS — 164/164 (no tests added or removed by this task; Step 1 already confirmed nothing
references the old hex values). If you see fewer than 30 test files or a "Worker exited unexpectedly"
error, this is a known flaky Vitest worker-pool crash on this machine, not a real failure — re-run the
command once more and use that result.

- [ ] **Step 5: Commit**

```bash
git add frontend-react/src/styles.css
git commit -m "fix(home): use theme tokens for hero background and trust-chip text so they stay readable"
```

---

## Final Verification

```bash
cd "d:/TraVinh Shelter/frontend-react" && npm test -- --run
```

Expected: 164/164 (unchanged — this plan adds and removes zero tests).

Manual check (no browser-automation tool available in this environment — report this limitation rather
than claiming a visual verification that didn't happen): `npm run dev` (mock API mode is default), open the
homepage (`/#/`), confirm the 4 trust-chip lines below the hero photo panel are clearly readable (dark
muted-gray text on the page's normal white background), matching `bannertrangchu.png` at the repo root.
Toggle dark mode and confirm the same area still reads correctly (near-white text implied by
`--color-muted`'s dark-mode value, on the site's dark canvas).
