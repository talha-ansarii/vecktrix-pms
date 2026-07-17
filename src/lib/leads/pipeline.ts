import { LeadStatus } from "@prisma/client";
import { formatStatus } from "@/lib/utils";

/** Primary sales path left-to-right; terminal states shown after. */
export const LEAD_PIPELINE_STAGES: LeadStatus[] = [
  LeadStatus.new,
  LeadStatus.contacted,
  LeadStatus.qualified,
  LeadStatus.proposal,
  LeadStatus.won,
];

export const LEAD_TERMINAL_STAGES: LeadStatus[] = [LeadStatus.lost, LeadStatus.archived];

export function pipelineStageLabel(status: LeadStatus) {
  return formatStatus(status);
}

export function activityTypeLabel(type: string) {
  const map: Record<string, string> = {
    created: "Lead created",
    note: "Conversation",
    status: "Stage change",
    updated: "Details updated",
    converted: "Converted",
    file_upload: "Document uploaded",
    file_removed: "Document removed",
  };
  return map[type] ?? type;
}

export type LeadTimelineItem = {
  id: string;
  type: string;
  content: string;
  pipelineStatus: LeadStatus | null;
  createdAt: string;
  user: { name: string | null; email: string } | null;
};

export function groupActivitiesByStage(activities: LeadTimelineItem[]) {
  const stages: (LeadStatus | "other")[] = [...LEAD_PIPELINE_STAGES, ...LEAD_TERMINAL_STAGES, "other"];
  const sorted = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const groups: { stage: LeadStatus | "other"; items: LeadTimelineItem[] }[] = [];

  for (const stage of stages) {
    if (stage === "other") {
      const known = new Set([...LEAD_PIPELINE_STAGES, ...LEAD_TERMINAL_STAGES]);
      const items = sorted.filter((a) => !a.pipelineStatus || !known.has(a.pipelineStatus));
      if (items.length) groups.push({ stage: "other", items });
      continue;
    }
    const items = sorted.filter((a) => a.pipelineStatus === stage);
    if (items.length) groups.push({ stage, items });
  }

  return groups;
}
