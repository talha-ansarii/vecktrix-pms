# Domain Model — v2

## Enums / statuses

### LeadStatus
`new` → `contacted` → `qualified` | `lost` | `archived`

Proposal lifecycle is a **separate** `Proposal` entity — not a lead stage.

### ProposalStatus
`draft` → `sent` → `accepted` | `rejected`

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

### Default proposal milestones (order 0–4)

1. Requirements gathering — `project_manager`
2. Design — `ux_designer`
3. Development — `product_engineer`
4. QA — `qa_engineer`
5. Deployment — `product_engineer`

## Core entities

- Workspace
- User (+ Auth Account/Session)
- WorkspaceMember (userId, workspaceId, role)
- **Lead** (+ **Contact** many-to-one)
- **Proposal** (+ ProposalMilestone, ProposalFile) — one per lead
- **ActivityLog** — unified audit trail (replaces LeadActivity / ProjectActivity)
- Client (+ ClientUser link)
- Project (+ ProjectMember, ProjectFile, ProjectPlanClientNote)
- Milestone (+ MilestoneReview, optional `dueDate`)
- Task (+ TaskReview, TaskComment, TimeEntry, optional `dueDate`)
- **Payment** — manual payment record per milestone; Admin marks paid
- Notification
- Invite

## Sales workflow

Sales manages **leads** and **contacts** only. They cannot create clients or projects.

## Admin: Proposal → Client

1. Admin builds proposal on lead detail (milestones, files, notes).
2. Send proposal → client decision.
3. On **accepted**, Admin uses **Convert → Client** (`createClientFromProposal`).
4. Sets `Lead.convertedClientId`; lead stays `qualified`.

## Client → Project handoff

Admin action from client card: **Create project & share proposals** wizard (`createDraftProjectFromClient`).

- New projects start **draft** (`publishedToClient = false`).
- Optional `Project.sourceLeadId`; selected `ProposalFile` rows promote to `ProjectFile`.
- Milestones seeded from wizard (default five), all **`locked`** until publish activates milestone 1.

## Publish to client portal

- **Publish** (`publishProjectToClient`): requires ≥1 milestone and ≥1 `ProjectFile` with `clientVisible: true`; sets `publishedToClient`, activates milestone 1 if locked.
- **Unpublish** hides project from portal again.
- Portal query returns only `publishedToClient: true` projects.

## Plan changes after publish

Agency may edit milestone plan fields (`updateMilestonePlan`); changes after first publish log to **client-visible** `ActivityLog`. Clients may submit **plan concern** notes (`ProjectPlanClientNote`).

## Sequential tasks

Within a milestone, tasks ordered by `sortOrder`. Next unlocks when previous is `approved`. PM may force-unlock with audit note.

## Whiteboard lifecycle

See `.agents/WHITEBOARD_WORKFLOW.md`. Key runtime rules:

- **Sales** — leads/contacts only; no project list.
- **Delivery roles** — projects filtered by `ProjectMember`.
- **QA sign-off** (`qaSignedOffAt`) required before client milestone review.
- **Payment** — next milestone unlocks only when completed milestone has `Payment.status = paid` (Admin marks paid manually).
