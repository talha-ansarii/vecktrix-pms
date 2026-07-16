"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertPermission, getSessionContext } from "@/lib/rbac";

const updateClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

export async function listClients() {
  const ctx = await assertPermission("client:read");

  return prisma.client.findMany({
    where: { workspaceId: ctx.workspaceId },
    include: {
      projects: { select: { id: true, name: true, status: true } },
      _count: { select: { projects: true } },
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

  const updated = await prisma.client.update({
    where: { id: client.id },
    data: rest,
  });

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
        include: {
          milestones: {
            orderBy: { sortOrder: "asc" },
            include: {
              tasks: {
                where: { clientVisible: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return client;
}
