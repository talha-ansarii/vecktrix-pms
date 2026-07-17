import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function appendProjectActivity(
  projectId: string,
  data: {
    actorUserId?: string | null;
    type: string;
    content: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.projectActivity.create({
    data: {
      projectId,
      userId: data.actorUserId ?? null,
      type: data.type,
      content: data.content,
      metadata: data.metadata,
    },
  });
}
