"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MilestoneStatus, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess } from "@/lib/rbac";
import { appendProjectPlanLog } from "@/lib/project-plan";

const milestoneDraftSchema = z.object({
  title: z.string().min(1),
  sortOrder: z.number().int().positive(),
  ownerRole: z.nativeEnum(WorkspaceRole),
});

const createHandoffSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  milestones: z.array(milestoneDraftSchema).min(1),
  leadFileIds: z.array(z.string()).default([]),
  assignPmUserId: z.string().optional(),
});

export async function getClientHandoffContext(clientId: string) {
  const ctx = await assertAgencyAccess("project:read");

  const client = await prisma.client.findFirstOrThrow({
    where: { id: clientId, workspaceId: ctx.workspaceId },
    include: {
      projects: { select: { id: true, name: true, publishedToClient: true } },
      lead: {
        include: {
          files: {
            include: { uploadedBy: { select: { name: true, email: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  return client;
}

export async function listHandoffPmOptions() {
  const ctx = await assertAgencyAccess("project:write");

  return prisma.workspaceMember.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      role: { in: [WorkspaceRole.project_manager, WorkspaceRole.agency_admin] },
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

async function promoteLeadFiles(
  projectId: string,
  leadId: string | undefined,
  leadFileIds: string[],
  workspaceId: string,
  uploadedById: string,
) {
  if (leadFileIds.length === 0 || !leadId) return [];

  const files = await prisma.leadFile.findMany({
    where: {
      id: { in: leadFileIds },
      leadId,
      lead: { workspaceId },
    },
  });

  const created = [];
  for (const lf of files) {
    const existing = await prisma.projectFile.findUnique({
      where: { sourceLeadFileId: lf.id },
    });
    if (existing) continue;

    const pf = await prisma.projectFile.create({
      data: {
        projectId,
        name: lf.name,
        url: lf.url,
        storageKey: lf.storageKey,
        mimeType: lf.mimeType,
        size: lf.size,
        clientVisible: true,
        sourceLeadFileId: lf.id,
        uploadedById,
      },
    });
    created.push(pf);
  }
  return created;
}

export async function createDraftProjectFromClient(data: z.infer<typeof createHandoffSchema>) {
  const ctx = await assertAgencyAccess("project:write");
  const parsed = createHandoffSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new Error(first?.message ?? "Invalid project details");
  }
  const input = parsed.data;

  const client = await prisma.client.findFirstOrThrow({
    where: { id: input.clientId, workspaceId: ctx.workspaceId },
    include: { lead: { select: { id: true, status: true } } },
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

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientId: input.clientId,
        name: input.name,
        description: input.description,
        publishedToClient: false,
        sourceLeadId: client.lead?.id,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
      },
    });

    for (const m of input.milestones) {
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

  const promoted = await promoteLeadFiles(
    project.id,
    client.lead?.id,
    input.leadFileIds,
    ctx.workspaceId,
    ctx.userId,
  );

  await appendProjectPlanLog(project.id, {
    actorUserId: ctx.userId,
    type: "project_created",
    summary: `Draft project "${project.name}" created${promoted.length ? ` with ${promoted.length} shared file(s) from the lead` : ""}.`,
    clientVisible: false,
  });

  if (client.lead?.id) {
    await prisma.leadActivity.create({
      data: {
        leadId: client.lead.id,
        userId: ctx.userId,
        type: "updated",
        content: `Draft project created: ${project.name}`,
        pipelineStatus: client.lead?.status,
      },
    });
  }

  revalidatePath("/clients");
  revalidatePath("/projects");
  revalidatePath(`/projects/${project.id}`);
  return { project, promotedCount: promoted.length };
}
