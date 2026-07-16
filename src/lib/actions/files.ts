"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertPermission } from "@/lib/rbac";
import { deleteFromBlob, uploadToBlob } from "@/lib/storage/blob";

export async function listProjectFiles(projectId: string) {
  const ctx = await assertPermission("project:read");

  return prisma.projectFile.findMany({
    where: { projectId, project: { workspaceId: ctx.workspaceId } },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadProjectFile(formData: FormData) {
  const ctx = await assertPermission("project:write");

  const projectId = formData.get("projectId") as string;
  const milestoneId = (formData.get("milestoneId") as string) || undefined;
  const file = formData.get("file") as File | null;

  if (!projectId || !file?.size) {
    throw new Error("Project and file are required");
  }

  await prisma.project.findFirstOrThrow({
    where: { id: projectId, workspaceId: ctx.workspaceId },
  });

  if (milestoneId) {
    await prisma.milestone.findFirstOrThrow({
      where: { id: milestoneId, projectId },
    });
  }

  const uploaded = await uploadToBlob(file, `projects/${projectId}`);

  const record = await prisma.projectFile.create({
    data: {
      projectId,
      milestoneId,
      name: uploaded.name,
      url: uploaded.url,
      storageKey: uploaded.storageKey,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      uploadedById: ctx.userId,
      clientVisible: false,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/portal");
  return record;
}

export async function deleteProjectFile(fileId: string) {
  const ctx = await assertPermission("project:write");

  const file = await prisma.projectFile.findFirstOrThrow({
    where: { id: fileId, project: { workspaceId: ctx.workspaceId } },
  });

  try {
    await deleteFromBlob(file.storageKey);
  } catch {
    // Blob may already be removed; still delete DB row
  }

  await prisma.projectFile.delete({ where: { id: fileId } });

  revalidatePath(`/projects/${file.projectId}`);
  revalidatePath("/portal");
}

export async function toggleProjectFileVisibility(fileId: string, clientVisible: boolean) {
  const ctx = await assertPermission("task:visibility");

  const file = await prisma.projectFile.update({
    where: { id: fileId, project: { workspaceId: ctx.workspaceId } },
    data: { clientVisible },
  });

  revalidatePath(`/projects/${file.projectId}`);
  revalidatePath("/portal");
  return file;
}
