"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LeadStatus, LeadTemperature, LeadSource, ServiceInterest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess } from "@/lib/rbac";

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceInterest: z.nativeEnum(ServiceInterest).optional(),
  notes: z.string().optional(),
  temperature: z.nativeEnum(LeadTemperature).optional(),
  moneyBucket: z.enum(["low", "mid", "high"]).optional(),
  timelineBucket: z.enum(["short", "medium", "long"]).optional(),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string(),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.string().nullable().optional(),
});

export async function listLeads(filters?: {
  status?: LeadStatus;
  temperature?: LeadTemperature;
  moneyBucket?: "low" | "mid" | "high";
  timelineBucket?: "short" | "medium" | "long";
}) {
  const ctx = await assertAgencyAccess("lead:read");

  return prisma.lead.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.temperature ? { temperature: filters.temperature } : {}),
      ...(filters?.moneyBucket ? { moneyBucket: filters.moneyBucket } : {}),
      ...(filters?.timelineBucket ? { timelineBucket: filters.timelineBucket } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLead(id: string) {
  const ctx = await assertAgencyAccess("lead:read");
  return prisma.lead.findFirstOrThrow({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function createLead(data: z.infer<typeof createLeadSchema>) {
  const ctx = await assertAgencyAccess("lead:write");
  const parsed = createLeadSchema.parse(data);

  const lead = await prisma.lead.create({
    data: {
      ...parsed,
      workspaceId: ctx.workspaceId,
      source: LeadSource.manual,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: ctx.userId,
      type: "created",
      content: "Lead created",
    },
  });

  revalidatePath("/leads");
  return lead;
}

export async function updateLead(data: z.infer<typeof updateLeadSchema>) {
  const ctx = await assertAgencyAccess("lead:write");
  const { id, ...rest } = updateLeadSchema.parse(data);

  const lead = await prisma.lead.update({
    where: { id, workspaceId: ctx.workspaceId },
    data: rest,
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: ctx.userId,
      type: "updated",
      content: `Lead updated: ${Object.keys(rest).join(", ")}`,
    },
  });

  revalidatePath("/leads");
  return lead;
}

export async function convertLeadToClient(leadId: string) {
  const ctx = await assertAgencyAccess("lead:convert");

  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, workspaceId: ctx.workspaceId },
  });

  if (!["qualified", "proposal"].includes(lead.status)) {
    throw new Error("Lead must be qualified or proposal to convert");
  }

  if (lead.convertedClientId) {
    throw new Error("Lead already converted");
  }

  const result = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
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
      data: { status: LeadStatus.won, convertedClientId: client.id },
    });

    await tx.leadActivity.create({
      data: {
        leadId,
        userId: ctx.userId,
        type: "converted",
        content: `Converted to client: ${client.name}. Invite them to the portal from the Clients page.`,
      },
    });

    return client;
  });

  revalidatePath("/leads");
  revalidatePath("/clients");
  return result;
}

export async function addLeadActivity(leadId: string, content: string) {
  const ctx = await assertAgencyAccess("lead:write");

  const activity = await prisma.leadActivity.create({
    data: {
      leadId,
      userId: ctx.userId,
      type: "note",
      content,
    },
  });

  revalidatePath("/leads");
  return activity;
}
