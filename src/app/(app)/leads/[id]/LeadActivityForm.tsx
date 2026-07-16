"use client";

import { useTransition } from "react";
import { addLeadActivity } from "@/lib/actions/leads";

export function LeadActivityForm({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          await addLeadActivity(leadId, fd.get("content") as string);
          e.currentTarget.reset();
        });
      }}
    >
      <input name="content" required placeholder="Add note…" className="input-dark text-sm flex-1" />
      <button type="submit" disabled={pending} className="btn-secondary-dark text-sm px-3">
        Add
      </button>
    </form>
  );
}
