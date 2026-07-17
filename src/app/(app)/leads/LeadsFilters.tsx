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

  const selectClass = "input-dark text-sm w-full sm:w-auto sm:min-w-[10.5rem]";

  return (
    <div className="card-dark p-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
        <div className="space-y-1.5 flex-1 min-w-[10.5rem]">
          <span className="text-xs font-medium text-text-darkSecondary">Status</span>
          <select
            className={selectClass}
            defaultValue={sp.get("status") ?? ""}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">All statuses</option>
            {["new", "contacted", "qualified", "proposal", "won", "lost", "archived"].map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[10.5rem]">
          <span className="text-xs font-medium text-text-darkSecondary">Temperature</span>
          <select
            className={selectClass}
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
        </div>
        <div className="space-y-1.5 flex-1 min-w-[10.5rem]">
          <span className="text-xs font-medium text-text-darkSecondary">Budget</span>
          <select
            className={selectClass}
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
        </div>
        <div className="space-y-1.5 flex-1 min-w-[10.5rem]">
          <span className="text-xs font-medium text-text-darkSecondary">Timeline</span>
          <select
            className={selectClass}
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
      </div>
    </div>
  );
}
