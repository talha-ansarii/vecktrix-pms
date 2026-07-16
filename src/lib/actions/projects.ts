"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkspaceRole, ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/rbac";
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
  const ctx = await assertPermission("project:read");

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
  const ctx = await assertPermission("project:read");

  return prisma.project.findFirstOrThrow({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      client: true,
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      milestones: {
        orderBy: { sortOrder: "asc" },
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          reviews: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });
}

export async function createProject(data: z.infer<typeof createProjectSchema>) {
  const ctx = await assertPermission("project:write");
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
  const ctx = await assertPermission("project:member_manage");
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

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const ctx = await assertPermission("project:write");

  const project = await prisma.project.update({
    where: { id: projectId, workspaceId: ctx.workspaceId },
    data: { status },
  });

  revalidatePath(`/projects/${projectId}`);
  return project;
}
