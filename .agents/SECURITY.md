# Security

## Threat model (v1)

- Client data isolation across clients
- Lead data not visible to clients
- Intake API abuse (spam leads)
- Privilege escalation via project membership
- Task comment leakage to portal

## Controls

- Separate Neon DB from CMS
- RBAC on every server action
- Row-level filters: Client role only sees own `clientId` projects
- Intake API requires shared secret + basic rate/idempotency
- `clientVisible` default false; client never gets task review/comment APIs
- Signed/private blob URLs for files (when enabled)
- No CMS credentials in PMS env
- bcrypt for credentials passwords
- JWT sessions; invite tokens single-use
