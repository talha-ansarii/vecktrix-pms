"use client";

import Link from "next/link";
import { useState } from "react";
import { LeadStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui";
import { formatDate, formatStatus } from "@/lib/utils";
import { ConvertLeadButton } from "./ConvertLeadButton";
import { LeadStatusSelect } from "./LeadStatusSelect";
import { LeadsPipelineStepper } from "./LeadsPipelineStepper";
import { LeadsFilters } from "./LeadsFilters";

export type LeadListItem = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: LeadStatus;
  temperature: string;
  moneyBucket: string | null;
  timelineBucket: string | null;
  source: string;
  createdAt: string;
  convertedClientId: string | null;
  convertedClient: { id: string; name: string } | null;
};

const BOARD_COLUMNS: LeadStatus[] = [
  LeadStatus.new,
  LeadStatus.contacted,
  LeadStatus.qualified,
  LeadStatus.proposal,
  LeadStatus.won,
  LeadStatus.lost,
];

export function LeadsWorkspace({
  leads,
  counts,
  activeStatus,
  canWrite,
  canConvert,
}: {
  leads: LeadListItem[];
  counts: Record<string, number>;
  activeStatus?: string;
  canWrite: boolean;
  canConvert: boolean;
}) {
  const [view, setView] = useState<"table" | "board">("table");

  return (
    <div className="space-y-4">
      <LeadsPipelineStepper counts={counts} activeStatus={activeStatus} />
      <LeadsFilters />

      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-[4px] border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`text-xs px-3 py-1.5 rounded-[3px] ${view === "table" ? "bg-white/10 text-white" : "text-text-darkSecondary"}`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setView("board")}
            className={`text-xs px-3 py-1.5 rounded-[3px] ${view === "board" ? "bg-white/10 text-white" : "text-text-darkSecondary"}`}
          >
            Board
          </button>
        </div>
        <p className="text-xs text-text-darkSecondary">{leads.length} lead{leads.length === 1 ? "" : "s"}</p>
      </div>

      {leads.length === 0 ? (
        <div className="card-dark text-center py-14 px-6">
          <p className="font-sans text-lg font-medium text-white mb-2">No leads match</p>
          <p className="body-text text-text-darkSecondary">Adjust filters or create a new lead.</p>
        </div>
      ) : view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {BOARD_COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col);
            return (
              <div key={col} className="flex-shrink-0 w-64 card-dark p-3 flex flex-col max-h-[70vh]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-darkSecondary mb-3 flex justify-between">
                  {formatStatus(col)}
                  <span className="text-white tabular-nums">{colLeads.length}</span>
                </h3>
                <ul className="space-y-2 overflow-y-auto flex-1 min-h-0">
                  {colLeads.map((lead) => (
                    <li key={lead.id} className="rounded-[4px] border border-white/6 bg-white/[0.02] p-3">
                      <Link href={`/leads/${lead.id}`} className="text-sm font-medium text-white hover:underline">
                        {lead.name}
                      </Link>
                      <p className="text-xs text-text-darkSecondary truncate">{lead.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <StatusBadge status={lead.temperature} />
                      </div>
                      {canWrite && (
                        <div className="mt-2">
                          <LeadStatusSelect leadId={lead.id} status={lead.status} />
                        </div>
                      )}
                      {canConvert &&
                        ["qualified", "proposal"].includes(lead.status) &&
                        !lead.convertedClientId && (
                          <div className="mt-2">
                            <ConvertLeadButton leadId={lead.id} size="xs" />
                          </div>
                        )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card-dark overflow-x-auto p-4 sm:p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-darkSecondary border-b border-white/6">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Temp</th>
                <th className="pb-3 font-medium">Budget</th>
                <th className="pb-3 font-medium">Timeline</th>
                <th className="pb-3 font-medium">Source</th>
                <th className="pb-3 font-medium">Created</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-white/6 last:border-0">
                  <td className="py-3">
                    <Link href={`/leads/${lead.id}`} className="text-white font-medium hover:underline">
                      {lead.name}
                    </Link>
                    <p className="text-text-darkSecondary text-xs">{lead.email}</p>
                  </td>
                  <td className="py-3">
                    {canWrite ? (
                      <LeadStatusSelect leadId={lead.id} status={lead.status} />
                    ) : (
                      <StatusBadge status={lead.status} />
                    )}
                  </td>
                  <td className="py-3 text-text-darkSecondary">{lead.company ?? "—"}</td>
                  <td className="py-3">
                    <StatusBadge status={lead.temperature} />
                  </td>
                  <td className="py-3 text-text-darkSecondary">{lead.moneyBucket ?? "—"}</td>
                  <td className="py-3 text-text-darkSecondary">{lead.timelineBucket ?? "—"}</td>
                  <td className="py-3 text-text-darkSecondary">{lead.source}</td>
                  <td className="py-3 text-text-darkSecondary">{formatDate(lead.createdAt)}</td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {lead.convertedClientId && lead.convertedClient ? (
                      <Link href="/clients" className="text-xs text-emerald-400 hover:underline">
                        View client
                      </Link>
                    ) : canConvert && ["qualified", "proposal"].includes(lead.status) ? (
                      <ConvertLeadButton leadId={lead.id} size="xs" />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
