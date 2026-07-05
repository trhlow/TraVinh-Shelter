# CLAUDE.md — Công Tín Land Project Guide

**Công Tín Land** — nền tảng bất động sản kết nối người mua/bán với đội ngũ môi giới tại Trà Vinh.  
**Tagline**: *Uy tín — Tận tâm — Hiệu quả*

---

## Quick Reference

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 8, CSS custom properties (no UI libraries) |
| Backend | Spring Boot 3, Java 21, PostgreSQL 16 |
| Testing | Vitest + Testing Library (FE), JUnit 5 + Testcontainers (BE) |
| Icons | lucide-react only |

Run: `cd frontend-react && npm run dev` (http://localhost:5173)

---

## Multi-Developer Workflow

**Team**: devlong (backend) + devnguyen (frontend)

### Branch Structure

```
main                           ← production, CI must pass before merge
├── devlong/                   ← backend integration branch (owned by devlong)
│   ├── devlong/feature-xyz    ← feature branch
│   └── devlong/fix-bug        ← bug fix branch
└── devnguyen/                 ← frontend integration branch (owned by devnguyen)
    ├── devnguyen/feature-abc  ← feature branch
    └── devnguyen/fix-style    ← style fix branch
```

### Scope & Ownership

| Developer | Workspace | Allowed Changes | Branch Pattern |
|---|---|---|---|
| **devlong** (Long) | `backend-springboot/`, shared config, docs | Java, backend logic, DB schema, `pom.xml`, `.md` | `devlong/*` |
| **devnguyen** (Nguyễn) | `frontend-react/`, shared config, docs | React, CSS, UI, `package.json`, `.md` | `devnguyen/*` |

**Shared files** (package.json, pom.xml, CLAUDE.md, docs/): Changes OK if they don't disrupt the other person's workflow.

### Workflow per Developer

1. **Create feature branch** from your dev branch:
   ```bash
   git checkout devlong              # (or devnguyen)
   git pull origin devlong           # sync
   git checkout -b devlong/feat-xyz  # create feature
   ```

2. **Commit & push** (follow conventional commits):
   ```bash
   git add <files>
   git commit -m "feat: add JWT revocation on password change"
   git push -u origin devlong/feat-xyz
   ```

3. **Create PR** (devlong/feat-xyz → devlong, or devnguyen/feat-abc → devnguyen)
   - Same review & test standards as main PRs
   - CI must pass
   - Self-review OK if small, else ask partner

4. **Merge to dev branch** (when PR approved):
   ```bash
   git checkout devlong
   git pull origin devlong
   git merge devlong/feat-xyz
   git push origin devlong
   ```

5. **Merge dev → main** (when ready to release):
   - Create PR: devlong → main (or devnguyen → main)
   - CI must pass
   - Either dev owner or partner can approve
   - Delete dev feature branch after merge

### Conflict Resolution

- **Backend ↔ Frontend conflict**: Rare. devlong handles `backend-springboot/`, devnguyen handles `frontend-react/`.
- **Shared file conflict** (package.json, CLAUDE.md, etc.): 
  - Coordinate with partner if critical
  - Safe changes (deps, docs): merge normally
  - Risky changes (config): discuss first

### Git User Identification

- `git config user.name` = "Trần Hoàng Long" → **devlong** workspace
- (devnguyen will have different git config on their machine)

I will automatically detect your identity and enforce scope rules when you commit.

---

## Rules

See **@rules/** for details:

- **design.md** — Airbnb-inspired: single accent (#ff385c), modest typography (max 28px), photography-first, no external UI libs. Dual theme (light/dark) via CSS tokens. **Exception**: `/admin/*` uses a fixed đen-tím theme (`.admin-theme` scope) that never follows the site's light/dark toggle.
- **tech-defaults.md** — Architecture, stack choices, mock API layer, auth flow, property JSONB attributes (ward, houseType, bedrooms...).
- **workflow.md** — Vietnamese UI, English code. Conventional commits. TDD mandatory for business logic. No hard-coded colors. No `inline style`.

---

## Workflow Checklist

When starting a task:

1. **Plan mode** → Use `/code-review ultra`, `/verify`, `/run`, or `/loop` as needed.
2. **TDD** (business logic) → RED → GREEN → REFACTOR.
3. **Before commit** → Run `npm test -- --run` (FE) + check Git impact.
4. **No attribution** — Exclude "Co-Authored-By" from commits.

---

## Skills (Invoke Before Doing Work)

| Skill | When |
|---|---|
| **using-superpowers** | Start of session (teaches skill priority) |
| **brainstorming** | Before any feature/component/behavior change |
| **writing-plans** | Before implementation (design approach) |
| **test-driven-development** | Implement business logic (RED → GREEN → REFACTOR) |
| **subagent-driven-development** | Execute multi-step implementation with review gates |
| **systematic-debugging** | When debugging bugs/test failures |
| **verification-before-completion** | Before claiming work is done |
| **requesting-code-review** | Before merging to main |
| **receiving-code-review** | When feedback comes in |
| **using-git-worktrees** | For parallel feature work |
| **dispatching-parallel-agents** | When multiple independent tasks exist |
| **executing-plans** | Execute a written implementation plan |
| **finishing-a-development-branch** | Decide merge/PR strategy after work complete |

---

## Recent Work

**Admin rebuild** (branch `feat/admin-custom-rebuild`, done): custom admin (đen-tím theme,
`pages/admin/`) replaces react-admin/MUI (removed). Broker got date-range filter + CSV export.
Spec: `docs/superpowers/specs/2026-07-03-admin-custom-rebuild-design.md`. Branch chờ merge.

---

## Key Files

- `.claude/CLAUDE.md` ← you are here
- `.claude/rules/design.md` — design system tokens, typography, spacing, components
- `.claude/rules/tech-defaults.md` — architecture, mock data, entity schema
- `.claude/rules/workflow.md` — lang, commits, code style, TDD, git branch naming
- `.claude/agents/` — subagent definitions (fixer, reviewer, researcher)
- `.claude/settings.json` — Claude Code harness config (models, reasoning, tools)
- `.claude/skills/` — workflow guides (read via Skill tool, not manually)

---

## Next Session Notes

This file was cleaned up (2026-07-03):
- Removed 30+ unused design/Vercel/backend/GitNexus skills (chưa dùng bao giờ)
- Deleted duplicate `CLAUDE.md` (root), `AGENTS.md` (root), `.CLAUDE.local.md`
- Kept only active workflow skills (TDD, planning, debugging, code review)
- Result: smaller context, faster responses, less confusion

If you need GitNexus MCP tools (impact analysis, rename, trace), use them directly via Bash/Skill — do NOT invoke gitnexus skill files (they were removed).
