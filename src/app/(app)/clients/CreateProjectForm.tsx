"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/lib/actions/projects";

export function CreateProjectForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary-dark text-sm px-3 py-1.5">
        New project
      </button>
    );
  }

  return (
    <form
      className="mt-4 space-y-3 border-t border-white/6 pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            const project = await createProject({
              clientId,
              name: fd.get("name") as string,
              description: (fd.get("description") as string) || undefined,
              startDate: (fd.get("startDate") as string) || undefined,
            });
            setOpen(false);
            router.push(`/projects/${project.id}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create project");
          }
        });
      }}
    >
      <p className="text-xs text-text-darkSecondary">Project for {clientName}</p>
      <input name="name" required placeholder="Project name" className="input-dark" />
      <textarea name="description" placeholder="Description (optional)" rows={2} className="input-dark" />
      <input name="startDate" type="date" className="input-dark" />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary-dark text-sm px-4 py-2">
          {pending ? "Creating…" : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary-dark text-sm px-4 py-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
