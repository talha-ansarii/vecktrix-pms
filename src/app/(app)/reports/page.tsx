import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard } from "@/components/ui";
import { getTimeReportSummary } from "@/lib/actions/time";
import { listProjects } from "@/lib/actions/projects";
import { listLeads } from "@/lib/actions/leads";

export default async function ReportsPage() {
  const [timeSummary, projects, leads] = await Promise.all([
    getTimeReportSummary().catch(() => []),
    listProjects().catch(() => []),
    listLeads().catch(() => []),
  ]);

  const totalHours = timeSummary.reduce((sum, r) => sum + r.totalHours, 0);
  const wonLeads = leads.filter((l) => l.status === "won").length;
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  return (
    <AppShell currentPath="/reports">
      <PageHeader
        overline="Analytics"
        title="Reports"
        description="Time tracking and pipeline metrics"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Hours" value={totalHours.toFixed(1)} />
        <StatCard label="Active Projects" value={projects.filter((p) => p.status === "active").length} />
        <StatCard label="Lead Conversion" value={`${conversionRate}%`} sub={`${wonLeads} won`} />
      </div>

      <div className="card-dark">
        <h2 className="heading-card text-white text-xl mb-4">Hours by Project</h2>
        {timeSummary.length === 0 ? (
          <p className="text-text-darkSecondary text-sm">No time entries logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-darkSecondary border-b border-white/6">
                <th className="pb-3">Project</th>
                <th className="pb-3">Hours</th>
                <th className="pb-3">Entries</th>
              </tr>
            </thead>
            <tbody>
              {timeSummary.map((row) => (
                <tr key={row.projectId} className="border-b border-white/6 last:border-0">
                  <td className="py-3 text-white">{row.projectName}</td>
                  <td className="py-3 text-text-darkSecondary">{row.totalHours.toFixed(1)}h</td>
                  <td className="py-3 text-text-darkSecondary">{row.entryCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
