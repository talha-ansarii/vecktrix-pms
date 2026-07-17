# Current Context — PMS v2 Rewrite

> Last updated: 2026-07-17 | Prompt: Polish gaps closed

## Active micro-phase
**ID:** MP-5.10 (polish)
**Title:** Production checklist + polish gaps
**Status:** done

## What was done this prompt
- Added `lead.service.ts` + `contact.service.ts`; actions thin-delegated to domain layer
- ProposalBuilder: full milestone editor (add/remove/reorder/save draft)
- Deadline badges: `DeadlineBadge` + `dueDate` on tasks and milestone plan editor
- Docs updated: `DOMAIN_MODEL.md`, `RBAC.md`, `PRODUCTION_CHECKLIST.md` for v2
- Unit tests: deadlines, proposal state machine
- E2E expanded: lead → proposal → accept → convert client
- Migration script: field mapping + dry-run mode

## Files changed this prompt
- `src/domain/leads/lead.service.ts`, `contact.service.ts`, `index.ts`
- `src/lib/actions/leads.ts`, `contacts.ts`
- `src/lib/deadlines.ts`, `src/components/DeadlineBadge.tsx`
- `src/app/(app)/leads/[id]/ProposalBuilder.tsx`
- `src/app/(app)/projects/[id]/MilestoneTaskPanel.tsx`, `MilestonePlanEditor.tsx`, `page.tsx`
- `e2e/whiteboard.spec.ts`, `scripts/migrate-v1-to-v2.ts`
- `.agents/DOMAIN_MODEL.md`, `RBAC.md`, `PRODUCTION_CHECKLIST.md`

## Blockers / open questions
- Run `npm run db:push` + `npm run db:seed` on target Neon DB before deploy
- Full E2E path (project → QA → pay) still manual or future e2e extension

## Next prompt should
Deploy `pms-v2` and run production smoke per `PRODUCTION_CHECKLIST.md`

## Key references
- `.agents/WHITEBOARD_WORKFLOW.md`
- `.agents/TODO_V2_REWRITE.md`
- `prisma/schema.prisma`

## Spec drift
- Lead status no longer includes `proposal`/`won` — proposal is separate entity
- Payment is `Payment` model, not `Milestone.paymentStatus`
