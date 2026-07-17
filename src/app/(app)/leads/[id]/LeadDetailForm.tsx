"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLead } from "@/lib/actions/leads";
import { LeadStatus, LeadTemperature, ServiceInterest } from "@prisma/client";
import { formatStatus } from "@/lib/utils";
import { BucketRangeLegend, MoneyBucketSelect, TimelineBucketSelect } from "../LeadBucketSelects";

type Assignee = { id: string; name: string | null; email: string };

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: LeadStatus;
  temperature: LeadTemperature;
  serviceInterest: ServiceInterest | null;
  moneyBucket: string | null;
  timelineBucket: string | null;
  assignedToId: string | null;
};

const STATUSES = Object.values(LeadStatus);
const SERVICE_OPTIONS = Object.values(ServiceInterest);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-text-darkSecondary">{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 pt-4 border-t border-white/6 first:border-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-darkSecondary">{title}</h3>
      {children}
    </section>
  );
}

export function LeadDetailForm({
  lead,
  assignees,
  canWrite,
}: {
  lead: Lead;
  assignees: Assignee[];
  canWrite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canWrite) {
    return (
      <div className="space-y-2 text-sm text-text-darkSecondary">
        <p>
          <span className="text-white">Status:</span> {formatStatus(lead.status)}
        </p>
        <p>
          <span className="text-white">Temperature:</span> {lead.temperature}
        </p>
        {lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
      </div>
    );
  }

  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        setError(null);
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
              assignedToId: (() => {
                const v = fd.get("assignedToId") as string;
                return v ? v : null;
              })(),
              serviceInterest: (() => {
                const v = fd.get("serviceInterest") as string;
                return v ? (v as ServiceInterest) : undefined;
              })(),
            });
            setSaved(true);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
          }
        });
      }}
    >
      <Section title="Pipeline">
        <Field label="Status">
          <select name="status" defaultValue={lead.status} className="input-dark text-sm w-full">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-text-darkSecondary">
          Move to <strong className="text-white font-medium">qualified</strong> or{" "}
          <strong className="text-white font-medium">proposal</strong> before converting to a client.
        </p>
      </Section>

      <Section title="Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input name="name" defaultValue={lead.name} required className="input-dark text-sm w-full" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={lead.email} required className="input-dark text-sm w-full" />
          </Field>
          <Field label="Company">
            <input name="company" defaultValue={lead.company ?? ""} className="input-dark text-sm w-full" />
          </Field>
          <Field label="Phone">
            <input name="phone" defaultValue={lead.phone ?? ""} className="input-dark text-sm w-full" />
          </Field>
        </div>
      </Section>

      <Section title="Segregation">
        <div className="rounded-[4px] border border-white/6 bg-white/[0.02] p-3 mb-1">
          <BucketRangeLegend />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </Section>

      <Section title="Qualification">
        <Field label="Service interest">
          <select name="serviceInterest" defaultValue={lead.serviceInterest ?? ""} className="input-dark text-sm w-full">
            <option value="">Not set</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner (Sales)">
          <select name="assignedToId" defaultValue={lead.assignedToId ?? ""} className="input-dark text-sm w-full">
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
            placeholder="Discovery notes, proposals sent, next steps…"
            className="input-dark text-sm w-full min-h-[100px]"
          />
        </Field>
      </Section>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {saved && <p className="text-sm text-emerald-400">Saved.</p>}

      <button type="submit" disabled={pending} className="btn-primary-dark text-sm mt-2">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
