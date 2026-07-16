"use client";

import { useTransition } from "react";
import { submitMilestoneForClientReview, updateMilestoneStatus } from "@/lib/actions/milestones";
import type { MilestoneStatus } from "@prisma/client";

export function MilestoneActions({ milestoneId, status }: { milestoneId: string; status: MilestoneStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="mt-4 flex gap-2 flex-wrap">
      {status === "internal_complete" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { void submitMilestoneForClientReview(milestoneId); })}
          className="btn-primary-dark text-xs py-1.5 px-3"
        >
          Submit for client review
        </button>
      )}
      {status === "active" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { void updateMilestoneStatus({ milestoneId, status: "internal_complete" }); })}
          className="btn-secondary-dark text-xs py-1.5 px-3"
        >
          Mark internal complete
        </button>
      )}
      {status === "client_approved" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { void updateMilestoneStatus({ milestoneId, status: "completed" }); })}
          className="btn-primary-dark text-xs py-1.5 px-3"
        >
          Complete milestone
        </button>
      )}
    </div>
  );
}
