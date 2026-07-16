"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MilestoneStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertPermission, getSessionContext } from "@/lib/rbac";
import { sendEmail, milestoneReviewEmailHtml } from "@/lib/email/send";
import { notifyWorkspaceRole } from "@/lib/notifications/events";

const transitionSchema = z.object({
  milestoneId: z.string(),
  status: z.nativeEnum(MilestoneStatus),
});

const clientReviewSchema = z.object({
  milestoneId: z.string(),
  status: z.enum(["client_approved", "client_changes_requested"]),
  feedback: z.string().optional(),
});

const ALLOWED_TRANSITIONS: Partial<Record<MilestoneStatus, MilestoneStatus[]>> = {
  active: ["internal_complete", "blocked"],
  internal_complete: ["awaiting_client_review", "active"],
  awaiting_client_review: ["client_approved", "client_changes_requested"],
  client_approved: ["completed"],
  client_changes_requested: ["active"],
  blocked: ["active"],
};

async function assertMilestoneTasksComplete(milestoneId: string) {
  const incomplete = await prisma.task.count({
    where: {
      milestoneId,
      status: { notIn: [TaskStatus.approved, TaskStatus.done, TaskStatus.cancelled] },
    },
  });
  if (incomplete > 0) {
    throw new Error("All tasks must be approved or done before completing this milestone");
  }
}

async function unlockNextMilestone(projectId: string, currentSortOrder: number) {
  const next = await prisma.milestone.findFirst({
    where: { projectId, sortOrder: currentSortOrder + 1 },
  });
  if (next?.status === MilestoneStatus.locked) {
    await prisma.milestone.update({
      where: { id: next.id },
      data: { status: MilestoneStatus.active },
    });
  }
}

export async function updateMilestoneStatus(data: z.infer<typeof transitionSchema>) {
  const ctx = await assertAgencyAccess("milestone:write");
  const { milestoneId, status } = transitionSchema.parse(data);

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
    include: { project: true },
  });

  const allowed = ALLOWED_TRANSITIONS[milestone.status];
  if (allowed && !allowed.includes(status)) {
    throw new Error(`Cannot transition milestone from ${milestone.status} to ${status}`);
  }

  if (status === MilestoneStatus.internal_complete) {
    await assertMilestoneTasksComplete(milestoneId);
  }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status },
  });

  if (status === MilestoneStatus.completed) {
    await unlockNextMilestone(milestone.projectId, milestone.sortOrder);
  }

  revalidatePath(`/projects/${milestone.projectId}`);
  return updated;
}

export async function submitMilestoneForClientReview(milestoneId: string) {
  const ctx = await assertAgencyAccess("milestone:submit_client");

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
    include: { project: { include: { client: true } } },
  });

  await assertMilestoneTasksComplete(milestoneId);

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: MilestoneStatus.awaiting_client_review },
  });

  const portalUrl = `${(process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}/portal`;
  if (milestone.project.client.userId) {
    const user = await prisma.user.findUnique({ where: { id: milestone.project.client.userId } });
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: `Milestone ready for review — ${milestone.project.name}`,
        html: milestoneReviewEmailHtml(
          milestone.project.client.name,
          milestone.project.name,
          portalUrl,
        ),
      });
    }
  }

  await notifyWorkspaceRole({
    workspaceId: ctx.workspaceId,
    roles: ["project_manager", "agency_admin"],
    type: "milestone",
    title: "Milestone awaiting client review",
    message: milestone.title,
    href: `/projects/${milestone.projectId}`,
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath("/portal");
  return updated;
}

export async function clientReviewMilestone(data: z.infer<typeof clientReviewSchema>) {
  const ctx = await getSessionContext();
  await assertPermission("milestone:client_review");
  const parsed = clientReviewSchema.parse(data);

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: {
      id: parsed.milestoneId,
      status: MilestoneStatus.awaiting_client_review,
      project: { client: { userId: ctx.userId } },
    },
    include: { project: true },
  });

  const nextStatus =
    parsed.status === "client_approved"
      ? MilestoneStatus.completed
      : MilestoneStatus.client_changes_requested;

  await prisma.$transaction([
    prisma.milestoneReview.create({
      data: {
        milestoneId: parsed.milestoneId,
        reviewerId: ctx.userId,
        status: parsed.status,
        feedback: parsed.feedback,
      },
    }),
    prisma.milestone.update({
      where: { id: parsed.milestoneId },
      data: { status: nextStatus },
    }),
  ]);

  if (nextStatus === MilestoneStatus.completed) {
    await unlockNextMilestone(milestone.projectId, milestone.sortOrder);
  }

  revalidatePath("/portal");
  revalidatePath(`/projects/${milestone.projectId}`);
}

export async function overrideMilestone(milestoneId: string, note: string) {
  const ctx = await assertAgencyAccess("milestone:override");
  if (!note.trim()) throw new Error("Override note is required");

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
  });

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: MilestoneStatus.active },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  return { updated, note: note.trim(), overriddenBy: ctx.userId };
}

export async function updatePaymentStatus(milestoneId: string, paymentStatus: string) {
  const ctx = await assertAgencyAccess("payment:write");

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
  });

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { paymentStatus },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  return updated;
}
