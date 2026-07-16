"use client";

import { useTransition } from "react";
import { inviteClientToPortal } from "@/lib/actions/clients";

export function ClientPortalInviteButton({
  clientId,
  hasPortalAccess,
}: {
  clientId: string;
  hasPortalAccess: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (hasPortalAccess) {
    return <span className="text-xs text-emerald-400">Portal linked</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      className="btn-secondary-dark text-xs py-1.5 px-3 mt-3 w-full"
      onClick={() => startTransition(() => inviteClientToPortal(clientId))}
    >
      {pending ? "Sending invite…" : "Invite to portal"}
    </button>
  );
}
