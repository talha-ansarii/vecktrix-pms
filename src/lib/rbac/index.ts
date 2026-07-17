import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { WorkspaceRole } from "@prisma/client";
import { permissionsForRole, roleHasPermission as matrixHasPermission, type Permission } from "@/domain/rbac/matrix";

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

export function getUserPermissions(workspaceRole: WorkspaceRole) {
  return permissionsForRole(workspaceRole);
}

/** Supports legacy 3-arg UI calls and 2-arg service calls */
export function roleHasPermission(
  permissionsOrRole: Set<string> | WorkspaceRole,
  permission: Permission | string,
  workspaceRole?: WorkspaceRole,
) {
  if (workspaceRole !== undefined) {
    const perms = permissionsOrRole as Set<string>;
    if (workspaceRole === "agency_admin") return true;
    return perms.has(permission) || perms.has("*");
  }
  return matrixHasPermission(permissionsOrRole as WorkspaceRole, permission as Permission);
}

export async function assertPermission(permission: Permission) {
  const ctx = await getSessionContext();
  if (!matrixHasPermission(ctx.workspaceRole, permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return ctx;
}

export async function assertAnyPermission(permissions: Permission[]) {
  const ctx = await getSessionContext();
  if (ctx.workspaceRole === "agency_admin") return ctx;
  const hasAny = permissions.some((p) => matrixHasPermission(ctx.workspaceRole, p));
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

export async function getSessionWithPermissions() {
  const ctx = await getSessionContext();
  const permissions = getUserPermissions(ctx.workspaceRole);
  return { ...ctx, permissions };
}

export async function tryAssertPermission(permission: Permission) {
  try {
    const ctx = await assertPermission(permission);
    return { ok: true as const, ctx };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false as const, reason: "forbidden" as const };
    throw e;
  }
}

export async function tryAssertAnyPermission(permissions: Permission[]) {
  try {
    const ctx = await assertAnyPermission(permissions);
    return { ok: true as const, ctx };
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false as const, reason: "forbidden" as const };
    throw e;
  }
}

export function assertNotClientForTaskReview(role: WorkspaceRole) {
  if (role === "client") throw new ForbiddenError("Clients cannot review tasks");
}

export async function assertAgencyAccess(permission: Permission) {
  const ctx = await assertPermission(permission);
  if (isClientRole(ctx.workspaceRole)) {
    throw new ForbiddenError("Clients cannot access agency resources");
  }
  return ctx;
}

export async function assertAdminOnly() {
  const ctx = await getSessionContext();
  if (ctx.workspaceRole !== "agency_admin") {
    throw new ForbiddenError("Admin only");
  }
  return ctx;
}

export async function getClientLinkedRecord(ctx: { userId: string; workspaceId: string }) {
  const client = await prisma.client.findFirst({
    where: { userId: ctx.userId, workspaceId: ctx.workspaceId },
  });
  if (!client) throw new ForbiddenError("No client profile linked");
  return client;
}
