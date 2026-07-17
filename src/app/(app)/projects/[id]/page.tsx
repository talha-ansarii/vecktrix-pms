import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, ForbiddenState } from "@/components/ui";
import { getProject, listAssignableMembers, getProjectPublishEligibility } from "@/lib/actions/projects";
import { getSessionWithPermissions, roleHasPermission, tryAssertPermission } from "@/lib/rbac";
import { formatStatus, formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { MilestoneActions } from "./MilestoneActions";
import { MilestoneTaskPanel } from "./MilestoneTaskPanel";
import { ProjectFilesPanel } from "./ProjectFilesPanel";
import { ProjectMembersPanel } from "./ProjectMembersPanel";
import { ProjectPublishBar } from "./ProjectPublishBar";
import { MilestonePlanEditor } from "./MilestonePlanEditor";

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

  const [project, assignable, session, publishState] = await Promise.all([
    getProject(id).catch(() => null),
    listAssignableMembers().catch(() => []),
    getSessionWithPermissions(),
    getProjectPublishEligibility(id).catch(() => null),
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

      {publishState && (
        <ProjectPublishBar
          projectId={project.id}
          publishedToClient={project.publishedToClient}
          publishedAt={project.publishedAt}
          unpublishedAt={project.unpublishedAt}
          canPublish={publishState.canPublish}
          clientVisibleFileCount={publishState.clientVisibleFileCount}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="overline-text text-text-darkSecondary">Milestones</h2>
          {project.milestones.map((milestone) => (
            <div key={milestone.id} className="card-dark">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <MilestonePlanEditor
                    milestoneId={milestone.id}
                    title={milestone.title}
                    sortOrder={milestone.sortOrder}
                    ownerRole={milestone.ownerRole}
                    canEdit={caps.canManageMilestones}
                  />
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
            {project.sourceLeadId && (
              <a
                href={`/leads/${project.sourceLeadId}`}
                className="text-xs text-emerald-400/90 hover:underline mt-2 inline-block"
              >
                View source lead
              </a>
            )}
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

          <div className="card-dark">
            <h3 className="overline-text text-text-darkSecondary mb-3">Plan activity</h3>
            {project.planLogs.length === 0 && project.planClientNotes.length === 0 ? (
              <p className="text-sm text-text-darkSecondary">No plan updates yet.</p>
            ) : (
              <ul className="space-y-3 max-h-80 overflow-y-auto">
                {project.planLogs.map((log) => (
                  <li key={log.id} className="text-sm border-b border-white/6 pb-2">
                    <p className="text-white">{log.summary}</p>
                    <p className="text-xs text-text-darkSecondary mt-1">
                      {formatDate(log.createdAt)}
                      {log.actor && ` · ${log.actor.name ?? log.actor.email}`}
                      {!log.clientVisible && " · internal"}
                    </p>
                  </li>
                ))}
                {project.planClientNotes.map((note) => (
                  <li key={note.id} className="text-sm border-b border-white/6 pb-2">
                    <p className="text-amber-200/90">Client note</p>
                    <p className="text-text-darkSecondary">{note.content}</p>
                    <p className="text-xs text-text-darkSecondary mt-1">
                      {formatDate(note.createdAt)} · {note.user.name ?? note.user.email}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
