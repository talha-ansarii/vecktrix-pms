"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { convertLeadToClient } from "@/lib/actions/leads";
import { cn } from "@/lib/utils";

export function ConvertLeadButton({
  leadId,
  size = "md",
}: {
  leadId: string;
  size?: "xs" | "md";
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 items-end">
        <p className="text-xs text-text-darkSecondary text-right max-w-[14rem]">
          Create a client account from this lead? You can add a project on the Clients page next.
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary-dark text-xs py-1.5 px-2.5"
            disabled={pending}
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className="btn-primary-dark text-xs py-1.5 px-2.5"
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const client = await convertLeadToClient(leadId);
                  router.push(`/clients?highlight=${client.id}`);
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Convert failed");
                }
              });
            }}
          >
            {pending ? "Converting…" : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => setConfirming(true)}
      className={cn(
        "btn-primary-dark",
        size === "xs" ? "text-xs py-1.5 px-3" : "text-sm py-2 px-4",
      )}
    >
      Convert → Client
    </button>
  );
}
