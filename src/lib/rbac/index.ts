import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { WorkspaceRole } from "@prisma/client";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function getSessionContext() {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError();

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  if (!member) throw new AuthError("No workspace membership");

  return {
    userId: session.user.id,
    workspaceId: member.workspaceId,
    workspaceRole: member.role,
    workspace: member.workspace,
  };
}

export async function getUserPermissions(userId: string, workspaceId: string): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId, workspaceId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });

  const perms = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      perms.add(rp.permission.key);
    }
  }

  // Fallback: map workspace role to default role slug
  if (perms.size === 0 && member) {
    const role = await prisma.role.findUnique({
      where: { workspaceId_slug: { workspaceId, slug: member.role } },
      include: { rolePermissions: { include: { permission: true } } },
    });
    role?.rolePermissions.forEach((rp) => perms.add(rp.permission.key));
  }

  return perms;
}

export async function assertPermission(permission: string) {
  const ctx = await getSessionContext();
  const perms = await getUserPermissions(ctx.userId, ctx.workspaceId);

  if (!perms.has(permission) && !perms.has("*")) {
    // agency_admin gets all via seed
    if (ctx.workspaceRole !== "agency_admin") {
      throw new ForbiddenError(`Missing permission: ${permission}`);
    }
  }

  return ctx;
}

export async function assertAnyPermission(permissions: string[]) {
  const ctx = await getSessionContext();
  const perms = await getUserPermissions(ctx.userId, ctx.workspaceId);

  if (ctx.workspaceRole === "agency_admin") return ctx;

  const hasAny = permissions.some((p) => perms.has(p));
  if (!hasAny) throw new ForbiddenError(`Missing one of: ${permissions.join(", ")}`);

  return ctx;
}

export async function assertProjectRole(projectId: string, allowedRoles: WorkspaceRole[]) {
  const ctx = await getSessionContext();

  if (ctx.workspaceRole === "agency_admin") return ctx;

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: ctx.userId } },
  });

  if (!member || !allowedRoles.includes(member.role)) {
    throw new ForbiddenError("Insufficient project role");
  }

  return ctx;
}

export function isClientRole(role: WorkspaceRole) {
  return role === "client";
}

// Clients must never review or comment on tasks
export function assertNotClientForTaskReview(role: WorkspaceRole) {
  if (role === "client") {
    throw new ForbiddenError("Clients cannot review tasks");
  }
}
