"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMilestonePlan } from "@/lib/actions/milestones";
import { WorkspaceRole } from "@prisma/client";
import { formatStatus } from "@/lib/utils";

const OWNER_ROLES = [
  WorkspaceRole.project_manager,
  WorkspaceRole.ux_designer,
  WorkspaceRole.product_engineer,
  WorkspaceRole.qa_engineer,
];

export function MilestonePlanEditor({
  milestoneId,
  title,
  sortOrder,
  ownerRole,
  dueDate,
  canEdit,
}: {
  milestoneId: string;
  title: string;
  sortOrder: number;
  ownerRole: WorkspaceRole;
  dueDate?: Date | string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftOrder, setDraftOrder] = useState(sortOrder);
  const [draftOwner, setDraftOwner] = useState(ownerRole);
  const [draftDueDate, setDraftDueDate] = useState(
    dueDate ? new Date(dueDate).toISOString().slice(0, 10) : "",
  );

  if (!canEdit) {
    return (
      <>
        <p className="text-xs text-text-darkSecondary mb-1">#{sortOrder}</p>
        <h3 className="text-white font-medium text-lg">{title}</h3>
        <p className="text-xs text-text-darkSecondary mt-1">Owner: {formatStatus(ownerRole)}</p>
      </>
    );
  }

  if (!editing) {
    return (
      <div>
        <p className="text-xs text-text-darkSecondary mb-1">#{sortOrder}</p>
        <div className="flex items-start gap-2">
          <h3 className="text-white font-medium text-lg flex-1">{title}</h3>
          <button
            type="button"
            className="text-xs text-text-darkSecondary hover:text-white"
            onClick={() => {
              setDraftTitle(title);
              setDraftOrder(sortOrder);
              setDraftOwner(ownerRole);
              setDraftDueDate(dueDate ? new Date(dueDate).toISOString().slice(0, 10) : "");
              setEditing(true);
            }}
          >
            Edit plan
          </button>
        </div>
        <p className="text-xs text-text-darkSecondary mt-1">Owner: {formatStatus(ownerRole)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-darkSecondary">Edit milestone plan</p>
      <input
        value={draftTitle}
        onChange={(e) => setDraftTitle(e.target.value)}
        className="input-dark w-full"
      />
      <div className="flex gap-2 flex-wrap">
        <label className="text-xs text-text-darkSecondary">
          Order
          <input
            type="number"
            min={1}
            value={draftOrder}
            onChange={(e) => setDraftOrder(Number(e.target.value))}
            className="input-dark ml-2 w-20"
          />
        </label>
        <select
          value={draftOwner}
          onChange={(e) => setDraftOwner(e.target.value as WorkspaceRole)}
          className="input-dark text-sm"
        >
          {OWNER_ROLES.map((r) => (
            <option key={r} value={r}>
              {formatStatus(r)}
            </option>
          ))}
        </select>
        <label className="text-xs text-text-darkSecondary">
          Due date
          <input
            type="date"
            value={draftDueDate}
            onChange={(e) => setDraftDueDate(e.target.value)}
            className="input-dark ml-2"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          className="btn-primary-dark text-xs px-3 py-1.5"
          onClick={() => {
            setError(null);
            startTransition(async () => {
              try {
                await updateMilestonePlan({
                  milestoneId,
                  title: draftTitle,
                  sortOrder: draftOrder,
                  ownerRole: draftOwner,
                  dueDate: draftDueDate || null,
                });
                setEditing(false);
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Save failed");
              }
            });
          }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn-secondary-dark text-xs px-3 py-1.5" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
