"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { TaskStatus, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertAgencyAccess,
  assertNotClientForTaskReview,
} from "@/lib/rbac";
import { notifyWorkspaceRole } from "@/lib/notifications/events";

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

const DELIVERY_ROLES: WorkspaceRole[] = [
  WorkspaceRole.ux_designer,
  WorkspaceRole.product_engineer,
  WorkspaceRole.qa_engineer,
];

async function loadTaskInWorkspace(taskId: string, workspaceId: string) {
  return prisma.task.findFirstOrThrow({
    where: { id: taskId, project: { workspaceId } },
    include: { milestone: true },
  });
}

async function assertPreviousTaskApproved(task: { milestoneId: string; sortOrder: number; forceUnlocked: boolean }) {
  if (task.forceUnlocked) return;
  const prevTask = await prisma.task.findFirst({
    where: { milestoneId: task.milestoneId, sortOrder: task.sortOrder - 1 },
  });
  if (
    prevTask &&
    prevTask.status !== TaskStatus.approved &&
    prevTask.status !== TaskStatus.done
  ) {
    throw new Error("Previous task must be approved before this task can proceed");
  }
}

function canCreateOnMilestone(workspaceRole: WorkspaceRole, milestoneOwner: WorkspaceRole) {
  if (workspaceRole === WorkspaceRole.agency_admin || workspaceRole === WorkspaceRole.project_manager) {
    return true;
  }
  return workspaceRole === milestoneOwner;
}

async function assertCanMutateTask(
  ctx: { userId: string; workspaceRole: WorkspaceRole },
  task: { assignedToId: string | null },
) {
  if (ctx.workspaceRole === WorkspaceRole.agency_admin || ctx.workspaceRole === WorkspaceRole.project_manager) {
    return;
  }
  if (DELIVERY_ROLES.includes(ctx.workspaceRole)) {
    if (task.assignedToId && task.assignedToId !== ctx.userId) {
      throw new Error("You can only update tasks assigned to you");
    }
  }
}

export async function createTask(data: z.infer<typeof createTaskSchema>) {
  const ctx = await assertAgencyAccess("task:create");
  const parsed = createTaskSchema.parse(data);

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: parsed.milestoneId, projectId: parsed.projectId, project: { workspaceId: ctx.workspaceId } },
  });

  if (!canCreateOnMilestone(ctx.workspaceRole, milestone.ownerRole)) {
    throw new Error("Your role cannot create tasks on this milestone");
  }

  const lastTask = await prisma.task.findFirst({
    where: { milestoneId: parsed.milestoneId },
    orderBy: { sortOrder: "desc" },
  });

  const isPm =
    ctx.workspaceRole === WorkspaceRole.project_manager || ctx.workspaceRole === WorkspaceRole.agency_admin;

  const task = await prisma.task.create({
    data: {
      ...parsed,
      createdById: ctx.userId,
      sortOrder: (lastTask?.sortOrder ?? -1) + 1,
      status: isPm ? TaskStatus.todo : TaskStatus.pending_pm_approval,
    },
  });

  if (!isPm) {
    await notifyWorkspaceRole({
      workspaceId: ctx.workspaceId,
      roles: ["project_manager", "agency_admin"],
      type: "task",
      title: "Task pending PM approval",
      message: task.title,
      href: `/projects/${parsed.projectId}`,
    });
  }

  revalidatePath(`/projects/${parsed.projectId}`);
  return task;
}

export async function approveTask(taskId: string) {
  const ctx = await assertAgencyAccess("task:approve");

  const task = await loadTaskInWorkspace(taskId, ctx.workspaceId);
  await assertPreviousTaskApproved(task);

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.todo },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return updated;
}

export async function updateTask(data: z.infer<typeof updateTaskSchema>) {
  const ctx = await assertAgencyAccess("task:update");
  const { id, ...rest } = updateTaskSchema.parse(data);

  const existing = await loadTaskInWorkspace(id, ctx.workspaceId);
  await assertCanMutateTask(ctx, existing);

  const task = await prisma.task.update({
    where: { id },
    data: rest,
  });

  revalidatePath(`/projects/${task.projectId}`);
  return task;
}

export async function transitionTask(taskId: string, status: TaskStatus) {
  const ctx = await assertAgencyAccess("task:update");

  const task = await loadTaskInWorkspace(taskId, ctx.workspaceId);
  await assertCanMutateTask(ctx, task);

  if (status === TaskStatus.in_progress || status === TaskStatus.in_review) {
    await assertPreviousTaskApproved(task);
  }

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

  const task = await loadTaskInWorkspace(parsed.taskId, ctx.workspaceId);

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
  const ctx = await assertAgencyAccess("task:review");
  assertNotClientForTaskReview(ctx.workspaceRole);
  return ctx;
}

export async function addTaskComment(taskId: string, content: string) {
  const ctx = await assertAgencyAccess("task:comment");
  assertNotClientForTaskReview(ctx.workspaceRole);

  const task = await loadTaskInWorkspace(taskId, ctx.workspaceId);

  const comment = await prisma.taskComment.create({
    data: { taskId, userId: ctx.userId, content },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return comment;
}

export async function toggleClientVisibility(taskId: string, clientVisible: boolean) {
  const ctx = await assertAgencyAccess("task:visibility");

  const task = await prisma.task.update({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
    data: { clientVisible },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/portal");
  return task;
}

export async function forceUnlockTask(taskId: string, auditNote: string) {
  const ctx = await assertAgencyAccess("task:approve");
  if (!auditNote.trim()) throw new Error("Audit note is required");

  const task = await prisma.task.update({
    where: { id: taskId, project: { workspaceId: ctx.workspaceId } },
    data: { forceUnlocked: true, auditNote: auditNote.trim() },
  });

  revalidatePath(`/projects/${task.projectId}`);
  return task;
}
