# Domain Model

## Enums / statuses

### LeadStatus
`new` → `contacted` → `qualified` → `proposal` → `won` | `lost` | `archived`

### LeadTemperature
`hot` | `warm` | `cold`

### MoneyBucket / TimelineBucket
`low|mid|high` / `short|medium|long`

### LeadSource
`manual` | `website` | `email` | `other`

### MilestoneStatus
`locked` → `active` → `internal_complete` → `awaiting_client_review` → `client_approved` | `client_changes_requested` → `completed` | `blocked`

### TaskStatus
`draft` → `pending_pm_approval` → `todo` → `in_progress` → `in_review` → `changes_requested` → `approved` → `done` | `blocked` | `cancelled`

### WorkspaceRole
`agency_admin` | `sales` | `project_manager` | `ux_designer` | `product_engineer` | `qa_engineer` | `client`

### Default milestones (order 1–5)

1. Requirements gathering — `project_manager`
2. Design — `ux_designer`
3. Development — `product_engineer`
4. QA — `qa_engineer`
5. Deployment — `product_engineer`

## Core entities

- Workspace
- User (+ Auth Account/Session)
- WorkspaceMember (userId, workspaceId, role)
- Lead (+ LeadActivity)
- Client (+ ClientUser link)
- Project (+ ProjectMember)
- Milestone (+ MilestoneReview)
- Task (+ TaskReview, TaskComment, TimeEntry)
- Notification
- Invite

## Convert Lead → Client

Allowed from `qualified` or `proposal`. Creates Client, sets `Lead.convertedClientId`, status `won`. No Project.

## Sequential tasks

Within a milestone, tasks ordered by `sortOrder`. Next unlocks when previous is `approved`. PM may force-unlock with audit note.
