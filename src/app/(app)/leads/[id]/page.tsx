import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, ForbiddenState } from "@/components/ui";
import {
  getLead,
  listLeadAssigneeOptions,
} from "@/lib/actions/leads";
import { getSessionWithPermissions, roleHasPermission, tryAssertPermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { ConvertLeadButton } from "../ConvertLeadButton";
import { LeadDetailForm } from "./LeadDetailForm";
import { LeadActivityForm } from "./LeadActivityForm";
import { LeadFilesPanel } from "./LeadFilesPanel";

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
    listLeadAssigneeOptions(),
  ]);
  if (!lead) notFound();

  const showConvert =
    canConvert && ["qualified", "proposal"].includes(lead.status) && !lead.convertedClientId;

  return (
    <AppShell currentPath="/leads">
      <PageHeader
        overline="Lead"
        title={lead.name}
        description={lead.email}
        action={
          showConvert ? (
            <ConvertLeadButton leadId={lead.id} />
          ) : lead.convertedClient ? (
            <Link href={`/clients?highlight=${lead.convertedClient.id}`} className="btn-secondary-dark text-sm py-2 px-4">
              View client →
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <StatusBadge status={lead.status} />
        <StatusBadge status={lead.temperature} />
        {lead.moneyBucket && <StatusBadge status={lead.moneyBucket} />}
        {lead.timelineBucket && <StatusBadge status={lead.timelineBucket} />}
        {lead.serviceInterest && <StatusBadge status={lead.serviceInterest} />}
      </div>

      <p className="text-sm text-text-darkSecondary mb-6">
        Source: {lead.source} · Created {formatDate(lead.createdAt)}
        {lead.assignedTo && (
          <>
            {" "}
            · Owner: {lead.assignedTo.name ?? lead.assignedTo.email}
          </>
        )}
      </p>

      {lead.convertedClient && (
        <div className="card-dark mb-6 border-emerald-500/20 bg-emerald-500/5 p-4">
          <p className="text-sm text-emerald-300">
            Converted to client{" "}
            <Link href={`/clients?highlight=${lead.convertedClient.id}`} className="underline font-medium">
              {lead.convertedClient.name}
            </Link>
            . Create a project from the Clients page and send a portal invite when ready.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark p-5 sm:p-6">
          <LeadDetailForm lead={lead} assignees={assignees} canWrite={canWrite} />
        </div>

        <div className="space-y-6">
          <LeadFilesPanel leadId={lead.id} files={lead.files} canManage={canWrite} />

          <div className="card-dark p-5 sm:p-6">
            <h2 className="font-sans text-lg font-semibold text-white mb-4">Activity</h2>
            {canWrite && <LeadActivityForm leadId={lead.id} />}
            <ul className="mt-4 space-y-3">
              {lead.activities.map((a) => (
                <li key={a.id} className="border-b border-white/6 pb-3 text-sm last:border-0">
                  <p className="text-white">{a.content}</p>
                  <p className="text-xs text-text-darkSecondary mt-1">
                    {a.user?.name ?? a.user?.email ?? "System"} · {formatDate(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <Link href="/leads" className="inline-block mt-8 text-sm text-text-darkSecondary hover:text-white">
        ← Back to leads
      </Link>
    </AppShell>
  );
}
