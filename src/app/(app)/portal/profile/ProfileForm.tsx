"use client";

import { useTransition } from "react";
import { selfUpdateClient } from "@/lib/actions/clients";

export function ProfileForm({
  defaultValues,
}: {
  defaultValues: { id: string; name: string; email: string; phone: string; company: string };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="card-dark space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => {
          void selfUpdateClient({
            id: defaultValues.id,
            name: fd.get("name") as string,
            email: fd.get("email") as string,
            phone: (fd.get("phone") as string) || undefined,
            company: (fd.get("company") as string) || undefined,
          });
        });
      }}
    >
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Name</label>
        <input name="name" defaultValue={defaultValues.name} required className="input-dark" />
      </div>
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Email</label>
        <input name="email" type="email" defaultValue={defaultValues.email} required className="input-dark" />
      </div>
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Phone</label>
        <input name="phone" defaultValue={defaultValues.phone} className="input-dark" />
      </div>
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Company</label>
        <input name="company" defaultValue={defaultValues.company} className="input-dark" />
      </div>
      <button type="submit" disabled={pending} className="btn-primary-dark">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
