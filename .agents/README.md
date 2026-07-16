# Vecktrix PMS — Agent Context Index

Long-running context for AI agents implementing the Vecktrix Agency Project Management System. **Read these files at the start of every session.**

## Session Protocol

**At the start of every prompt/session:**
1. Read `SESSION_HANDOFF.md` — what happened last session
2. Read `IMPLEMENTATION_TODO.md` — checkbox progress
3. Skim `PHASES.md` — which phase we're in
4. Reference `DESIGN_SYSTEM.md` before any UI work
5. Reference other files as needed for the current task

**At the end of every implementation session (or when user asks for phase/status update):**
1. Update `SESSION_HANDOFF.md` — completed work, next steps, blockers
2. Update `IMPLEMENTATION_TODO.md` — check/uncheck items
3. Update `PHASES.md` if a phase completed or scope shifted
4. Update `DECISIONS.md` if new ADR
5. Update `OPEN_QUESTIONS.md` if product decisions resolved

**Also update `IMPLEMENTATION_TODO.md` mid-session** when a user prompt changes requirements.

## File Index

| File | Purpose |
|------|---------|
| [PHASES.md](./PHASES.md) | High-level phase roadmap |
| [IMPLEMENTATION_TODO.md](./IMPLEMENTATION_TODO.md) | Living checkbox backlog |
| [SESSION_HANDOFF.md](./SESSION_HANDOFF.md) | Live session notes |
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
