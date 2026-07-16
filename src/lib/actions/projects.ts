"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkspaceRole, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess } from "@/lib/rbac";
import { DEFAULT_MILESTONES } from "@/lib/services/milestones";

const createProjectSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
});

const addMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string(),
  role: z.nativeEnum(WorkspaceRole),
});

export async function listProjects() {
  const ctx = await assertAgencyAccess("project:read");

  return prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      client: { select: { id: true, name: true, company: true } },
      _count: { select: { milestones: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProject(id: string) {
  const ctx = await assertAgencyAccess("project:read");

  return prisma.project.findFirstOrThrow({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      client: true,
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      milestones: {
        orderBy: { sortOrder: "asc" },
        include: {
          tasks: {
            orderBy: { sortOrder: "asc" },
            include: {
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
    },
  });
}

export async function createProject(data: z.infer<typeof createProjectSchema>) {
  const ctx = await assertAgencyAccess("project:write");
  const parsed = createProjectSchema.parse(data);

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        workspaceId: ctx.workspaceId,
        clientId: parsed.clientId,
        name: parsed.name,
        description: parsed.description,
        status: ProjectStatus.planning,
        startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
      },
    });

    // Seed 5 default milestones
    for (const m of DEFAULT_MILESTONES) {
      await tx.milestone.create({
        data: {
          projectId: p.id,
          title: m.title,
          sortOrder: m.sortOrder,
          ownerRole: m.ownerRole,
          status: m.sortOrder === 1 ? "active" : "locked",
        },
      });
    }

    // Add creator as PM member
    await tx.projectMember.create({
      data: {
        projectId: p.id,
        userId: ctx.userId,
        role: WorkspaceRole.project_manager,
      },
    });

    return p;
  });

  revalidatePath("/projects");
  revalidatePath("/clients");
  return project;
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
    create: {
      projectId: project.id,
      userId: parsed.userId,
      role: parsed.role,
    },
  });

  revalidatePath(`/projects/${project.id}`);
  return member;
}

export async function listAssignableMembers() {
  const ctx = await assertAgencyAccess("project:member_manage");
  return prisma.workspaceMember.findMany({
    where: {
      workspaceId: ctx.workspaceId,
      role: { not: "client" },
    },
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
