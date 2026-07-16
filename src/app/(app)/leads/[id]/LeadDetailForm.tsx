"use client";

import { useTransition } from "react";
import { updateLead } from "@/lib/actions/leads";
import { LeadStatus, LeadTemperature } from "@prisma/client";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  moneyBucket: string | null;
  timelineBucket: string | null;
};

export function LeadDetailForm({ lead }: { lead: Lead }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          void updateLead({
            id: lead.id,
            name: fd.get("name") as string,
            email: fd.get("email") as string,
            phone: (fd.get("phone") as string) || undefined,
            company: (fd.get("company") as string) || undefined,
            notes: (fd.get("notes") as string) || undefined,
            status: fd.get("status") as LeadStatus,
            temperature: fd.get("temperature") as LeadTemperature,
            moneyBucket: (fd.get("moneyBucket") as "low" | "mid" | "high") || undefined,
            timelineBucket: (fd.get("timelineBucket") as "short" | "medium" | "long") || undefined,
          });
        });
      }}
    >
      <input name="name" defaultValue={lead.name} className="input-dark text-sm" />
      <input name="email" type="email" defaultValue={lead.email} className="input-dark text-sm" />
      <input name="company" defaultValue={lead.company ?? ""} className="input-dark text-sm" />
      <input name="phone" defaultValue={lead.phone ?? ""} className="input-dark text-sm" />
      <select name="status" defaultValue={lead.status} className="input-dark text-sm">
        {["new", "contacted", "qualified", "proposal", "won", "lost", "archived"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select name="temperature" defaultValue={lead.temperature} className="input-dark text-sm">
        {["hot", "warm", "cold"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select name="moneyBucket" defaultValue={lead.moneyBucket ?? ""} className="input-dark text-sm">
        <option value="">budget</option>
        {["low", "mid", "high"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select name="timelineBucket" defaultValue={lead.timelineBucket ?? ""} className="input-dark text-sm">
        <option value="">timeline</option>
        {["short", "medium", "long"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <textarea name="notes" defaultValue={lead.notes ?? ""} className="input-dark text-sm min-h-[80px]" />
      <button type="submit" disabled={pending} className="btn-primary-dark text-sm">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
