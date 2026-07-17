"use client";

import { useState, useTransition } from "react";
import { submitProjectPlanClientNote } from "@/lib/actions/project-plan-client";

export function ClientPlanConcernForm({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p className="text-sm text-emerald-400 mt-4">Thanks — your project manager will review your note.</p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary-dark text-sm mt-4">
        Something doesn&apos;t look right
      </button>
    );
  }

  return (
    <form
      className="mt-4 space-y-3 border-t border-white/6 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const content = (fd.get("content") as string)?.trim();
        if (!content) return;
        startTransition(async () => {
          try {
            await submitProjectPlanClientNote({ projectId, content });
            setDone(true);
            setOpen(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not send");
          }
        });
      }}
    >
      <p className="text-sm text-text-darkSecondary">
        Tell us what seems off about the milestone plan or shared files (not milestone delivery review).
      </p>
      <textarea name="content" required rows={4} className="input-dark w-full" placeholder="Your note…" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary-dark text-sm px-4 py-2">
          {pending ? "Sending…" : "Send note"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary-dark text-sm px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
