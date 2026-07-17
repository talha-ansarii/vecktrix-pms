"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { WorkspaceRole } from "@prisma/client";
import {
  acceptProposal,
  getOrCreateProposal,
  sendProposal,
  updateProposal,
  uploadProposalFile,
} from "@/lib/actions/proposals";
import { proposalStageLabel } from "@/lib/leads/pipeline";
import { formatStatus } from "@/lib/utils";

type MilestoneDraft = {
  title: string;
  sortOrder: number;
  ownerRole: WorkspaceRole;
  amount?: number;
};

type ProposalData = {
  id: string;
  status: string;
  notes: string | null;
  milestones: { id: string; title: string; sortOrder: number; ownerRole: WorkspaceRole; amount: number | null }[];
  files: { id: string; name: string; url: string }[];
};

const OWNER_ROLES = [
  WorkspaceRole.project_manager,
  WorkspaceRole.ux_designer,
  WorkspaceRole.product_engineer,
  WorkspaceRole.qa_engineer,
];

function toDrafts(milestones: ProposalData["milestones"]): MilestoneDraft[] {
  return [...milestones]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m, i) => ({
      title: m.title,
      sortOrder: i,
      ownerRole: m.ownerRole,
      amount: m.amount ?? undefined,
    }));
}

export function ProposalBuilder({
  leadId,
  proposal,
  isAdmin,
}: {
  leadId: string;
  proposal: ProposalData | null;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [local, setLocal] = useState(proposal);
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(
    proposal ? toDrafts(proposal.milestones) : [],
  );
  const [notes, setNotes] = useState(proposal?.notes ?? "");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!local) return;
    setMilestones(toDrafts(local.milestones));
    setNotes(local.notes ?? "");
  }, [local]);

  if (!isAdmin) return null;

  const refresh = () =>
    startTransition(async () => {
      const p = await getOrCreateProposal(leadId);
      setLocal(p as ProposalData);
    });

  const ensure = () =>
    startTransition(async () => {
      const p = await getOrCreateProposal(leadId);
      setLocal(p as ProposalData);
    });

  if (!local) {
    return (
      <div className="card-dark p-4">
        <p className="text-sm text-text-darkSecondary mb-3">No proposal yet.</p>
        <button type="button" className="btn-primary-dark text-sm" onClick={ensure} disabled={pending}>
          Create proposal
        </button>
      </div>
    );
  }

  const isDraft = local.status === "draft";

  return (
    <div className="card-dark p-4 sm:p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-white">Proposal</h3>
        <span className="text-xs text-emerald-400/90">{proposalStageLabel(local.status as never)}</span>
      </div>

      {isDraft ? (
        <>
          <label className="block space-y-1.5">
            <span className="text-xs text-text-darkSecondary">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-dark w-full text-sm"
              placeholder="Scope summary or terms"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-darkSecondary">Milestone outline</p>
              <button
                type="button"
                className="text-xs text-emerald-400 hover:underline"
                onClick={() =>
                  setMilestones((m) => [
                    ...m,
                    {
                      title: "New milestone",
                      sortOrder: m.length,
                      ownerRole: WorkspaceRole.project_manager,
                    },
                  ])
                }
              >
                + Add milestone
              </button>
            </div>
            <ul className="space-y-2">
              {milestones.map((m, idx) => (
                <li key={idx} className="flex flex-wrap items-center gap-2 border border-white/6 rounded-lg p-3">
                  <span className="text-xs text-text-darkSecondary w-6">#{idx + 1}</span>
                  <input
                    value={m.title}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[idx] = { ...next[idx], title: e.target.value };
                      setMilestones(next);
                    }}
                    className="input-dark flex-1 min-w-[120px] text-sm"
                    required
                  />
                  <select
                    value={m.ownerRole}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[idx] = { ...next[idx], ownerRole: e.target.value as WorkspaceRole };
                      setMilestones(next);
                    }}
                    className="input-dark text-sm"
                  >
                    {OWNER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {formatStatus(r)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    placeholder="Amount"
                    value={m.amount ?? ""}
                    onChange={(e) => {
                      const next = [...milestones];
                      next[idx] = {
                        ...next[idx],
                        amount: e.target.value ? Number(e.target.value) : undefined,
                      };
                      setMilestones(next);
                    }}
                    className="input-dark w-24 text-sm"
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        if (idx === 0) return;
                        const next = [...milestones];
                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                        setMilestones(next);
                      }}
                      className="btn-secondary-dark p-1.5"
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === milestones.length - 1}
                      onClick={() => {
                        if (idx === milestones.length - 1) return;
                        const next = [...milestones];
                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                        setMilestones(next);
                      }}
                      className="btn-secondary-dark p-1.5"
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={milestones.length <= 1}
                      onClick={() => setMilestones((m) => m.filter((_, i) => i !== idx))}
                      className="btn-secondary-dark text-xs px-2"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="btn-secondary-dark text-sm w-full"
            disabled={pending || milestones.length === 0}
            onClick={() => {
              setError(null);
              setSaveMsg(null);
              startTransition(async () => {
                try {
                  await updateProposal({
                    proposalId: local.id,
                    notes,
                    milestones: milestones.map((m, i) => ({
                      title: m.title.trim(),
                      sortOrder: i,
                      ownerRole: m.ownerRole,
                      amount: m.amount,
                    })),
                  });
                  setSaveMsg("Proposal saved.");
                  refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Save failed");
                }
              });
            }}
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
        </>
      ) : (
        <ul className="space-y-1 text-sm text-text-darkSecondary">
          {local.milestones.map((m) => (
            <li key={m.id}>
              {m.sortOrder + 1}. {m.title} ({formatStatus(m.ownerRole)})
              {m.amount != null ? ` — $${m.amount}` : ""}
            </li>
          ))}
        </ul>
      )}

      {local.files.length > 0 && (
        <ul className="text-sm space-y-1">
          {local.files.map((f) => (
            <li key={f.id}>
              <a href={f.url} className="text-white hover:underline" target="_blank" rel="noreferrer">
                {f.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {isDraft && (
        <>
          <input
            type="file"
            className="text-xs text-text-darkSecondary"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("file", file);
              startTransition(async () => {
                await uploadProposalFile(local.id, fd);
                refresh();
              });
            }}
          />
          <button
            type="button"
            className="btn-primary-dark text-sm w-full"
            disabled={pending || milestones.length === 0}
            onClick={() =>
              startTransition(async () => {
                await sendProposal(local.id);
                refresh();
              })
            }
          >
            Send proposal
          </button>
        </>
      )}

      {local.status === "sent" && (
        <button
          type="button"
          className="btn-primary-dark text-sm w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await acceptProposal(local.id);
              refresh();
            })
          }
        >
          Mark accepted
        </button>
      )}

      {saveMsg && <p className="text-xs text-emerald-400">{saveMsg}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
