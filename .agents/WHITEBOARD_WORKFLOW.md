# Whiteboard workflow (v2 canonical)

Source: agency whiteboard — entities, roles, lifecycle, and rules.

## Entities

| Whiteboard | PMS v2 implementation |
|------------|----------------------|
| Admin | `agency_admin` workspace role |
| Member | `User` + `WorkspaceMember` |
| Lead | `Lead` |
| Contact | `Contact` (CRUD on lead) |
| Proposal | `Proposal` + `ProposalMilestone` + `ProposalFile` |
| Client | `Client` (Admin creates after proposal accepted) |
| Project | `Project` + `ProjectMember` + milestones + tasks |
| Payment | `Payment` (manual; Admin marks paid) |
| Audit | `ActivityLog` (unified) |

## Roles

| Role | Can | Cannot |
|------|-----|--------|
| Sales | CRUD Lead, Contact, notes | Create client/project, see delivery projects |
| Admin | + proposal, client, project+PM, mark paid | — |
| PM | Team, milestones, tasks, submit review | Create client/project |
| Designer/PE/QA | Assigned projects + tasks (with dueDate) | Unassigned projects |
| Client | Portal: published projects, review, payment CTA | Agency APIs |

## Lifecycle

1. Lead ingested → contacts + notes (`ActivityLog`)
2. Admin creates proposal with milestone outline → send → accept/reject
3. Accepted → Admin creates **Client** → **Project** + assign PM (milestones copied from proposal)
4. PM assigns team; tasks with deadlines; QA sign-off → client review
5. Client approves → Admin marks **Payment** paid → next milestone unlocks

## Rules

- Delivery roles see only `ProjectMember` projects
- Member may hold different project roles per project
- Everything logged in `ActivityLog`
- Client may have multiple concurrent published projects
- Manual payment only (mailto CTA in portal)
