import type { ActivityEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WriteLogInput = {
  workspaceId: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  content: string;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeLog(input: WriteLogInput) {
  return prisma.activityLog.create({
    data: {
      workspaceId: input.workspaceId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      content: input.content,
      actorUserId: input.actorUserId ?? null,
      metadata: input.metadata,
    },
  });
}

export async function listForEntity(
  workspaceId: string,
  entityType: ActivityEntityType,
  entityId: string,
  limit = 50,
) {
  return prisma.activityLog.findMany({
    where: { workspaceId, entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}

export async function listForLeadGraph(workspaceId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId },
    include: { proposal: { select: { id: true } }, convertedClient: { select: { id: true } } },
  });
  if (!lead) return [];

  const entityFilters: { entityType: ActivityEntityType; entityId: string }[] = [
    { entityType: "lead", entityId: leadId },
  ];
  if (lead.proposal) {
    entityFilters.push({ entityType: "proposal", entityId: lead.proposal.id });
  }
  if (lead.convertedClient) {
    entityFilters.push({ entityType: "client", entityId: lead.convertedClient.id });
  }

  return prisma.activityLog.findMany({
    where: {
      workspaceId,
      OR: entityFilters,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}
