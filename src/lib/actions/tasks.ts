"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertNotClientForTaskReview } from "@/lib/rbac";

const createTaskSchema = z.object({
  milestoneId: z.string(),
  projectId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateTaskSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assignedToId: z.string().nullable().optional(),
});

const reviewSchema = z.object({
  taskId: z.string(),
  status: z.enum(["approved", "changes_requested"]),
  feedback: z.string().optional(),
});

export async function createTask(data: z.infer<typeof createTaskSchema>) {
  const ctx = await assertPermission("task:create");
  const parsed = createTaskSchema.parse(data);

  const lastTask = await prisma.task.findFirst({
    where: { milestoneId: parsed.milestoneId },
    orderBy: { sortOrder: "desc" },
  });

  const isPm =
    ctx.workspaceRole === "project_manager" || ctx.workspaceRole === "agency_admin";

  const task = await prisma.task.create({
    data: {
      ...parsed,
      createdById: ctx.userId,
      sortOrder: (lastTask?.sortOrder ?? -1) + 1,
      status: isPm ? TaskStatus.todo : TaskStatus.pending_pm_approval,
    },
  });

  revalidatePath(`/projects/${parsed.projectId}`);
  return task;
}

export async function approveTask(taskId: string) {
  const ctx = await assertPermission("task:approve");

  const task = await prisma.task.findFirstOrThrow({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
  });

  // Check sequential unlock
  const prevTask = await prisma.task.findFirst({
    where: { milestoneId: task.milestoneId, sortOrder: task.sortOrder - 1 },
  });

  if (prevTask && prevTask.status !== TaskStatus.approved && prevTask.status !== TaskStatus.done && !task.forceUnlocked) {
    throw new Error("Previous task must be approved before this task can proceed");
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.todo },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return updated;
}

export async function updateTask(data: z.infer<typeof updateTaskSchema>) {
  const ctx = await assertPermission("task:update");
  const { id, ...rest } = updateTaskSchema.parse(data);

  const task = await prisma.task.update({
    where: { id, project: { workspaceId: ctx.workspaceId } },
    data: rest,
  });

  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function transitionTask(taskId: string, status: TaskStatus) {
  const ctx = await assertPermission("task:update");

  const task = await prisma.task.findFirstOrThrow({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
  });

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return updated;
}

export async function reviewTask(data: z.infer<typeof reviewSchema>) {
  const ctx = await getSessionContextWithReview();
  const parsed = reviewSchema.parse(data);

  const task = await prisma.task.findFirstOrThrow({
    where: { id: parsed.taskId, project: { workspaceId: ctx.workspaceId } },
  });

  const lastReview = await prisma.taskReview.findFirst({
    where: { taskId: parsed.taskId },
    orderBy: { round: "desc" },
  });

  const newStatus =
    parsed.status === "approved" ? TaskStatus.approved : TaskStatus.changes_requested;

  await prisma.$transaction([
    prisma.taskReview.create({
      data: {
        taskId: parsed.taskId,
        reviewerId: ctx.userId,
        round: (lastReview?.round ?? 0) + 1,
        status: parsed.status,
        feedback: parsed.feedback,
      },
    }),
    prisma.task.update({
      where: { id: parsed.taskId },
      data: { status: newStatus },
    }),
  ]);

  revalidatePath(`/projects/${task.projectId}`);
}

async function getSessionContextWithReview() {
  const ctx = await assertPermission("task:review");
  assertNotClientForTaskReview(ctx.workspaceRole);
  return ctx;
}

export async function addTaskComment(taskId: string, content: string) {
  const ctx = await assertPermission("task:comment");
  assertNotClientForTaskReview(ctx.workspaceRole);

  const task = await prisma.task.findFirstOrThrow({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
  });

  const comment = await prisma.taskComment.create({
    data: { taskId, userId: ctx.userId, content },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return comment;
}

export async function toggleClientVisibility(taskId: string, clientVisible: boolean) {
  const ctx = await assertPermission("task:visibility");

  const task = await prisma.task.update({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
    data: { clientVisible },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/portal");
  return task;
}

export async function forceUnlockTask(taskId: string, auditNote: string) {
  const ctx = await assertPermission("task:approve");

  const task = await prisma.task.update({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
    data: { forceUnlocked: true, auditNote },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return task;
}
