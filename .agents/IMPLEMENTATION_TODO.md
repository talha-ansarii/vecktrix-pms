# Implementation TODO (living)

Update this file every session, every phase completion, and when prompts change scope.

## Phase 0 — Spec & skills

- [x] Create `.agents` index + session protocol
- [x] PRD.md
- [x] ARCHITECTURE.md
- [x] PHASES.md
- [x] DESIGN_SYSTEM.md
- [x] DOMAIN_MODEL.md
- [x] RBAC.md
- [x] API_CONTRACTS.md
- [x] SECURITY.md
- [x] DECISIONS.md
- [x] OPEN_QUESTIONS.md
- [x] SESSION_HANDOFF.md
- [x] Copy Auth.js skill into `.cursor/skills`
- [x] Cursor rules for PMS conventions

## Phase 1 — Skeleton, visual, auth

- [x] Next.js scaffold + deps
- [x] Port `index.css` tokens + component classes
- [x] Copy `bg.avif` + `logo.svg`
- [x] Fonts: Inter, Newsreader, JetBrains Mono
- [x] Prisma schema (core auth + workspace + full domain)
- [x] Auth.js credentials + Google
- [x] RBAC seed + assert helpers
- [x] Invite user flow
- [x] App shell layouts (internal + client)
- [x] Login page with atmospheric bg

## Phase 2 — Leads & Clients

- [x] Lead CRUD + segregation fields
- [x] Sales board + filters
- [x] Lead activity log
- [x] Convert Lead → Client
- [x] Clients directory
- [x] Website intake API (`/api/leads/intake`)

## Phase 3 — Projects & Milestones

- [x] Create Project for Client
- [x] Seed 5 milestones with default roles
- [x] Project members
- [x] Milestone gating + PM override
- [x] Project hub UI

## Phase 4 — Tasks & reviews

- [x] Task create (PM / role) + PM approval
- [x] Sequential unlock
- [x] TaskReview rounds + comments
- [x] `clientVisible` toggle
- [x] Time entries

## Phase 5 — Client portal

- [x] Client dashboard (ongoing projects)
- [x] Edit client details
- [x] Milestone progress + visible tasks
- [x] MilestoneReview submit
- [x] Notifications (in-app + email stub)

## Phase 6 — Ops & production

- [x] Milestone payment status (action)
- [x] Basic reports dashboard
- [x] Email lead intake endpoint stub
- [x] Duplicate-merge note / basic email idempotency
- [x] Production checklist doc

## Phase 7 — Whiteboard alignment

- [x] WHITEBOARD_WORKFLOW.md + project scoping + QA + payment gate
- [x] Handoff PM picker + activity audit + proposal UX
- [x] `npm run test:unit` smoke for pipeline/scope
- [ ] Stripe/invoicing (optional)


- [x] Create-project UI form on clients page
- [x] Task creation UI on project detail
- [x] Time entry UI on project detail
- [x] Invite acceptance flow (`/invite/[token]`)
- [x] Email notifications via Msg91
- [x] Vercel Blob file uploads
- [x] E2E tests
