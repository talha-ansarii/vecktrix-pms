# Session handoff

## Latest: Whiteboard workflow (Phase 7 — complete)

### PMS (`Vecktrix-PMS`)
- **Spec:** `.agents/WHITEBOARD_WORKFLOW.md` — canonical entities, roles, lifecycle.
- **Lead → client → project:** Convert client-only; handoff wizard; draft + publish gate; proposal sent/rejected logging.
- **Delivery:** Project list scoped by `ProjectMember`; QA sign-off before client review; payment unlocks next milestone; unified **Project activity** feed.
- **Portal:** Published projects only; plan updates; payment CTA (`NEXT_PUBLIC_BILLING_EMAIL`).
- **Tests:** `npm run test:unit` (pipeline + scope); Playwright smoke unchanged.

### Post-deploy smoke (whiteboard)
1. Lead in **qualified** → upload proposal file → stage **proposal** + timeline `proposal_sent`.
2. **Proposal rejected** → **lost** on lead.
3. Convert → client → handoff wizard (PM + files) → publish with client-visible file.
4. PM: internal complete → QA sign-off → client review → mark **paid** → next milestone unlocks.
5. Designer/PE only see assigned projects in sidebar.

### Prior: PRD acceptance remediation
- RBAC, portal invite, Msg91, notifications, intake rate limits — see git history / `PRD_ACCEPTANCE.md`.

### Deploy env
- PMS: `MSG91_*`, `BLOB_READ_WRITE_TOKEN`, optional `NEXT_PUBLIC_BILLING_EMAIL`
- CMS: `PMS_INTAKE_URL`, `LEAD_INTAKE_SECRET`

### Post-deploy
- `npm run db:push` after schema changes (e.g. `ProjectActivity`, `qaSignedOffAt`).
- Re-seed only if RBAC permissions change.
