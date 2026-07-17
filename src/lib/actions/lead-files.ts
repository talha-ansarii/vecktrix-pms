"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess } from "@/lib/rbac";
import { deleteFromBlob, uploadToBlob } from "@/lib/storage/blob";

export async function listLeadFiles(leadId: string) {
  const ctx = await assertAgencyAccess("lead:read");

  return prisma.leadFile.findMany({
    where: { leadId, lead: { workspaceId: ctx.workspaceId } },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadLeadFile(formData: FormData) {
  const ctx = await assertAgencyAccess("lead:write");

  const leadId = formData.get("leadId") as string;
  const file = formData.get("file") as File | null;

  if (!leadId || !file?.size) {
    throw new Error("Lead and file are required");
  }

  await prisma.lead.findFirstOrThrow({
    where: { id: leadId, workspaceId: ctx.workspaceId },
  });

  const uploaded = await uploadToBlob(file, `leads/${leadId}`);

  const record = await prisma.leadFile.create({
    data: {
      leadId,
      name: uploaded.name,
      url: uploaded.url,
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedById: ctx.userId,
    },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return record;
}

export async function deleteLeadFile(fileId: string) {
  const ctx = await assertAgencyAccess("lead:write");

  const file = await prisma.leadFile.findFirstOrThrow({
    where: { id: fileId, lead: { workspaceId: ctx.workspaceId } },
    include: { lead: { select: { id: true } } },
  });

  try {
    await deleteFromBlob(file.storageKey);
  } catch {
    // Blob may already be removed
  }

  await prisma.leadFile.delete({ where: { id: fileId } });

  revalidatePath(`/leads/${file.lead.id}`);
  revalidatePath("/leads");
}
