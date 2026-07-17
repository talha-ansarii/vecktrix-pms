"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertAdminOnly } from "@/lib/rbac";
import { writeLog } from "@/domain/audit/log";
import { createLeadSchema, updateLeadSchema } from "@/domain/leads/lead.schema";
import {
  addLeadNoteInWorkspace,
  createLeadInWorkspace,
  getLeadInWorkspace,
  listLeadsInWorkspace,
  updateLeadInWorkspace,
  updateLeadStatusInWorkspace,
} from "@/domain/leads/lead.service";

const PIPELINE_STATUSES: LeadStatus[] = [
  LeadStatus.new,
  LeadStatus.contacted,
  LeadStatus.qualified,
];

export async function listLeadAssigneeOptions() {
  const ctx = await assertAgencyAccess("lead:read");
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      role: { in: ["agency_admin", "sales", "project_manager"] },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return members.map((m) => m.user);
}

export async function getLeadStatusCounts() {
  const ctx = await assertAgencyAccess("lead:read");
  const rows = await prisma.lead.groupBy({
    by: ["status"],
    where: { workspaceId: ctx.workspaceId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const s of Object.values(LeadStatus)) counts[s] = 0;
  for (const row of rows) counts[row.status] = row._count._all;
  return { counts, pipeline: PIPELINE_STATUSES };
}

export async function listLeads(filters?: {
  status?: LeadStatus;
  temperature?: import("@prisma/client").LeadTemperature;
  moneyBucket?: "low" | "mid" | "high";
  timelineBucket?: "short" | "medium" | "long";
}) {
  const ctx = await assertAgencyAccess("lead:read");
  return listLeadsInWorkspace(ctx.workspaceId, filters);
}

export async function getLead(id: string) {
  const ctx = await assertAgencyAccess("lead:read");
  return getLeadInWorkspace(ctx.workspaceId, id);
}

export async function createLead(data: z.infer<typeof createLeadSchema>) {
  const ctx = await assertAgencyAccess("lead:write");
  const parsed = createLeadSchema.parse(data);
  const lead = await createLeadInWorkspace(ctx.workspaceId, ctx.userId, parsed);
  revalidatePath("/leads");
  return lead;
}

export async function updateLead(data: z.infer<typeof updateLeadSchema>) {
  const ctx = await assertAgencyAccess("lead:write");
  const parsed = updateLeadSchema.parse(data);
  const lead = await updateLeadInWorkspace(ctx.workspaceId, ctx.userId, parsed);
  revalidatePath("/leads");
  revalidatePath(`/leads/${lead.id}`);
  return lead;
}

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
  const ctx = await assertAgencyAccess("lead:write");
  const lead = await updateLeadStatusInWorkspace(ctx.workspaceId, ctx.userId, leadId, status);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return lead;
}

export async function addLeadNote(leadId: string, content: string) {
  const ctx = await assertAgencyAccess("lead:write");
  const log = await addLeadNoteInWorkspace(ctx.workspaceId, ctx.userId, leadId, content);
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return log;
}

export async function getLeadActivity(leadId: string) {
  const ctx = await assertAgencyAccess("lead:read");
  await prisma.lead.findFirstOrThrow({ where: { id: leadId, workspaceId: ctx.workspaceId } });
  const { listForLeadGraph } = await import("@/domain/audit/log");
  return listForLeadGraph(ctx.workspaceId, leadId);
}

/** @deprecated use addLeadNote */
export async function addLeadActivity(leadId: string, content: string) {
  return addLeadNote(leadId, content);
}

/** Admin-only: create client from accepted proposal */
export async function createClientFromProposal(leadId: string) {
  const ctx = await assertAdminOnly();
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, workspaceId: ctx.workspaceId },
    include: { proposal: true },
  });
  if (!lead.proposal || lead.proposal.status !== "accepted") {
    throw new Error("Proposal must be accepted before creating client");
  }
  if (lead.convertedClientId) throw new Error("Lead already converted");

  const client = await prisma.$transaction(async (tx) => {
    const c = await tx.client.create({
      data: {
        workspaceId: ctx.workspaceId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        notes: lead.notes,
      },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { convertedClientId: c.id, status: LeadStatus.qualified },
    });
    return c;
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "client",
    entityId: client.id,
    action: "client_created",
    content: `Client ${client.name} created from accepted proposal.`,
    actorUserId: ctx.userId,
    metadata: { leadId },
  });
  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "lead",
    entityId: leadId,
    action: "client_created",
    content: `Converted to client ${client.name}.`,
    actorUserId: ctx.userId,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/clients");
  return client;
}

/** Blocked for Sales — use createClientFromProposal (Admin) */
export async function convertLeadToClient(leadId: string) {
  await assertAdminOnly();
  return createClientFromProposal(leadId);
}

export async function rejectLeadProposal(leadId: string, reason?: string) {
  const ctx = await assertAgencyAccess("proposal:write");
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, workspaceId: ctx.workspaceId },
    include: { proposal: true },
  });
  if (!lead.proposal) throw new Error("No proposal on this lead");

  const note = reason?.trim() || "Proposal declined by the client.";
  await prisma.$transaction(async (tx) => {
    await tx.proposal.update({
      where: { id: lead.proposal!.id },
      data: { status: "rejected", decidedAt: new Date() },
    });
    await tx.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.lost },
    });
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "proposal",
    entityId: lead.proposal.id,
    action: "proposal_rejected",
    content: note,
    actorUserId: ctx.userId,
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return lead;
}
