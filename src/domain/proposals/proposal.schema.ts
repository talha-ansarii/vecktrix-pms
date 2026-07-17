import { z } from "zod";
import { WorkspaceRole } from "@prisma/client";

export const proposalMilestoneSchema = z.object({
  title: z.string().min(1),
  sortOrder: z.number().int().min(0),
  ownerRole: z.nativeEnum(WorkspaceRole),
  amount: z.number().optional(),
});

export const updateProposalSchema = z.object({
  proposalId: z.string(),
  notes: z.string().optional(),
  milestones: z.array(proposalMilestoneSchema).optional(),
});

export const DEFAULT_PROPOSAL_MILESTONES = [
  { title: "Requirements gathering", sortOrder: 0, ownerRole: WorkspaceRole.project_manager },
  { title: "Design", sortOrder: 1, ownerRole: WorkspaceRole.ux_designer },
  { title: "Development", sortOrder: 2, ownerRole: WorkspaceRole.product_engineer },
  { title: "QA", sortOrder: 3, ownerRole: WorkspaceRole.qa_engineer },
  { title: "Deployment", sortOrder: 4, ownerRole: WorkspaceRole.product_engineer },
] as const;
