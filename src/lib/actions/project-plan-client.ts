"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertPermission, getSessionContext } from "@/lib/rbac";
import { appendProjectPlanLog } from "@/lib/project-plan";
import { notifyWorkspaceRole } from "@/lib/notifications/events";

const noteSchema = z.object({
  projectId: z.string(),
  content: z.string().min(1).max(5000),
});

export async function submitProjectPlanClientNote(data: z.infer<typeof noteSchema>) {
  const ctx = await getSessionContext();
  await assertPermission("portal:read");
  const parsed = noteSchema.parse(data);

  const project = await prisma.project.findFirstOrThrow({
    where: {
      id: parsed.projectId,
      publishedToClient: true,
      client: { userId: ctx.userId, workspaceId: ctx.workspaceId },
    },
  });

  const note = await prisma.projectPlanClientNote.create({
    data: {
      projectId: project.id,
      userId: ctx.userId,
      content: parsed.content.trim(),
    },
  });

  await appendProjectPlanLog(project.id, {
    actorUserId: ctx.userId,
    type: "client_plan_note",
    summary: `Client noted a plan concern: ${parsed.content.trim().slice(0, 200)}${parsed.content.length > 200 ? "…" : ""}`,
    metadata: { noteId: note.id },
    clientVisible: false,
  });

  await notifyWorkspaceRole({
    workspaceId: ctx.workspaceId,
    roles: ["project_manager", "agency_admin"],
    type: "project",
    title: "Client plan concern",
    message: project.name,
    href: `/projects/${project.id}`,
  });

  revalidatePath("/portal");
  revalidatePath(`/projects/${project.id}`);
  return note;
}
