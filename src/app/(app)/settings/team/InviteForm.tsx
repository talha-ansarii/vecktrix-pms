"use client";

import { useTransition } from "react";
import { inviteUser } from "@/lib/actions/users";
import { WorkspaceRole } from "@prisma/client";

const ROLES = Object.values(WorkspaceRole).filter((r) => r !== "client");

export function InviteForm() {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2 flex-wrap"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          void inviteUser({
            email: fd.get("email") as string,
            role: fd.get("role") as WorkspaceRole,
          });
        });
        e.currentTarget.reset();
      }}
    >
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
    </form>
  );
}
