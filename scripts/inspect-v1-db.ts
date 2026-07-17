import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const files = await prisma.$queryRaw`SELECT * FROM "LeadFile"`;
  const payments = await prisma.$queryRaw`SELECT id, "paymentStatus" FROM "Milestone" WHERE "paymentStatus" IS NOT NULL`;
  const pf = await prisma.$queryRaw`SELECT id, "sourceLeadFileId" FROM "ProjectFile" WHERE "sourceLeadFileId" IS NOT NULL`;
  const pa = await prisma.$queryRaw`SELECT count(*)::int as c FROM "ProjectActivity"`;
  console.log({ files, payments, pf, pa });
}

main().finally(() => prisma.$disconnect());
