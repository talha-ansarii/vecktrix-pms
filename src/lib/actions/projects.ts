"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkspaceRole, ProjectStatus, MilestoneStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertAdminOnly } from "@/lib/rbac";
import { appendProjectActivity } from "@/lib/project-activity";
import { writeLog } from "@/domain/audit/log";
import { notifyUser } from "@/lib/notifications/events";
import {
  assertProjectVisible,
  projectVisibilityWhere,
} from "@/lib/rbac/project-scope";
import { listForEntity } from "@/domain/audit/log";

const addMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  role: z.nativeEnum(WorkspaceRole),
});

export async function listProjects() {
  const ctx = await assertAgencyAccess("project:read");
  return prisma.project.findMany({
    where: projectVisibilityWhere(ctx.workspaceId, ctx.workspaceRole, ctx.userId),
    include: {
      client: { select: { id: true, name: true, company: true } },
      _count: { select: { milestones: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(id: string) {
  const ctx = await assertAgencyAccess("project:read");
  await assertProjectVisible(id, ctx.workspaceId, ctx.workspaceRole, ctx.userId);

  return prisma.project.findFirstOrThrow({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      client: true,
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      milestones: {
        orderBy: { sortOrder: "asc" },
        include: {
          payment: true,
          tasks: {
            orderBy: { sortOrder: "asc" },
            include: {
              assignedTo: { select: { id: true, name: true, email: true } },
              comments: {
                orderBy: { createdAt: "asc" },
                include: { user: { select: { name: true, email: true } } },
              },
              reviews: { orderBy: { createdAt: "desc" } },
            },
          },
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
      files: {
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: { select: { id: true, name: true, email: true } },
          milestone: { select: { id: true, title: true } },
        },
      },
      planClientNotes: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
}

export async function getProjectActivity(projectId: string) {
  const ctx = await assertAgencyAccess("project:read");
  await assertProjectVisible(projectId, ctx.workspaceId, ctx.workspaceRole, ctx.userId);
  return listForEntity(ctx.workspaceId, "project", projectId);
}

export async function addProjectMember(data: z.infer<typeof addMemberSchema>) {
  const ctx = await assertAgencyAccess("project:member_manage");
  const parsed = addMemberSchema.parse(data);
  const project = await prisma.project.findFirstOrThrow({
    where: { id: parsed.projectId, workspaceId: ctx.workspaceId },
  });
  const member = await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: project.id, userId: parsed.userId } },
    update: { role: parsed.role },
    create: { projectId: project.id, userId: parsed.userId, role: parsed.role },
  });
  await appendProjectActivity(project.id, {
    actorUserId: ctx.userId,
    type: "member_added",
    content: `Team member added with role ${parsed.role.replace(/_/g, " ")}.`,
  });
  revalidatePath(`/projects/${project.id}`);
  return member;
}

export async function listAssignableMembers() {
  const ctx = await assertAgencyAccess("project:member_manage");
  return prisma.workspaceMember.findMany({
    where: { workspaceId: ctx.workspaceId, role: { not: "client" } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const ctx = await assertAgencyAccess("project:write");
  const project = await prisma.project.update({
    where: { id: projectId, workspaceId: ctx.workspaceId },
    data: { status },
  });
  revalidatePath(`/projects/${projectId}`);
  return project;
}

export async function getProjectPublishEligibility(projectId: string) {
  const ctx = await assertAgencyAccess("project:read");
  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, workspaceId: ctx.workspaceId },
    select: {
      publishedToClient: true,
      publishedAt: true,
      unpublishedAt: true,
      _count: { select: { milestones: true } },
    },
  });
  const clientVisibleFiles = await prisma.projectFile.count({
    where: { projectId, clientVisible: true },
  });
  return {
    ...project,
    clientVisibleFileCount: clientVisibleFiles,
    canPublish:
      !project.publishedToClient && project._count.milestones >= 1 && clientVisibleFiles >= 1,
  };
}

export async function publishProjectToClient(projectId: string) {
  const ctx = await assertAgencyAccess("project:publish");

  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, workspaceId: ctx.workspaceId },
    include: { client: true },
  });

  if (project.publishedToClient) throw new Error("Project is already published");

  const milestoneCount = await prisma.milestone.count({ where: { projectId } });
  if (milestoneCount < 1) throw new Error("Add at least one milestone before publishing");

  const clientVisibleFiles = await prisma.projectFile.count({
    where: { projectId, clientVisible: true },
  });
  if (clientVisibleFiles < 1) {
    throw new Error("Mark at least one project file as visible to the client before publishing");
  }

  const now = new Date();
  await prisma.project.update({
    where: { id: projectId },
    data: { publishedToClient: true, publishedAt: now, unpublishedAt: null },
  });

  const firstMilestone = await prisma.milestone.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });
  if (firstMilestone?.status === MilestoneStatus.locked) {
    await prisma.milestone.update({
      where: { id: firstMilestone.id },
      data: { status: MilestoneStatus.active },
    });
  }

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "project",
    entityId: projectId,
    action: "published",
    content: "Project plan and shared files are now visible on the client portal.",
    actorUserId: ctx.userId,
    metadata: { clientVisible: true },
  });

  if (project.client.userId) {
    await notifyUser({
      userId: project.client.userId,
      workspaceId: ctx.workspaceId,
      type: "project",
      title: "Your project is ready",
      message: `${project.name} is now available in your portal.`,
      href: "/portal",
    });
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/clients");
}

export async function unpublishProjectFromClient(projectId: string) {
  const ctx = await assertAgencyAccess("project:publish");
  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, workspaceId: ctx.workspaceId },
  });
  if (!project.publishedToClient) throw new Error("Project is not published");

  await prisma.project.update({
    where: { id: projectId },
    data: { publishedToClient: false, unpublishedAt: new Date() },
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "project",
    entityId: projectId,
    action: "unpublished",
    content: "Project hidden from client portal.",
    actorUserId: ctx.userId,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/portal");
}

/** Admin-only legacy create — prefer createDraftProjectFromClient */
export async function createProject(data: {
  clientId: string;
  name: string;
  description?: string;
  startDate?: string;
}) {
  await assertAdminOnly();
  const { createDraftProjectFromClient } = await import("@/lib/actions/project-handoff");
  return createDraftProjectFromClient({
    clientId: data.clientId,
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    milestones: [],
    proposalFileIds: [],
  });
}
