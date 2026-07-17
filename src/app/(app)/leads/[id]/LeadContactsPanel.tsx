"use client";

import { useState, useTransition } from "react";
import { createContact, deleteContact, updateContact } from "@/lib/actions/contacts";

type ContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
};

export function LeadContactsPanel({
  leadId,
  contacts,
  canManage,
}: {
  leadId: string;
  contacts: ContactRow[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div className="card-dark p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-white mb-3">Contacts</h3>
      <ul className="space-y-2 mb-4">
        {contacts.map((c) => (
          <li key={c.id} className="text-sm flex justify-between gap-2">
            <div>
              <span className="text-white">{c.name}</span>
              {c.isPrimary && (
                <span className="ml-2 text-xs text-emerald-400/80">primary</span>
              )}
              {c.email && <p className="text-xs text-text-darkSecondary">{c.email}</p>}
            </div>
            {canManage && (
              <button
                type="button"
                className="text-xs text-red-400/80 hover:text-red-300"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void deleteContact(c.id);
                  })
                }
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {contacts.length === 0 && (
          <p className="text-xs text-text-darkSecondary">No contacts yet.</p>
        )}
      </ul>
      {canManage && (
        <form
          className="space-y-2 border-t border-white/6 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            startTransition(async () => {
              await createContact({
                leadId,
                name: name.trim(),
                email: email || undefined,
                isPrimary: contacts.length === 0,
              });
              setName("");
              setEmail("");
            });
          }}
        >
          <input
            className="input-dark w-full text-sm"
            placeholder="Contact name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input-dark w-full text-sm"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn-secondary-dark text-xs w-full" disabled={pending}>
            Add contact
          </button>
        </form>
      )}
    </div>
  );
}
