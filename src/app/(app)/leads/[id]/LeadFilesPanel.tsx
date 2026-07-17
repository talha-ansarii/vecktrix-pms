"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, ExternalLink } from "lucide-react";
import { deleteLeadFile, uploadLeadFile } from "@/lib/actions/lead-files";

export type LeadFileRow = {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  uploadedBy: { name: string | null; email: string };
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function LeadFilesPanel({
  leadId,
  files,
  canManage = true,
}: {
  leadId: string;
  files: LeadFileRow[];
  canManage?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="card-dark">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="overline-text text-text-darkSecondary">Proposals & files</h3>
          <p className="text-xs text-text-darkSecondary mt-1">Decks, quotes, and sales documents for this lead.</p>
        </div>
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
                fd.set("leadId", leadId);
                fd.set("file", file);
                run(() => uploadLeadFile(fd));
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="btn-secondary-dark text-xs px-3 py-1.5 shrink-0"
            >
              {pending ? "Uploading…" : "Upload"}
            </button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
      {files.length === 0 ? (
        <p className="text-sm text-text-darkSecondary">No files yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 border border-white/6 rounded-[4px] px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-text-darkSecondary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-text-darkSecondary">
                    {formatSize(file.size)} · {file.uploadedBy.name ?? file.uploadedBy.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-text-darkSecondary hover:text-white"
                  aria-label="Open file"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                {canManage && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteLeadFile(file.id))}
                    className="p-1.5 text-text-darkSecondary hover:text-red-400"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
