"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function LeadsFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <select
        className="input-dark text-sm w-auto"
        defaultValue={sp.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {["new", "contacted", "qualified", "proposal", "won", "lost", "archived"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="input-dark text-sm w-auto"
        defaultValue={sp.get("temperature") ?? ""}
        onChange={(e) => update("temperature", e.target.value)}
      >
        <option value="">All temps</option>
        {["hot", "warm", "cold"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="input-dark text-sm w-auto"
        defaultValue={sp.get("money") ?? ""}
        onChange={(e) => update("money", e.target.value)}
      >
        <option value="">All budgets</option>
        {["low", "mid", "high"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="input-dark text-sm w-auto"
        defaultValue={sp.get("timeline") ?? ""}
        onChange={(e) => update("timeline", e.target.value)}
      >
        <option value="">All timelines</option>
        {["short", "medium", "long"].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
