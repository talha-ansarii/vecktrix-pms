# Vecktrix Agency PMS — PRD

## Vision

Agency delivery OS for Vecktrix: ingest and qualify leads, convert to clients, run fixed-milestone projects with sequential PM-approved tasks, and give clients a portal for progress + milestone reviews.

## Goals

1. Sales can manage leads with hot/warm/cold + money + timeline segregation
2. Website forms can create leads in PMS
3. Convert qualified leads to Clients (no auto project)
4. PM runs projects through 5 fixed milestones with role owners
5. Dynamic sub-tasks with PM approval, sequential unlock, internal reviews
6. Client portal: **published** projects only, shared files, plan updates, plan concern notes, milestone review
7. Visual identity matches vecktrix.com

## Personas

- **Agency Admin** — users, settings, all data
- **Sales** — leads, convert to client
- **Project Manager** — projects, task approval, client visibility, milestone submit
- **UX Designer** — design milestone tasks
- **Product Engineer** — development + deployment tasks
- **QA Engineer** — QA milestone tasks
- **Client** — own projects/profile, milestone review only

## Core flows

1. Lead ingest (manual Sales / website) → qualify → convert → Client
2. PM runs **Create project & share proposals** wizard from client (draft) → publish when plan + client-visible files ready → portal
3. Role creates tasks → PM approves → work → internal review → approve → next task
4. Milestone internal complete → PM submits → Client reviews → unlock next

## Non-goals (v1)

- Stripe/full accounting
- Full marketing CRM automation
- Sharing CMS database
- Auto-creating projects on convert (use explicit client-card handoff wizard instead)
- Client task-level review
- Separate visual theme
