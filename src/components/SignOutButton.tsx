"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className ?? "btn-secondary-dark text-sm py-2 px-4"}
    >
      Sign out
    </button>
  );
}
