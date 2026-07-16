import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge } from "@/components/ui";
import { getProject } from "@/lib/actions/projects";
import { formatStatus } from "@/lib/utils";
import { notFound } from "next/navigation";
import { MilestoneActions } from "./MilestoneActions";
import { MilestoneTaskPanel } from "./MilestoneTaskPanel";
import { ProjectFilesPanel } from "./ProjectFilesPanel";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id).catch(() => null);
  if (!project) notFound();

  return (
    <AppShell
      currentPath={`/projects/${project.id}`}
      currentProject={{ id: project.id, name: project.name }}
    >
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
                tasks={milestone.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  clientVisible: t.clientVisible,
                  sortOrder: t.sortOrder,
                }))}
              />

              <MilestoneActions milestoneId={milestone.id} status={milestone.status} />
            </div>
          ))}
        </div>

        <div className="space-y-4">
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
