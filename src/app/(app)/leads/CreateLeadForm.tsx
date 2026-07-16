"use client";

import { useState, useTransition } from "react";
import { createLead } from "@/lib/actions/leads";
import { LeadTemperature } from "@prisma/client";

export function CreateLeadForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" className="btn-primary-dark text-sm" onClick={() => setOpen(true)}>
        New lead
      </button>
    );
  }

  return (
    <form
      className="card-dark !p-4 space-y-2 w-full max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await createLead({
            name: fd.get("name") as string,
            email: fd.get("email") as string,
            company: (fd.get("company") as string) || undefined,
            phone: (fd.get("phone") as string) || undefined,
            temperature: (fd.get("temperature") as LeadTemperature) || undefined,
            moneyBucket: (fd.get("moneyBucket") as "low" | "mid" | "high") || undefined,
            timelineBucket: (fd.get("timelineBucket") as "short" | "medium" | "long") || undefined,
            notes: (fd.get("notes") as string) || undefined,
          });
          setOpen(false);
        });
      }}
    >
      <input name="name" required placeholder="Name" className="input-dark text-sm" />
      <input name="email" type="email" required placeholder="Email" className="input-dark text-sm" />
      <input name="company" placeholder="Company" className="input-dark text-sm" />
      <input name="phone" placeholder="Phone" className="input-dark text-sm" />
      <div className="grid grid-cols-3 gap-2">
        <select name="temperature" className="input-dark text-sm" defaultValue="warm">
          <option value="hot">hot</option>
          <option value="warm">warm</option>
          <option value="cold">cold</option>
        </select>
        <select name="moneyBucket" className="input-dark text-sm" defaultValue="">
          <option value="">budget</option>
          <option value="low">low</option>
          <option value="mid">mid</option>
          <option value="high">high</option>
        </select>
        <select name="timelineBucket" className="input-dark text-sm" defaultValue="">
          <option value="">timeline</option>
          <option value="short">short</option>
          <option value="medium">medium</option>
          <option value="long">long</option>
        </select>
      </div>
      <textarea name="notes" placeholder="Notes" className="input-dark text-sm min-h-[60px]" />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary-dark text-sm flex-1">
          {pending ? "Saving…" : "Create"}
        </button>
        <button type="button" className="btn-secondary-dark text-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
