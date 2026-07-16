import type { WorkspaceRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Attach portal user to existing Client row (from lead convert). */
export async function linkClientPortalUser(
  tx: Tx,
  params: { userId: string; workspaceId: string; email: string; role: WorkspaceRole },
) {
  if (params.role !== "client") return;

  const normalized = params.email.trim().toLowerCase();
  const client = await tx.client.findFirst({
    where: { workspaceId: params.workspaceId, email: normalized },
  });

  if (!client) {
    throw new Error(
      "No client record found for this email. Convert a lead to a client first, then invite to the portal.",
    );
  }

  if (client.userId && client.userId !== params.userId) {
    throw new Error("This client is already linked to another portal user.");
  }

  await tx.client.update({
    where: { id: client.id },
    data: { userId: params.userId },
  });
}
