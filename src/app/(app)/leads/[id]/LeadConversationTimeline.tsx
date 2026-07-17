"use client";

import { LeadStatus } from "@prisma/client";
import { StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import {
  activityTypeLabel,
  groupActivitiesByStage,
  type LeadTimelineItem,
  pipelineStageLabel,
} from "@/lib/leads/pipeline";
import { MessageSquare, FileUp, RefreshCw, Sparkles, Send, XCircle } from "lucide-react";

function ActivityIcon({ type }: { type: string }) {
  if (type === "note") return <MessageSquare className="h-4 w-4 text-blue-300" />;
  if (type === "proposal_sent") return <Send className="h-4 w-4 text-violet-300" />;
  if (type === "proposal_rejected") return <XCircle className="h-4 w-4 text-red-400" />;
  if (type.startsWith("file")) return <FileUp className="h-4 w-4 text-amber-300" />;
  if (type === "converted") return <Sparkles className="h-4 w-4 text-emerald-300" />;
  return <RefreshCw className="h-4 w-4 text-text-darkSecondary" />;
}

export function LeadConversationTimeline({
  activities,
  currentStatus,
}: {
  activities: LeadTimelineItem[];
  currentStatus: LeadStatus;
}) {
  const groups = groupActivitiesByStage(activities);

  if (activities.length === 0) {
    return (
      <div className="card-dark p-8 text-center">
        <p className="text-white font-medium mb-1">No conversations yet</p>
        <p className="text-sm text-text-darkSecondary">
          Log calls, emails, and meeting notes at each pipeline stage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.stage} className="card-dark overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3 bg-white/[0.02]">
            <h3 className="text-sm font-semibold text-white">
              {group.stage === "other"
                ? "Earlier activity"
                : pipelineStageLabel(group.stage as LeadStatus)}
            </h3>
            {group.stage !== "other" && group.stage === currentStatus && (
              <span className="text-[10px] uppercase tracking-wider text-emerald-300">Current</span>
            )}
            <span className="text-xs text-text-darkSecondary">{group.items.length} entries</span>
          </header>
          <ul className="divide-y divide-white/6">
            {group.items.map((item) => (
              <li key={item.id} className="px-4 py-4 flex gap-3">
                <div className="mt-0.5 shrink-0">
                  <ActivityIcon type={item.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-text-darkSecondary">
                      {activityTypeLabel(item.type)}
                    </span>
                    {item.pipelineStatus && (
                      <StatusBadge status={item.pipelineStatus} className="!text-[10px] !py-0" />
                    )}
                  </div>
                  <p
                    className={`text-sm whitespace-pre-wrap ${
                      item.type === "proposal_rejected" ? "text-red-200/90" : "text-white"
                    }`}
                  >
                    {item.content}
                  </p>
                  <p className="text-xs text-text-darkSecondary mt-2">
                    {item.user?.name ?? item.user?.email ?? "System"} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
