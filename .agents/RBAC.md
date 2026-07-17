# RBAC — v2 (code matrix)

Permissions are defined in `src/domain/rbac/matrix.ts` — no database Role/Permission tables.

## Workspace roles

| Role | Key permissions |
|------|-----------------|
| agency_admin | `*` all |
| sales | `lead:*`, `contact:*`, `proposal:read` — **no** client/project create |
| project_manager | `project:*`, `milestone:*`, `task:*`, `client:read`, `time:*` |
| ux_designer | `task:create` (design), `task:update` assigned, `task:submit_review` |
| product_engineer | `task:create` (dev/deploy), `task:update` assigned, `task:submit_review` |
| qa_engineer | `task:create` (qa), `task:update` assigned, `task:submit_review`, `milestone:qa_signoff` |
| client | `portal:read`, `client:self_update`, `milestone:client_review` |

## Permission catalog

- `lead:read` `lead:write`
- `contact:read` `contact:write`
- `proposal:read` `proposal:write` `proposal:send`
- `client:read` `client:write` `client:self_update`
- `project:read` `project:write` `project:member_manage`
- `milestone:read` `milestone:write` `milestone:submit_client` `milestone:client_review` `milestone:override` `milestone:qa_signoff`
- `task:read` `task:create` `task:approve` `task:update` `task:review` `task:comment` `task:visibility`
- `time:read` `time:write`
- `user:invite` `user:manage`
- `report:read`
- `portal:read`
- `payment:write`

## Rules

- Client never gets `task:review` or `task:comment`
- Only PM (or admin) toggles `clientVisible`
- Only PM submits milestone for client review (after QA sign-off)
- **Delivery visibility:** PM, Designer, PE, QA only see projects where they are `ProjectMember`; `agency_admin` sees all
- Sales has no project access (leads/contacts only)
- **Client creation** and **project handoff** are Admin-only (`agency_admin`)
- **Payment mark-paid** requires `payment:write` (Admin)

## Domain services

- `src/domain/leads/lead.service.ts` — lead CRUD + notes
- `src/domain/leads/contact.service.ts` — contact CRUD
- `src/domain/audit/log.ts` — ActivityLog writes
