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
- Project (+ ProjectMember, ProjectFile, ProjectPlanLog, ProjectPlanClientNote)
- Milestone (+ MilestoneReview)
- Task (+ TaskReview, TaskComment, TimeEntry)
- Notification
- Invite

## Convert Lead → Client

Allowed from `qualified`, `proposal`, or `won` (if not already converted). Creates Client, sets `Lead.convertedClientId`. **Does not create a Project.** Lead timeline and `LeadFile` rows stay on the lead.

## Client → Project handoff

Explicit PM/Sales action from the client card: **Create project & share proposals** wizard (`createDraftProjectFromClient`).

- New projects start **draft** (`publishedToClient = false`).
- Optional `Project.sourceLeadId`; selected `LeadFile` rows promote to `ProjectFile` (same `url`/`storageKey`, `sourceLeadFileId`, default `clientVisible: true`).
- Milestones seeded from wizard (default five), all **`locked`** until publish activates milestone 1.

## Publish to client portal

- **Publish** (`publishProjectToClient`): requires ≥1 milestone and ≥1 `ProjectFile` with `clientVisible: true`; sets `publishedToClient`, activates milestone 1 if locked; client-visible `ProjectPlanLog`.
- **Unpublish** hides project from portal again; client-visible log entry.
- Portal query returns only `publishedToClient: true` projects.

## Plan changes after publish

Agency may edit milestone plan fields (`updateMilestonePlan`); changes after first publish log to **client-visible** `ProjectPlanLog`. Clients may submit **plan concern** notes (`ProjectPlanClientNote`) — separate from milestone delivery review.

## Sequential tasks

Within a milestone, tasks ordered by `sortOrder`. Next unlocks when previous is `approved`. PM may force-unlock with audit note.
