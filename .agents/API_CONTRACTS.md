# API Contracts

## Auth

- `GET/POST /api/auth/[...nextauth]` — Auth.js handlers

## Website lead intake

`POST /api/leads/intake`

Headers: `Authorization: Bearer <LEAD_INTAKE_SECRET>` or `x-pms-intake-secret`

Body (JSON):
```json
{
  "name": "string",
  "email": "string",
  "phone": "string?",
  "company": "string?",
  "serviceInterest": "Website|Automation|RAG|SaaS_MVP|Extension|Other",
  "notes": "string?"
}
```

Behavior:
- Creates Lead `source=website`, `status=new`, `temperature=warm`
- Rate-limit friendly; idempotent on same email within 24h (return existing)
- Returns `{ id, created: boolean }`

## Email lead intake (Phase 6)

`POST /api/leads/email-intake`

Same auth secret. Creates Lead `source=email`.

## Server actions (internal)

Namespaced under `src/lib/actions/`:

- `leads.ts` — create/update/convert/list
- `clients.ts` — list/update/selfUpdate
- `projects.ts` — create/list/members
- `milestones.ts` — status transitions, submit for client, client review
- `tasks.ts` — create/approve/transition/review/visibility
- `time.ts` — log entries
- `users.ts` — invite
- `notifications.ts` — list/mark read

All mutations call RBAC asserts first.
