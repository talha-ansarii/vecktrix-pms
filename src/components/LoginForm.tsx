"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

const URL_ERRORS: Record<string, string> = {
  NoWorkspaceAccess:
    "No workspace access for this account. Ask your admin to invite you, then sign in with the same email (Google or password).",
  AccessDenied: "Sign-in was denied. Use an invited email or contact your admin.",
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = searchParams.get("error");
    if (code && URL_ERRORS[code]) setError(URL_ERRORS[code]);
  }, [searchParams]);

  async function handleCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Image src="/logo.svg" alt="Vecktrix" width={160} height={36} className="mx-auto mb-6" priority />
        <h1 className="heading-card text-white mb-2">Agency PMS</h1>
        <p className="body-text text-text-darkSecondary">Sign in to manage projects</p>
      </div>

      <div className="card-dark space-y-6">
        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== "false" && (
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="btn-secondary-dark w-full"
          >
            Continue with Google
          </button>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-bg-cardDark px-3 text-text-darkSecondary">or</span>
          </div>
        </div>

        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-text-darkSecondary mb-1.5">
              Email
            </label>
            <input id="email" name="email" type="email" required className="input-dark" placeholder="vecktrixai@gmail.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-text-darkSecondary mb-1.5">
              Password
            </label>
            <input id="password" name="password" type="password" required className="input-dark" placeholder="••••••••" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary-dark w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
