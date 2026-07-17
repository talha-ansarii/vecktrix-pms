import {
  LeadSource,
  LeadStatus,
  LeadTemperature,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeLog } from "@/domain/audit/log";
import type { createLeadSchema, updateLeadSchema } from "@/domain/leads/lead.schema";
import type { z } from "zod";

export type LeadListFilters = {
  status?: LeadStatus;
  temperature?: LeadTemperature;
  moneyBucket?: "low" | "mid" | "high";
  timelineBucket?: "short" | "medium" | "long";
};

const leadInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
  convertedClient: { select: { id: true, name: true, email: true } },
  contacts: { orderBy: [{ isPrimary: "desc" as const }, { createdAt: "asc" as const }] },
  proposal: {
    include: {
      milestones: { orderBy: { sortOrder: "asc" as const } },
      files: {
        include: { uploadedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" as const },
      },
    },
  },
} satisfies Prisma.LeadInclude;

export async function listLeadsInWorkspace(workspaceId: string, filters?: LeadListFilters) {
  return prisma.lead.findMany({
    where: {
      workspaceId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.temperature ? { temperature: filters.temperature } : {}),
      ...(filters?.moneyBucket ? { moneyBucket: filters.moneyBucket } : {}),
      ...(filters?.timelineBucket ? { timelineBucket: filters.timelineBucket } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      convertedClient: { select: { id: true, name: true, email: true } },
      proposal: { select: { id: true, status: true } },
      contacts: { take: 3, orderBy: { isPrimary: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeadInWorkspace(workspaceId: string, leadId: string) {
  return prisma.lead.findFirstOrThrow({
    where: { id: leadId, workspaceId },
    include: leadInclude,
  });
}

export async function createLeadInWorkspace(
  workspaceId: string,
  actorUserId: string,
  data: z.infer<typeof createLeadSchema>,
) {
  const lead = await prisma.lead.create({
    data: { ...data, workspaceId, source: LeadSource.manual },
  });
  await writeLog({
    workspaceId,
    entityType: "lead",
    entityId: lead.id,
    action: "created",
    content: "Lead entered the pipeline.",
    actorUserId,
    metadata: { status: LeadStatus.new },
  });
  return lead;
}

export async function updateLeadInWorkspace(
  workspaceId: string,
  actorUserId: string,
  data: z.infer<typeof updateLeadSchema>,
) {
  const { id, ...rest } = data;
  const before = await prisma.lead.findFirstOrThrow({ where: { id, workspaceId } });
  const lead = await prisma.lead.update({ where: { id, workspaceId }, data: rest });
  const action = rest.status && rest.status !== before.status ? "status_changed" : "updated";
  await writeLog({
    workspaceId,
    entityType: "lead",
    entityId: lead.id,
    action,
    content:
      action === "status_changed"
        ? `Stage updated to ${rest.status?.replace(/_/g, " ")}.`
        : "Lead details updated.",
    actorUserId,
    metadata: { status: lead.status },
  });
  return lead;
}

export async function updateLeadStatusInWorkspace(
  workspaceId: string,
  actorUserId: string,
  leadId: string,
  status: LeadStatus,
) {
  const lead = await prisma.lead.update({
    where: { id: leadId, workspaceId },
    data: { status },
  });
  await writeLog({
    workspaceId,
    entityType: "lead",
    entityId: lead.id,
    action: "status_changed",
    content: `Stage updated to ${status.replace(/_/g, " ")}.`,
    actorUserId,
    metadata: { status },
  });
  return lead;
}

export async function addLeadNoteInWorkspace(
  workspaceId: string,
  actorUserId: string,
  leadId: string,
  content: string,
) {
  await prisma.lead.findFirstOrThrow({ where: { id: leadId, workspaceId } });
  return writeLog({
    workspaceId,
    entityType: "lead",
    entityId: leadId,
    action: "note",
    content,
    actorUserId,
  });
}
