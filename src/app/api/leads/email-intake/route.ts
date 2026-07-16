import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LeadSource, LeadTemperature } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitOrThrow, clientIpFromHeaders } from "@/lib/rate-limit";

const emailIntakeSchema = z.object({
  from: z.string().email(),
  subject: z.string().optional(),
  body: z.string().optional(),
  name: z.string().optional(),
  company: z.string().optional(),
});

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.LEAD_INTAKE_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  return req.headers.get("x-pms-intake-secret") === secret;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    rateLimitOrThrow(`email-intake:${clientIpFromHeaders(req.headers)}`);
    const body = await req.json();
    const parsed = emailIntakeSchema.parse(body);

    const workspace = await prisma.workspace.findFirst({ where: { slug: "vecktrix" } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not configured" }, { status: 500 });
    }

    const existing = await prisma.lead.findFirst({
      where: {
        workspaceId: workspace.id,
        email: parsed.from,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) {
      return NextResponse.json({ id: existing.id, created: false, duplicate: true });
    }

    const lead = await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.name ?? parsed.from.split("@")[0],
        email: parsed.from,
        company: parsed.company,
        notes: [parsed.subject, parsed.body].filter(Boolean).join("\n\n"),
        source: LeadSource.email,
        temperature: LeadTemperature.warm,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "email_intake",
        content: `Email lead: ${parsed.subject ?? "(no subject)"}`,
      },
    });

    return NextResponse.json({ id: lead.id, created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("[email-intake]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
