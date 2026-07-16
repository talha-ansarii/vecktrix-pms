# Architecture

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (ported Vecktrix `@theme` tokens)
- Auth.js v5 (JWT + Prisma adapter, credentials + Google)
- Prisma 6 + **dedicated Neon Postgres** (separate from CMS)
- Vercel Blob (files), Msg91 (email notifications)
- Zod validation on server actions

## App structure

```
Vecktrix-PMS/
  .agents/           # agent context
  .cursor/skills/    # authjs-skills +
  prisma/            # PMS schema only
  public/            # bg.avif, logo.svg
  src/
    app/
      (auth)/login
      (app)/         # authenticated shells
        dashboard/
        leads/
        clients/
        projects/
        portal/      # client role
        reports/
      api/
        auth/[...nextauth]
        leads/intake  # website webhook
        leads/email-intake
    auth.ts
    auth.config.ts
    middleware.ts
    lib/prisma.ts
    lib/rbac/
    lib/services/
    components/
```

## Data boundary

- PMS `DATABASE_URL` → Neon project A
- CMS `DATABASE_URL` → Neon project B (never reuse)
- No foreign keys across apps; website → PMS via HTTP intake API only

## Auth

- JWT sessions
- Workspace membership + workspace role + optional ProjectMember role
- `assertPermission` / `assertProjectRole` on every mutation
