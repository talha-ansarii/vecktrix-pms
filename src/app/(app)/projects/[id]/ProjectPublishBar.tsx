"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  publishProjectToClient,
  unpublishProjectFromClient,
} from "@/lib/actions/projects";

export function ProjectPublishBar({
  projectId,
  publishedToClient,
  publishedAt,
  unpublishedAt,
  canPublish,
  clientVisibleFileCount,
}: {
  projectId: string;
  publishedToClient: boolean;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
  canPublish: boolean;
  clientVisibleFileCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div
      className={`card-dark mb-6 border ${
        publishedToClient ? "border-emerald-500/30" : "border-amber-500/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {publishedToClient ? (
            <>
              <p className="text-emerald-400 font-medium">Published to client portal</p>
              {publishedAt && (
                <p className="text-xs text-text-darkSecondary mt-1">
                  Since {new Date(publishedAt).toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-amber-400 font-medium">Draft — not visible to client</p>
              <p className="text-xs text-text-darkSecondary mt-1">
                Publish when the plan and at least one client-visible file are ready.
                {clientVisibleFileCount === 0 && " No client-visible files yet."}
              </p>
              {unpublishedAt && (
                <p className="text-xs text-text-darkSecondary">
                  Last hidden {new Date(unpublishedAt).toLocaleString()}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          {error && <p className="text-sm text-red-400">{error}</p>}
          {publishedToClient ? (
            <button
              type="button"
              disabled={pending}
              className="btn-secondary-dark text-sm px-4 py-2"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await unpublishProjectFromClient(projectId);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed");
                  }
                });
              }}
            >
              {pending ? "…" : "Unpublish"}
            </button>
          ) : (
            <button
              type="button"
              disabled={pending || !canPublish}
              title={
                !canPublish
                  ? "Requires at least one milestone and one client-visible file"
                  : undefined
              }
              className="btn-primary-dark text-sm px-4 py-2 disabled:opacity-50"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    await publishProjectToClient(projectId);
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed");
                  }
                });
              }}
            >
              {pending ? "Publishing…" : "Publish to client"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
