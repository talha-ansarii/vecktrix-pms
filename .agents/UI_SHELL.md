# PMS Platform Shell (UI)

Adapted from the **Workflow Application UI Design Document** and OpenAI-style platform chrome. Visual tokens remain in [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) (Vecktrix dark theme).

## PMS mapping

| Generic concept | Vecktrix PMS |
|-----------------|--------------|
| Organization workspace | **Vecktrix Agency** (single tenant v1; switcher is display-only) |
| Personal workspace | N/A v1 (client portal uses separate nav) |
| Project | Delivery **Project** (client engagement) |
| Workflow / Editor | **Project hub** — milestones & tasks (no DAG editor) |
| Home | `/dashboard` |
| Usage | `/reports` |
| Approvals | PM inbox on project (milestones/tasks); future dedicated queue |
| Settings | `/settings/team` |
| Client portal | `/portal` — minimal shell, no agency nav |

## Shell variants

| Route | Shell |
|-------|--------|
| `/login`, `/invite/*` | Minimal auth (no sidebar) |
| Agency routes | Sidebar + scrollable main |
| `/portal/*` | Sidebar (client nav only) |

## Sidebar anatomy (agency)

1. Project switcher + collapse toggle
2. Search (⌘K command palette)
3. **Agency** nav: Home, Leads, Clients, Projects, Usage, Team
4. **This project** (when on `/projects/[id]`): Overview
5. Footer: workspace label, account menu (sign out)

## Behaviors

- Sidebar collapse persisted in `localStorage`
- Project switcher preserves project context when switching (navigate to new project overview)
- Mobile: top bar + left sheet mirroring sidebar
- No global desktop top header — nav lives in sidebar

## Implementation

- `src/components/shell/SidebarShell.tsx` — client shell
- `src/components/AppShell.tsx` — server wrapper (session + projects)
- `src/lib/navigation.ts` — nav config
