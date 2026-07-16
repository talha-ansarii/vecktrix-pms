import { PrismaClient, WorkspaceRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "lead:read", description: "View leads" },
  { key: "lead:write", description: "Create and update leads" },
  { key: "lead:convert", description: "Convert leads to clients" },
  { key: "client:read", description: "View clients" },
  { key: "client:write", description: "Update clients" },
  { key: "client:self_update", description: "Update own client profile" },
  { key: "project:read", description: "View projects" },
  { key: "project:write", description: "Create and update projects" },
  { key: "project:member_manage", description: "Manage project members" },
  { key: "milestone:read", description: "View milestones" },
  { key: "milestone:write", description: "Update milestones" },
  { key: "milestone:submit_client", description: "Submit milestone for client review" },
  { key: "milestone:client_review", description: "Review milestones as client" },
  { key: "milestone:override", description: "Override milestone gating" },
  { key: "task:read", description: "View tasks" },
  { key: "task:create", description: "Create tasks" },
  { key: "task:approve", description: "Approve tasks" },
  { key: "task:update", description: "Update assigned tasks" },
  { key: "task:review", description: "Review tasks internally" },
  { key: "task:comment", description: "Comment on tasks" },
  { key: "task:visibility", description: "Toggle client visibility" },
  { key: "time:read", description: "View time entries" },
  { key: "time:write", description: "Log time entries" },
  { key: "user:invite", description: "Invite users" },
  { key: "user:manage", description: "Manage users" },
  { key: "report:read", description: "View reports" },
  { key: "portal:read", description: "Access client portal" },
  { key: "payment:write", description: "Update payment status" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[] | "*"> = {
  agency_admin: "*",
  sales: ["lead:read", "lead:write", "lead:convert", "client:read", "client:write"],
  project_manager: [
    "project:read", "project:write", "project:member_manage",
    "milestone:read", "milestone:write", "milestone:submit_client", "milestone:override",
    "task:read", "task:create", "task:approve", "task:update", "task:review", "task:comment", "task:visibility",
    "client:read", "time:read", "time:write", "report:read", "payment:write",
  ],
  ux_designer: ["task:read", "task:create", "task:update", "task:review", "time:read", "time:write", "milestone:read", "project:read"],
  product_engineer: ["task:read", "task:create", "task:update", "task:review", "time:read", "time:write", "milestone:read", "project:read"],
  qa_engineer: ["task:read", "task:create", "task:update", "task:review", "time:read", "time:write", "milestone:read", "project:read"],
  client: ["portal:read", "client:self_update", "milestone:client_review"],
};

const ROLE_LABELS: Record<string, string> = {
  agency_admin: "Agency Admin",
  sales: "Sales",
  project_manager: "Project Manager",
  ux_designer: "UX Designer",
  product_engineer: "Product Engineer",
  qa_engineer: "QA Engineer",
  client: "Client",
};

async function main() {
  console.log("Seeding Vecktrix PMS...");

  // Upsert permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const permMap = Object.fromEntries(allPermissions.map((p) => [p.key, p.id]));

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "vecktrix" },
    update: { name: "Vecktrix" },
    create: { name: "Vecktrix", slug: "vecktrix" },
  });

  // Create roles with permissions
  for (const [slug, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug } },
      update: { name: ROLE_LABELS[slug] ?? slug },
      create: {
        workspaceId: workspace.id,
        slug,
        name: ROLE_LABELS[slug] ?? slug,
        description: `${ROLE_LABELS[slug]} role`,
      },
    });

    const keys = perms === "*" ? allPermissions.map((p) => p.key) : perms;
    const allowedIds = new Set(
      keys.map((key) => permMap[key]).filter((id): id is string => Boolean(id)),
    );
    for (const key of keys) {
      const permissionId = permMap[key];
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
    // Drop permissions removed from role definition (e.g. client role tightening)
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: [...allowedIds] } },
    });
  }

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

  // Create admin user
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

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "agency_admin" } },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId_workspaceId: { userId: admin.id, roleId: adminRole.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id, workspaceId: workspace.id },
  });

  console.log("Seed complete:");
  console.log(`  Workspace: ${workspace.name} (${workspace.slug})`);
  console.log(`  Admin: ${ADMIN_EMAIL} / Admin123!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
