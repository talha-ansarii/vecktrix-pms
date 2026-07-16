# RBAC

## Workspace roles

| Role | Key permissions |
|------|-----------------|
| agency_admin | `*` all |
| sales | `lead:*`, `client:read`, `client:write` (post-convert) |
| project_manager | `project:*`, `milestone:*`, `task:*`, `client:read`, `time:*` |
| ux_designer | `task:create` (design), `task:update` assigned, `task:submit_review` |
| product_engineer | `task:create` (dev/deploy), `task:update` assigned, `task:submit_review` |
| qa_engineer | `task:create` (qa), `task:update` assigned, `task:submit_review` |
| client | `portal:read`, `client:self_update`, `milestone:client_review` |

## Permission catalog

- `lead:read` `lead:write` `lead:convert`
- `client:read` `client:write` `client:self_update`
- `project:read` `project:write` `project:member_manage`
- `milestone:read` `milestone:write` `milestone:submit_client` `milestone:client_review` `milestone:override`
- `task:read` `task:create` `task:approve` `task:update` `task:review` `task:comment` `task:visibility`
- `time:read` `time:write`
- `user:invite` `user:manage`
- `report:read`
- `portal:read`
- `payment:write`

## Rules

- Client never gets `task:review` or `task:comment`
- Only PM (or admin) toggles `clientVisible`
- Only PM submits milestone for client review
- ProjectMember role scopes delivery work; workspace role gates Sales/Admin/Client portal
