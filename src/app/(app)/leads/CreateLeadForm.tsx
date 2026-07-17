"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLead } from "@/lib/actions/leads";
import { LeadTemperature } from "@prisma/client";
import { X } from "lucide-react";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-text-darkSecondary">{label}</span>
      {children}
    </label>
  );
}

export function CreateLeadForm({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className ?? "btn-primary-dark text-sm py-2.5 px-5 shrink-0"}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        New lead
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-lead-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <form
            className="relative w-full max-w-lg card-dark p-6 space-y-4 max-h-[min(90vh,720px)] overflow-y-auto"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const form = e.currentTarget;
              const fd = new FormData(form);
              startTransition(async () => {
                try {
                  await createLead({
                    name: fd.get("name") as string,
                    email: fd.get("email") as string,
                    company: (fd.get("company") as string) || undefined,
                    phone: (fd.get("phone") as string) || undefined,
                    temperature: (fd.get("temperature") as LeadTemperature) || undefined,
                    moneyBucket: (fd.get("moneyBucket") as "low" | "mid" | "high") || undefined,
                    timelineBucket:
                      (fd.get("timelineBucket") as "short" | "medium" | "long") || undefined,
                    notes: (fd.get("notes") as string) || undefined,
                  });
                  setOpen(false);
                  form.reset();
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not create lead");
                }
              });
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="create-lead-title" className="font-sans text-lg font-semibold text-white">
                  New lead
                </h2>
                <p className="text-sm text-text-darkSecondary mt-1">Add a prospect to your pipeline.</p>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-[4px] text-text-darkSecondary hover:text-white hover:bg-white/5"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">
                <input name="name" required placeholder="Jane Doe" className="input-dark text-sm w-full" />
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="jane@company.com"
                  className="input-dark text-sm w-full"
                />
              </Field>
              <Field label="Company">
                <input name="company" placeholder="Optional" className="input-dark text-sm w-full" />
              </Field>
              <Field label="Phone">
                <input name="phone" type="tel" placeholder="Optional" className="input-dark text-sm w-full" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Temperature">
                <select name="temperature" className="input-dark text-sm w-full" defaultValue="warm">
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </Field>
              <Field label="Budget">
                <select name="moneyBucket" className="input-dark text-sm w-full" defaultValue="">
                  <option value="">Not set</option>
                  <option value="low">Low</option>
                  <option value="mid">Mid</option>
                  <option value="high">High</option>
                </select>
              </Field>
              <Field label="Timeline">
                <select name="timelineBucket" className="input-dark text-sm w-full" defaultValue="">
                  <option value="">Not set</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                name="notes"
                placeholder="Context, next steps, source details…"
                className="input-dark text-sm w-full min-h-[88px]"
              />
            </Field>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
              <button
                type="button"
                className="btn-secondary-dark text-sm py-2.5 px-5"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" disabled={pending} className="btn-primary-dark text-sm py-2.5 px-5">
                {pending ? "Creating…" : "Create lead"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
