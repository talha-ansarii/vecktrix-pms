import { prisma } from "@/lib/prisma";
import { writeLog } from "@/domain/audit/log";
import type { createContactSchema, updateContactSchema } from "@/domain/leads/lead.schema";
import type { z } from "zod";

export async function listContactsForLead(workspaceId: string, leadId: string) {
  await prisma.lead.findFirstOrThrow({ where: { id: leadId, workspaceId } });
  return prisma.contact.findMany({
    where: { leadId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

export async function createContactForLead(
  workspaceId: string,
  actorUserId: string,
  data: z.infer<typeof createContactSchema>,
) {
  await prisma.lead.findFirstOrThrow({
    where: { id: data.leadId, workspaceId },
  });

  if (data.isPrimary) {
    await prisma.contact.updateMany({
      where: { leadId: data.leadId },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.contact.create({
    data: { ...data, createdById: actorUserId },
  });

  await writeLog({
    workspaceId,
    entityType: "contact",
    entityId: contact.id,
    action: "contact_added",
    content: `Contact ${contact.name} added.`,
    actorUserId,
    metadata: { leadId: data.leadId },
  });
  await writeLog({
    workspaceId,
    entityType: "lead",
    entityId: data.leadId,
    action: "contact_added",
    content: `Contact ${contact.name} added.`,
    actorUserId,
  });

  return contact;
}

export async function updateContactInWorkspace(
  workspaceId: string,
  actorUserId: string,
  data: z.infer<typeof updateContactSchema>,
) {
  const { id, ...rest } = data;
  const existing = await prisma.contact.findFirstOrThrow({
    where: { id },
    include: { lead: true },
  });
  if (existing.lead.workspaceId !== workspaceId) throw new Error("Not found");

  if (rest.isPrimary) {
    await prisma.contact.updateMany({
      where: { leadId: existing.leadId },
      data: { isPrimary: false },
    });
  }

  const contact = await prisma.contact.update({ where: { id }, data: rest });

  await writeLog({
    workspaceId,
    entityType: "lead",
    entityId: existing.leadId,
    action: "contact_updated",
    content: `Contact ${contact.name} updated.`,
    actorUserId,
  });

  return contact;
}

export async function deleteContactInWorkspace(
  workspaceId: string,
  actorUserId: string,
  contactId: string,
) {
  const contact = await prisma.contact.findFirstOrThrow({
    where: { id: contactId },
    include: { lead: true },
  });
  if (contact.lead.workspaceId !== workspaceId) throw new Error("Not found");

  await prisma.contact.delete({ where: { id: contactId } });
  await writeLog({
    workspaceId,
    entityType: "lead",
    entityId: contact.leadId,
    action: "contact_removed",
    content: `Contact ${contact.name} removed.`,
    actorUserId,
  });
}
