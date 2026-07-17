/**
 * Run AFTER `npm run db:push` to restore v1 data from `.migration/v1-backup.json`.
 */
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, ProposalStatus, WorkspaceRole } from "@prisma/client";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const BACKUP_PATH = join(process.cwd(), ".migration", "v1-backup.json");
const prisma = new PrismaClient();

const DEFAULT_MILESTONES = [
  { title: "Requirements gathering", sortOrder: 0, ownerRole: WorkspaceRole.project_manager },
  { title: "Design", sortOrder: 1, ownerRole: WorkspaceRole.ux_designer },
  { title: "Development", sortOrder: 2, ownerRole: WorkspaceRole.product_engineer },
  { title: "QA", sortOrder: 3, ownerRole: WorkspaceRole.qa_engineer },
  { title: "Deployment", sortOrder: 4, ownerRole: WorkspaceRole.product_engineer },
];

type V1Backup = {
  leadStatuses: { leadId: string; oldStatus: string; convertedClientId: string | null }[];
  leadActivities: {
    id: string;
    leadId: string;
    userId: string | null;
    type: string;
    content: string;
    pipelineStatus: string | null;
    createdAt: string;
  }[];
  leadFiles: {
    id: string;
    leadId: string;
    name: string;
    url: string;
    storageKey: string;
    mimeType: string;
    size: number;
    uploadedById: string;
    createdAt: string;
  }[];
  milestonePayments: { milestoneId: string; paymentStatus: string }[];
  projectPlanLogs: {
    id: string;
    projectId: string;
    actorUserId: string | null;
    type: string;
    summary: string;
    metadata: unknown;
    clientVisible: boolean;
    createdAt: string;
  }[];
  projectFileLeadRefs: { projectFileId: string; sourceLeadFileId: string }[];
};

async function ensureProposalForLead(leadId: string, oldStatus: string | null): Promise<string> {
  const existing = await prisma.proposal.findUnique({ where: { leadId } });
  if (existing) return existing.id;

  const status: ProposalStatus =
    oldStatus === "won"
      ? ProposalStatus.accepted
      : oldStatus === "proposal"
        ? ProposalStatus.sent
        : ProposalStatus.draft;

  const proposal = await prisma.proposal.create({
    data: {
      leadId,
      status,
      sentAt: status === ProposalStatus.sent ? new Date() : undefined,
      decidedAt: status === ProposalStatus.accepted ? new Date() : undefined,
      milestones: {
        create: DEFAULT_MILESTONES.map((m) => ({
          title: m.title,
          sortOrder: m.sortOrder,
          ownerRole: m.ownerRole,
        })),
      },
    },
  });
  return proposal.id;
}

async function isV2Database() {
  const hasActivityLog = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'ActivityLog'
    ) AS exists
  `;
  return hasActivityLog[0]?.exists ?? false;
}

async function main() {
  console.log(DRY_RUN ? "[DRY RUN] post-migrate v1 data" : "Post-migrating v1 data into v2 tables…");

  if (!existsSync(BACKUP_PATH)) {
    if (await isV2Database()) {
      console.log("No backup file and database is already on v2 — nothing to restore.");
      return;
    }
    console.error(`Backup not found at ${BACKUP_PATH}`);
    console.error("Run `npm run db:pre-migrate` before `db:push`, then run this script.");
    process.exit(1);
  }

  const backup = JSON.parse(readFileSync(BACKUP_PATH, "utf8")) as V1Backup;

  const statusByLead = new Map(backup.leadStatuses.map((r) => [r.leadId, r.oldStatus]));

  console.log(`Restoring from backup (${backup.leadStatuses.length} status overrides)…`);

  for (const row of backup.leadStatuses) {
    if (!DRY_RUN) await ensureProposalForLead(row.leadId, row.oldStatus);
  }

  for (const file of backup.leadFiles) {
    if (DRY_RUN) continue;
    const oldStatus = statusByLead.get(file.leadId) ?? null;
    const proposalId = await ensureProposalForLead(file.leadId, oldStatus);
    const exists = await prisma.proposalFile.findUnique({ where: { id: file.id } });
    if (exists) continue;
    await prisma.proposalFile.create({
      data: {
        id: file.id,
        proposalId,
        name: file.name,
        url: file.url,
        storageKey: file.storageKey,
        mimeType: file.mimeType,
        size: file.size,
        uploadedById: file.uploadedById,
        createdAt: new Date(file.createdAt),
      },
    });
  }
  console.log(`  ProposalFiles: ${backup.leadFiles.length}`);

  for (const row of backup.leadActivities) {
    if (DRY_RUN) continue;
    const lead = await prisma.lead.findUnique({ where: { id: row.leadId }, select: { workspaceId: true } });
    if (!lead) continue;
    const exists = await prisma.activityLog.findFirst({
      where: { entityType: "lead", entityId: row.leadId, action: row.type, createdAt: new Date(row.createdAt) },
    });
    if (exists) continue;
    await prisma.activityLog.create({
      data: {
        workspaceId: lead.workspaceId,
        entityType: "lead",
        entityId: row.leadId,
        action: row.type,
        content: row.content,
        actorUserId: row.userId,
        metadata: row.pipelineStatus ? { pipelineStatus: row.pipelineStatus } : undefined,
        createdAt: new Date(row.createdAt),
      },
    });
  }
  console.log(`  ActivityLog (leads): ${backup.leadActivities.length}`);

  for (const row of backup.projectPlanLogs) {
    if (DRY_RUN) continue;
    const project = await prisma.project.findUnique({
      where: { id: row.projectId },
      select: { workspaceId: true },
    });
    if (!project) continue;
    await prisma.activityLog.create({
      data: {
        workspaceId: project.workspaceId,
        entityType: "project",
        entityId: row.projectId,
        action: row.type,
        content: row.summary,
        actorUserId: row.actorUserId,
        metadata: {
          clientVisible: row.clientVisible,
          ...(row.metadata && typeof row.metadata === "object" ? row.metadata : {}),
        },
        createdAt: new Date(row.createdAt),
      },
    });
  }
  console.log(`  ActivityLog (projects): ${backup.projectPlanLogs.length}`);

  for (const row of backup.milestonePayments) {
    if (DRY_RUN) continue;
    const status = row.paymentStatus === "paid" ? "paid" : "pending";
    await prisma.payment.upsert({
      where: { milestoneId: row.milestoneId },
      update: { status },
      create: {
        milestoneId: row.milestoneId,
        status,
        paidAt: status === "paid" ? new Date() : undefined,
      },
    });
  }
  console.log(`  Payments: ${backup.milestonePayments.length}`);

  for (const row of backup.projectFileLeadRefs) {
    if (DRY_RUN) continue;
    const proposalFile = await prisma.proposalFile.findUnique({ where: { id: row.sourceLeadFileId } });
    if (!proposalFile) {
      console.warn(`  Missing ProposalFile for ${row.sourceLeadFileId}`);
      continue;
    }
    await prisma.projectFile.update({
      where: { id: row.projectFileId },
      data: { sourceProposalFileId: proposalFile.id },
    });
  }
  console.log(`  ProjectFile refs: ${backup.projectFileLeadRefs.length}`);

  if (!DRY_RUN) {
    unlinkSync(BACKUP_PATH);
    console.log(`Removed ${BACKUP_PATH}`);
  }

  console.log("\nPost-migrate complete. Optional: npm run db:seed");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
