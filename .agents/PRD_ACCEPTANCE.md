# PRD Acceptance Checklist

Mark items when verified by automated test or documented smoke run.

## PRD goals

| # | Goal | Status | Verification |
|---|------|--------|----------------|
| 1 | Sales lead board + segregation | Done | `e2e/leads.spec.ts`, `/leads` filters + detail |
| 2 | Website → PMS leads | Done | CMS `/api/pms-lead-intake` → PMS intake API |
| 3 | Convert → Client only | Done | `e2e/smoke.spec.ts` |
| 4 | Projects + 5 milestones | Done | `createProject` + smoke e2e |
| 5 | Tasks sequential + PM approval | Done | `tasks.ts` + project UI |
| 6 | Client portal | Done | Client invite links `Client.userId` |
| 7 | Visual DNA | Done | `public/bg.avif` + tokens |

## Security (SECURITY.md)

| Control | Status | Verification |
|---------|--------|----------------|
| Client role permissions minimal | Done | `prisma/seed.ts` client role |
| Client cannot access agency project APIs | Done | `assertAgencyAccess` |
| Intake rate limit | Done | `lib/rate-limit.ts` |
| Client row isolation on portal | Done | `getClientPortalData` by userId |

## Production smoke (PRODUCTION_CHECKLIST.md)

| Step | Test |
|------|------|
| Login admin | `e2e/smoke.spec.ts` |
| Lead → client → project | `e2e/smoke.spec.ts` |
| 5 milestones | smoke |
| Client portal visible tasks only | manual + RBAC |
| Intake API | `e2e/intake.spec.ts` |

## One-time production

After deploy, run `npm run db:seed` on fresh DB or re-seed to refresh **client** role permissions.
