import { writeLog } from "@/domain/audit/log";

export async function appendProjectPlanLog(
  projectId: string,
  opts: {
    actorUserId?: string | null;
    type: string;
    summary: string;
    metadata?: Record<string, unknown>;
    clientVisible?: boolean;
  },
) {
  const { prisma } = await import("@/lib/prisma");
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  return writeLog({
    workspaceId: project.workspaceId,
    entityType: "project",
    entityId: projectId,
    action: opts.type,
    content: opts.summary,
    actorUserId: opts.actorUserId,
    metadata: { ...opts.metadata, clientVisible: opts.clientVisible ?? true },
  });
}
