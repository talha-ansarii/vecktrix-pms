"use client";

import { useTransition } from "react";
import { revokeInvite } from "@/lib/actions/users";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => revokeInvite(inviteId))}
      className="btn-secondary-dark text-xs px-2 py-1 shrink-0"
    >
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}
