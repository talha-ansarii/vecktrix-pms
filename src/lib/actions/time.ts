"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/rbac";

const timeEntrySchema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  hours: z.number().positive(),
  description: z.string().optional(),
  date: z.string().optional(),
});

export async function listTimeEntries(projectId?: string) {
  const ctx = await assertPermission("time:read");

  return prisma.timeEntry.findMany({
    where: {
      project: { workspaceId: ctx.workspaceId },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });
}

export async function logTimeEntry(data: z.infer<typeof timeEntrySchema>) {
  const ctx = await assertPermission("time:write");
  const parsed = timeEntrySchema.parse(data);

  const project = await prisma.project.findFirstOrThrow({
    where: { id: parsed.projectId, workspaceId: ctx.workspaceId },
  });

  const entry = await prisma.timeEntry.create({
    data: {
      projectId: project.id,
      taskId: parsed.taskId,
      userId: ctx.userId,
      hours: parsed.hours,
      description: parsed.description,
      date: parsed.date ? new Date(parsed.date) : new Date(),
    },
  });

  revalidatePath("/reports");
  revalidatePath(`/projects/${project.id}`);
  return entry;
}

export async function getTimeReportSummary() {
  const ctx = await assertPermission("report:read");

  const entries = await prisma.timeEntry.groupBy({
    by: ["projectId"],
    where: { project: { workspaceId: ctx.workspaceId } },
    _sum: { hours: true },
    _count: true,
  });

  const projects = await prisma.project.findMany({
    where: { workspaceId: ctx.workspaceId },
    select: { id: true, name: true },
  });

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  return entries.map((e) => ({
    projectId: e.projectId,
    projectName: projectMap[e.projectId] ?? "Unknown",
    totalHours: e._sum.hours ?? 0,
    entryCount: e._count,
  }));
}
