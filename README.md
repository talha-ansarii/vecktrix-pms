# Vecktrix Agency PMS

Project Management System for Vecktrix Agency — leads, clients, projects, milestones, tasks, and client portal.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** (Vecktrix design tokens)
- **Auth.js v5** (credentials + Google OAuth)
- **Prisma 6** + Neon Postgres
- **Zod** validation on server actions

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Neon DATABASE_URL and AUTH_SECRET

# 3. Push schema and seed
npm run db:push
npm run db:seed

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with:

- **Email:** `vecktrixai@gmail.com`
- **Password:** `Admin123!`

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed permissions, roles, workspace |
| `npm run db:studio` | Open Prisma Studio |

## API endpoints

### Lead intake (website webhook)

```bash
POST /api/leads/intake
Authorization: Bearer <LEAD_INTAKE_SECRET>
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "company": "Acme Inc",
  "serviceInterest": "Website"
}
```

### Email lead intake

```bash
POST /api/leads/email-intake
Authorization: Bearer <LEAD_INTAKE_SECRET>

{
  "from": "lead@example.com",
  "subject": "Project inquiry",
  "body": "We need a website..."
}
```

## Project structure

```
src/
  app/
    (app)/          # Authenticated pages
    api/            # Auth + lead intake routes
    login/          # Login page
  auth.ts           # Auth.js config
  lib/
    actions/        # Server actions (RBAC-gated)
    rbac/           # Permission assertions
    services/       # Domain helpers
prisma/
  schema.prisma     # Full domain model
  seed.ts           # Initial data
.agents/            # Agent context docs
```

## Key rules

- Clients cannot review or comment on tasks
- Lead → Client conversion only (no auto-project)
- 5 default milestones seeded on project create
- Separate Neon database from Vecktrix CMS

## Documentation

See `.agents/` for PRD, architecture, RBAC, domain model, and implementation status.
