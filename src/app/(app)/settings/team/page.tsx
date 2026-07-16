import { AppShell } from "@/components/AppShell";
import { PageHeader, EmptyState } from "@/components/ui";
import { listTeamMembers, listPendingInvites } from "@/lib/actions/users";
import { formatDate, formatStatus } from "@/lib/utils";
import { InviteForm } from "./InviteForm";

export default async function TeamSettingsPage() {
  const [members, invites] = await Promise.all([
    listTeamMembers().catch(() => []),
    listPendingInvites().catch(() => []),
  ]);

  return (
    <AppShell currentPath="/settings/team">
      <PageHeader
        overline="Settings"
        title="Team"
        description="Manage workspace members and invites"
        action={<InviteForm />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-dark">
          <h2 className="heading-card text-white text-xl mb-4">Members</h2>
          {members.length === 0 ? (
            <EmptyState title="No members" />
          ) : (
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between border-b border-white/6 pb-3 last:border-0">
                  <div>
                    <p className="text-white font-medium">{m.user.name ?? "—"}</p>
                    <p className="text-sm text-text-darkSecondary">{m.user.email}</p>
                  </div>
                  <span className="text-xs text-text-darkSecondary">{formatStatus(m.role)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-dark">
          <h2 className="heading-card text-white text-xl mb-4">Pending Invites</h2>
          {invites.length === 0 ? (
            <p className="text-text-darkSecondary text-sm">No pending invites</p>
          ) : (
            <ul className="space-y-3">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between border-b border-white/6 pb-3 last:border-0">
                  <div>
                    <p className="text-white">{inv.email}</p>
                    <p className="text-xs text-text-darkSecondary">
                      {formatStatus(inv.role)} · expires {formatDate(inv.expiresAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
