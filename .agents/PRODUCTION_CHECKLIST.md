# Production Checklist — v2

Use this before deploying Vecktrix PMS to production.

## Environment

- [ ] `DATABASE_URL` points to **dedicated Neon Postgres** (not CMS database)
- [ ] `AUTH_SECRET` set (32+ byte random, `openssl rand -base64 32`)
- [ ] `AUTH_URL` set to **canonical** production URL (e.g. `https://www.app.vecktrix.com`) — **must not** be `http://localhost:3000` on Vercel
- [ ] `AUTH_TRUST_HOST` not required if `trustHost: true` in code (already set); still set `AUTH_URL` for OAuth callbacks
- [ ] `LEAD_INTAKE_SECRET` set and shared with Vecktrix website only
- [ ] Google OAuth credentials configured (if using Google sign-in)
- [ ] No `.env` files committed to git

## Database

- [ ] **v1 → v2 upgrade with existing data:** run in order:
  1. `npm run db:pre-migrate` (writes `.migration/v1-backup.json`, fixes lead statuses, drops legacy tables)
  2. `npm run db:push -- --accept-data-loss`
  3. `npm run db:post-migrate` (restores proposals, files, activity, payments from JSON backup)
- [ ] **Fresh database:** `npm run db:push` then `npm run db:seed`
- [ ] Admin password changed from default `Admin123!`

## Security

- [ ] HTTPS enforced (Vercel default)
- [ ] Intake API secret rotated from dev value
- [ ] RBAC verified: Sales cannot create client/project; client role cannot access task review/comment
- [ ] Row-level isolation tested for client portal
- [ ] Rate limiting on intake endpoints (Vercel WAF or middleware)
- [ ] bcrypt cost factor appropriate (12 in seed)

## Auth

- [ ] Credentials login works in production
- [ ] Google OAuth redirect URIs include production domain:
  - `https://www.app.vecktrix.com/api/auth/callback/google` (match your `AUTH_URL` host)
- [ ] Session cookies secure in production (`NODE_ENV=production`)
- [ ] Invite tokens expire after 7 days

## Integrations

- [ ] Vecktrix website contact form → `POST /api/leads/intake` (CMS: `PMS_INTAKE_URL` + `LEAD_INTAKE_SECRET`)
- [ ] Email intake webhook configured (if using)
- [x] Msg91 email (`MSG91_AUTH_KEY`, `MSG91_FROM_EMAIL`) — invites + milestone review
- [x] Vercel Blob for file uploads (when `BLOB_READ_WRITE_TOKEN` set)

## Monitoring

- [ ] Error tracking (Sentry or similar)
- [ ] Database connection pooling (Neon serverless)
- [ ] Uptime monitoring on `/login`

## Deployment (Vercel)

- [ ] Build succeeds: `npm run build`
- [ ] Unit tests pass: `npm run test:unit`
- [ ] Environment variables set in Vercel dashboard
- [ ] Custom domain configured
- [ ] `postinstall` runs `prisma generate`
- [ ] Deploy branch `pms-v2` (or merge to main)

## Post-deploy smoke test (v2 whiteboard path)

- [ ] Login with admin credentials
- [ ] Dashboard loads with stats
- [ ] **Sales** user can create lead + contacts but cannot convert client or open projects
- [ ] **Admin** creates proposal on lead → edit milestones → send → mark accepted
- [ ] Admin converts accepted proposal → **client**
- [ ] Admin runs **handoff wizard** → draft project with PM assigned
- [ ] PM adds team members; tasks with due dates show deadline badges
- [ ] Publish project → client portal sees project
- [ ] QA sign-off required before client milestone review
- [ ] Admin **marks payment paid** → next milestone unlocks
- [ ] Delivery user sees only **assigned** projects
- [ ] Client portal shows only client-visible tasks
- [ ] Intake API returns `{ id, created }` with valid secret
- [ ] Activity timeline shows unified `ActivityLog` entries on lead detail

## Automated checks

- [ ] `npm run test:e2e` (requires `DATABASE_URL` + seeded DB)
