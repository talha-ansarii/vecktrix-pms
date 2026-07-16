import { AppShell } from "@/components/AppShell";
import { PageHeader, StatCard, ForbiddenState } from "@/components/ui";
import { listLeads } from "@/lib/actions/leads";
import { listProjects } from "@/lib/actions/projects";
import { listClients } from "@/lib/actions/clients";
import { listNotifications, getUnreadCount } from "@/lib/actions/notifications";
import { getSessionWithPermissions, roleHasPermission, tryAssertPermission } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardPage() {
  const access = await tryAssertPermission("lead:read");
  if (!access.ok) {
    return (
      <AppShell currentPath="/dashboard">
        <ForbiddenState title="Welcome" description="Your role does not include dashboard metrics." />
      </AppShell>
    );
  }

  const { permissions, workspaceRole } = await getSessionWithPermissions();
  const canProjects = roleHasPermission(permissions, "project:read", workspaceRole);
  const canClients = roleHasPermission(permissions, "client:read", workspaceRole);

  const [leads, projects, clients, notifications, unread] = await Promise.all([
    listLeads(),
    canProjects ? listProjects() : Promise.resolve([]),
    canClients ? listClients() : Promise.resolve([]),
    listNotifications(),
    getUnreadCount(),
  ]);

  const newLeads = leads.filter((l) => l.status === "new").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  return (
    <AppShell currentPath="/dashboard">
      <PageHeader
        overline="Overview"
        title="Dashboard"
        description="Agency operations at a glance"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="New Leads" value={newLeads} sub={`${leads.length} total`} />
        {canProjects && (
          <StatCard label="Active Projects" value={activeProjects} sub={`${projects.length} total`} />
        )}
        {canClients && <StatCard label="Clients" value={clients.length} />}
        <StatCard label="Notifications" value={unread} sub="unread" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-card text-white text-xl">Recent Leads</h2>
            <Link href="/leads" className="text-sm text-text-darkSecondary hover:text-white">
              View all →
            </Link>
          </div>
          {leads.slice(0, 5).length === 0 ? (
            <p className="text-text-darkSecondary text-sm">No leads yet</p>
          ) : (
            <ul className="space-y-3">
              {leads.slice(0, 5).map((lead) => (
                <li key={lead.id} className="flex items-center justify-between border-b border-white/6 pb-3 last:border-0">
                  <div>
                    <p className="text-white font-medium">{lead.name}</p>
                    <p className="text-sm text-text-darkSecondary">{lead.email}</p>
                  </div>
                  <span className="text-xs text-text-darkSecondary">{formatDate(lead.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-card text-white text-xl">Notifications</h2>
          </div>
          {notifications.slice(0, 5).length === 0 ? (
            <p className="text-text-darkSecondary text-sm">No notifications</p>
          ) : (
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id} className={`border-b border-white/6 pb-3 last:border-0 ${!n.read ? "opacity-100" : "opacity-60"}`}>
                  <p className="text-white text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-text-darkSecondary">{n.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
