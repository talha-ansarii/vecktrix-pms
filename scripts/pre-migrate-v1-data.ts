/**
 * Run BEFORE `npm run db:push` when upgrading v1 → v2 on a database with data.
 * Backs up to `.migration/v1-backup.json` (Prisma db push drops unknown SQL tables).
 *
 *   npm run db:pre-migrate
 *   npm run db:push -- --accept-data-loss
 *   npm run db:post-migrate
 *
 * No-op if the database is already on v2.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const BACKUP_PATH = join(process.cwd(), ".migration", "v1-backup.json");
const prisma = new PrismaClient();

type V1Backup = {
  exportedAt: string;
  leadStatuses: { leadId: string; oldStatus: string; convertedClientId: string | null }[];
  leadActivities: Record<string, unknown>[];
  leadFiles: Record<string, unknown>[];
  milestonePayments: { milestoneId: string; paymentStatus: string }[];
  projectPlanLogs: Record<string, unknown>[];
  projectFileLeadRefs: { projectFileId: string; sourceLeadFileId: string }[];
};

async function tableExists(name: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function columnExists(table: string, column: string) {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
}

async function isV2Database() {
  const hasActivityLog = await tableExists("ActivityLog");
  const hasProposal = await tableExists("Proposal");
  const hasLeadActivity = await tableExists("LeadActivity");
  return (hasActivityLog || hasProposal) && !hasLeadActivity;
}

async function main() {
  console.log(DRY_RUN ? "[DRY RUN] pre-migrate v1 data" : "Pre-migrating v1 data for schema push…");

  if (!(await tableExists("Lead"))) {
    console.log("No Lead table — nothing to pre-migrate.");
    return;
  }

  if (await isV2Database()) {
    console.log("Database is already on v2 (ActivityLog/Proposal present, no LeadActivity).");
    console.log("Skip pre-migrate. Use `npm run db:push` only if schema drifted.");
    return;
  }

  let leadStatusRows: { id: string; status: string; convertedClientId: string | null }[] = [];
  try {
    leadStatusRows = await prisma.$queryRaw`
      SELECT id, status::text AS status, "convertedClientId"
      FROM "Lead" WHERE status::text IN ('proposal', 'won')
    `;
  } catch {
    // v2 LeadStatus enum — proposal/won variants already removed
    leadStatusRows = [];
  }

  const backup: V1Backup = {
    exportedAt: new Date().toISOString(),
    leadStatuses: leadStatusRows.map((r) => ({
      leadId: r.id,
      oldStatus: r.status,
      convertedClientId: r.convertedClientId,
    })),
    leadActivities: [],
    leadFiles: [],
    milestonePayments: [],
    projectPlanLogs: [],
    projectFileLeadRefs: [],
  };

  if (await tableExists("LeadActivity")) {
    backup.leadActivities = await prisma.$queryRaw`
      SELECT id, "leadId", "userId", type, content, "pipelineStatus"::text AS "pipelineStatus", "createdAt"
      FROM "LeadActivity"
    `;
  }
  if (await tableExists("LeadFile")) {
    backup.leadFiles = await prisma.$queryRaw`SELECT * FROM "LeadFile"`;
  }
  if ((await tableExists("Milestone")) && (await columnExists("Milestone", "paymentStatus"))) {
    backup.milestonePayments = await prisma.$queryRaw`
      SELECT id AS "milestoneId", "paymentStatus" AS "paymentStatus"
      FROM "Milestone" WHERE "paymentStatus" IS NOT NULL
    `;
  }
  if (await tableExists("ProjectPlanLog")) {
    backup.projectPlanLogs = await prisma.$queryRaw`SELECT * FROM "ProjectPlanLog"`;
  }
  if ((await tableExists("ProjectFile")) && (await columnExists("ProjectFile", "sourceLeadFileId"))) {
    backup.projectFileLeadRefs = await prisma.$queryRaw`
      SELECT id AS "projectFileId", "sourceLeadFileId" AS "sourceLeadFileId"
      FROM "ProjectFile" WHERE "sourceLeadFileId" IS NOT NULL
    `;
  }

  const hasV1Artifacts =
    backup.leadStatuses.length > 0 ||
    backup.leadActivities.length > 0 ||
    backup.leadFiles.length > 0 ||
    backup.milestonePayments.length > 0 ||
    backup.projectPlanLogs.length > 0 ||
    backup.projectFileLeadRefs.length > 0 ||
    (await tableExists("LeadActivity")) ||
    (await tableExists("LeadFile")) ||
    (await tableExists("Role"));

  if (!hasV1Artifacts) {
    console.log("No v1 data to migrate — database appears clean or already upgraded.");
    return;
  }

  console.log("Backup summary:", {
    leadStatuses: backup.leadStatuses.length,
    leadActivities: backup.leadActivities.length,
    leadFiles: backup.leadFiles.length,
    milestonePayments: backup.milestonePayments.length,
    projectPlanLogs: backup.projectPlanLogs.length,
    projectFileLeadRefs: backup.projectFileLeadRefs.length,
  });

  if (!DRY_RUN) {
    mkdirSync(join(process.cwd(), ".migration"), { recursive: true });
    writeFileSync(BACKUP_PATH, JSON.stringify(backup, null, 2));
    console.log(`Wrote ${BACKUP_PATH}`);

    if (leadStatusRows.length > 0) {
      await prisma.$executeRaw`
        UPDATE "Lead" SET status = 'qualified' WHERE status::text IN ('proposal', 'won')
      `;
      console.log(`Updated ${leadStatusRows.length} lead status(es) to qualified.`);
    }

    const dropTables = [
      "LeadActivity",
      "LeadFile",
      "ProjectPlanLog",
      "ProjectActivity",
      "RolePermission",
      "UserRole",
      "Permission",
      "Role",
    ];
    for (const table of dropTables) {
      if (await tableExists(table)) {
        console.log(`Dropping legacy table ${table}…`);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      }
    }
  }

  console.log("\nPre-migrate complete. Next:");
  console.log("  npm run db:push -- --accept-data-loss");
  console.log("  npm run db:post-migrate");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
