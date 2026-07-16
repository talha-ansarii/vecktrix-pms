"use client";

import { useState, useTransition } from "react";
import { clientReviewMilestone } from "@/lib/actions/milestones";

export function ClientMilestoneReview({ milestoneId }: { milestoneId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  return (
    <div className="mt-4 pt-4 border-t border-white/6 space-y-3">
      <p className="text-sm text-text-darkSecondary">This milestone is ready for your review.</p>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Optional feedback…"
        className="input-dark text-sm min-h-[80px]"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void clientReviewMilestone({ milestoneId, status: "client_approved", feedback });
            })
          }
          className="btn-primary-dark text-xs py-1.5 px-3"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void clientReviewMilestone({ milestoneId, status: "client_changes_requested", feedback });
            })
          }
          className="btn-secondary-dark text-xs py-1.5 px-3"
        >
          Request changes
        </button>
      </div>
    </div>
  );
}
