import { writeLog } from "@/domain/audit/log";

export async function appendProjectActivity(
  projectId: string,
  opts: {
    actorUserId?: string | null;
    type: string;
    content: string;
    metadata?: Record<string, unknown>;
    workspaceId?: string;
  },
) {
  const { prisma } = await import("@/lib/prisma");
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  return writeLog({
    workspaceId: opts.workspaceId ?? project.workspaceId,
    entityType: "project",
    entityId: projectId,
    action: opts.type,
    content: opts.content,
    actorUserId: opts.actorUserId,
    metadata: opts.metadata as import("@prisma/client").Prisma.InputJsonValue | undefined,
  });
}
