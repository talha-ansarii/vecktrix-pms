"use client";

import { useState } from "react";

export function InviteLinkCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mt-2 flex items-center gap-2 min-w-0">
      <code
        title={url}
        className="flex-1 text-xs text-text-darkSecondary bg-white/5 rounded px-2 py-1.5 truncate"
      >
        {url}
      </code>
      <button
        type="button"
        className="btn-secondary-dark text-xs py-1.5 px-2.5 shrink-0"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
