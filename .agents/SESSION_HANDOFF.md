# Session handoff

## Latest: PRD acceptance remediation (complete)

### PMS (`Vecktrix-PMS`)
- **RBAC:** Client role trimmed in seed; `assertAgencyAccess` on agency actions; permission-based nav/UI caps.
- **Portal:** `linkClientPortalUser` on invite accept + Google provision; `client` in invite roles; **Invite to portal** on Clients.
- **Delivery:** Sequential task rules in `transitionTask`/`approveTask`; milestone validation; auto-complete after client approval; PM override + payment UI; project members UI; task comments/reviews in panel.
- **Sales:** Lead filters, create, detail + activity log (`/leads/[id]`).
- **Email:** Msg91 via `src/lib/email/` (invites, milestone review, optional `SALES_NOTIFY_EMAIL`).
- **Notifications:** `lib/notifications/events.ts` wired to intake, tasks, milestones.
- **Rate limits:** Intake + email-intake APIs; CMS proxy has its own limiter.
- **E2E:** Playwright `e2e/smoke.spec.ts`, `npm run test:e2e`.
- **Docs:** `.agents/PRD_ACCEPTANCE.md`, `.env.example`, checklist updates.

### CMS (`Vecktrix`)
- `POST /api/pms-lead-intake` → PMS intake with server-only secret.
- Contact form calls PMS intake first, then EmailJS/Sheets.

### Deploy env (add)
- PMS: `MSG91_AUTH_KEY`, `MSG91_FROM_EMAIL`, optional `SALES_NOTIFY_EMAIL`
- CMS: `PMS_INTAKE_URL`, `LEAD_INTAKE_SECRET`

### Post-deploy
- Run `npm run db:seed` on production once to refresh client role permissions.
