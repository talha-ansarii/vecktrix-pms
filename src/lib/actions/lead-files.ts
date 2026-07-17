"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
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

  let lead = await prisma.lead.findFirstOrThrow({ where: { id: leadId } });

  if (lead.status === LeadStatus.qualified) {
    lead = await prisma.lead.update({
      where: { id: leadId },
      data: { status: LeadStatus.proposal },
    });
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: ctx.userId,
        type: "status",
        content: "Moved to proposal after sharing documents.",
        pipelineStatus: LeadStatus.proposal,
      },
    });
  }

  const activityType =
    lead.status === LeadStatus.proposal ? "proposal_sent" : "file_upload";
  const activityContent =
    lead.status === LeadStatus.proposal
      ? `Proposal document shared: ${uploaded.name}`
      : `Uploaded document: ${uploaded.name}`;

  await prisma.leadActivity.create({
    data: {
      leadId,
      userId: ctx.userId,
      type: activityType,
      content: activityContent,
      pipelineStatus: lead.status,
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
    include: { lead: { select: { id: true, status: true } } },
  });

  try {
    await deleteFromBlob(file.storageKey);
  } catch {
    // Blob may already be removed
  }

  await prisma.leadFile.delete({ where: { id: fileId } });

  await prisma.leadActivity.create({
    data: {
      leadId: file.lead.id,
      userId: ctx.userId,
      type: "file_removed",
      content: `Removed document: ${file.name}`,
      pipelineStatus: file.lead.status,
    },
  });

  revalidatePath(`/leads/${file.lead.id}`);
  revalidatePath("/leads");
}
