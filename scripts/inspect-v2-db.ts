import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const clients = await prisma.client.findMany({ select: { id: true, name: true, email: true } });
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      sourceLeadId: true,
      milestones: { select: { id: true, title: true, status: true, sortOrder: true } },
      files: { select: { id: true, name: true, sourceProposalFileId: true } },
    },
  });
  console.log(JSON.stringify({ clients, projects }, null, 2));
}

main().finally(() => prisma.$disconnect());
