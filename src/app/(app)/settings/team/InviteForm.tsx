"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "@/lib/actions/users";
import { WorkspaceRole } from "@prisma/client";
import { InviteLinkCopy } from "./InviteLinkCopy";
import { WORKSPACE_INVITE_ROLES, formatWorkspaceRole } from "@/lib/team/invite-roles";

export function InviteForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLastInviteUrl(null);
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          try {
            const result = await inviteUser({
              email: fd.get("email") as string,
              role: fd.get("role") as WorkspaceRole,
            });
            setLastInviteUrl(result.inviteUrl);
            setSuccess(
              result.emailSent
                ? "Invite sent by email. You can also share this link:"
                : "Invite saved. Email was not sent — share this link:",
            );
            form.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create invite");
          }
        });
      }}
    >
      <div className="flex gap-2 flex-wrap">
        <input name="email" type="email" required placeholder="email@company.com" className="input-dark text-sm py-2" />
        <select name="role" className="input-dark text-sm py-2 w-auto" defaultValue={WorkspaceRole.project_manager}>
          {WORKSPACE_INVITE_ROLES.map((r) => (
            <option key={r} value={r}>
              {formatWorkspaceRole(r)}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="btn-primary-dark text-sm py-2 px-4">
          {pending ? "Sending…" : "Invite"}
        </button>
      </div>
      <p className="text-xs text-text-darkSecondary max-w-md">
        Designer, engineer, and QA roles are assigned per project — use the project team panel, not workspace invites.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}
      {lastInviteUrl && <InviteLinkCopy url={lastInviteUrl} />}
    </form>
  );
}
