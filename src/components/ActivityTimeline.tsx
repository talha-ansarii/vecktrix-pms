"use client";

import { activityActionLabel, type TimelineItem } from "@/lib/leads/pipeline";
import { formatDate } from "@/lib/utils";

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-darkSecondary">No activity yet.</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="card-dark p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-emerald-400/90">
              {activityActionLabel(item.action)}
            </span>
            <time className="text-xs text-text-darkSecondary shrink-0">
              {formatDate(item.createdAt)}
            </time>
          </div>
          <p className="text-sm text-text-darkSecondary whitespace-pre-wrap">{item.content}</p>
          {item.actor && (
            <p className="text-xs text-text-darkSecondary/70 mt-2">
              {item.actor.name ?? item.actor.email}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
