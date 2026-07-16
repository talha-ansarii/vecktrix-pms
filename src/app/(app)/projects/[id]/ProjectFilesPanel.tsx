"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Trash2, ExternalLink } from "lucide-react";
import {
  deleteProjectFile,
  toggleProjectFileVisibility,
  uploadProjectFile,
} from "@/lib/actions/files";

export type ProjectFileRow = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  clientVisible: boolean;
  createdAt: Date;
  uploadedBy: { name: string | null; email: string };
  milestone: { title: string } | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectFilesPanel({
  projectId,
  files,
  canManage = true,
}: {
  projectId: string;
  files: ProjectFileRow[];
  canManage?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="card-dark">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h3 className="overline-text text-text-darkSecondary">Files</h3>
        {canManage && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.set("projectId", projectId);
                fd.set("file", file);
                run(() => uploadProjectFile(fd));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="btn-secondary-dark text-xs px-3 py-1.5"
            >
              {pending ? "Uploading…" : "Upload"}
            </button>
          </>
        )}
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-text-darkSecondary">No files yet.</p>
      ) : (
        <ul className="space-y-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-start justify-between gap-3 rounded-[4px] border border-white/6 bg-black/20 p-3"
            >
              <div className="flex gap-3 min-w-0">
                <FileText className="h-4 w-4 shrink-0 text-text-darkSecondary mt-0.5" />
                <div className="min-w-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:underline flex items-center gap-1 truncate"
                  >
                    {file.name}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="text-xs text-text-darkSecondary mt-0.5">
                    {formatSize(file.size)}
                    {file.milestone ? ` · ${file.milestone.title}` : ""}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-secondary-dark text-[10px] px-2 py-1"
                    onClick={() => run(() => toggleProjectFileVisibility(file.id, !file.clientVisible))}
                  >
                    {file.clientVisible ? "Client ✓" : "Client"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label="Delete file"
                    className="btn-secondary-dark text-xs px-2 py-1"
                    onClick={() => run(() => deleteProjectFile(file.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </div>
  );
}
