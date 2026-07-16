"use client";

import { useTransition } from "react";
import { convertLeadToClient } from "@/lib/actions/leads";

export function ConvertLeadButton({ leadId }: { leadId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => { void convertLeadToClient(leadId); })}
      className="btn-primary-dark text-xs py-1.5 px-3"
    >
      {pending ? "Converting…" : "Convert → Client"}
    </button>
  );
}
