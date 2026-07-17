# PMS v2 Rewrite — Micro-phase TODO

> One micro-phase in_progress at a time. Update after EVERY prompt.

## Status legend
- [ ] pending
- [~] in_progress ← only ONE
- [x] done

## MP-0 Bootstrap
- [x] MP-0.1 Living docs + branch
- [x] MP-0.2 Prisma auth + workspace
- [x] MP-0.3 Prisma leads + contacts
- [x] MP-0.4 Prisma proposals
- [x] MP-0.5 Prisma delivery core
- [x] MP-0.6 Prisma audit + payment + seed
- [x] MP-0.7 Domain folder scaffold
- [x] MP-0.8 ActivityLog service
- [x] MP-0.9 RBAC matrix
- [x] MP-0.10 Auth + middleware

## MP-1 Sales domain
- [x] MP-1.1 Lead domain service
- [x] MP-1.2 Lead actions + validators
- [x] MP-1.3 Leads list page
- [x] MP-1.4 Lead detail shell
- [x] MP-1.5 Contact domain service
- [x] MP-1.6 Contact UI panel
- [x] MP-1.7 Lead log via ActivityLog
- [x] MP-1.8 Activity timeline component
- [x] MP-1.9 Website intake API
- [x] MP-1.10 Lead pipeline UI

## MP-2 Proposal + Admin conversion
- [x] MP-2.1 Proposal domain service
- [x] MP-2.2 Proposal file upload
- [x] MP-2.3 ProposalMilestone editor
- [x] MP-2.4 Proposal builder UI
- [x] MP-2.5 Send proposal
- [x] MP-2.6 Accept / reject proposal
- [x] MP-2.7 Admin create client
- [x] MP-2.8 RBAC block Sales conversion
- [x] MP-2.9 Admin create project + PM
- [x] MP-2.10 Seed milestones from proposal

## MP-3 Delivery
- [x] MP-3.1 ProjectMember service
- [x] MP-3.2 Project members UI
- [x] MP-3.3 Project list scoping
- [x] MP-3.4 Project detail shell
- [x] MP-3.5 Task service + dueDate
- [x] MP-3.6 Task CRUD UI
- [x] MP-3.7 Sequential unlock + PM approve
- [x] MP-3.8 QA sign-off gate
- [x] MP-3.9 Internal complete → client review
- [x] MP-3.10 Publish to portal

## MP-4 Client portal + payments
- [x] MP-4.1 Portal data query
- [x] MP-4.2 Portal dashboard UI
- [x] MP-4.3 MilestoneReview service
- [x] MP-4.4 Client review UI
- [x] MP-4.5 Payment model service
- [x] MP-4.6 Admin mark paid
- [x] MP-4.7 Unlock next milestone
- [x] MP-4.8 Client payment CTA
- [x] MP-4.9 Client profile
- [x] MP-4.10 App shell + login

## MP-5 Hardening
- [x] MP-5.1 Role-aware dashboard
- [x] MP-5.2 Team invites
- [x] MP-5.3 Notifications stub
- [x] MP-5.4 Deadline badges (dueDate on tasks)
- [x] MP-5.5 RBAC unit tests
- [x] MP-5.6 State machine tests (pipeline)
- [x] MP-5.7 E2E whiteboard path
- [x] MP-5.8 Update v2 docs
- [x] MP-5.9 Optional migration script
- [x] MP-5.10 Production checklist

## Completed summary
| Phase | Status | Notes |
|-------|--------|-------|
| MP-0–MP-5 | complete | Full v2 rewrite on branch `pms-v2` |
