import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, ForbiddenState } from "@/components/ui";
import { getLead } from "@/lib/actions/leads";
import { tryAssertPermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { ConvertLeadButton } from "../ConvertLeadButton";
import { LeadDetailForm } from "./LeadDetailForm";
import { LeadActivityForm } from "./LeadActivityForm";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await tryAssertPermission("lead:read");
  if (!access.ok) {
    return (
      <AppShell currentPath="/leads">
        <ForbiddenState />
      </AppShell>
    );
  }

  const { id } = await params;
  const lead = await getLead(id).catch(() => null);
  if (!lead) notFound();

  return (
    <AppShell currentPath="/leads">
      <PageHeader
        overline="Lead"
        title={lead.name}
        description={lead.email}
        action={
          ["qualified", "proposal"].includes(lead.status) && !lead.convertedClientId ? (
            <ConvertLeadButton leadId={lead.id} />
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark space-y-3">
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={lead.status} />
            <StatusBadge status={lead.temperature} />
            {lead.moneyBucket && <StatusBadge status={lead.moneyBucket} />}
            {lead.timelineBucket && <StatusBadge status={lead.timelineBucket} />}
          </div>
          <p className="text-sm text-text-darkSecondary">Source: {lead.source}</p>
          <p className="text-sm text-text-darkSecondary">Created {formatDate(lead.createdAt)}</p>
          <LeadDetailForm lead={lead} />
        </div>

        <div className="card-dark">
          <h2 className="heading-card text-white text-lg mb-4">Activity</h2>
          <LeadActivityForm leadId={lead.id} />
          <ul className="mt-4 space-y-3">
            {lead.activities.map((a) => (
              <li key={a.id} className="border-b border-white/6 pb-3 text-sm">
                <p className="text-white">{a.content}</p>
                <p className="text-xs text-text-darkSecondary mt-1">
                  {a.user?.name ?? a.user?.email ?? "System"} · {formatDate(a.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link href="/leads" className="inline-block mt-6 text-sm text-text-darkSecondary hover:text-white">
        ← Back to leads
      </Link>
    </AppShell>
  );
}
