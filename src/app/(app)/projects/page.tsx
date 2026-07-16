import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { listProjects } from "@/lib/actions/projects";
import { formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const projects = await listProjects().catch(() => []);

  return (
    <AppShell currentPath="/projects">
      <PageHeader
        overline="Delivery"
        title="Projects"
        description="Active and planned engagements"
      />

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project from a client account." />
      ) : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-darkSecondary border-b border-white/6">
                <th className="pb-3 font-medium">Project</th>
                <th className="pb-3 font-medium">Client</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Milestones</th>
                <th className="pb-3 font-medium">Team</th>
                <th className="pb-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b border-white/6 last:border-0 hover:bg-white/2">
                  <td className="py-3">
                    <Link href={`/projects/${project.id}`} className="text-white font-medium hover:underline">
                      {project.name}
                    </Link>
                  </td>
                  <td className="py-3 text-text-darkSecondary">{project.client.name}</td>
                  <td className="py-3"><StatusBadge status={project.status} /></td>
                  <td className="py-3 text-text-darkSecondary">{project._count.milestones}</td>
                  <td className="py-3 text-text-darkSecondary">{project._count.members}</td>
                  <td className="py-3 text-text-darkSecondary">{formatDate(project.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
