import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function appendProjectPlanLog(
  projectId: string,
  data: {
    actorUserId?: string | null;
    type: string;
    summary: string;
    metadata?: Prisma.InputJsonValue;
    clientVisible?: boolean;
  },
) {
  return prisma.projectPlanLog.create({
    data: {
      projectId,
      actorUserId: data.actorUserId ?? null,
      type: data.type,
      summary: data.summary,
      metadata: data.metadata,
      clientVisible: data.clientVisible ?? true,
    },
  });
}
