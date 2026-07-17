"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MilestoneStatus, PaymentStatus, TaskStatus, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertPermission, getSessionContext } from "@/lib/rbac";
import { sendEmail, milestoneReviewEmailHtml } from "@/lib/email/send";
import { notifyWorkspaceRole } from "@/lib/notifications/events";
import { appendProjectActivity } from "@/lib/project-activity";
import { writeLog } from "@/domain/audit/log";

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

export async function unlockNextMilestone(projectId: string, completedSortOrder: number) {
  const completed = await prisma.milestone.findFirst({
    where: { projectId, sortOrder: completedSortOrder },
    include: { payment: true },
  });
  if (!completed || completed.payment?.status !== PaymentStatus.paid) return;

  const next = await prisma.milestone.findFirst({
    where: { projectId, sortOrder: completedSortOrder + 1 },
  });
  if (next?.status === MilestoneStatus.locked) {
    await prisma.milestone.update({
      where: { id: next.id },
      data: { status: MilestoneStatus.active },
    });
  }
}

async function ensurePaymentRecord(milestoneId: string, amount?: number | null) {
  const existing = await prisma.payment.findUnique({ where: { milestoneId } });
  if (existing) return existing;
  return prisma.payment.create({
    data: { milestoneId, amount: amount ?? undefined, status: PaymentStatus.pending },
  });
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

  if (status === MilestoneStatus.internal_complete) {
    await appendProjectActivity(milestone.projectId, {
      actorUserId: ctx.userId,
      type: "milestone_internal_complete",
      content: `Milestone "${milestone.title}" marked internally complete.`,
    });
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
  if (!milestone.qaSignedOffAt) {
    throw new Error("QA must sign off before sending this milestone to the client");
  }

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

  await appendProjectActivity(milestone.projectId, {
    actorUserId: ctx.userId,
    type: "client_review_sent",
    content: `Sent milestone "${milestone.title}" to client for review.`,
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
    include: { project: { select: { id: true, clientId: true } } },
  });

  const nextStatus =
    parsed.status === "client_approved"
      ? MilestoneStatus.client_approved
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

  if (nextStatus === MilestoneStatus.client_approved) {
    const completed = await prisma.milestone.update({
      where: { id: parsed.milestoneId },
      data: { status: MilestoneStatus.completed },
    });
    const proposalMilestone = await prisma.proposalMilestone.findFirst({
      where: {
        proposal: { lead: { convertedClientId: milestone.project.clientId } },
        sortOrder: milestone.sortOrder,
      },
    });
    await ensurePaymentRecord(milestone.id, proposalMilestone?.amount);
    await appendProjectActivity(milestone.projectId, {
      actorUserId: ctx.userId,
      type: "client_milestone_approved",
      content: `Client approved milestone "${milestone.title}". Awaiting payment.`,
    });
    revalidatePath("/portal");
    revalidatePath(`/projects/${milestone.projectId}`);
    return completed;
  }

  await appendProjectActivity(milestone.projectId, {
    actorUserId: ctx.userId,
    type: "client_milestone_changes",
    content: `Client requested changes on milestone "${milestone.title}".`,
  });

  revalidatePath("/portal");
  revalidatePath(`/projects/${milestone.projectId}`);
}

export async function qaSignOffMilestone(milestoneId: string) {
  const ctx = await assertAgencyAccess("milestone:qa_signoff");

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
  });

  if (milestone.status !== MilestoneStatus.internal_complete) {
    throw new Error("Milestone must be internally complete before QA sign-off");
  }

  await assertMilestoneTasksComplete(milestoneId);

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { qaSignedOffAt: new Date() },
  });

  await appendProjectActivity(milestone.projectId, {
    actorUserId: ctx.userId,
    type: "qa_signoff",
    content: `QA signed off milestone "${milestone.title}".`,
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  return updated;
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

const planUpdateSchema = z.object({
  milestoneId: z.string(),
  title: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  ownerRole: z.nativeEnum(WorkspaceRole).optional(),
  description: z.string().optional(),
  dueDate: z.string().optional().nullable(),
});

export async function updateMilestonePlan(data: z.infer<typeof planUpdateSchema>) {
  const ctx = await assertAgencyAccess("milestone:write");
  const parsed = planUpdateSchema.parse(data);

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: parsed.milestoneId, project: { workspaceId: ctx.workspaceId } },
    include: { project: { select: { id: true, publishedToClient: true } } },
  });

  const updated = await prisma.milestone.update({
    where: { id: parsed.milestoneId },
    data: {
      title: parsed.title,
      sortOrder: parsed.sortOrder,
      ownerRole: parsed.ownerRole,
      description: parsed.description,
      dueDate: parsed.dueDate === undefined ? undefined : parsed.dueDate ? new Date(parsed.dueDate) : null,
    },
  });

  if (milestone.project.publishedToClient) {
    await writeLog({
      workspaceId: ctx.workspaceId,
      entityType: "project",
      entityId: milestone.project.id,
      action: "milestone_plan_updated",
      content: `Milestone "${milestone.title}" plan updated.`,
      actorUserId: ctx.userId,
      metadata: { milestoneId: milestone.id, clientVisible: true },
    });
  }

  revalidatePath(`/projects/${milestone.project.id}`);
  revalidatePath("/portal");
  return updated;
}

/** @deprecated use markPaymentPaid */
export async function updatePaymentStatus(milestoneId: string, paymentStatus: string) {
  if (paymentStatus === "paid") {
    const { markPaymentPaid } = await import("@/lib/actions/payments");
    return markPaymentPaid(milestoneId);
  }
  throw new Error("Only marking paid is supported in v2");
}
