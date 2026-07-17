/**
 * One-time recovery after db:push dropped SQL backup tables.
 * Uses data captured during the failed migration session.
 */
import { PrismaClient, ProposalStatus, WorkspaceRole } from "@prisma/client";

const prisma = new PrismaClient();

const RECOVERY = {
  leadStatuses: [
    { leadId: "cmro6uzvo0001jm04eyrc1r82", oldStatus: "won" },
    { leadId: "cmro9gi6c0008lc04o5jxxm6r", oldStatus: "won" },
  ],
  leadFiles: [
    {
      id: "cmro7xncv000fjv043274fl0r",
      leadId: "cmro6uzvo0001jm04eyrc1r82",
      name: "Notes.pdf",
      url: "https://jb4m9ewaywtaiddy.public.blob.vercel-storage.com/leads/cmro6uzvo0001jm04eyrc1r82/1784249248404-Notes-CDs6mUEsPNh7tZ4ye9enCd0SY7pWaw.pdf",
      storageKey: "leads/cmro6uzvo0001jm04eyrc1r82/1784249248404-Notes-CDs6mUEsPNh7tZ4ye9enCd0SY7pWaw.pdf",
      mimeType: "application/pdf",
      size: 138397,
      uploadedById: "cmro1er6g0000r87vz6ka2lzz",
    },
    {
      id: "cmro9iggt000slc04he601g3t",
      leadId: "cmro9gi6c0008lc04o5jxxm6r",
      name: "FlowAgwnts (1).pdf",
      url: "https://jb4m9ewaywtaiddy.public.blob.vercel-storage.com/leads/cmro9gi6c0008lc04o5jxxm6r/1784251898861-FlowAgwnts__1_-NcSqdyFsJiCbmPYMR3yecDAcQjJJNk.pdf",
      storageKey: "leads/cmro9gi6c0008lc04o5jxxm6r/1784251898861-FlowAgwnts__1_-NcSqdyFsJiCbmPYMR3yecDAcQjJJNk.pdf",
      mimeType: "application/pdf",
      size: 181332,
      uploadedById: "cmro1er6g0000r87vz6ka2lzz",
    },
  ],
  milestonePayments: [{ milestoneId: "cmro9lh9o0003jo04lsocpkpr", paymentStatus: "pending" }],
  projectFileLeadRefs: [
    { projectFileId: "cmro9lhbc000fjo04sk3tda4x", sourceLeadFileId: "cmro9iggt000slc04he601g3t" },
  ],
};

const DEFAULT_MILESTONES = [
  { title: "Requirements gathering", sortOrder: 0, ownerRole: WorkspaceRole.project_manager },
  { title: "Design", sortOrder: 1, ownerRole: WorkspaceRole.ux_designer },
  { title: "Development", sortOrder: 2, ownerRole: WorkspaceRole.product_engineer },
  { title: "QA", sortOrder: 3, ownerRole: WorkspaceRole.qa_engineer },
  { title: "Deployment", sortOrder: 4, ownerRole: WorkspaceRole.product_engineer },
];

async function ensureProposal(leadId: string, oldStatus: string) {
  const existing = await prisma.proposal.findUnique({ where: { leadId } });
  if (existing) return existing.id;

  const proposal = await prisma.proposal.create({
    data: {
      leadId,
      status: oldStatus === "won" ? ProposalStatus.accepted : ProposalStatus.sent,
      decidedAt: oldStatus === "won" ? new Date() : undefined,
      milestones: { create: DEFAULT_MILESTONES },
    },
  });
  return proposal.id;
}

async function main() {
  for (const row of RECOVERY.leadStatuses) {
    await ensureProposal(row.leadId, row.oldStatus);
  }

  for (const file of RECOVERY.leadFiles) {
    const proposalId = await ensureProposal(file.leadId, "won");
    const { leadId: _leadId, ...fileData } = file;
    await prisma.proposalFile.upsert({
      where: { id: file.id },
      update: {},
      create: { ...fileData, proposalId },
    });
  }

  for (const row of RECOVERY.milestonePayments) {
    await prisma.payment.upsert({
      where: { milestoneId: row.milestoneId },
      update: { status: "pending" },
      create: { milestoneId: row.milestoneId, status: "pending" },
    });
  }

  for (const row of RECOVERY.projectFileLeadRefs) {
    await prisma.projectFile.update({
      where: { id: row.projectFileId },
      data: { sourceProposalFileId: row.sourceLeadFileId },
    });
  }

  console.log("Recovery complete (proposals, files, payment, project file ref).");
  console.log("Note: 26 lead activity log entries were lost when db:push dropped SQL backups.");
}

main().finally(() => prisma.$disconnect());
