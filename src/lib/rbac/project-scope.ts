import type { Prisma, WorkspaceRole } from "@prisma/client";
import { ForbiddenError } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

const SCOPED_DELIVERY_ROLES: WorkspaceRole[] = [
  "project_manager",
  "ux_designer",
  "product_engineer",
  "qa_engineer",
];

export function projectListRequiresMembership(workspaceRole: WorkspaceRole) {
  return SCOPED_DELIVERY_ROLES.includes(workspaceRole);
}

/** Prisma filter: delivery roles only see projects they belong to; admin sees all. */
export function projectVisibilityWhere(
  workspaceId: string,
  workspaceRole: WorkspaceRole,
  userId: string,
): Prisma.ProjectWhereInput {
  const base = { workspaceId };
  if (workspaceRole === "agency_admin") return base;
  if (!projectListRequiresMembership(workspaceRole)) {
    return { id: "__none__" };
  }
  return {
    ...base,
    members: { some: { userId } },
  };
}

export async function assertProjectVisible(
  projectId: string,
  workspaceId: string,
  workspaceRole: WorkspaceRole,
  userId: string,
) {
  if (workspaceRole === "agency_admin") return;
  if (!projectListRequiresMembership(workspaceRole)) {
    throw new ForbiddenError("You do not have access to projects");
  }
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!member) throw new ForbiddenError("You do not have access to this project");
}
