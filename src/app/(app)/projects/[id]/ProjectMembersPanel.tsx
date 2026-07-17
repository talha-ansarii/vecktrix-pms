"use client";

import { useTransition } from "react";
import { addProjectMember } from "@/lib/actions/projects";
import { WorkspaceRole } from "@prisma/client";
import { formatStatus } from "@/lib/utils";

type MemberOption = {
  userId: string;
  user: { id: string; name: string | null; email: string | null };
  role: WorkspaceRole;
};

export function ProjectMembersPanel({
  projectId,
  members,
  assignable,
}: {
  projectId: string;
  members: { id: string; user: { id: string; name: string | null; email: string | null }; role: WorkspaceRole }[];
  assignable: MemberOption[];
}) {
  const [pending, startTransition] = useTransition();

  const memberIds = new Set(members.map((m) => m.user.id));
  const available = assignable.filter((a) => !memberIds.has(a.user.id));

  return (
    <div className="card-dark">
      <h3 className="overline-text text-text-darkSecondary mb-4">Team on this project</h3>
      <ul className="space-y-3 mb-4">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between text-sm">
            <span className="text-white">{m.user.name ?? m.user.email}</span>
            <span className="text-text-darkSecondary text-xs">{formatStatus(m.role)}</span>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <form
          className="space-y-2 border-t border-white/6 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => {
              void addProjectMember({
                projectId,
                userId: fd.get("userId") as string,
                role: fd.get("role") as WorkspaceRole,
              });
            });
          }}
        >
          <p className="text-xs text-text-darkSecondary">Add member</p>
          <select name="userId" required className="input-dark text-sm">
            <option value="">Select user</option>
            {available.map((a) => (
              <option key={a.user.id} value={a.user.id}>
                {a.user.name ?? a.user.email}
              </option>
            ))}
          </select>
          <select name="role" className="input-dark text-sm" defaultValue={WorkspaceRole.product_engineer}>
            {Object.values(WorkspaceRole)
              .filter((r) => r !== "client" && r !== "agency_admin" && r !== "sales")
              .map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
          </select>
          <button type="submit" disabled={pending} className="btn-secondary-dark text-xs w-full py-2">
            {pending ? "Adding…" : "Add to project"}
          </button>
        </form>
      )}
    </div>
  );
}
