import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LeadSource, LeadTemperature, ServiceInterest } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitOrThrow, clientIpFromHeaders } from "@/lib/rate-limit";
import { notifyWorkspaceRole } from "@/lib/notifications/events";
import { writeLog } from "@/domain/audit/log";
import { sendEmail } from "@/lib/email/send";

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
    rateLimitOrThrow(`intake:${clientIpFromHeaders(req.headers)}`);
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

    await writeLog({
      workspaceId: workspace.id,
      entityType: "lead",
      entityId: lead.id,
      action: "created",
      content: "Lead received via website intake API",
    });

    await notifyWorkspaceRole({
      workspaceId: workspace.id,
      roles: ["sales", "agency_admin"],
      type: "lead",
      title: "New website lead",
      message: `${lead.name} (${lead.email})`,
      href: "/leads",
    });

    const salesEmail = process.env.SALES_NOTIFY_EMAIL;
    if (salesEmail) {
      await sendEmail({
        to: salesEmail,
        subject: `New lead: ${lead.name}`,
        html: `<p>New website lead: <strong>${lead.name}</strong> (${lead.email})</p>`,
      });
    }

    return NextResponse.json({ id: lead.id, created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Rate limit exceeded") {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("[intake]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
