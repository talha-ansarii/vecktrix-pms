import { WorkspaceRole } from "@prisma/client";

export const DEFAULT_MILESTONES: { title: string; ownerRole: WorkspaceRole; sortOrder: number }[] = [
  { title: "Requirements gathering", ownerRole: WorkspaceRole.project_manager, sortOrder: 1 },
  { title: "Design", ownerRole: WorkspaceRole.ux_designer, sortOrder: 2 },
  { title: "Development", ownerRole: WorkspaceRole.product_engineer, sortOrder: 3 },
  { title: "QA", ownerRole: WorkspaceRole.qa_engineer, sortOrder: 4 },
  { title: "Deployment", ownerRole: WorkspaceRole.product_engineer, sortOrder: 5 },
];

export async function seedProjectMilestones(projectId: string, tx: { milestone: { create: (args: unknown) => Promise<unknown> } }) {
  for (const m of DEFAULT_MILESTONES) {
    await tx.milestone.create({
      data: {
        projectId,
        title: m.title,
        sortOrder: m.sortOrder,
        ownerRole: m.ownerRole,
        status: m.sortOrder === 1 ? "active" : "locked",
      },
    });
  }
}
