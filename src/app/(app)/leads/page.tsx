import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, EmptyState, ForbiddenState } from "@/components/ui";
import { listLeads } from "@/lib/actions/leads";
import { tryAssertPermission, getSessionWithPermissions, roleHasPermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { ConvertLeadButton } from "./ConvertLeadButton";
import { CreateLeadForm } from "./CreateLeadForm";
import { LeadsFilters } from "./LeadsFilters";
import { Suspense } from "react";
import type { LeadStatus, LeadTemperature } from "@prisma/client";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const access = await tryAssertPermission("lead:read");
  if (!access.ok) {
    return (
      <AppShell currentPath="/leads">
        <ForbiddenState />
      </AppShell>
    );
  }

  const sp = await searchParams;
  const { permissions, workspaceRole } = await getSessionWithPermissions();
  const canWriteLead = roleHasPermission(permissions, "lead:write", workspaceRole);

  const leads = await listLeads({
    status: sp.status as LeadStatus | undefined,
    temperature: sp.temperature as LeadTemperature | undefined,
    moneyBucket: sp.money as "low" | "mid" | "high" | undefined,
    timelineBucket: sp.timeline as "short" | "medium" | "long" | undefined,
  });

  return (
    <AppShell currentPath="/leads">
      <PageHeader
        overline="Sales"
        title="Leads"
        description="Pipeline and prospect management"
        action={canWriteLead ? <CreateLeadForm /> : undefined}
      />

      <div className="space-y-4">
        <Suspense fallback={<div className="card-dark h-[88px] animate-pulse" />}>
          <LeadsFilters />
        </Suspense>

        {leads.length === 0 ? (
          <EmptyState
            title="No leads yet"
            description="Create a lead manually or wait for submissions from the Vecktrix website."
            action={
              canWriteLead ? <CreateLeadForm className="btn-secondary-dark text-sm py-2.5 px-5" /> : undefined
            }
          />
        ) : (
          <div className="card-dark overflow-x-auto p-4 sm:p-6">
            <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-darkSecondary border-b border-white/6">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Temp</th>
                <th className="pb-3 font-medium">Money</th>
                <th className="pb-3 font-medium">Timeline</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-white/6 last:border-0">
                  <td className="py-3">
                    <Link href={`/leads/${lead.id}`} className="text-white font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="text-text-darkSecondary text-xs">{lead.email}</p>
                  </td>
                  <td className="py-3 text-text-darkSecondary">{lead.company ?? "—"}</td>
                  <td className="py-3"><StatusBadge status={lead.status} /></td>
                  <td className="py-3"><StatusBadge status={lead.temperature} /></td>
                  <td className="py-3 text-text-darkSecondary">{lead.moneyBucket ?? "—"}</td>
                  <td className="py-3 text-text-darkSecondary">{lead.timelineBucket ?? "—"}</td>
                  <td className="py-3 text-text-darkSecondary">{lead.source}</td>
                  <td className="py-3 text-text-darkSecondary">{formatDate(lead.createdAt)}</td>
                  <td className="py-3">
                    {["qualified", "proposal"].includes(lead.status) && !lead.convertedClientId && (
                      <ConvertLeadButton leadId={lead.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </AppShell>
  );
}
