"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LeadStatus } from "@prisma/client";
import { updateLeadStatus } from "@/lib/actions/leads";
import { formatStatus } from "@/lib/utils";

const STATUSES = Object.values(LeadStatus);

export function LeadStatusSelect({
  leadId,
  status,
  disabled,
  className,
}: {
  leadId: string;
  status: LeadStatus;
  disabled?: boolean;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      className={className ?? "input-dark text-xs py-1.5 w-full max-w-[9.5rem]"}
      value={status}
      disabled={disabled || pending}
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        startTransition(async () => {
          await updateLeadStatus(leadId, next);
          router.refresh();
        });
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {formatStatus(s)}
        </option>
      ))}
    </select>
  );
}
