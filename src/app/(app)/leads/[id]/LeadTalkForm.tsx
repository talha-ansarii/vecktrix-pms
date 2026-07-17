"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LeadStatus } from "@prisma/client";
import { addLeadActivity } from "@/lib/actions/leads";
import { formatStatus } from "@/lib/utils";

export function LeadTalkForm({ leadId, stage }: { leadId: string; stage: LeadStatus }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="card-dark p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-sans text-base font-semibold text-white">Log conversation</h2>
        <span className="text-xs text-text-darkSecondary">
          Recorded at stage: <span className="text-white">{formatStatus(stage)}</span>
        </span>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          const form = e.currentTarget;
          const fd = new FormData(form);
          const content = (fd.get("content") as string).trim();
          if (!content) return;
          startTransition(async () => {
            try {
              await addLeadActivity(leadId, content);
              form.reset();
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not save note");
            }
          });
        }}
      >
        <textarea
          name="content"
          required
          rows={4}
          placeholder="Call summary, email thread, meeting notes, objections, next steps…"
          className="input-dark text-sm w-full min-h-[100px]"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary-dark text-sm py-2 px-4">
          {pending ? "Saving…" : "Add to timeline"}
        </button>
      </form>
    </div>
  );
}
