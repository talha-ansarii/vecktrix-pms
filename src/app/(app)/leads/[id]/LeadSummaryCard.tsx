import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { formatMoneyBucket, formatTimelineBucket } from "@/lib/leads/buckets";
import { LeadStatus, ServiceInterest } from "@prisma/client";

type LeadSummary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  notes: string | null;
  status: LeadStatus;
  temperature: string;
  source: string;
  serviceInterest: ServiceInterest | null;
  moneyBucket: string | null;
  timelineBucket: string | null;
  createdAt: Date;
  assignedTo: { name: string | null; email: string } | null;
  convertedClient: { id: string; name: string } | null;
};

export function LeadSummaryCard({ lead }: { lead: LeadSummary }) {
  return (
    <div className="card-dark p-4 sm:p-5 space-y-4 sticky top-4">
      <div>
        <p className="overline-text text-text-darkSecondary mb-2">Contact</p>
        <p className="text-white font-medium">{lead.name}</p>
        <a href={`mailto:${lead.email}`} className="text-sm text-text-darkSecondary hover:text-white block">
          {lead.email}
        </a>
        {lead.phone && <p className="text-sm text-text-darkSecondary mt-1">{lead.phone}</p>}
        {lead.company && <p className="text-sm text-white/80 mt-2">{lead.company}</p>}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <StatusBadge status={lead.status} />
        <StatusBadge status={lead.temperature} />
        {lead.serviceInterest && <StatusBadge status={lead.serviceInterest} />}
      </div>

      <dl className="text-sm space-y-2">
        <div>
          <dt className="text-text-darkSecondary text-xs">Source</dt>
          <dd className="text-white">{lead.source}</dd>
        </div>
        <div>
          <dt className="text-text-darkSecondary text-xs">Created</dt>
          <dd className="text-white">{formatDate(lead.createdAt)}</dd>
        </div>
        {lead.assignedTo && (
          <div>
            <dt className="text-text-darkSecondary text-xs">Owner</dt>
            <dd className="text-white">{lead.assignedTo.name ?? lead.assignedTo.email}</dd>
          </div>
        )}
        {lead.moneyBucket && (
          <div>
            <dt className="text-text-darkSecondary text-xs">Budget</dt>
            <dd className="text-white text-xs leading-relaxed">{formatMoneyBucket(lead.moneyBucket)}</dd>
          </div>
        )}
        {lead.timelineBucket && (
          <div>
            <dt className="text-text-darkSecondary text-xs">Timeline</dt>
            <dd className="text-white text-xs leading-relaxed">{formatTimelineBucket(lead.timelineBucket)}</dd>
          </div>
        )}
      </dl>

      {lead.notes && (
        <div className="border-t border-white/6 pt-4">
          <p className="text-xs font-medium text-text-darkSecondary mb-2">Summary notes</p>
          <p className="text-sm text-text-darkSecondary whitespace-pre-wrap line-clamp-6">{lead.notes}</p>
        </div>
      )}

      {lead.convertedClient && (
        <Link
          href={`/clients?highlight=${lead.convertedClient.id}`}
          className="block text-sm text-emerald-400 hover:underline"
        >
          Client: {lead.convertedClient.name} →
        </Link>
      )}
    </div>
  );
}
