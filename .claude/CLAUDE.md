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

## Rules

See **@rules/** for details:

- **design.md** — Airbnb-inspired: single accent (#ff385c), modest typography (max 28px), photography-first, no external UI libs. Dual theme (light/dark) via CSS tokens. **Exception**: `/admin/*` uses react-admin Material UI only (no site tokens there).
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

**Dashboard upgrade** (branch `feat/dashboard-live-charts`, done): live activity charts
(`useLiveSeries`/`LiveLineChart`), ward stats (`WardBarChart`, always 4 phường), and
admin self-lock guard in `/admin` user list. Plan executed from
`~/.claude/plans/t-i-c-th-c-hi-n-serialized-axolotl.md`.

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
