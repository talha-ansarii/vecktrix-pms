"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import { createDraftProjectFromClient, getClientHandoffContext, listHandoffPmOptions } from "@/lib/actions/project-handoff";
import { DEFAULT_MILESTONES } from "@/lib/services/milestones";
import { formatStatus } from "@/lib/utils";

type MilestoneDraft = {
  title: string;
  sortOrder: number;
  ownerRole: WorkspaceRole;
};

const OWNER_ROLES = [
  WorkspaceRole.project_manager,
  WorkspaceRole.ux_designer,
  WorkspaceRole.product_engineer,
  WorkspaceRole.qa_engineer,
];

function defaultMilestones(): MilestoneDraft[] {
  return DEFAULT_MILESTONES.map((m) => ({
    title: m.title,
    sortOrder: m.sortOrder,
    ownerRole: m.ownerRole,
  }));
}

export function CreateProjectHandoffWizard({
  clientId,
  clientName,
  prominent,
}: {
  clientId: string;
  clientName: string;
  prominent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof getClientHandoffContext>> | null>(null);
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(defaultMilestones);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [assignPmUserId, setAssignPmUserId] = useState("");
  const [pmOptions, setPmOptions] = useState<Awaited<ReturnType<typeof listHandoffPmOptions>>>([]);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setMilestones(defaultMilestones());
    setLoading(true);
    getClientHandoffContext(clientId)
      .then((c) => {
        setCtx(c);
        const files = c.lead?.files ?? [];
        setSelectedFileIds(files.map((f) => f.id));
        const company = c.company ?? c.lead?.company ?? "";
        setProjectName(company ? `${company} — Delivery` : "");
        setProjectDescription("");
        setProjectStartDate("");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));

    listHandoffPmOptions()
      .then((opts) => {
        setPmOptions(opts);
        if (opts.length > 0) setAssignPmUserId(opts[0].userId);
      })
      .catch(() => setPmOptions([]));
  }, [open, clientId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const leadFiles = ctx?.lead?.files ?? [];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          prominent
            ? "btn-primary-dark w-full text-sm px-4 py-2.5 mt-4"
            : "btn-secondary-dark text-sm px-3 py-1.5 mt-4"
        }
      >
        {prominent ? "Create project & share proposals" : "Create project & share proposals"}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-2xl card-dark p-6 max-h-[min(92vh,800px)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="overline-text text-text-darkSecondary">New draft project</p>
            <h2 className="text-white text-xl font-medium">{clientName}</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-text-darkSecondary hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-text-darkSecondary">Loading…</p>
        ) : (
          <form
            id="handoff-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 0) {
                if (!projectName.trim()) {
                  setError("Project name is required");
                  return;
                }
                setError(null);
                setStep(1);
                return;
              }
              if (step === 1) {
                setError(null);
                setStep(2);
                return;
              }
              setError(null);
              startTransition(async () => {
                try {
                  const { project } = await createDraftProjectFromClient({
                    clientId,
                    name: projectName.trim(),
                    description: projectDescription.trim() || undefined,
                    startDate: projectStartDate || undefined,
                    milestones: milestones.map((m, i) => ({ ...m, sortOrder: i + 1 })),
                    leadFileIds: selectedFileIds,
                    assignPmUserId: assignPmUserId || undefined,
                  });
                  setOpen(false);
                  router.push(`/projects/${project.id}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to create project");
                }
              });
            }}
          >
            {step === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-text-darkSecondary">Step 1 — Project details</p>
                <input
                  name="name"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  className="input-dark w-full"
                />
                <textarea
                  name="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={3}
                  className="input-dark w-full"
                />
                <input
                  name="startDate"
                  type="date"
                  value={projectStartDate}
                  onChange={(e) => setProjectStartDate(e.target.value)}
                  className="input-dark w-full"
                />
                {pmOptions.length > 0 && (
                  <label className="block space-y-1.5">
                    <span className="text-xs text-text-darkSecondary">Assign project manager</span>
                    <select
                      value={assignPmUserId}
                      onChange={(e) => setAssignPmUserId(e.target.value)}
                      className="input-dark w-full text-sm"
                      required
                    >
                      {pmOptions.map((m) => (
                        <option key={m.userId} value={m.userId}>
                          {m.user.name ?? m.user.email} ({formatStatus(m.role)})
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-text-darkSecondary">Step 2 — Milestone plan (draft)</p>
                <ul className="space-y-2">
                  {milestones.map((m, idx) => (
                    <li key={idx} className="flex flex-wrap items-center gap-2 border border-white/6 rounded-lg p-3">
                      <span className="text-xs text-text-darkSecondary w-6">#{idx + 1}</span>
                      <input
                        value={m.title}
                        onChange={(e) => {
                          const next = [...milestones];
                          next[idx] = { ...next[idx], title: e.target.value };
                          setMilestones(next);
                        }}
                        className="input-dark flex-1 min-w-[140px]"
                        required
                      />
                      <select
                        value={m.ownerRole}
                        onChange={(e) => {
                          const next = [...milestones];
                          next[idx] = { ...next[idx], ownerRole: e.target.value as WorkspaceRole };
                          setMilestones(next);
                        }}
                        className="input-dark text-sm"
                      >
                        {OWNER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {formatStatus(r)}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            if (idx === 0) return;
                            const next = [...milestones];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setMilestones(next);
                          }}
                          className="btn-secondary-dark p-1.5"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === milestones.length - 1}
                          onClick={() => {
                            if (idx === milestones.length - 1) return;
                            const next = [...milestones];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            setMilestones(next);
                          }}
                          className="btn-secondary-dark p-1.5"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-text-darkSecondary">Step 3 — Share files from lead</p>
                {leadFiles.length === 0 ? (
                  <p className="text-sm text-text-darkSecondary">
                    No lead files linked. You can upload client-visible files on the project hub before publishing.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {leadFiles.map((f) => (
                      <li key={f.id} className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.includes(f.id)}
                          onChange={(e) => {
                            setSelectedFileIds((ids) =>
                              e.target.checked ? [...ids, f.id] : ids.filter((id) => id !== f.id),
                            );
                          }}
                        />
                        <span className="text-white">{f.name}</span>
                        <span className="text-text-darkSecondary text-xs">
                          {f.uploadedBy.name ?? f.uploadedBy.email}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2 pt-2">
              {step > 0 && (
                <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary-dark text-sm px-4 py-2">
                  Back
                </button>
              )}
              <button type="submit" disabled={pending} className="btn-primary-dark text-sm px-4 py-2">
                {pending ? "Creating…" : step < 2 ? "Next" : "Create draft project"}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary-dark text-sm px-4 py-2">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
