"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LeadStatus } from "@prisma/client";
import { formatStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PIPELINE: LeadStatus[] = [
  LeadStatus.new,
  LeadStatus.contacted,
  LeadStatus.qualified,
  LeadStatus.proposal,
  LeadStatus.won,
];

export function LeadsPipelineStepper({
  counts,
  activeStatus,
}: {
  counts: Record<string, number>;
  activeStatus?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function go(status: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (!status) params.delete("status");
    else params.set("status", status);
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="card-dark p-4 overflow-x-auto">
      <p className="text-xs font-medium text-text-darkSecondary mb-3">Pipeline</p>
      <ol className="flex items-stretch min-w-[36rem] gap-1">
        {PIPELINE.map((status, i) => {
          const selected = activeStatus === status;
          const count = counts[status] ?? 0;
          return (
            <li key={status} className="flex flex-1 items-stretch min-w-0">
              <button
                type="button"
                onClick={() => go(selected ? null : status)}
                className={cn(
                  "flex-1 rounded-[4px] border px-2 py-2 text-left transition-colors",
                  selected
                    ? "border-white/25 bg-white/10"
                    : "border-white/6 bg-white/[0.02] hover:bg-white/5",
                )}
              >
                <span className="block text-[10px] uppercase tracking-wider text-text-darkSecondary">
                  {i + 1}. {formatStatus(status)}
                </span>
                <span className="block text-lg font-medium text-white tabular-nums">{count}</span>
              </button>
              {i < PIPELINE.length - 1 && (
                <span className="self-center text-text-darkSecondary px-0.5" aria-hidden>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-2 mt-3 text-xs">
        <button
          type="button"
          onClick={() => go(LeadStatus.lost)}
          className={cn(
            "px-2 py-1 rounded-[4px] border",
            activeStatus === LeadStatus.lost ? "border-red-400/40 text-red-300" : "border-white/10 text-text-darkSecondary",
          )}
        >
          Lost ({counts.lost ?? 0})
        </button>
        <button
          type="button"
          onClick={() => go(LeadStatus.archived)}
          className={cn(
            "px-2 py-1 rounded-[4px] border",
            activeStatus === LeadStatus.archived
              ? "border-white/25 text-white"
              : "border-white/10 text-text-darkSecondary",
          )}
        >
          Archived ({counts.archived ?? 0})
        </button>
        {activeStatus && (
          <button type="button" onClick={() => go(null)} className="text-text-darkSecondary hover:text-white underline">
            Clear filter
          </button>
        )}
      </div>
    </div>
  );
}
