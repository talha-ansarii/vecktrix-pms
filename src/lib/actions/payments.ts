"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAdminOnly } from "@/lib/rbac";
import { writeLog } from "@/domain/audit/log";
import { unlockNextMilestone } from "@/lib/actions/milestones";

export async function markPaymentPaid(milestoneId: string) {
  const ctx = await assertAdminOnly();

  const milestone = await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
    include: { payment: true, project: true },
  });

  const payment = milestone.payment
    ? await prisma.payment.update({
        where: { milestoneId },
        data: { status: PaymentStatus.paid, paidAt: new Date(), markedById: ctx.userId },
      })
    : await prisma.payment.create({
        data: {
          milestoneId,
          status: PaymentStatus.paid,
          paidAt: new Date(),
          markedById: ctx.userId,
        },
      });

  await unlockNextMilestone(milestone.projectId, milestone.sortOrder);

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "payment",
    entityId: payment.id,
    action: "payment_paid",
    content: `Payment recorded for milestone "${milestone.title}".`,
    actorUserId: ctx.userId,
    metadata: { milestoneId },
  });

  await writeLog({
    workspaceId: ctx.workspaceId,
    entityType: "project",
    entityId: milestone.projectId,
    action: "milestone_paid",
    content: `Payment recorded for "${milestone.title}"; next milestone unlocked.`,
    actorUserId: ctx.userId,
  });

  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath("/portal");
  return payment;
}

export async function getMilestonePayment(milestoneId: string) {
  const ctx = await assertAdminOnly();
  await prisma.milestone.findFirstOrThrow({
    where: { id: milestoneId, project: { workspaceId: ctx.workspaceId } },
  });
  return prisma.payment.findUnique({ where: { milestoneId } });
}
