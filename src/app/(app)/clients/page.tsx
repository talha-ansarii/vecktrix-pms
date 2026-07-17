import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader, StatusBadge, EmptyState } from "@/components/ui";
import { listClients } from "@/lib/actions/clients";
import { formatDate, cn } from "@/lib/utils";
import { CreateProjectForm } from "./CreateProjectForm";
import { ClientPortalInviteButton } from "./ClientPortalInviteButton";
import { tryAssertPermission } from "@/lib/rbac";
import { ForbiddenState } from "@/components/ui";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const access = await tryAssertPermission("client:read");
  if (!access.ok) {
    return (
      <AppShell currentPath="/clients">
        <ForbiddenState />
      </AppShell>
    );
  }

  const sp = await searchParams;
  const highlight = sp.highlight;

  const clients = await listClients();

  return (
    <AppShell currentPath="/clients">
      <PageHeader
        overline="Accounts"
        title="Clients"
        description="Converted leads and active accounts"
      />

      {clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Convert qualified leads to create clients." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <div
              key={client.id}
              id={`client-${client.id}`}
              className={cn(
                "card-dark scroll-mt-24",
                highlight === client.id && "ring-2 ring-emerald-400/60",
              )}
            >
              <h3 className="heading-card text-white text-xl mb-1">{client.name}</h3>
              {client.company && <p className="text-text-darkSecondary text-sm mb-3">{client.company}</p>}
              <p className="text-sm text-text-darkSecondary mb-4">{client.email}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-darkSecondary">
                  {client._count.projects} project{client._count.projects !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-text-darkSecondary">{formatDate(client.createdAt)}</span>
              </div>
              {client.projects.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/6 space-y-2">
                  {client.projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between text-sm hover:text-white text-text-darkSecondary"
                    >
                      <span>{p.name}</span>
                      <StatusBadge status={p.status} />
                    </Link>
                  ))}
                </div>
              )}
              <CreateProjectForm clientId={client.id} clientName={client.name} />
              <ClientPortalInviteButton clientId={client.id} hasPortalAccess={Boolean(client.userId)} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
