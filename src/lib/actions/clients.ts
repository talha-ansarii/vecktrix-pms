"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertAgencyAccess, assertPermission, getSessionContext } from "@/lib/rbac";

const updateClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export async function listClients() {
  const ctx = await assertAgencyAccess("client:read");
  return prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      projects: {
        select: { id: true, name: true, status: true, publishedToClient: true },
      },
      lead: { select: { id: true } },
      _count: { select: { projects: true } },
      user: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClient(id: string) {
  const ctx = await assertPermission("client:read");
  return prisma.client.findFirstOrThrow({
    where: { id, workspaceId: ctx.workspaceId },
    include: {
      projects: true,
      user: { select: { id: true, name: true, email: true } },
      lead: {
        include: {
          proposal: {
            include: { milestones: { orderBy: { sortOrder: "asc" } } },
          },
        },
      },
    },
  });
}

export async function updateClient(data: z.infer<typeof updateClientSchema>) {
  const ctx = await assertPermission("client:write");
  const { id, ...rest } = updateClientSchema.parse(data);
  const client = await prisma.client.update({
    where: { id, workspaceId: ctx.workspaceId },
    data: rest,
  });
  revalidatePath("/clients");
  revalidatePath("/portal");
  return client;
}

export async function selfUpdateClient(data: z.infer<typeof updateClientSchema>) {
  const ctx = await getSessionContext();
  await assertPermission("client:self_update");
  const client = await prisma.client.findFirst({
    where: { userId: ctx.userId, workspaceId: ctx.workspaceId },
  });
  if (!client) throw new Error("No client profile linked");
  const { id: _id, ...rest } = updateClientSchema.parse({ ...data, id: client.id });
  const updated = await prisma.client.update({ where: { id: client.id }, data: rest });
  revalidatePath("/portal");
  return updated;
}

export async function getClientPortalData() {
  const ctx = await getSessionContext();
  await assertPermission("portal:read");
  const client = await prisma.client.findFirst({
    where: { userId: ctx.userId, workspaceId: ctx.workspaceId },
    include: {
      projects: {
        where: { publishedToClient: true },
        include: {
          files: {
            where: { clientVisible: true },
            orderBy: { createdAt: "desc" },
          },
          milestones: {
            orderBy: { sortOrder: "asc" },
            include: {
              payment: true,
              tasks: {
                where: { clientVisible: true },
                orderBy: { sortOrder: "asc" },
              },
              reviews: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
          planClientNotes: {
            orderBy: { createdAt: "desc" },
            take: 30,
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
  });
  return client;
}

export async function inviteClientToPortal(clientId: string) {
  await assertAgencyAccess("client:write");
  const ctx = await getSessionContext();
  const client = await prisma.client.findFirstOrThrow({
    where: { id: clientId, workspaceId: ctx.workspaceId },
  });
  if (client.userId) throw new Error("This client already has portal access.");
  const { inviteUser } = await import("@/lib/actions/users");
  await inviteUser({ email: client.email, role: WorkspaceRole.client });
  revalidatePath("/clients");
}
