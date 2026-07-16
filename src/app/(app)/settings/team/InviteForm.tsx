"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "@/lib/actions/users";
import { WorkspaceRole } from "@prisma/client";

const ROLES = Object.values(WorkspaceRole);

export function InviteForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            const result = await inviteUser({
              email: fd.get("email") as string,
              role: fd.get("role") as WorkspaceRole,
            });
            if (result.emailSent) {
              setSuccess("Invite sent by email.");
            } else {
              setSuccess(
                `Invite saved. Share this link (email not configured): ${result.inviteUrl ?? ""}`,
              );
            }
            e.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create invite");
          }
        });
      }}
    >
      <div className="flex gap-2 flex-wrap">
        <input name="email" type="email" required placeholder="email@company.com" className="input-dark text-sm py-2" />
        <select name="role" className="input-dark text-sm py-2 w-auto" defaultValue="project_manager">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button type="submit" disabled={pending} className="btn-primary-dark text-sm py-2 px-4">
          {pending ? "Sending…" : "Invite"}
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400 break-all">{success}</p>}
    </form>
  );
}
