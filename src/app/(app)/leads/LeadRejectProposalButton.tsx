"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rejectLeadProposal } from "@/lib/actions/leads";

export function LeadRejectProposalButton({
  leadId,
  variant = "banner",
}: {
  leadId: string;
  variant?: "banner" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (variant === "compact") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.stopPropagation();
          startTransition(async () => {
            try {
              await rejectLeadProposal(leadId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed");
            }
          });
        }}
        className="text-xs text-red-400/90 hover:text-red-300"
      >
        {pending ? "…" : "Proposal rejected"}
      </button>
    );
  }

  return (
    <div className="card-dark mb-6 border-red-500/25 bg-red-500/5 p-4 sm:p-5">
      <p className="text-white font-medium">Proposal outcome</p>
      <p className="text-sm text-text-darkSecondary mt-1">
        If the client declined, mark the lead lost and log it on the timeline.
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-secondary-dark text-sm mt-4 border-red-400/30 text-red-200"
        >
          Mark proposal rejected
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional reason (shared on lead log)"
            rows={2}
            className="input-dark w-full text-sm"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              className="btn-secondary-dark text-sm px-4 py-2"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await rejectLeadProposal(leadId, reason);
                    setOpen(false);
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed");
                  }
                });
              }}
            >
              {pending ? "Saving…" : "Confirm rejected → Lost"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary-dark text-sm px-4 py-2">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
