"use client";

import { LeadStatus, ProposalStatus } from "@prisma/client";
import { cn, formatStatus } from "@/lib/utils";
import { LEAD_PIPELINE_STAGES, LEAD_TERMINAL_STAGES, pipelineStageLabel, proposalStageLabel } from "@/lib/leads/pipeline";

export function LeadPipelineBar({
  currentStatus,
  proposalStatus,
}: {
  currentStatus: LeadStatus;
  proposalStatus?: ProposalStatus;
}) {
  const terminal = LEAD_TERMINAL_STAGES.includes(currentStatus);
  const currentIndex = LEAD_PIPELINE_STAGES.indexOf(currentStatus);

  return (
    <div className="card-dark p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-darkSecondary mb-4">
        Pipeline journey
      </p>
      {proposalStatus && (
        <p className="text-sm text-white mb-3">
          Proposal: <span className="font-medium">{proposalStageLabel(proposalStatus)}</span>
        </p>
      )}
      {terminal ? (
        <p className="text-sm text-white">
          Current stage: <span className="font-medium">{pipelineStageLabel(currentStatus)}</span>
        </p>
      ) : (
        <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
          {LEAD_PIPELINE_STAGES.map((stage, i) => {
            const done = currentIndex > i;
            const active = currentIndex === i;
            return (
              <li key={stage} className="flex sm:flex-1 sm:items-center min-w-0">
                <div
                  className={cn(
                    "flex items-center gap-2 sm:flex-col sm:items-start sm:flex-1 rounded-[4px] px-2 py-2 sm:py-0",
                    active && "bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold border",
                      done && "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
                      active && "bg-white text-black border-white",
                      !done && !active && "border-white/15 text-text-darkSecondary",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-xs sm:text-[11px] uppercase tracking-wide",
                      active ? "text-white font-medium" : "text-text-darkSecondary",
                    )}
                  >
                    {formatStatus(stage)}
                  </span>
                </div>
                {i < LEAD_PIPELINE_STAGES.length - 1 && (
                  <span className="hidden sm:block flex-1 h-px bg-white/10 mx-2 min-w-[8px]" aria-hidden />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
