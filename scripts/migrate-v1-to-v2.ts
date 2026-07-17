/**
 * Optional one-time migration from v1 schema to v2.
 *
 * Usage (after backup):
 *   DRY_RUN=1 npx tsx scripts/migrate-v1-to-v2.ts   # print plan only
 *   npx tsx scripts/migrate-v1-to-v2.ts             # execute (requires v1 tables still present)
 *
 * Fresh dev environments should use `npm run db:push` + `npm run db:seed` instead.
 */
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

/**
 * v1 → v2 field mapping reference
 * --------------------------------
 * LeadActivity / ProjectActivity / ProjectPlanLog → ActivityLog
 *   - entityType: "lead" | "project" | "proposal" | "client" | ...
 *   - entityId: source row id
 *   - action: v1 `type` or normalized verb
 *   - content: v1 `content` or `message`
 *   - actorUserId: v1 `userId` / `createdById`
 *   - metadata: JSON blob for extra fields
 *
 * LeadFile → ProposalFile
 *   - Requires Proposal row per lead (create draft if missing)
 *   - Maps url, storageKey, mimeType, size, uploadedById
 *
 * Lead.status `proposal` / `won` → separate Proposal.status
 *   - `proposal` on lead → Proposal.status = sent|draft based on files
 *   - `won` on lead → Proposal.status = accepted + convertedClientId if client exists
 *
 * Milestone.paymentStatus → Payment model
 *   - paid → Payment { status: "paid", paidAt }
 *   - pending → Payment { status: "pending" }
 *
 * Role / Permission / UserRole / RolePermission → dropped (code matrix in src/domain/rbac/matrix.ts)
 */
async function main() {
  const prisma = new PrismaClient();
  console.log(DRY_RUN ? "[DRY RUN] v1 → v2 migration plan" : "Starting v1 → v2 migration…");

  const steps = [
    "1. Back up production database",
    "2. Deploy v2 schema (`npm run db:push`) on a staging clone first",
    "3. Migrate LeadActivity → ActivityLog (entityType=lead)",
    "4. Migrate ProjectActivity + ProjectPlanLog → ActivityLog (entityType=project)",
    "5. For each lead with LeadFile: ensure Proposal exists, copy files to ProposalFile",
    "6. Map lead statuses: remove proposal/won; set Proposal.status accordingly",
    "7. For each milestone with paymentStatus: create Payment row",
    "8. Drop legacy tables after verification",
  ];

  steps.forEach((s) => console.log(`  ${s}`));

  if (DRY_RUN) {
    console.log("\nNo changes applied (DRY_RUN). Implement SQL/Prisma steps above against a staging clone.");
    await prisma.$disconnect();
    return;
  }

  // Staging implementation hooks — extend when migrating real v1 data:
  const leadCount = await prisma.lead.count().catch(() => 0);
  console.log(`\nFound ${leadCount} leads in current database.`);

  console.log(
    "\nMigration body not auto-executed — v1 tables may not exist on fresh v2 DB.\n" +
      "Copy this script into a staging job and implement per-step Prisma transactions using the mapping above.",
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
