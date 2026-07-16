import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, ForbiddenState } from "@/components/ui";
import { getProject, listAssignableMembers } from "@/lib/actions/projects";
import { getSessionWithPermissions, roleHasPermission, tryAssertPermission } from "@/lib/rbac";
import { formatStatus } from "@/lib/utils";
import { notFound } from "next/navigation";
import { MilestoneActions } from "./MilestoneActions";
import { MilestoneTaskPanel } from "./MilestoneTaskPanel";
import { ProjectFilesPanel } from "./ProjectFilesPanel";
import { ProjectMembersPanel } from "./ProjectMembersPanel";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await tryAssertPermission("project:read");
  if (!access.ok) {
    return (
      <AppShell currentPath="/projects">
        <ForbiddenState />
      </AppShell>
    );
  }

  const [project, assignable, session] = await Promise.all([
    getProject(id).catch(() => null),
    listAssignableMembers().catch(() => []),
    getSessionWithPermissions(),
  ]);
  if (!project) notFound();

  const { permissions, workspaceRole } = session;
  const caps = {
    canApprove: roleHasPermission(permissions, "task:approve", workspaceRole),
    canVisibility: roleHasPermission(permissions, "task:visibility", workspaceRole),
    canManageMilestones: roleHasPermission(permissions, "milestone:write", workspaceRole),
    canOverride: roleHasPermission(permissions, "milestone:override", workspaceRole),
    canPayment: roleHasPermission(permissions, "payment:write", workspaceRole),
    canMemberManage: roleHasPermission(permissions, "project:member_manage", workspaceRole),
  };

  return (
    <AppShell currentPath={`/projects/${project.id}`} currentProject={{ id: project.id, name: project.name }}>
      <PageHeader
        overline={project.client.name}
        title={project.name}
        description={project.description ?? undefined}
        action={<StatusBadge status={project.status} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="overline-text text-text-darkSecondary">Milestones</h2>
          {project.milestones.map((milestone) => (
            <div key={milestone.id} className="card-dark">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-xs text-text-darkSecondary mb-1">#{milestone.sortOrder}</p>
                  <h3 className="text-white font-medium text-lg">{milestone.title}</h3>
                  <p className="text-xs text-text-darkSecondary mt-1">
                    Owner: {formatStatus(milestone.ownerRole)}
                  </p>
                </div>
                <StatusBadge status={milestone.status} />
              </div>

              <MilestoneTaskPanel
                projectId={project.id}
                milestoneId={milestone.id}
                milestoneStatus={milestone.status}
                caps={caps}
                tasks={milestone.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  clientVisible: t.clientVisible,
                  sortOrder: t.sortOrder,
                  forceUnlocked: t.forceUnlocked,
                  comments: t.comments.map((c) => ({
                    id: c.id,
                    content: c.content,
                    author: c.user.name ?? c.user.email ?? "User",
                  })),
                  reviews: t.reviews.map((r) => ({
                    id: r.id,
                    status: r.status,
                    feedback: r.feedback,
                    round: r.round,
                  })),
                }))}
              />

              <MilestoneActions
                milestoneId={milestone.id}
                status={milestone.status}
                canManageMilestones={caps.canManageMilestones}
                canOverride={caps.canOverride}
                canPayment={caps.canPayment}
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {caps.canMemberManage ? (
            <ProjectMembersPanel
              projectId={project.id}
              members={project.members}
              assignable={assignable.map((a) => ({
                userId: a.userId,
                user: a.user,
                role: a.role,
              }))}
            />
          ) : (
            <div className="card-dark">
              <h3 className="overline-text text-text-darkSecondary mb-4">Team</h3>
              <ul className="space-y-3">
                {project.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-white">{m.user.name ?? m.user.email}</span>
                    <span className="text-text-darkSecondary text-xs">{formatStatus(m.role)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card-dark">
            <h3 className="overline-text text-text-darkSecondary mb-2">Client</h3>
            <p className="text-white">{project.client.name}</p>
            <p className="text-sm text-text-darkSecondary">{project.client.email}</p>
          </div>

          <ProjectFilesPanel
            projectId={project.id}
            files={project.files.map((f) => ({
              id: f.id,
              name: f.name,
              url: f.url,
              size: f.size,
              mimeType: f.mimeType,
              clientVisible: f.clientVisible,
              createdAt: f.createdAt,
              uploadedBy: f.uploadedBy,
              milestone: f.milestone,
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
