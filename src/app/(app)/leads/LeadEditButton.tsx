"use client";

import { useState } from "react";
import { EditLeadModal } from "./EditLeadModal";

export function LeadEditButton({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="btn-secondary-dark text-sm py-2 px-4" onClick={() => setOpen(true)}>
        Edit lead
      </button>
      <EditLeadModal leadId={leadId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
