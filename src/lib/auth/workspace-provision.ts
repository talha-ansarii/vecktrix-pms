import { prisma } from "@/lib/prisma";
import { linkClientPortalUser } from "@/lib/auth/client-link";

/** Link Google OAuth users to workspace via pending invite, or allow existing members. */
export async function ensureGoogleWorkspaceMembership(
  userId: string,
  email: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.workspaceMember.findFirst({
    where: { userId },
  });
  if (existing) return true;

  const invite = await prisma.invite.findFirst({
    where: {
      email: normalizedEmail,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!invite) return false;

  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.upsert({
      where: {
        userId_workspaceId: { userId, workspaceId: invite.workspaceId },
      },
      update: { role: invite.role },
      create: {
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      },
    });

    const role = await tx.role.findUnique({
      where: {
        workspaceId_slug: { workspaceId: invite.workspaceId, slug: invite.role },
      },
    });
    if (role) {
      await tx.userRole.upsert({
        where: {
          userId_roleId_workspaceId: {
            userId,
            roleId: role.id,
            workspaceId: invite.workspaceId,
          },
        },
        update: {},
        create: {
          userId,
          roleId: role.id,
          workspaceId: invite.workspaceId,
        },
      });
    }

    await tx.invite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await linkClientPortalUser(tx, {
      userId,
      workspaceId: invite.workspaceId,
      email: normalizedEmail,
      role: invite.role,
    });
  });

  return true;
}

export async function loadWorkspaceForUser(userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}
