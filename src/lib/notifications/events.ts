import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/actions/notifications";

export async function notifyUser(params: {
  userId: string;
  workspaceId: string;
  title: string;
  message: string;
  href?: string;
  type?: "lead" | "project" | "milestone" | "task" | "invite" | "system";
}) {
  await createNotification({
    userId: params.userId,
    workspaceId: params.workspaceId,
    type: params.type ?? "system",
    title: params.title,
    message: params.message,
    link: params.href,
  });
}

export async function notifyWorkspaceRole(params: {
  workspaceId: string;
  roles: string[];
  title: string;
  message: string;
  href?: string;
  type?: "lead" | "project" | "milestone" | "task" | "invite" | "system";
}) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: params.workspaceId, role: { in: params.roles as never } },
    select: { userId: true },
  });
  await Promise.all(
    members.map((m) =>
      notifyUser({
        userId: m.userId,
        workspaceId: params.workspaceId,
        title: params.title,
        message: params.message,
        href: params.href,
        type: params.type,
      }),
    ),
  );
}
