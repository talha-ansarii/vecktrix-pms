"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MilestoneStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/rbac";

const transitionSchema = z.object({
  milestoneId: z.string(),
  status: z.nativeEnum(MilestoneStatus),
});

const clientReviewSchema = z.object({
  milestoneId: z.string(),
  status: z.enum(["client_approved", "client_changes_requested"]),
  feedback: z.string().optional(),
});

export async function updateMilestoneStatus(data: z.infer<typeof transitionSchema>) {
  const ctx = await assertPermission("milestone:write");
  const { milestoneId, status } = transitionSchema.parse(data);

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
    include: { project: true },
  });

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status },
  });

  // Unlock next milestone when completed
  if (status === "completed") {
    const next = await prisma.milestone.findFirst({
      where: { projectId: milestone.projectId, sortOrder: milestone.sortOrder + 1 },
    });
    if (next?.status === "locked") {
      await prisma.milestone.update({
        where: { id: next.id },
        data: { status: "active" },
      });
    }
  }

  revalidatePath(`/projects/${milestone.projectId}`);
  return updated;
}

export async function submitMilestoneForClientReview(milestoneId: string) {
  const ctx = await assertPermission("milestone:submit_client");

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
  });

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: MilestoneStatus.awaiting_client_review },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath("/portal");
  return updated;
}

export async function clientReviewMilestone(data: z.infer<typeof clientReviewSchema>) {
  const ctx = await assertPermission("milestone:client_review");
  const parsed = clientReviewSchema.parse(data);

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: {
      id: parsed.milestoneId,
      status: MilestoneStatus.awaiting_client_review,
      project: { client: { userId: ctx.userId } },
    },
    include: { project: true },
  });

  const status =
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
      data: { status },
    }),
  ]);

  revalidatePath("/portal");
  revalidatePath(`/projects/${milestone.projectId}`);
}

export async function overrideMilestone(milestoneId: string, note: string) {
  const ctx = await assertPermission("milestone:override");

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
  });

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: MilestoneStatus.active },
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  return { updated, note, overriddenBy: ctx.userId };
}

export async function updatePaymentStatus(milestoneId: string, paymentStatus: string) {
  const ctx = await assertPermission("payment:write");

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
