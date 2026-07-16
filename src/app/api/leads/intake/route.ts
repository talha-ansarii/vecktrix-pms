import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LeadSource, LeadTemperature, ServiceInterest } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const intakeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  serviceInterest: z.nativeEnum(ServiceInterest).optional(),
  notes: z.string().optional(),
});

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.LEAD_INTAKE_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  const headerSecret = req.headers.get("x-pms-intake-secret");
  return headerSecret === secret;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = intakeSchema.parse(body);

    const workspace = await prisma.workspace.findFirst({ where: { slug: "vecktrix" } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not configured" }, { status: 500 });
    }

    // Idempotent: same email within 24h
    const existing = await prisma.lead.findFirst({
      where: {
        workspaceId: workspace.id,
        email: parsed.email,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (existing) {
      return NextResponse.json({ id: existing.id, created: false });
    }

    const lead = await prisma.lead.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        company: parsed.company,
        serviceInterest: parsed.serviceInterest,
        notes: parsed.notes,
        source: LeadSource.website,
        temperature: LeadTemperature.warm,
      },
    });

    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "intake",
        content: "Lead received via website intake API",
      },
    });

    return NextResponse.json({ id: lead.id, created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("[intake]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
