import { PrismaClient, WorkspaceRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Vecktrix PMS v2...");

  const workspace = await prisma.workspace.upsert({
    where: { slug: "vecktrix" },
    update: { name: "Vecktrix" },
    create: { name: "Vecktrix", slug: "vecktrix" },
  });

  const ADMIN_EMAIL = "vecktrixai@gmail.com";
  const LEGACY_ADMIN_EMAIL = "admin@vecktrix.com";

  const legacyAdmin = await prisma.user.findUnique({ where: { email: LEGACY_ADMIN_EMAIL } });
  const adminByNewEmail = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (legacyAdmin && !adminByNewEmail) {
    await prisma.user.update({
      where: { id: legacyAdmin.id },
      data: { email: ADMIN_EMAIL },
    });
  }

  const hashedPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { hashedPassword, name: "Vecktrix Admin" },
    create: {
      email: ADMIN_EMAIL,
      name: "Vecktrix Admin",
      hashedPassword,
    },
  });

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: admin.id, workspaceId: workspace.id } },
    update: { role: WorkspaceRole.agency_admin },
    create: {
      userId: admin.id,
      workspaceId: workspace.id,
      role: WorkspaceRole.agency_admin,
    },
  });

  // Sample sales user for testing
  const salesEmail = "sales@vecktrix.com";
  const sales = await prisma.user.upsert({
    where: { email: salesEmail },
    update: {},
    create: {
      email: salesEmail,
      name: "Sales Rep",
      hashedPassword: await bcrypt.hash("Sales123!", 12),
    },
  });
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: sales.id, workspaceId: workspace.id } },
    update: { role: WorkspaceRole.sales },
    create: { userId: sales.id, workspaceId: workspace.id, role: WorkspaceRole.sales },
  });

  console.log("Seed complete:");
  console.log(`  Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`  Admin: ${ADMIN_EMAIL} / Admin123!`);
  console.log(`  Sales: ${salesEmail} / Sales123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
