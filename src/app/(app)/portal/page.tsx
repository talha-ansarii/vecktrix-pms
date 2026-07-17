import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { getClientPortalData } from "@/lib/actions/clients";
import { formatStatus } from "@/lib/utils";
import { ClientMilestoneReview } from "./ClientMilestoneReview";
import { ClientPlanConcernForm } from "./ClientPlanConcernForm";
import { ClientMilestonePaymentBlock } from "./ClientMilestonePaymentBlock";
import { formatDate } from "@/lib/utils";

export default async function PortalPage() {
  const client = await getClientPortalData().catch(() => null);

  return (
    <AppShell isClient currentPath="/portal">
      <PageHeader
        overline="Client Portal"
        title={client?.name ?? "Your Projects"}
        description="Track milestone progress and deliverables"
      />

      {!client ? (
        <EmptyState title="No client profile" description="Contact your project manager for access." />
      ) : client.projects.length === 0 ? (
        <EmptyState title="No active projects" description="Your project manager will publish projects when ready." />
      ) : (
        <div className="space-y-8">
          {client.projects.map((project) => (
            <div key={project.id}>
              <h2 className="heading-card text-white text-2xl mb-4">{project.name}</h2>
              {project.planLogs.length > 0 && (
                <div className="card-dark mb-6">
                  <h3 className="overline-text text-text-darkSecondary mb-3">Plan updates</h3>
                  <ul className="space-y-3">
                    {project.planLogs.map((log) => (
                      <li key={log.id} className="text-sm border-b border-white/6 pb-2 last:border-0">
                        <p className="text-text-darkSecondary">{log.summary}</p>
                        <p className="text-xs text-text-darkSecondary/80 mt-1">{formatDate(log.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {project.files.length > 0 && (
                <div className="card-dark mb-6">
                  <h3 className="overline-text text-text-darkSecondary mb-3">Shared files</h3>
                  <ul className="space-y-2">
                    {project.files.map((file) => (
                      <li key={file.id}>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white hover:underline"
                        >
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-4">
                {project.milestones.map((milestone) => (
                  <div key={milestone.id} className="card-dark">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-xs text-text-darkSecondary">Milestone {milestone.sortOrder}</p>
                        <h3 className="text-white font-medium text-lg">{milestone.title}</h3>
                        {milestone.paymentStatus && (
                          <p className="text-xs text-text-darkSecondary mt-1">
                            Payment:{" "}
                            <span
                              className={
                                milestone.paymentStatus === "paid"
                                  ? "text-emerald-400"
                                  : "text-amber-300/90"
                              }
                            >
                              {formatStatus(milestone.paymentStatus)}
                            </span>
                          </p>
                        )}
                      </div>
                      <StatusBadge status={milestone.status} />
                    </div>

                    {milestone.tasks.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-white/6 pt-3">
                        {milestone.tasks.map((task) => (
                          <li key={task.id} className="flex items-center justify-between text-sm">
                            <span className="text-text-darkSecondary">{task.title}</span>
                            <StatusBadge status={task.status} />
                          </li>
                        ))}
                      </ul>
                    )}

                    {milestone.status === "awaiting_client_review" && (
                      <ClientMilestoneReview milestoneId={milestone.id} />
                    )}

                    <ClientMilestonePaymentBlock
                      milestoneTitle={milestone.title}
                      status={milestone.status}
                      paymentStatus={milestone.paymentStatus}
                    />
                  </div>
                ))}
              </div>
              <ClientPlanConcernForm projectId={project.id} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
