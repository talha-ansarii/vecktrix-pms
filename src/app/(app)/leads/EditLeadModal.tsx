"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { LeadStatus, LeadTemperature, ServiceInterest } from "@prisma/client";
import { getLead, listLeadAssigneeOptions, updateLead } from "@/lib/actions/leads";
import { listLeadFiles } from "@/lib/actions/lead-files";
import { formatStatus } from "@/lib/utils";
import { BucketRangeLegend } from "./LeadBucketSelects";
import { MoneyBucketSelect, TimelineBucketSelect } from "./LeadBucketSelects";
import { LeadFilesPanel, type LeadFileRow } from "./[id]/LeadFilesPanel";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-text-darkSecondary">{label}</span>
      {children}
    </label>
  );
}

const STATUSES = Object.values(LeadStatus);
const SERVICE_OPTIONS = Object.values(ServiceInterest);

export function EditLeadModal({
  leadId,
  open,
  onClose,
}: {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lead, setLead] = useState<Awaited<ReturnType<typeof getLead>> | null>(null);
  const [files, setFiles] = useState<LeadFileRow[]>([]);
  const [assignees, setAssignees] = useState<Awaited<ReturnType<typeof listLeadAssigneeOptions>>>([]);

  useEffect(() => {
    if (!open || !leadId) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    Promise.all([getLead(leadId), listLeadFiles(leadId), listLeadAssigneeOptions()])
      .then(([l, f, a]) => {
        setLead(l);
        setFiles(f);
        setAssignees(a);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load lead"))
      .finally(() => setLoading(false));
  }, [open, leadId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !leadId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-lead-title"
    >
      <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-2xl card-dark p-6 max-h-[min(92vh,800px)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="edit-lead-title" className="font-sans text-lg font-semibold text-white">
              Edit lead
            </h2>
            <p className="text-sm text-text-darkSecondary mt-1">
              Update details, notes, and upload proposal files.
            </p>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-[4px] text-text-darkSecondary hover:text-white hover:bg-white/5"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && <p className="text-sm text-text-darkSecondary">Loading…</p>}
        {error && !loading && <p className="text-sm text-red-400 mb-4">{error}</p>}

        {lead && !loading && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setSaved(false);
              const form = e.currentTarget;
              const fd = new FormData(form);
              startTransition(async () => {
                try {
                  await updateLead({
                    id: lead.id,
                    name: fd.get("name") as string,
                    email: fd.get("email") as string,
                    phone: (fd.get("phone") as string) || undefined,
                    company: (fd.get("company") as string) || undefined,
                    notes: (fd.get("notes") as string) || undefined,
                    status: fd.get("status") as LeadStatus,
                    temperature: fd.get("temperature") as LeadTemperature,
                    moneyBucket: (fd.get("moneyBucket") as "low" | "mid" | "high") || undefined,
                    timelineBucket: (fd.get("timelineBucket") as "short" | "medium" | "long") || undefined,
                    serviceInterest: (() => {
                      const v = fd.get("serviceInterest") as string;
                      return v ? (v as ServiceInterest) : undefined;
                    })(),
                    assignedToId: (() => {
                      const v = fd.get("assignedToId") as string;
                      return v ? v : null;
                    })(),
                  });
                  setSaved(true);
                  router.refresh();
                  const refreshed = await listLeadFiles(lead.id);
                  setFiles(refreshed);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not save");
                }
              });
            }}
          >
            <Field label="Pipeline status">
              <select name="status" defaultValue={lead.status} className="input-dark text-sm w-full">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">
                <input name="name" defaultValue={lead.name} required className="input-dark text-sm w-full" />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  defaultValue={lead.email}
                  required
                  className="input-dark text-sm w-full"
                />
              </Field>
              <Field label="Company">
                <input name="company" defaultValue={lead.company ?? ""} className="input-dark text-sm w-full" />
              </Field>
              <Field label="Phone">
                <input name="phone" defaultValue={lead.phone ?? ""} className="input-dark text-sm w-full" />
              </Field>
            </div>

            <div className="rounded-[4px] border border-white/6 bg-white/[0.02] p-3">
              <BucketRangeLegend />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Temperature">
                <select name="temperature" defaultValue={lead.temperature} className="input-dark text-sm w-full">
                  {["hot", "warm", "cold"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Budget bucket">
                <MoneyBucketSelect defaultValue={lead.moneyBucket ?? ""} />
              </Field>
              <Field label="Timeline bucket">
                <TimelineBucketSelect defaultValue={lead.timelineBucket ?? ""} />
              </Field>
            </div>

            <Field label="Service interest">
              <select
                name="serviceInterest"
                defaultValue={lead.serviceInterest ?? ""}
                className="input-dark text-sm w-full"
              >
                <option value="">Not set</option>
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Owner">
              <select
                name="assignedToId"
                defaultValue={lead.assignedToId ?? ""}
                className="input-dark text-sm w-full"
              >
                <option value="">Unassigned</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes">
              <textarea
                name="notes"
                defaultValue={lead.notes ?? ""}
                placeholder="Discovery notes, next steps, call summaries…"
                className="input-dark text-sm w-full min-h-[120px]"
              />
            </Field>

            <div className="border-t border-white/6 pt-4">
              <LeadFilesPanel leadId={lead.id} files={files} canManage />
            </div>

            {saved && <p className="text-sm text-emerald-400">Saved.</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2">
              <a href={`/leads/${lead.id}`} className="text-sm text-text-darkSecondary hover:text-white self-center">
                Open full page →
              </a>
              <div className="flex gap-2 justify-end">
                <button type="button" className="btn-secondary-dark text-sm py-2.5 px-5" onClick={onClose}>
                  Close
                </button>
                <button type="submit" disabled={pending} className="btn-primary-dark text-sm py-2.5 px-5">
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
