# Vecktrix PMS — Agent Context Index

Long-running context for AI agents implementing the Vecktrix Agency Project Management System. **Read these files at the start of every session.**

## Session Protocol (v2 rewrite — branch `pms-v2`)

**At the start of every prompt/session:**
1. Read `CURRENT_CONTEXT.md` — active micro-phase and blockers
2. Read `TODO_V2_REWRITE.md` — find the single `[~] in_progress` micro-phase
3. Implement ONLY that micro-phase scope (≤8 files, one concern)
4. Reference `DESIGN_SYSTEM.md` before any UI work

**At the end of every prompt:**
1. Mark completed checkboxes in `TODO_V2_REWRITE.md`
2. Set next micro-phase to `[~] in_progress` (only one)
3. Rewrite `CURRENT_CONTEXT.md` entirely
4. Note spec drift in `CURRENT_CONTEXT.md` if schema/RBAC changed

**Legacy v1 files** (`SESSION_HANDOFF.md`, `IMPLEMENTATION_TODO.md`) — archive only; do not edit during v2 rewrite.

**User prompt:** `Run MP-X.Y` or `Continue PMS v2 rewrite`

## File Index

| File | Purpose |
|------|---------|
| [CURRENT_CONTEXT.md](./CURRENT_CONTEXT.md) | **v2** active micro-phase + next prompt |
| [TODO_V2_REWRITE.md](./TODO_V2_REWRITE.md) | **v2** 52 micro-phase checkbox backlog |
| [WHITEBOARD_WORKFLOW.md](./WHITEBOARD_WORKFLOW.md) | Canonical whiteboard spec |
| [PHASES.md](./PHASES.md) | High-level phase roadmap (v1 archive) |
| [IMPLEMENTATION_TODO.md](./IMPLEMENTATION_TODO.md) | v1 backlog (archive) |
| [SESSION_HANDOFF.md](./SESSION_HANDOFF.md) | v1 session notes (archive) |
| [PRD.md](./PRD.md) | Product requirements |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack, folders, constraints |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Vecktrix visual DNA for PMS UI |
| [DOMAIN_MODEL.md](./DOMAIN_MODEL.md) | Entities + status machines |
| [RBAC.md](./RBAC.md) | Roles and permissions |
| [API_CONTRACTS.md](./API_CONTRACTS.md) | Server actions + lead intake |
| [SECURITY.md](./SECURITY.md) | Threat model |
| [DECISIONS.md](./DECISIONS.md) | ADR log |
| [OPEN_QUESTIONS.md](./OPEN_QUESTIONS.md) | Unresolved decisions |

## Hard Constraints

- Separate app from marketing CMS — never share CMS Neon DB or Prisma schema
- Dedicated Neon Postgres + Prisma ORM for PMS only
- UI must inherit Vecktrix website design (colors, fonts, `bg.avif`, components)
- Client reviews milestones only — never tasks
- Convert Lead → Client only (no auto Project)
- Update living todo every session / phase / requirement change

## Repo Root

```
/Users/talhaansari/Developer/Vecktrix Website/Vecktrix-PMS/
```

Planned host: `app.vecktrix.com`
