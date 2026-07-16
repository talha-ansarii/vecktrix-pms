import { auth } from "@/auth";
import { getSessionContext } from "@/lib/rbac";
import { listProjects } from "@/lib/actions/projects";
import { SidebarShell } from "@/components/shell/SidebarShell";

export async function AppShell({
  children,
  isClient = false,
  currentPath = "/dashboard",
  currentProject,
}: {
  children: React.ReactNode;
  isClient?: boolean;
  currentPath?: string;
  currentProject?: { id: string; name: string } | null;
}) {
  const session = await auth();
  const user = {
    name: session?.user?.name,
    email: session?.user?.email,
  };

  let workspaceName = "Vecktrix Agency";
  try {
    const ctx = await getSessionContext();
    workspaceName = ctx.workspace.name;
  } catch {
    // unauthenticated pages should not use AppShell
  }

  const projects = isClient
    ? []
    : await listProjects().catch(() => []);

  return (
    <SidebarShell
      isClient={isClient}
      currentPath={currentPath}
      currentProject={currentProject ?? null}
      user={user}
      workspaceName={workspaceName}
      projects={projects.map((p) => ({
        id: p.id,
        name: p.name,
        client: p.client,
      }))}
    >
      {children}
    </SidebarShell>
  );
}
