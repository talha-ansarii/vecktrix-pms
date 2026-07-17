import { LeadStatus } from "@prisma/client";
import { formatStatus } from "@/lib/utils";

export const LEAD_PIPELINE_STAGES: LeadStatus[] = [
  LeadStatus.new,
  LeadStatus.contacted,
  LeadStatus.qualified,
];

export const LEAD_TERMINAL_STAGES: LeadStatus[] = [LeadStatus.lost, LeadStatus.archived];

export function pipelineStageLabel(status: LeadStatus) {
  return formatStatus(status);
}

export function activityActionLabel(action: string) {
  const map: Record<string, string> = {
    created: "Lead created",
    note: "Conversation",
    status_changed: "Stage change",
    updated: "Details updated",
    contact_added: "Contact added",
    contact_updated: "Contact updated",
    contact_removed: "Contact removed",
    proposal_created: "Proposal drafted",
    proposal_sent: "Proposal sent",
    proposal_accepted: "Proposal accepted",
    proposal_rejected: "Proposal rejected",
    client_created: "Client created",
    project_created: "Project created",
    published: "Published to portal",
  };
  return map[action] ?? action;
}

/** @deprecated use activityActionLabel */
export const activityTypeLabel = activityActionLabel;

export type TimelineItem = {
  id: string;
  action: string;
  content: string;
  metadata?: unknown;
  createdAt: string;
  actor: { name: string | null; email: string } | null;
};

/** @deprecated legacy timeline shape */
export type LeadTimelineItem = {
  id: string;
  type: string;
  action?: string;
  content: string;
  pipelineStatus?: LeadStatus | null;
  createdAt: string;
  user: { name: string | null; email: string } | null;
  actor?: { name: string | null; email: string } | null;
};

export function groupActivitiesByStage(_activities: LeadTimelineItem[]) {
  return [] as { stage: LeadStatus | "other"; items: LeadTimelineItem[] }[];
}

export { canCreateClient, proposalStageLabel } from "./pipeline-helpers";
