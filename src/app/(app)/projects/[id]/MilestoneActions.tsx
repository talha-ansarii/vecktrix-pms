"use client";

import { useState, useTransition } from "react";
import {
  submitMilestoneForClientReview,
  updateMilestoneStatus,
  overrideMilestone,
  qaSignOffMilestone,
} from "@/lib/actions/milestones";
import { markPaymentPaid } from "@/lib/actions/payments";
import type { MilestoneStatus } from "@prisma/client";

export function MilestoneActions({
  milestoneId,
  status,
  canManageMilestones,
  canOverride,
  canPayment,
  canQaSignOff,
  qaSignedOff,
}: {
  milestoneId: string;
  status: MilestoneStatus;
  canManageMilestones: boolean;
  canOverride: boolean;
  canPayment: boolean;
  canQaSignOff: boolean;
  qaSignedOff: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [overrideNote, setOverrideNote] = useState("");

  if (!canManageMilestones && !canOverride && !canPayment && !canQaSignOff) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex gap-2 flex-wrap">
        {canQaSignOff && status === "internal_complete" && !qaSignedOff && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => { void qaSignOffMilestone(milestoneId); })}
            className="btn-primary-dark text-xs py-1.5 px-3"
          >
            QA sign-off
          </button>
        )}
        {canManageMilestones && status === "internal_complete" && qaSignedOff && (
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => { void submitMilestoneForClientReview(milestoneId); })}
            className="btn-primary-dark text-xs py-1.5 px-3"
          >
            Submit for client review
          </button>
        )}
        {canManageMilestones && status === "active" && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => {
                void updateMilestoneStatus({ milestoneId, status: "internal_complete" });
              })
            }
            className="btn-secondary-dark text-xs py-1.5 px-3"
          >
            Mark internal complete
          </button>
        )}
      </div>
      {canManageMilestones && status === "internal_complete" && !qaSignedOff && (
        <p className="text-xs text-amber-400/90">Waiting for QA sign-off before client review.</p>
      )}
      {canOverride && (
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={overrideNote}
            onChange={(e) => setOverrideNote(e.target.value)}
            placeholder="Override note"
            className="input-dark text-xs flex-1 min-w-[120px]"
          />
          <button
            type="button"
            disabled={pending || !overrideNote.trim()}
            onClick={() =>
              startTransition(() => {
                void overrideMilestone(milestoneId, overrideNote);
                setOverrideNote("");
              })
            }
            className="btn-secondary-dark text-xs py-1.5 px-3"
          >
            PM override → active
          </button>
        </div>
      )}
      {canPayment && status === "completed" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => { void markPaymentPaid(milestoneId); })}
          className="btn-primary-dark text-xs py-1.5 px-3"
        >
          Mark payment paid
        </button>
      )}
    </div>
  );
}
