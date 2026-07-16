"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionContext } from "@/lib/rbac";

export async function listNotifications() {
  const ctx = await getSessionContext();

  return prisma.notification.findMany({
    where: { userId: ctx.userId, workspaceId: ctx.workspaceId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(id: string) {
  const ctx = await getSessionContext();

  await prisma.notification.update({
    where: { id, userId: ctx.userId },
    data: { read: true },
  });

  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const ctx = await getSessionContext();

  await prisma.notification.updateMany({
    where: { userId: ctx.userId, workspaceId: ctx.workspaceId, read: false },
    data: { read: true },
  });

  revalidatePath("/dashboard");
}

export async function createNotification(data: {
  userId: string;
  workspaceId: string;
  type: "lead" | "project" | "milestone" | "task" | "invite" | "system";
  title: string;
  message: string;
  link?: string;
}) {
  return prisma.notification.create({ data });
}

export async function getUnreadCount() {
  const ctx = await getSessionContext();

  return prisma.notification.count({
    where: { userId: ctx.userId, workspaceId: ctx.workspaceId, read: false },
  });
}
