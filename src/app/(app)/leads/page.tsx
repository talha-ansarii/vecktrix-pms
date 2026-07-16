import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { listLeads } from "@/lib/actions/leads";
import { formatDate } from "@/lib/utils";
import { ConvertLeadButton } from "./ConvertLeadButton";

export default async function LeadsPage() {
  const leads = await listLeads().catch(() => []);

  return (
    <AppShell currentPath="/leads">
      <PageHeader
        overline="Sales"
        title="Leads"
        description="Pipeline and prospect management"
      />

      {leads.length === 0 ? (
        <EmptyState title="No leads yet" description="Leads from the website intake API will appear here." />
      ) : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-darkSecondary border-b border-white/6">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Temp</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-white/6 last:border-0">
                  <td className="py-3">
                    <p className="text-white font-medium">{lead.name}</p>
                    <p className="text-text-darkSecondary text-xs">{lead.email}</p>
                  </td>
                  <td className="py-3 text-text-darkSecondary">{lead.company ?? "—"}</td>
                  <td className="py-3"><StatusBadge status={lead.status} /></td>
                  <td className="py-3"><StatusBadge status={lead.temperature} /></td>
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
    </AppShell>
  );
}
