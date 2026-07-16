"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { z } from "zod";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/rbac";
import { sendEmail, inviteEmailHtml } from "@/lib/email/send";
import { linkClientPortalUser } from "@/lib/auth/client-link";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(WorkspaceRole),
});

export async function listTeamMembers() {
  const ctx = await assertPermission("user:manage");

  return prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPendingInvites() {
  const ctx = await assertPermission("user:invite");

  return prisma.invite.findMany({
    where: { workspaceId: ctx.workspaceId, status: "pending" },
    include: { invitedBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function inviteUser(data: z.infer<typeof inviteSchema>) {
  const ctx = await assertPermission("user:invite");
  const parsed = inviteSchema.parse(data);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      email: parsed.email.trim().toLowerCase(),
      workspaceId: ctx.workspaceId,
      role: parsed.role,
      token,
      expiresAt,
      invitedById: ctx.userId,
    },
  });

  const workspace = await prisma.workspace.findUnique({ where: { id: ctx.workspaceId } });
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${baseUrl.replace(/\/$/, "")}/invite/${token}`;

  await sendEmail({
    to: parsed.email.trim().toLowerCase(),
    subject: `Invitation to ${workspace?.name ?? "Vecktrix"} PMS`,
    html: inviteEmailHtml(inviteUrl, workspace?.name ?? "Vecktrix"),
  });

  revalidatePath("/settings/team");
  return invite;
}

export async function revokeInvite(inviteId: string) {
  const ctx = await assertPermission("user:invite");

  await prisma.invite.update({
    where: { id: inviteId, workspaceId: ctx.workspaceId },
    data: { status: "revoked" },
  });

  revalidatePath("/settings/team");
}

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function getInviteByToken(token: string) {
  return prisma.invite.findFirst({
    where: { token, status: "pending", expiresAt: { gt: new Date() } },
    include: { workspace: { select: { name: true } } },
  });
}

export async function acceptInvite(data: z.infer<typeof acceptInviteSchema>) {
  const parsed = acceptInviteSchema.parse(data);
  const invite = await getInviteByToken(parsed.token);
  if (!invite) throw new Error("Invite is invalid or expired");

  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(parsed.password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: invite.email } });
    const u =
      existing ??
      (await tx.user.create({
        data: {
          email: invite.email,
          name: parsed.name,
          hashedPassword,
        },
      }));

    if (existing && parsed.password) {
      await tx.user.update({
        where: { id: u.id },
        data: { name: parsed.name, hashedPassword },
      });
    }

    await tx.workspaceMember.upsert({
      where: { userId_workspaceId: { userId: u.id, workspaceId: invite.workspaceId } },
      update: { role: invite.role },
      create: {
        workspaceId: invite.workspaceId,
        userId: u.id,
        role: invite.role,
      },
    });

    const role = await tx.role.findUnique({
      where: { workspaceId_slug: { workspaceId: invite.workspaceId, slug: invite.role } },
    });
    if (role) {
      await tx.userRole.upsert({
        where: {
          userId_roleId_workspaceId: {
            userId: u.id,
            roleId: role.id,
            workspaceId: invite.workspaceId,
          },
        },
        update: {},
        create: { userId: u.id, roleId: role.id, workspaceId: invite.workspaceId },
      });
    }

    await tx.invite.update({
      where: { id: invite.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    await linkClientPortalUser(tx, {
      userId: u.id,
      workspaceId: invite.workspaceId,
      email: invite.email,
      role: invite.role,
    });

    return u;
  });

  return { userId: user.id, email: user.email };
}
