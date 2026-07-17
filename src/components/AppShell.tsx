import { auth } from "@/auth";
import {
  getSessionContext,
  getUserPermissions,
  roleHasPermission,
} from "@/lib/rbac";
import { listProjects } from "@/lib/actions/projects";
import { SidebarShell } from "@/components/shell/SidebarShell";
import type { NavAccess } from "@/lib/navigation";
import type { WorkspaceRole } from "@prisma/client";

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
  let navAccess: NavAccess | undefined;
  let showProjectSwitcher = false;

  try {
    const ctx = await getSessionContext();
    workspaceName = ctx.workspace.name;
    const permissions = getUserPermissions(ctx.workspaceRole);
    navAccess = {
      permissions: [...permissions],
      workspaceRole: ctx.workspaceRole,
    };
    showProjectSwitcher = roleHasPermission(
      permissions,
      "project:read",
      ctx.workspaceRole as WorkspaceRole,
    );
  } catch {
    // unauthenticated pages should not use AppShell
  }

  const projects =
    isClient || !showProjectSwitcher
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
      navAccess={navAccess}
      showProjectSwitcher={showProjectSwitcher}
    >
      {children}
    </SidebarShell>
  );
}
