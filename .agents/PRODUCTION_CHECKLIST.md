# Production Checklist

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

- [ ] `npm run db:push` applied to production database
- [ ] `npm run db:seed` run once on fresh production DB
- [ ] Admin password changed from default `Admin123!`
- [ ] Prisma migrations strategy decided (currently `db push` for v1)

## Security

- [ ] HTTPS enforced (Vercel default)
- [ ] Intake API secret rotated from dev value
- [ ] RBAC verified: client role cannot access task review/comment
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

- [ ] Vecktrix website contact form → `POST /api/leads/intake`
- [ ] Email intake webhook configured (if using)
- [ ] Msg91 email notifications (when enabled)
- [ ] Vercel Blob for file uploads (when enabled)

## Monitoring

- [ ] Error tracking (Sentry or similar)
- [ ] Database connection pooling (Neon serverless)
- [ ] Uptime monitoring on `/login`

## Deployment (Vercel)

- [ ] Build succeeds: `npm run build`
- [ ] Environment variables set in Vercel dashboard
- [ ] Custom domain configured
- [ ] `postinstall` runs `prisma generate`

## Post-deploy smoke test

- [ ] Login with admin credentials
- [ ] Dashboard loads with stats
- [ ] Create lead → convert to client → create project
- [ ] 5 milestones appear on new project
- [ ] Client portal shows only client-visible tasks
- [ ] Intake API returns `{ id, created }` with valid secret
