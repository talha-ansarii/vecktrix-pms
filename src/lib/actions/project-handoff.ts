"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MilestoneStatus, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertAdminOnly } from "@/lib/rbac";
import { writeLog } from "@/domain/audit/log";
import { DEFAULT_PROPOSAL_MILESTONES } from "@/domain/proposals/proposal.schema";

const milestoneDraftSchema = z.object({
  title: z.string().min(1),
  sortOrder: z.number().int().min(0),
  ownerRole: z.nativeEnum(WorkspaceRole),
  amount: z.number().optional(),
});

const createHandoffSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  milestones: z.array(milestoneDraftSchema).optional(),
  proposalFileIds: z.array(z.string()).default([]),
  assignPmUserId: z.string().optional(),
});

export async function getClientHandoffContext(clientId: string) {
  const ctx = await assertAgencyAccess("client:read");
  const client = await prisma.client.findFirstOrThrow({
    where: { id: clientId, workspaceId: ctx.workspaceId },
    include: {
      projects: { select: { id: true, name: true, publishedToClient: true } },
      lead: {
        include: {
          proposal: {
            include: {
              milestones: { orderBy: { sortOrder: "asc" } },
              files: {
                include: { uploadedBy: { select: { name: true, email: true } } },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      },
    },
  });
  return client;
}

export async function listHandoffPmOptions() {
  const ctx = await assertAdminOnly();
  return prisma.workspaceMember.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      role: { in: [WorkspaceRole.project_manager, WorkspaceRole.agency_admin] },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function promoteProposalFiles(
  projectId: string,
  proposalId: string | undefined,
  fileIds: string[],
  workspaceId: string,
  uploadedById: string,
) {
  if (fileIds.length === 0 || !proposalId) return [];
  const files = await prisma.proposalFile.findMany({
    where: {
      id: { in: fileIds },
      proposalId,
      proposal: { lead: { workspaceId } },
    },
  });
  const created = [];
  for (const pf of files) {
    const existing = await prisma.projectFile.findUnique({
      where: { sourceProposalFileId: pf.id },
    });
    if (existing) continue;
    const record = await prisma.projectFile.create({
      data: {
        projectId,
        name: pf.name,
        url: pf.url,
        storageKey: pf.storageKey,
        mimeType: pf.mimeType,
        size: pf.size,
        clientVisible: true,
        sourceProposalFileId: pf.id,
        uploadedById,
      },
    });
    created.push(record);
  }
  return created;
}

export async function createDraftProjectFromClient(data: z.infer<typeof createHandoffSchema>) {
  const ctx = await assertAdminOnly();
  const parsed = createHandoffSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid project details");
  }
  const input = parsed.data;

  const client = await prisma.client.findFirstOrThrow({
    where: { id: input.clientId, workspaceId: ctx.workspaceId },
    include: {
      lead: {
        include: {
          proposal: { include: { milestones: { orderBy: { sortOrder: "asc" } } } },
        },
      },
    },
  });

  if (input.assignPmUserId) {
    const pmMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: ctx.workspaceId,
        userId: input.assignPmUserId,
        role: { in: [WorkspaceRole.project_manager, WorkspaceRole.agency_admin] },
      },
    });
    if (!pmMember) throw new Error("Selected user cannot be assigned as project manager");
  }

  const milestoneSource =
    input.milestones && input.milestones.length > 0
      ? input.milestones
      : client.lead?.proposal?.milestones.map((m) => ({
          title: m.title,
          sortOrder: m.sortOrder,
          ownerRole: m.ownerRole,
          amount: m.amount ?? undefined,
        })) ??
        DEFAULT_PROPOSAL_MILESTONES.map((m) => ({
          title: m.title,
          sortOrder: m.sortOrder,
          ownerRole: m.ownerRole,
        }));

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        publishedToClient: false,
        sourceLeadId: client.lead?.id,
        sourceProposalId: client.lead?.proposal?.id,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
      },
    });

    for (const m of milestoneSource) {
      await tx.milestone.create({
        data: {
          projectId: p.id,
          title: m.title,
          sortOrder: m.sortOrder,
          ownerRole: m.ownerRole,
          status: MilestoneStatus.locked,
        },
      });
    }

    await tx.projectMember.create({
      data: {
        projectId: p.id,
        userId: input.assignPmUserId ?? ctx.userId,
        role: WorkspaceRole.project_manager,
      },
    });

    return p;
  });

  const promoted = await promoteProposalFiles(
    project.id,
    client.lead?.proposal?.id,
    input.proposalFileIds,
    ctx.workspaceId,
    ctx.userId,
  );

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "project",
    entityId: project.id,
    action: "project_created",
    content: `Draft project "${project.name}" created${promoted.length ? ` with ${promoted.length} shared file(s)` : ""}.`,
    actorUserId: ctx.userId,
  });

  if (client.lead?.id) {
    await writeLog({
      workspaceId: ctx.workspaceId,
      entityType: "lead",
      entityId: client.lead.id,
      action: "project_created",
      content: `Draft project created: ${project.name}`,
      actorUserId: ctx.userId,
    });
  }

  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath(`/projects/${project.id}`);
  return { project, promotedCount: promoted.length };
}
