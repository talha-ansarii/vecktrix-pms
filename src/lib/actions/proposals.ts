"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertAdminOnly } from "@/lib/rbac";
import { writeLog } from "@/domain/audit/log";
import { DEFAULT_PROPOSAL_MILESTONES, updateProposalSchema } from "@/domain/proposals/proposal.schema";
import { uploadToBlob } from "@/lib/storage/blob";

export async function getOrCreateProposal(leadId: string) {
  const ctx = await assertAgencyAccess("proposal:read");
  const lead = await prisma.lead.findFirstOrThrow({
    where: { id: leadId, workspaceId: ctx.workspaceId },
    include: {
      proposal: {
        include: {
          milestones: { orderBy: { sortOrder: "asc" } },
          files: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  if (lead.proposal) return lead.proposal;

  await assertAgencyAccess("proposal:write");
  const proposal = await prisma.$transaction(async (tx) => {
    const p = await tx.proposal.create({ data: { leadId } });
    await tx.proposalMilestone.createMany({
      data: DEFAULT_PROPOSAL_MILESTONES.map((m) => ({
        proposalId: p.id,
        title: m.title,
        sortOrder: m.sortOrder,
        ownerRole: m.ownerRole,
      })),
    });
    return p;
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "proposal",
    entityId: proposal.id,
    action: "proposal_created",
    content: "Proposal draft created with default milestones.",
    actorUserId: ctx.userId,
    metadata: { leadId },
  });

  revalidatePath(`/leads/${leadId}`);
  return prisma.proposal.findUniqueOrThrow({
    where: { id: proposal.id },
    include: {
      milestones: { orderBy: { sortOrder: "asc" } },
      files: true,
    },
  });
}

export async function updateProposal(data: z.infer<typeof updateProposalSchema>) {
  const ctx = await assertAgencyAccess("proposal:write");
  const parsed = updateProposalSchema.parse(data);
  const proposal = await prisma.proposal.findFirstOrThrow({
    where: { id: parsed.proposalId },
    include: { lead: true },
  });
  if (proposal.lead.workspaceId !== ctx.workspaceId) throw new Error("Not found");
  if (proposal.status !== "draft") throw new Error("Can only edit draft proposals");

  if (parsed.notes !== undefined) {
    await prisma.proposal.update({
      where: { id: parsed.proposalId },
      data: { notes: parsed.notes },
    });
  }

  if (parsed.milestones) {
    await prisma.proposalMilestone.deleteMany({ where: { proposalId: parsed.proposalId } });
    await prisma.proposalMilestone.createMany({
      data: parsed.milestones.map((m) => ({
        proposalId: parsed.proposalId,
        title: m.title,
        sortOrder: m.sortOrder,
        ownerRole: m.ownerRole,
        amount: m.amount,
      })),
    });
  }

  revalidatePath(`/leads/${proposal.leadId}`);
  return getOrCreateProposal(proposal.leadId);
}

export async function sendProposal(proposalId: string) {
  const ctx = await assertAgencyAccess("proposal:send");
  const proposal = await prisma.proposal.findFirstOrThrow({
    where: { id: proposalId },
    include: { lead: true, milestones: true, files: true },
  });
  if (proposal.lead.workspaceId !== ctx.workspaceId) throw new Error("Not found");
  if (proposal.status !== "draft") throw new Error("Proposal already sent");

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "sent", sentAt: new Date() },
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "proposal",
    entityId: proposalId,
    action: "proposal_sent",
    content: `Proposal sent with ${proposal.milestones.length} milestones.`,
    actorUserId: ctx.userId,
    metadata: { leadId: proposal.leadId },
  });
  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "lead",
    entityId: proposal.leadId,
    action: "proposal_sent",
    content: "Proposal sent to client.",
    actorUserId: ctx.userId,
  });

  revalidatePath(`/leads/${proposal.leadId}`);
  return proposal;
}

export async function acceptProposal(proposalId: string) {
  const ctx = await assertAgencyAccess("proposal:write");
  const proposal = await prisma.proposal.findFirstOrThrow({
    where: { id: proposalId },
    include: { lead: true },
  });
  if (proposal.lead.workspaceId !== ctx.workspaceId) throw new Error("Not found");
  if (proposal.status !== "sent") throw new Error("Proposal must be sent first");

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "accepted", decidedAt: new Date() },
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "proposal",
    entityId: proposalId,
    action: "proposal_accepted",
    content: "Proposal accepted by client.",
    actorUserId: ctx.userId,
  });

  revalidatePath(`/leads/${proposal.leadId}`);
  return proposal;
}

export async function uploadProposalFile(proposalId: string, formData: FormData) {
  const ctx = await assertAgencyAccess("proposal:write");
  const proposal = await prisma.proposal.findFirstOrThrow({
    where: { id: proposalId },
    include: { lead: true },
  });
  if (proposal.lead.workspaceId !== ctx.workspaceId) throw new Error("Not found");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file");

  const blob = await uploadToBlob(file, `proposals/${proposalId}`);
  const record = await prisma.proposalFile.create({
    data: {
      proposalId,
      name: blob.name,
      url: blob.url,
      storageKey: blob.storageKey,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedById: ctx.userId,
    },
  });

  revalidatePath(`/leads/${proposal.leadId}`);
  return record;
}

export async function listProposalFiles(proposalId: string) {
  const ctx = await assertAgencyAccess("proposal:read");
  const proposal = await prisma.proposal.findFirstOrThrow({
    where: { id: proposalId },
    include: { lead: true },
  });
  if (proposal.lead.workspaceId !== ctx.workspaceId) throw new Error("Not found");
  return prisma.proposalFile.findMany({
    where: { proposalId },
    include: { uploadedBy: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteProposalFile(fileId: string) {
  const ctx = await assertAgencyAccess("proposal:write");
  const file = await prisma.proposalFile.findFirstOrThrow({
    where: { id: fileId },
    include: { proposal: { include: { lead: true } } },
  });
  if (file.proposal.lead.workspaceId !== ctx.workspaceId) throw new Error("Not found");
  await prisma.proposalFile.delete({ where: { id: fileId } });
  revalidatePath(`/leads/${file.proposal.leadId}`);
}
