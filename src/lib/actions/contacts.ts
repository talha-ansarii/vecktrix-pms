"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess } from "@/lib/rbac";
import { createContactSchema, updateContactSchema } from "@/domain/leads/lead.schema";
import {
  createContactForLead,
  deleteContactInWorkspace,
  listContactsForLead,
  updateContactInWorkspace,
} from "@/domain/leads/contact.service";

export async function listContacts(leadId: string) {
  const ctx = await assertAgencyAccess("contact:read");
  return listContactsForLead(ctx.workspaceId, leadId);
}

export async function createContact(data: Parameters<typeof createContactSchema.parse>[0]) {
  const ctx = await assertAgencyAccess("contact:write");
  const parsed = createContactSchema.parse(data);
  const contact = await createContactForLead(ctx.workspaceId, ctx.userId, parsed);
  revalidatePath(`/leads/${parsed.leadId}`);
  return contact;
}

export async function updateContact(data: Parameters<typeof updateContactSchema.parse>[0]) {
  const ctx = await assertAgencyAccess("contact:write");
  const parsed = updateContactSchema.parse(data);
  const contact = await updateContactInWorkspace(ctx.workspaceId, ctx.userId, parsed);
  revalidatePath(`/leads/${contact.leadId}`);
  return contact;
}

export async function deleteContact(contactId: string) {
  const ctx = await assertAgencyAccess("contact:write");
  const contact = await prisma.contact.findFirstOrThrow({
    where: { id: contactId },
    include: { lead: true },
  });
  await deleteContactInWorkspace(ctx.workspaceId, ctx.userId, contactId);
  revalidatePath(`/leads/${contact.leadId}`);
}
