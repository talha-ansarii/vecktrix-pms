import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ForbiddenState } from "@/components/ui";
import { getLead, listLeadAssigneeOptions } from "@/lib/actions/leads";
import { getSessionWithPermissions, roleHasPermission, tryAssertPermission } from "@/lib/rbac";
import { ConvertLeadButton } from "../ConvertLeadButton";
import { LeadEditButton } from "../LeadEditButton";
import { LeadRejectProposalButton } from "../LeadRejectProposalButton";
import { LeadStatusSelect } from "../LeadStatusSelect";
import { canConvertLead } from "@/lib/leads/pipeline";
import { LeadPipelineBar } from "./LeadPipelineBar";
import { LeadConversationTimeline } from "./LeadConversationTimeline";
import { LeadTalkForm } from "./LeadTalkForm";
import { LeadSummaryCard } from "./LeadSummaryCard";
import { LeadFilesPanel } from "./LeadFilesPanel";
import { LeadDetailForm } from "./LeadDetailForm";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await tryAssertPermission("lead:read");
  if (!access.ok) {
    return (
      <AppShell currentPath="/leads">
        <ForbiddenState />
      </AppShell>
    );
  }

  const { permissions, workspaceRole } = await getSessionWithPermissions();
  const canWrite = roleHasPermission(permissions, "lead:write", workspaceRole);
  const canConvert = roleHasPermission(permissions, "lead:convert", workspaceRole);

  const { id } = await params;
  const [lead, assignees] = await Promise.all([
    getLead(id).catch(() => null),
    canWrite ? listLeadAssigneeOptions() : Promise.resolve([]),
  ]);
  if (!lead) notFound();

  const showConvert = canConvert && canConvertLead(lead.status, lead.convertedClientId);

  const timelineItems = lead.activities.map((a) => ({
    id: a.id,
    type: a.type,
    content: a.content,
    pipelineStatus: a.pipelineStatus,
    createdAt: a.createdAt.toISOString(),
    user: a.user,
  }));

  return (
    <AppShell currentPath="/leads">
      <div className="mb-6">
        <Link href="/leads" className="text-sm text-text-darkSecondary hover:text-white">
          ← All leads
        </Link>
      </div>

      <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <p className="overline-text text-text-darkSecondary mb-2">Lead workspace</p>
          <h1 className="heading-section text-white text-3xl sm:text-4xl lg:text-5xl">{lead.name}</h1>
          {lead.company && (
            <p className="body-text text-text-darkSecondary mt-2">{lead.company}</p>
          )}
          {canWrite && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-xs text-text-darkSecondary">Stage</span>
              <LeadStatusSelect leadId={lead.id} status={lead.status} className="input-dark text-sm py-2 max-w-[11rem]" />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canWrite && <LeadEditButton leadId={lead.id} />}
          {showConvert && <ConvertLeadButton leadId={lead.id} />}
          {lead.convertedClient && (
            <Link
              href={`/clients?highlight=${lead.convertedClient.id}`}
              className="btn-primary-dark text-sm py-2 px-4"
            >
              View client →
            </Link>
          )}
        </div>
      </header>

      {canWrite && lead.status === "proposal" && !lead.convertedClientId && (
        <LeadRejectProposalButton leadId={lead.id} />
      )}

      {showConvert && (
        <div className="card-dark mb-6 border-emerald-500/25 bg-emerald-500/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white font-medium">Convert to client</p>
            <p className="text-sm text-text-darkSecondary mt-1">
              Create a client record from this lead, then add a project and portal invite on the Clients page.
            </p>
          </div>
          <ConvertLeadButton leadId={lead.id} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <LeadPipelineBar currentStatus={lead.status} />
          {canWrite && <LeadTalkForm leadId={lead.id} stage={lead.status} />}
          <div>
            <h2 className="font-sans text-lg font-semibold text-white mb-4">Conversation & history</h2>
            <LeadConversationTimeline activities={timelineItems} currentStatus={lead.status} />
          </div>
        </div>

        <aside className="space-y-6 xl:max-w-[300px]">
          <LeadSummaryCard lead={lead} />
          <LeadFilesPanel leadId={lead.id} files={lead.files} canManage={canWrite} />
          {canWrite && (
            <details className="card-dark p-4 sm:p-5 group">
              <summary className="cursor-pointer text-sm font-semibold text-white list-none flex justify-between items-center">
                Edit all fields
                <span className="text-text-darkSecondary group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-4 pt-4 border-t border-white/6">
                <LeadDetailForm lead={lead} assignees={assignees} canWrite />
              </div>
            </details>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
