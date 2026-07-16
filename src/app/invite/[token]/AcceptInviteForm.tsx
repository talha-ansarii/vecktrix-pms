"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/actions/users";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await acceptInvite({
              token,
              name: fd.get("name") as string,
              password: fd.get("password") as string,
            });
            router.push("/login");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not accept invite");
          }
        });
      }}
    >
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Email</label>
        <input value={email} disabled className="input-dark opacity-70" />
      </div>
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Your name</label>
        <input name="name" required className="input-dark" />
      </div>
      <div>
        <label className="block text-sm text-text-darkSecondary mb-1.5">Password</label>
        <input name="password" type="password" required minLength={8} className="input-dark" />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary-dark w-full">
        {pending ? "Creating account…" : "Accept invite"}
      </button>
    </form>
  );
}
