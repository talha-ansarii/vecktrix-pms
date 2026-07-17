import { AppShell } from "@/components/AppShell";
import { PageHeader, EmptyState, ForbiddenState } from "@/components/ui";
import { listLeads, getLeadStatusCounts } from "@/lib/actions/leads";
import { tryAssertPermission, getSessionWithPermissions, roleHasPermission } from "@/lib/rbac";
import { CreateLeadForm } from "./CreateLeadForm";
import { LeadsWorkspace } from "./LeadsWorkspace";
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
  const canConvert = roleHasPermission(permissions, "lead:convert", workspaceRole);

  const [{ counts }, leads] = await Promise.all([
    getLeadStatusCounts(),
    listLeads({
      status: sp.status as LeadStatus | undefined,
      temperature: sp.temperature as LeadTemperature | undefined,
      moneyBucket: sp.money as "low" | "mid" | "high" | undefined,
      timelineBucket: sp.timeline as "short" | "medium" | "long" | undefined,
    }),
  ]);

  const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0);

  const serialized = leads.map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company,
    status: lead.status,
    temperature: lead.temperature,
    moneyBucket: lead.moneyBucket,
    timelineBucket: lead.timelineBucket,
    source: lead.source,
    createdAt: lead.createdAt.toISOString(),
    convertedClientId: lead.convertedClientId,
    convertedClient: lead.convertedClient,
  }));

  return (
    <AppShell currentPath="/leads">
      <PageHeader
        overline="Sales"
        title="Leads"
        description="Pipeline and prospect management"
        action={canWriteLead ? <CreateLeadForm /> : undefined}
      />

      {totalLeads === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Create a lead manually or wait for submissions from the Vecktrix website."
          action={canWriteLead ? <CreateLeadForm className="btn-secondary-dark text-sm py-2.5 px-5" /> : undefined}
        />
      ) : (
        <Suspense fallback={<div className="card-dark h-32 animate-pulse" />}>
          <LeadsWorkspace
            leads={serialized}
            counts={counts}
            activeStatus={sp.status}
            canWrite={canWriteLead}
            canConvert={canConvert}
          />
        </Suspense>
      )}
    </AppShell>
  );
}
